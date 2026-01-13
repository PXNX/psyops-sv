// src/routes/factory/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	factories,
	factoryWorkers,
	regions,
	resourceInventory,
	stateEnergy,
	states,
	userWallets
} from "$lib/server/schema";
import { calculateAndCollectTax } from "$lib/server/taxes";
import { error, fail } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const SHIFT_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const factoryId = parseInt(params.id);

	if (isNaN(factoryId)) {
		throw error(404, "Factory not found");
	}

	// Get factory details with relations
	const [factory] = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			maxWorkers: factories.maxWorkers,
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
			createdAt: factories.createdAt,
			companyId: factories.companyId,
			companyName: companies.name,
			companyLogo: companies.logo,
			ownerId: companies.ownerId,
			regionId: factories.regionId,
			stateName: states.name,
			stateId: regions.stateId
		})
		.from(factories)
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.innerJoin(states, eq(regions.stateId, states.id))
		.where(eq(factories.id, factoryId));

	if (!factory) {
		throw error(404, "Factory not found");
	}

	// Get current workers
	const workers = await db
		.select({
			id: factoryWorkers.id,
			userId: factoryWorkers.userId,
			jobType: factoryWorkers.jobType,
			hiredAt: factoryWorkers.hiredAt,
			lastWorked: factoryWorkers.lastWorked
		})
		.from(factoryWorkers)
		.where(eq(factoryWorkers.factoryId, factoryId));

	// Check if current user is working here
	const [currentUserJob] = await db.select().from(factoryWorkers).where(eq(factoryWorkers.userId, account.id));

	// Get state energy
	let stateEnergyData = null;
	if (factory.stateId) {
		[stateEnergyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, factory.stateId));
	}

	// Calculate if user can work (8 hours since last shift)
	let canWork = true;
	let timeUntilNextShift = 0;
	let isCurrentlyWorking = false;
	let shiftProgress = 0;
	let shiftEndsAt: Date | null = null;

	if (currentUserJob?.lastWorked) {
		const lastWorkedTime = new Date(currentUserJob.lastWorked).getTime();
		const now = Date.now();
		const timeSinceLastShift = now - lastWorkedTime;

		if (timeSinceLastShift < SHIFT_DURATION) {
			// Still working current shift
			isCurrentlyWorking = true;
			shiftProgress = (timeSinceLastShift / SHIFT_DURATION) * 100;
			shiftEndsAt = new Date(lastWorkedTime + SHIFT_DURATION);
			canWork = false;
		} else {
			// Shift complete, ready for next one
			canWork = true;
			isCurrentlyWorking = false;
		}
	}

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	return {
		factory,
		workers: workers.length,
		maxWorkers: factory.maxWorkers,
		currentUserJob,
		canWork,
		isCurrentlyWorking,
		shiftProgress,
		shiftEndsAt: shiftEndsAt?.toISOString() || null,
		stateEnergy: stateEnergyData,
		wallet: wallet || { balance: 10000 },
		isOwner: factory.ownerId === account.id
	};
};

