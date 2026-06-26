// src/lib/server/service/factoryWork.ts
import { db } from "$lib/server/db";
import { companies, companyBudgets, factories, factoryWorkers, regions, resourceInventory, userWallets, transactionHistory } from "$lib/server/schema";
import { calculateAndCollectTax } from "$lib/server/taxes";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";
import { and, eq, sql } from "drizzle-orm";

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
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
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

	let incomeTaxResult: Awaited<ReturnType<typeof calculateAndCollectTax>>;
	let miningTaxResult: Awaited<ReturnType<typeof calculateAndCollectTax>> | null = null;
	let resourcesProduced = 0;

	await db.transaction(async (tx) => {
		// Calculate income tax (inside transaction for atomicity)
		incomeTaxResult = await calculateAndCollectTax(factory.stateId, "income", wageToCollect, userId, tx);

		// Calculate mining tax if applicable
		let netResourceQuantity = 0;
		if (factory.factoryType === "mine" && factory.resourceOutput) {
			const estimatedResourceValue = factory.productionRate * 100;
			miningTaxResult = await calculateAndCollectTax(
				factory.stateId,
				"mining",
				estimatedResourceValue,
				factory.ownerId,
				tx
			);
			const taxPercentage = miningTaxResult.taxAmount / estimatedResourceValue;
			netResourceQuantity = Math.floor(factory.productionRate * (1 - taxPercentage));
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
		if (factory.factoryType === "mine" && factory.resourceOutput) {
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

		// Reset shift data to allow immediate next shift
		await tx
			.update(factoryWorkers)
			.set({
				lastWorked: null,
				wageAtShiftStart: null
			})
			.where(eq(factoryWorkers.id, job.id));

		// Record transaction for worker
		const [currentWallet] = await tx.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, userId));
		await tx.insert(transactionHistory).values({
			userId,
			transactionType: "factory_wage",
			amount: incomeTaxResult.netAmount,
			balanceAfter: currentWallet?.balance || 0,
			description: `Received wage for shift at ${factory.name}`,
			relatedEntityType: "factory",
			relatedEntityId: factoryId
			});
			});

	const totalTaxPaid = incomeTaxResult!.taxAmount + (miningTaxResult?.taxAmount || 0);
	const taxBreakdown = miningTaxResult
		? `${incomeTaxResult!.taxAmount.toLocaleString()} income tax + ${miningTaxResult.taxAmount.toLocaleString()} mining tax`
		: `${incomeTaxResult!.taxAmount.toLocaleString()} income tax`;

	await sendNotificationIfEnabled(userId, "notifyShiftComplete", {
		title: "🏭 Shift Complete!",
		body: `You earned ${incomeTaxResult!.netAmount.toLocaleString()} from your shift at ${factory.name}.`,
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
		message: `Shift complete! Earned ${incomeTaxResult!.netAmount.toLocaleString()} (${taxBreakdown})`
	};
}
