// src/routes/company/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	accounts,
	companies,
	companyBudgets,
	factories,
	factoryWorkers,
	regions,
	states,
	resourceInventory,
	productInventory,
	userWallets
} from "$lib/server/schema";
import { eq, count, sum, sql, inArray } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const companyId = parseInt(params.id);

	// Get company details with owner info
	const [company] = await db
		.select({
			id: companies.id,
			name: companies.name,
			logo: companies.logo,
			description: companies.description,
			foundedAt: companies.foundedAt,
			ownerId: companies.ownerId,
			ownerEmail: accounts.email
		})
		.from(companies)
		.innerJoin(accounts, eq(companies.ownerId, accounts.id))
		.where(eq(companies.id, companyId));

	if (!company) {
		throw error(404, "Company not found");
	}

	// Get owner profile name and logo
	const [ownerProfile] = await db.query.userProfiles.findMany({
		where: (profiles, { eq }) => eq(profiles.accountId, company.ownerId),
		with: {
			logoFile: true
		}
	});

	// Check if current user is the owner
	const isOwner = company.ownerId === account.id;

	// Get company budget
	let [budget] = await db.select().from(companyBudgets).where(eq(companyBudgets.companyId, companyId));

	// Create budget if it doesn't exist
	if (!budget) {
		[budget] = await db
			.insert(companyBudgets)
			.values({
				companyId,
				balance: 0,
				totalDeposited: 0,
				totalSpent: 0
			})
			.returning();
	}

	// Get company's factories with detailed info
	const companyFactories = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			maxWorkers: factories.maxWorkers,
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
			regionId: factories.regionId,
			stateId: regions.stateId,
			stateName: states.name
		})
		.from(factories)
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.innerJoin(states, eq(regions.stateId, states.id))
		.where(eq(factories.companyId, companyId));

	// OPTIMIZATION: Get all workers for all factories in ONE query
	const factoryIds = companyFactories.map((f) => f.id);
	const allWorkers =
		factoryIds.length > 0
			? await db
					.select({
						factoryId: factoryWorkers.factoryId,
						userId: factoryWorkers.userId,
						lastWorked: factoryWorkers.lastWorked
					})
					.from(factoryWorkers)
					.where(inArray(factoryWorkers.factoryId, factoryIds))
			: [];

	// Group workers by factory in memory (fast)
	const workersByFactory = allWorkers.reduce(
		(acc, worker) => {
			if (!acc[worker.factoryId]) {
				acc[worker.factoryId] = [];
			}
			acc[worker.factoryId].push(worker);
			return acc;
		},
		{} as Record<number, typeof allWorkers>
	);

	// Calculate pending resources for each factory (all in memory, no DB calls)
	const factoriesWithDetails = companyFactories.map((factory) => {
		const workers = workersByFactory[factory.id] || [];
		const workerCount = workers.length;

		// Get the most recent lastWorked time
		const lastWorked = workers.reduce(
			(latest, w) => {
				if (!w.lastWorked) return latest;
				if (!latest) return w.lastWorked;
				return w.lastWorked > latest ? w.lastWorked : latest;
			},
			null as Date | null
		);

		// Calculate pending resources based on time since last work
		let pendingResources = 0;
		let shiftsCompleted = 0;
		if (lastWorked && workerCount > 0) {
			const hoursSinceWork = Math.floor((Date.now() - lastWorked.getTime()) / (1000 * 60 * 60));
			// Assuming production happens every 8 hours (one shift)
			shiftsCompleted = Math.floor(hoursSinceWork / 8);
			pendingResources = shiftsCompleted * factory.productionRate * workerCount;
		}

		return {
			...factory,
			workerCount,
			lastWorked: lastWorked?.toISOString() || null,
			pendingResources,
			shiftsCompleted
		};
	});

	// Calculate aggregate statistics (all in memory)
	const totalWorkers = factoriesWithDetails.reduce((sum, f) => sum + f.workerCount, 0);
	const totalWageCost = factoriesWithDetails.reduce((sum, f) => sum + Number(f.workerWage) * f.workerCount, 0);
	const totalPendingResources = factoriesWithDetails.reduce((sum, f) => sum + f.pendingResources, 0);

	// Calculate resource production breakdown by type
	const resourceProduction = factoriesWithDetails.reduce(
		(acc, factory) => {
			const output = factory.resourceOutput || factory.productOutput;
			if (output) {
				if (!acc[output]) {
					acc[output] = {
						type: output,
						factoryCount: 0,
						totalWorkers: 0,
						productionRate: 0,
						pendingTotal: 0
					};
				}
				acc[output].factoryCount += 1;
				acc[output].totalWorkers += factory.workerCount;
				acc[output].productionRate += factory.productionRate * factory.workerCount;
				acc[output].pendingTotal += factory.pendingResources;
			}
			return acc;
		},
		{} as Record<string, any>
	);

	// Get unique states and regions
	const uniqueStates = Array.from(
		new Map(
			companyFactories.filter((f) => f.stateId).map((f) => [f.stateId, { id: f.stateId!, name: f.stateName! }])
		).values()
	);

	const uniqueRegions = Array.from(new Map(companyFactories.map((f) => [f.regionId, { id: f.regionId }])).values());

	// Calculate how many shifts can be funded with current budget
	const shiftsAffordable = totalWageCost > 0 ? Math.floor(Number(budget.balance) / totalWageCost) : 0;

	// Get owner's wallet balance (for depositing into budget)
	const [ownerWallet] = await db
		.select({ balance: userWallets.balance })
		.from(userWallets)
		.where(eq(userWallets.userId, company.ownerId));

	const ownerBalance = ownerWallet ? Number(ownerWallet.balance) : 0;

	return {
		company: {
			...company,
			ownerName: ownerProfile?.name || null,
			ownerLogo: ownerProfile?.logoFile?.key ? `/api/files/${ownerProfile.logoFile.key}` : null,
			foundedAt: company.foundedAt.toISOString()
		},
		isOwner,
		factories: factoriesWithDetails,
		totalWorkers,
		totalWageCost,
		totalPendingResources,
		resourceProduction: Object.values(resourceProduction),
		uniqueStates,
		uniqueRegions,
		budget: {
			balance: Number(budget.balance),
			totalDeposited: Number(budget.totalDeposited),
			totalSpent: Number(budget.totalSpent)
		},
		shiftsAffordable,
		ownerBalance
	};
};