export const actions: Actions = {
	startShift: async ({ params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);

		// Get factory details
		const [factory] = await db
			.select({
				id: factories.id,
				ownerId: companies.ownerId,
				factoryType: factories.factoryType,
				resourceOutput: factories.resourceOutput,
				productOutput: factories.productOutput,
				workerWage: factories.workerWage,
				productionRate: factories.productionRate,
				maxWorkers: factories.maxWorkers,
				regionId: factories.regionId,
				stateId: regions.stateId
			})
			.from(factories)
			.innerJoin(companies, eq(factories.companyId, companies.id))
			.innerJoin(regions, eq(factories.regionId, regions.id))
			.where(eq(factories.id, factoryId));

		if (!factory) {
			return fail(404, { error: "Factory not found" });
		}

		// Check state energy
		if (factory.stateId) {
			const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, factory.stateId));
			if (energy) {
				const availableEnergy = energy.totalProduction - energy.usedProduction;
				if (availableEnergy < 0) {
					return fail(400, {
						error: "Insufficient state energy. Factory cannot operate."
					});
				}
			}
		}

		// Check if user already has a job
		const [existingJob] = await db.select().from(factoryWorkers).where(eq(factoryWorkers.userId, account.id));

		if (existingJob) {
			// Check if still on cooldown
			if (existingJob.lastWorked) {
				const timeSinceWork = Date.now() - new Date(existingJob.lastWorked).getTime();
				if (timeSinceWork < SHIFT_DURATION) {
					const hoursLeft = Math.ceil((SHIFT_DURATION - timeSinceWork) / (60 * 60 * 1000));
					return fail(400, {
						error: `Still working current shift. ${hoursLeft} hours remaining.`
					});
				}
			}

			// If different factory, change jobs
			if (existingJob.factoryId !== factoryId) {
				await db
					.update(factoryWorkers)
					.set({
						factoryId,
						lastWorked: new Date()
					})
					.where(eq(factoryWorkers.id, existingJob.id));
			} else {
				// Same factory, just update last worked
				await db.update(factoryWorkers).set({ lastWorked: new Date() }).where(eq(factoryWorkers.id, existingJob.id));
			}
		} else {
			// Check if factory is full
			const currentWorkers = await db.select().from(factoryWorkers).where(eq(factoryWorkers.factoryId, factoryId));

			if (currentWorkers.length >= factory.maxWorkers) {
				return fail(400, { error: "Factory is at maximum capacity" });
			}

			// Create new job
			await db.insert(factoryWorkers).values({
				userId: account.id,
				factoryId,
				jobType: factory.factoryType === "mine" ? "miner" : "general_worker",
				lastWorked: new Date()
			});
		}

		return { success: true, message: "Shift started! Work for 8 hours to receive payment." };
	},

	collectPayment: async ({ params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);

		// Get factory and user's job
		const [factory] = await db
			.select({
				id: factories.id,
				ownerId: companies.ownerId,
				factoryType: factories.factoryType,
				resourceOutput: factories.resourceOutput,
				productOutput: factories.productOutput,
				workerWage: factories.workerWage,
				productionRate: factories.productionRate,
				stateId: regions.stateId
			})
			.from(factories)
			.innerJoin(companies, eq(factories.companyId, companies.id))
			.innerJoin(regions, eq(factories.regionId, regions.id))
			.where(eq(factories.id, factoryId));

		if (!factory) {
			return fail(404, { error: "Factory not found" });
		}

		const [job] = await db
			.select()
			.from(factoryWorkers)
			.where(and(eq(factoryWorkers.userId, account.id), eq(factoryWorkers.factoryId, factoryId)));

		if (!job) {
			return fail(400, { error: "You don't work at this factory" });
		}

		if (!job.lastWorked) {
			return fail(400, { error: "No active shift" });
		}

		// Check if 8 hours have passed
		const timeSinceWork = Date.now() - new Date(job.lastWorked).getTime();
		if (timeSinceWork < SHIFT_DURATION) {
			const hoursLeft = Math.ceil((SHIFT_DURATION - timeSinceWork) / (60 * 60 * 1000));
			return fail(400, { error: `Shift not complete. ${hoursLeft} hours remaining.` });
		}

		let taxAmount = 0;
		let netAmount = Number(factory.workerWage);

		await db.transaction(async (tx) => {
			// Calculate and collect tax
			if (factory.stateId) {
				const taxResult = await calculateAndCollectTax(
					factory.stateId,
					"income",
					Number(factory.workerWage),
					account.id
				);
				taxAmount = taxResult.taxAmount;
				netAmount = taxResult.netAmount;
			}

			// Pay worker
			const [workerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, account.id));

			if (workerWallet) {
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} + ${netAmount}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));
			} else {
				await tx.insert(userWallets).values({
					userId: account.id,
					balance: netAmount
				});
			}

			// Add resources to owner (if mine/refinery)
			if (factory.factoryType === "mine" && factory.resourceOutput) {
				const [ownerInv] = await tx
					.select()
					.from(resourceInventory)
					.where(
						and(
							eq(resourceInventory.userId, factory.ownerId),
							eq(resourceInventory.resourceType, factory.resourceOutput)
						)
					);

				if (ownerInv) {
					await tx
						.update(resourceInventory)
						.set({
							quantity: sql`${resourceInventory.quantity} + ${factory.productionRate}`,
							updatedAt: new Date()
						})
						.where(eq(resourceInventory.id, ownerInv.id));
				} else {
					await tx.insert(resourceInventory).values({
						userId: factory.ownerId,
						resourceType: factory.resourceOutput,
						quantity: factory.productionRate
					});
				}
			}

			// Reset last worked to allow immediate next shift
			await tx.update(factoryWorkers).set({ lastWorked: null }).where(eq(factoryWorkers.id, job.id));
		});

		return {
			success: true,
			earned: Number(factory.workerWage),
			netEarned: netAmount,
			taxPaid: taxAmount,
			message: `Shift complete! Earned ${netAmount.toLocaleString()} (${taxAmount.toLocaleString()} tax)`
		};
	}
};
