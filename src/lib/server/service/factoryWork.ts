// src/lib/server/service/factoryWork.ts
import { db } from "#lib/server/db.js";
import {
	companies,
	companyBudgets,
	factories,
	factoryWorkers,
	regions,
	resourceInventory,
	userWallets,
	transactionHistory
} from "#lib/server/schema.js";
import { calculateAndCollectTax } from "#lib/server/taxes.js";
import { getEmbargoReason } from "#lib/server/embargo.js";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
import { and, eq, sql } from "drizzle-orm";
import { extractFromDeposit, isMineable } from "#lib/server/services/economy/mining.js";
import { addUserItem, takeUserItem } from "#lib/server/services/economy/inventory.js";
import { SHIFT_RECIPES, gridFactor, supplyFactor } from "#lib/config/index.js";
import { gridDegradation, supplyDisruption } from "#lib/server/services/military/state-effects.js";
import { strikeProductionFactor } from "#lib/server/services/military/strike.js";
import { aiLevel } from "#lib/server/services/military/ai.js";
import { aiProductionFactor } from "#lib/config/index.js";
import { regionSupply } from "#lib/server/services/military/logistics.js";
import { factoryWaterFactor } from "#lib/config/index.js";
import { regionsCivilianNeeds } from "#lib/server/services/civilians/supply.js";
import {
	efficiencyFactor,
	dueForWear,
	nextEfficiency,
	nextQuality,
	qualityFactor
} from "#lib/config/index.js";

const SHIFT_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export interface ShiftStatus {
	canWork: boolean;
	isCurrentlyWorking: boolean;
	shiftProgress: number;
	shiftEndsAt: Date | null;
	hoursRemaining: number;
}

export interface StartShiftResult {
	success: boolean;
	error?: string;
	message?: string;
}

export interface CollectWageResult {
	success: boolean;
	error?: string;
	message?: string;
	earned?: number;
	grossWage?: number;
	taxPaid?: number;
	resourcesProduced?: number;
	/** Mines only: what's left of the region's deposit, and its size. */
	depositRemaining?: number;
	depositCapacity?: number;
	companyBankrupt?: boolean;
	owedAmount?: number;
	companyBalance?: number;
}

/**
 * Calculate current shift status for a worker
 */
export function calculateShiftStatus(lastWorked: Date | null): ShiftStatus {
	if (!lastWorked) {
		return {
			canWork: true,
			isCurrentlyWorking: false,
			shiftProgress: 0,
			shiftEndsAt: null,
			hoursRemaining: 0
		};
	}

	const lastWorkedTime = new Date(lastWorked).getTime();
	const now = Date.now();
	const timeSinceLastShift = now - lastWorkedTime;

	if (timeSinceLastShift < SHIFT_DURATION) {
		// Still working current shift
		const shiftProgress = (timeSinceLastShift / SHIFT_DURATION) * 100;
		const shiftEndsAt = new Date(lastWorkedTime + SHIFT_DURATION);
		const hoursRemaining = Math.ceil((SHIFT_DURATION - timeSinceLastShift) / (60 * 60 * 1000));

		return {
			canWork: false,
			isCurrentlyWorking: true,
			shiftProgress,
			shiftEndsAt,
			hoursRemaining
		};
	}

	// Shift complete, ready for next one
	return {
		canWork: true,
		isCurrentlyWorking: false,
		shiftProgress: 100,
		shiftEndsAt: null,
		hoursRemaining: 0
	};
}

/**
 * Start a work shift at a factory
 */