export const actions: Actions = {
	// Collect produced resources from all factories
	collectResources: async ({ params, locals }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);

		// Verify ownership
		const [company] = await db
			.select({ ownerId: companies.ownerId })
			.from(companies)
			.where(eq(companies.id, companyId));

		if (!company || company.ownerId !== account.id) {
			return fail(403, { error: "Not authorized to collect resources for this company" });
		}

		// Get all factories
		const companyFactories = await db
			.select({
				id: factories.id,
				resourceOutput: factories.resourceOutput,
				productOutput: factories.productOutput,
				productionRate: factories.productionRate
			})
			.from(factories)
			.where(eq(factories.companyId, companyId));

		if (companyFactories.length === 0) {
			return fail(400, { error: "No factories found" });
		}

		// OPTIMIZATION: Get all workers in one query
		const factoryIds = companyFactories.map((f) => f.id);
		const allWorkers = await db
			.select({
				factoryId: factoryWorkers.factoryId,
				userId: factoryWorkers.userId,
				lastWorked: factoryWorkers.lastWorked
			})
			.from(factoryWorkers)
			.where(inArray(factoryWorkers.factoryId, factoryIds));

		// Group by factory
		const workersByFactory = allWorkers.reduce(
			(acc, worker) => {
				if (!acc[worker.factoryId]) {
					acc[worker.factoryId] = [];
				}
				acc[worker.factoryId].push(worker);
				return acc;
			},
			{} as Record<number, typeof allWorkers>
		);

		let totalCollected = 0;
		const collectionResults: Record<string, number> = {};
		const factoriesToUpdate: number[] = [];

		// Calculate production for each factory
		for (const factory of companyFactories) {
			const workers = workersByFactory[factory.id] || [];
			const workerCount = workers.length;

			if (workerCount === 0) continue;

			const lastWorked = workers.reduce(
				(latest, w) => {
					if (!w.lastWorked) return latest;
					if (!latest) return w.lastWorked;
					return w.lastWorked > latest ? w.lastWorked : latest;
				},
				null as Date | null
			);

			if (!lastWorked) continue;

			// Calculate completed shifts
			const hoursSinceWork = Math.floor((Date.now() - lastWorked.getTime()) / (1000 * 60 * 60));
			const shiftsCompleted = Math.floor(hoursSinceWork / 8);

			if (shiftsCompleted === 0) continue;

			const production = shiftsCompleted * factory.productionRate * workerCount;
			const outputType = factory.resourceOutput || factory.productOutput;

			if (!outputType) continue;

			collectionResults[outputType] = (collectionResults[outputType] || 0) + production;
			totalCollected += production;
			factoriesToUpdate.push(factory.id);

			// Add to owner's inventory (batch these)
			if (factory.resourceOutput) {
				await db
					.insert(resourceInventory)
					.values({
						userId: account.id,
						resourceType: factory.resourceOutput,
						quantity: production
					})
					.onConflictDoUpdate({
						target: [resourceInventory.userId, resourceInventory.resourceType],
						set: {
							quantity: sql`${resourceInventory.quantity} + ${production}`,
							updatedAt: new Date()
						}
					});
			} else if (factory.productOutput) {
				await db
					.insert(productInventory)
					.values({
						userId: account.id,
						productType: factory.productOutput,
						quantity: production
					})
					.onConflictDoUpdate({
						target: [productInventory.userId, productInventory.productType],
						set: {
							quantity: sql`${productInventory.quantity} + ${production}`,
							updatedAt: new Date()
						}
					});
			}
		}

		if (totalCollected === 0) {
			return fail(400, { error: "No resources ready to collect" });
		}

		// OPTIMIZATION: Update all factory workers in one query
		if (factoriesToUpdate.length > 0) {
			await db
				.update(factoryWorkers)
				.set({ lastWorked: new Date() })
				.where(inArray(factoryWorkers.factoryId, factoriesToUpdate));
		}

		return {
			success: true,
			totalCollected,
			results: collectionResults,
			message: `Collected ${totalCollected.toLocaleString()} units of resources`
		};
	},

	// Deposit money from owner's wallet into company budget
	depositBudget: async ({ params, locals, request }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);
		const formData = await request.formData();
		const amount = parseInt(formData.get("amount") as string);

		if (amount < 1) {
			return fail(400, { error: "Deposit amount must be at least 1" });
		}

		// Verify ownership
		const [company] = await db
			.select({ ownerId: companies.ownerId })
			.from(companies)
			.where(eq(companies.id, companyId));

		if (!company || company.ownerId !== account.id) {
			return fail(403, { error: "Not authorized" });
		}

		// Check owner's wallet balance
		const [wallet] = await db
			.select({ balance: userWallets.balance })
			.from(userWallets)
			.where(eq(userWallets.userId, account.id));

		if (!wallet || Number(wallet.balance) < amount) {
			return fail(400, { error: "Insufficient funds in your wallet" });
		}

		// Use a transaction to ensure atomicity
		await db.transaction(async (tx) => {
			// Deduct from owner's wallet
			await tx
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${amount}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Add to company budget
			await tx
				.update(companyBudgets)
				.set({
					balance: sql`${companyBudgets.balance} + ${amount}`,
					totalDeposited: sql`${companyBudgets.totalDeposited} + ${amount}`,
					updatedAt: new Date()
				})
				.where(eq(companyBudgets.companyId, companyId));
		});

		return {
			success: true,
			amount,
			message: `Deposited ${amount.toLocaleString()} to company budget`
		};
	},

	// Fund wages for workers
	fundWages: async ({ params, locals, request }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);
		const formData = await request.formData();
		const shifts = parseInt(formData.get("shifts") as string);

		if (shifts < 1) {
			return fail(400, { error: "Must fund at least 1 shift" });
		}

		// Verify ownership
		const [company] = await db
			.select({ ownerId: companies.ownerId })
			.from(companies)
			.where(eq(companies.id, companyId));

		if (!company || company.ownerId !== account.id) {
			return fail(403, { error: "Not authorized" });
		}

		// Get company budget
		const [budget] = await db.select().from(companyBudgets).where(eq(companyBudgets.companyId, companyId));

		if (!budget) {
			return fail(400, { error: "Company budget not found" });
		}

		// Get company factories
		const companyFactories = await db
			.select({
				id: factories.id,
				workerWage: factories.workerWage
			})
			.from(factories)
			.where(eq(factories.companyId, companyId));

		if (companyFactories.length === 0) {
			return fail(400, { error: "No factories found" });
		}

		// OPTIMIZATION: Get all workers in one query
		const factoryIds = companyFactories.map((f) => f.id);
		const allWorkers = await db
			.select({
				factoryId: factoryWorkers.factoryId,
				userId: factoryWorkers.userId
			})
			.from(factoryWorkers)
			.where(inArray(factoryWorkers.factoryId, factoryIds));

		if (allWorkers.length === 0) {
			return fail(400, { error: "No workers employed" });
		}

		// Group by factory and calculate total cost
		const workersByFactory = allWorkers.reduce(
			(acc, worker) => {
				if (!acc[worker.factoryId]) {
					acc[worker.factoryId] = [];
				}
				acc[worker.factoryId].push(worker);
				return acc;
			},
			{} as Record<number, typeof allWorkers>
		);

		let totalWageCost = 0;
		const factoryWages: { factoryId: number; workers: { userId: string }[]; wage: number }[] = [];

		for (const factory of companyFactories) {
			const workers = workersByFactory[factory.id] || [];
			const workerCount = workers.length;
			const factoryCost = Number(factory.workerWage) * workerCount;
			totalWageCost += factoryCost;

			if (workerCount > 0) {
				factoryWages.push({
					factoryId: factory.id,
					workers,
					wage: Number(factory.workerWage)
				});
			}
		}

		const totalCost = totalWageCost * shifts;

		// Check if budget has enough balance
		if (Number(budget.balance) < totalCost) {
			return fail(400, {
				error: `Insufficient company budget. Need ${totalCost.toLocaleString()}, have ${Number(budget.balance).toLocaleString()}`
			});
		}

		// Use a transaction for atomicity
		await db.transaction(async (tx) => {
			// Deduct from company budget
			await tx
				.update(companyBudgets)
				.set({
					balance: sql`${companyBudgets.balance} - ${totalCost}`,
					totalSpent: sql`${companyBudgets.totalSpent} + ${totalCost}`,
					updatedAt: new Date()
				})
				.where(eq(companyBudgets.companyId, companyId));

			// OPTIMIZATION: Batch pay all workers by calculating total per user
			const totalWagesByUser: Record<string, number> = {};
			for (const { workers, wage } of factoryWages) {
				const totalWage = wage * shifts;
				for (const worker of workers) {
					totalWagesByUser[worker.userId] = (totalWagesByUser[worker.userId] || 0) + totalWage;
				}
			}

			// Pay all users (could be further optimized with a bulk update if your DB supports it)
			const uniqueUserIds = Object.keys(totalWagesByUser);
			for (const userId of uniqueUserIds) {
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} + ${totalWagesByUser[userId]}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, userId));
			}

			// Update last worked time for all factories
			await tx
				.update(factoryWorkers)
				.set({ lastWorked: new Date() })
				.where(inArray(factoryWorkers.factoryId, factoryIds));
		});

		return {
			success: true,
			shifts,
			totalCost,
			message: `Successfully funded ${shifts} shift${shifts > 1 ? "s" : ""} for ${totalCost.toLocaleString()} currency`
		};
	}
};