export async function startWorkShift(userId: string, factoryId: number): Promise<StartShiftResult> {
	// Get factory details
	const [factory] = await db
		.select({
			id: factories.id,
			companyId: factories.companyId,
			workerWage: factories.workerWage,
			maxWorkers: factories.maxWorkers,
			factoryType: factories.factoryType
		})
		.from(factories)
		.where(eq(factories.id, factoryId));

	if (!factory) {
		return { success: false, error: "Factory not found" };
	}

	// Block employment if the company's headquarters state and the worker's
	// state have an active embargo (sanction) against each other.
	const [company] = await db
		.select({ stateId: regions.stateId })
		.from(companies)
		.leftJoin(regions, eq(companies.regionId, regions.id))
		.where(eq(companies.id, factory.companyId));

	const embargoReason = await getEmbargoReason(company?.stateId ?? null, userId);
	if (embargoReason) {
		return { success: false, error: embargoReason };
	}

	// Check company budget
	const [companyBudget] = await db.select().from(companyBudgets).where(eq(companyBudgets.companyId, factory.companyId));

	if (!companyBudget || companyBudget.balance < factory.workerWage) {
		return {
			success: false,
			error: `Company cannot afford to pay wages. Current budget: ${companyBudget?.balance.toLocaleString() || 0}, Required: ${factory.workerWage.toLocaleString()}`
		};
	}

	// Check if user already has a job
	const [existingJob] = await db.select().from(factoryWorkers).where(eq(factoryWorkers.userId, userId));

	if (existingJob) {
		// Check if still on cooldown
		if (existingJob.lastWorked) {
			const shiftStatus = calculateShiftStatus(existingJob.lastWorked);
			if (shiftStatus.isCurrentlyWorking) {
				return {
					success: false,
					error: `Still working current shift. ${shiftStatus.hoursRemaining} hours remaining.`
				};
			}
		}

		// If different factory, transfer worker
		if (existingJob.factoryId !== factoryId) {
			await db
				.update(factoryWorkers)
				.set({
					factoryId,
					lastWorked: new Date(),
					wageAtShiftStart: factory.workerWage
				})
				.where(eq(factoryWorkers.id, existingJob.id));

			return {
				success: true,
				message: "Transferred to new factory. Shift started! Work for 8 hours to receive payment."
			};
		} else {
			// Same factory, just update last worked and lock wage
			await db
				.update(factoryWorkers)
				.set({
					lastWorked: new Date(),
					wageAtShiftStart: factory.workerWage
				})
				.where(eq(factoryWorkers.id, existingJob.id));

			return {
				success: true,
				message: "Shift started! Work for 8 hours to receive payment."
			};
		}
	}

	// Check if factory is full
	const currentWorkers = await db.select().from(factoryWorkers).where(eq(factoryWorkers.factoryId, factoryId));

	if (currentWorkers.length >= factory.maxWorkers) {
		return { success: false, error: "Factory is at maximum capacity" };
	}

	// Create new job
	await db.insert(factoryWorkers).values({
		userId,
		factoryId,
		jobType: factory.factoryType === "mine" ? "miner" : "general_worker",
		lastWorked: new Date(),
		wageAtShiftStart: factory.workerWage
	});

	return {
		success: true,
		message: "Shift started! Work for 8 hours to receive payment."
	};
}

/**
 * Collect wages after completing a shift
 */
export async function collectWages(userId: string, factoryId: number): Promise<CollectWageResult> {
	// Get factory details
	const [factory] = await db
		.select({
			id: factories.id,
			name: factories.name,
			companyId: factories.companyId,
			ownerId: companies.ownerId,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
			efficiency: factories.efficiency,
			quality: factories.quality,
			shiftsCompleted: factories.shiftsCompleted,
			regionId: factories.regionId,
			stateId: regions.stateId
		})
		.from(factories)
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.where(eq(factories.id, factoryId));

	if (!factory) {
		return { success: false, error: "Factory not found" };
	}

	// Get user's job
	const [job] = await db
		.select({
			id: factoryWorkers.id,
			lastWorked: factoryWorkers.lastWorked,
			wageAtShiftStart: factoryWorkers.wageAtShiftStart
		})
		.from(factoryWorkers)
		.where(and(eq(factoryWorkers.userId, userId), eq(factoryWorkers.factoryId, factoryId)));

	if (!job) {
		return { success: false, error: "You don't work at this factory" };
	}

	if (!job.lastWorked) {
		return { success: false, error: "No active shift" };
	}

	// Check if 8 hours have passed
	const shiftStatus = calculateShiftStatus(job.lastWorked);
	if (shiftStatus.isCurrentlyWorking) {
		return {
			success: false,
			error: `Shift not complete. ${shiftStatus.hoursRemaining} hours remaining.`
		};
	}

	// Use wage locked at shift start, or fall back to current wage
	const wageToCollect = job.wageAtShiftStart ?? factory.workerWage;

	// Check company budget
	const [companyBudget] = await db.select().from(companyBudgets).where(eq(companyBudgets.companyId, factory.companyId));

	if (!companyBudget) {
		return {
			success: false,
			error: "Company has no budget account. Contact company owner."
		};
	}

	if (companyBudget.balance < wageToCollect) {
		return {
			success: false,
			error: `Company cannot pay wages. Budget: ${companyBudget.balance.toLocaleString()}, Owed: ${wageToCollect.toLocaleString()}. Contact company owner.`,
			companyBankrupt: true,
			owedAmount: wageToCollect,
			companyBalance: companyBudget.balance
		};
	}

	class AlreadyCollected extends Error {}
	let result;
	try {
		result = await db.transaction(async (tx) => {
			// Claim the finished shift first: if two requests race, only one of them
			// matches the original lastWorked and gets paid (and mines the deposit).
			const [claimed] = await tx
				.update(factoryWorkers)
				.set({ lastWorked: null, wageAtShiftStart: null })
				.where(and(eq(factoryWorkers.id, job.id), eq(factoryWorkers.lastWorked, job.lastWorked!)))
				.returning({ id: factoryWorkers.id });
			if (!claimed) throw new AlreadyCollected();

			// Calculate income tax (inside transaction for atomicity)
			const incomeTaxResult = await calculateAndCollectTax(factory.stateId, "income", wageToCollect, userId, tx);

			// Calculate mining tax if applicable
			let miningTaxResult: Awaited<ReturnType<typeof calculateAndCollectTax>> | null = null;
			let resourcesProduced = 0;
			let netResourceQuantity = 0;
			let deposit: { remaining: number; capacity: number } | null = null;
			// A grid attack, a poisoned supply chain, an airstrike and a severed
			// road all cut output. The individual factors are kept so a plant's
			// efficiency and quality can degrade when any of them bites.
			// Water-hungry companies (steel, refining, fabs) share the region's
			// supply with its households and throttle when the taps run low.
			const waterSufficiency =
				(await regionsCivilianNeeds(tx, [factory.regionId])).get(factory.regionId)?.water.sufficiency ?? 1;
			const disruptionFactors = [
				gridFactor(await gridDegradation(tx, factory.stateId)),
				supplyFactor(await supplyDisruption(tx, factory.stateId)),
				await strikeProductionFactor(tx, factory.stateId, factory.regionId),
				(await regionSupply(tx, factory.regionId)).factor,
				factoryWaterFactor(factory.productOutput ?? factory.resourceOutput, waterSufficiency)
			];
			const grid =
				disruptionFactors.reduce((product, f) => product * f, 1) *
				// AI-assisted planning wastes less material (ai.config.ts).
				aiProductionFactor(await aiLevel(tx, factory.stateId)) *
				// A plant learns from every clean shift; a worn-out one makes less.
				efficiencyFactor(factory.efficiency ?? 50) *
				// Damage and shortages lower the quality of what it makes.
				qualityFactor(factory.quality ?? 90);
			if (factory.factoryType === "mine" && isMineable(factory.resourceOutput)) {
				// Output depends on the region's deposit and the state's exploitation law.
				const extraction = await extractFromDeposit(
					tx,
					factory.regionId,
					factory.resourceOutput,
					Math.max(1, Math.round(factory.productionRate * grid))
				);
				deposit = { remaining: extraction.remaining, capacity: extraction.capacity };
				if (extraction.produced > 0) {
					const estimatedResourceValue = extraction.produced * 10;
					miningTaxResult = await calculateAndCollectTax(
						factory.stateId,
						"mining",
						estimatedResourceValue,
						factory.ownerId,
						tx
					);
					const taxPercentage = miningTaxResult.taxAmount / estimatedResourceValue;
					netResourceQuantity = Math.floor(extraction.produced * (1 - taxPercentage));
				}
			}

			// Pay worker (net amount after tax)
			await tx
				.insert(userWallets)
				.values({
					userId,
					balance: incomeTaxResult.netAmount
				})
				.onConflictDoUpdate({
					target: userWallets.userId,
					set: {
						balance: sql`${userWallets.balance} + ${incomeTaxResult.netAmount}`,
						updatedAt: new Date()
					}
				});

			// Deduct wage from company budget
			await tx
				.update(companyBudgets)
				.set({
					balance: sql`${companyBudgets.balance} - ${wageToCollect}`,
					totalSpent: sql`${companyBudgets.totalSpent} + ${wageToCollect}`,
					updatedAt: new Date()
				})
				.where(eq(companyBudgets.companyId, factory.companyId));

			// Add resources to company owner (if mine/refinery)
			if (factory.factoryType === "mine" && factory.resourceOutput && netResourceQuantity > 0) {
				resourcesProduced = netResourceQuantity;

				await tx
					.insert(resourceInventory)
					.values({
						userId: factory.ownerId,
						resourceType: factory.resourceOutput,
						quantity: netResourceQuantity
					})
					.onConflictDoUpdate({
						target: [resourceInventory.userId, resourceInventory.resourceType],
						set: {
							quantity: sql`${resourceInventory.quantity} + ${netResourceQuantity}`,
							updatedAt: new Date()
						}
					});
			}

			// Refineries and armaments factories turn the owner's materials into
			// output, one recipe per shift; without the materials the shift is
			// paid but produces nothing.
			let output: { item: string; quantity: number; missing?: string } | null = null;
			if (factory.factoryType !== "mine") {
				const item = factory.productOutput ?? factory.resourceOutput;
				const recipe = item ? SHIFT_RECIPES[item] : undefined;
				if (item && recipe) {
					let missing: string | undefined;
					const taken: { type: "resource" | "product"; name: string; amount: number }[] = [];
					for (const [input, needed] of Object.entries(recipe.inputs)) {
						// Inputs may be raw materials or finished products (e.g.
						// fab equipment needs chips and machine tools).
						const asResource = await takeUserItem(tx, factory.ownerId, "resource", input, needed!);
						const asProduct = asResource ? false : await takeUserItem(tx, factory.ownerId, "product", input, needed!);
						if (!asResource && !asProduct) {
							missing = input;
							break;
						}
						taken.push({ type: asResource ? "resource" : "product", name: input, amount: needed! });
					}
					if (missing) {
						// Put back anything already taken: all or nothing.
						for (const t of taken) await addUserItem(tx, factory.ownerId, t.type, t.name, t.amount);
						output = { item, quantity: 0, missing };
					} else {
						const type = factory.productOutput ? "product" : "resource";
						const quantity = Math.max(1, Math.round(recipe.output * grid));
						await addUserItem(tx, factory.ownerId, type, item, quantity);
						output = { item, quantity };
					}
				}
			}

			// A plant learns from clean shifts and loses know-how when its inputs
			// or its tools run out. Attacks on the grid or the supply line chip
			// away both output and quality (equipment.config.ts).
			const shiftsCompleted = (factory.shiftsCompleted ?? 0) + 1;
			let toolsWorn = true;
			if (dueForWear(shiftsCompleted)) {
				toolsWorn = await takeUserItem(tx, factory.ownerId, "product", "machine_tools", 1);
			}
			const produced = factory.factoryType === "mine" ? resourcesProduced > 0 : (output?.quantity ?? 0) > 0;
			const supplied = produced && toolsWorn;
			const newEfficiency = nextEfficiency(factory.efficiency ?? 50, {
				supplied,
				disruptions: disruptionFactors
			});
			const newQuality = nextQuality(factory.quality ?? 90, newEfficiency, supplied);
			await tx
				.update(factories)
				.set({
					efficiency: newEfficiency,
					quality: newQuality,
					shiftsCompleted
				})
				.where(eq(factories.id, factory.id));

			// Record transaction for worker
			const [currentWallet] = await tx
				.select({ balance: userWallets.balance })
				.from(userWallets)
				.where(eq(userWallets.userId, userId));
			await tx.insert(transactionHistory).values({
				userId,
				transactionType: "factory_wage",
				amount: incomeTaxResult.netAmount,
				balanceAfter: currentWallet?.balance || 0,
				description: `Received wage for shift at ${factory.name}`,
				relatedEntityType: "factory",
				relatedEntityId: factoryId
			});

			return { incomeTaxResult, miningTaxResult, resourcesProduced, deposit, output, efficiency: newEfficiency, quality: newQuality };
		});
	} catch (err) {
		if (err instanceof AlreadyCollected) return { success: false, error: "This shift has already been collected." };
		throw err;
	}
	const { incomeTaxResult, miningTaxResult, resourcesProduced, deposit, output } = result;

	const totalTaxPaid = incomeTaxResult.taxAmount + (miningTaxResult?.taxAmount || 0);
	const taxBreakdown = miningTaxResult
		? `${incomeTaxResult.taxAmount.toLocaleString()} income tax + ${miningTaxResult.taxAmount.toLocaleString()} mining tax`
		: `${incomeTaxResult.taxAmount.toLocaleString()} income tax`;

	await sendNotificationIfEnabled(userId, "notifyShiftComplete", {
		title: "🏭 Shift Complete!",
		body: `You earned ${incomeTaxResult.netAmount.toLocaleString()} from your shift at ${factory.name}.`,
		icon: "/favicon.png",
		badge: "/badge.png",
		data: {
			url: `/factory/${factoryId}`,
			tag: `factory-shift-${factoryId}`
		}
	});

	return {
		success: true,
		earned: incomeTaxResult!.netAmount,
		grossWage: wageToCollect,
		taxPaid: totalTaxPaid,
		resourcesProduced,
		depositRemaining: deposit?.remaining,
		depositCapacity: deposit?.capacity,
		message:
			`Shift complete! Earned ${incomeTaxResult!.netAmount.toLocaleString()} (${taxBreakdown})` +
			(deposit && deposit.capacity === 0
				? ". This region has no deposit of that resource, so the mine produced nothing."
				: deposit && deposit.remaining === 0
					? ". The deposit is exhausted."
					: "") +
			(output?.missing
				? `. No ${output.item} was made: the owner is out of ${output.missing}.`
				: output
					? `. The factory made ${output.quantity} ${output.item}.`
					: "")
	};
}
