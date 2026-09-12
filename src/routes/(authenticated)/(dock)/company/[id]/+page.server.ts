// src/routes/company/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	accounts,
	companies,
	companyBudgets,
	companyShares,
	shareHoldings,
	shareListings,
	shareTransactions,
	factories,
	factoryWorkers,
	regions,
	states,
	resourceInventory,
	productInventory,
	userWallets,
	transactionHistory
} from "$lib/server/schema";
import { eq, and, desc, count, sum, sql, inArray } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import { ECONOMY_CONFIG } from "$lib/config";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";
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
	//  TODO this is bullshit. Use backblaze instead.
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

	// --- Stock market ---
	const [shares] = await db.select().from(companyShares).where(eq(companyShares.companyId, companyId));

	let myHolding = 0;
	let listings: Array<{
		id: number;
		sellerId: string;
		sellerName: string | null;
		quantity: number;
		pricePerUnit: number;
		isMine: boolean;
	}> = [];
	let topHolders: Array<{ userId: string; name: string | null; quantity: number; percent: number }> = [];
	let floatOutstanding = 0;

	if (shares) {
		const [myHoldingRow] = await db
			.select({ quantity: shareHoldings.quantity })
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, account.id)));
		myHolding = myHoldingRow?.quantity ?? 0;

		const rawListings = await db
			.select()
			.from(shareListings)
			.where(eq(shareListings.companyId, companyId))
			.orderBy(shareListings.pricePerUnit);

		floatOutstanding = rawListings.reduce((sum, l) => sum + l.quantity, 0);

		const holderRows = await db
			.select({ userId: shareHoldings.userId, quantity: shareHoldings.quantity })
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, companyId), sql`${shareHoldings.quantity} > 0`))
			.orderBy(desc(shareHoldings.quantity))
			.limit(10);

		const holderIds = Array.from(new Set([...holderRows.map((h) => h.userId), ...rawListings.map((l) => l.sellerId)]));
		const profiles =
			holderIds.length > 0
				? await db.query.userProfiles.findMany({
						where: (profiles, { inArray }) => inArray(profiles.accountId, holderIds)
					})
				: [];
		const nameByUserId = new Map(profiles.map((p) => [p.accountId, p.name]));

		listings = rawListings.map((l) => ({
			id: l.id,
			sellerId: l.sellerId,
			sellerName: nameByUserId.get(l.sellerId) ?? null,
			quantity: l.quantity,
			pricePerUnit: Number(l.pricePerUnit),
			isMine: l.sellerId === account.id
		}));

		topHolders = holderRows.map((h) => ({
			userId: h.userId,
			name: nameByUserId.get(h.userId) ?? null,
			quantity: h.quantity,
			percent: Math.round((h.quantity / shares.totalShares) * 1000) / 10
		}));
	}

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
		ownerBalance,
		shares: shares
			? {
					totalShares: shares.totalShares,
					founderLockedShares: shares.founderLockedShares,
					ipoPrice: Number(shares.ipoPrice),
					ipoAt: shares.ipoAt.toISOString()
				}
			: null,
		myHolding,
		listings,
		topHolders,
		floatOutstanding,
		ipoConfig: {
			totalShares: ECONOMY_CONFIG.IPO_TOTAL_SHARES,
			founderLockedPercent: ECONOMY_CONFIG.IPO_FOUNDER_LOCKED_PERCENT,
			minPrice: ECONOMY_CONFIG.MIN_SHARE_PRICE
		}
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
	},

	// Take the company public: issue a fixed share count, lock the founder's
	// controlling block, and auto-list the remaining float at the chosen price.
	goPublic: async ({ params, locals, request }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);
		const formData = await request.formData();
		const startingPrice = parseInt(formData.get("startingPrice") as string);

		if (!startingPrice || startingPrice < ECONOMY_CONFIG.MIN_SHARE_PRICE) {
			return fail(400, { error: "Invalid starting share price" });
		}

		const [company] = await db.select({ ownerId: companies.ownerId }).from(companies).where(eq(companies.id, companyId));
		if (!company || company.ownerId !== account.id) {
			return fail(403, { error: "Only the company owner can take it public" });
		}

		const [existing] = await db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
		if (existing) {
			return fail(400, { error: "Company is already public" });
		}

		const totalShares = ECONOMY_CONFIG.IPO_TOTAL_SHARES;
		const founderLockedShares = Math.ceil((totalShares * ECONOMY_CONFIG.IPO_FOUNDER_LOCKED_PERCENT) / 100);
		const floatShares = totalShares - founderLockedShares;

		await db.transaction(async (tx) => {
			await tx.insert(companyShares).values({
				companyId,
				totalShares,
				founderLockedShares,
				ipoPrice: startingPrice
			});

			await tx.insert(shareHoldings).values({
				companyId,
				userId: account.id,
				quantity: founderLockedShares
			});

			if (floatShares > 0) {
				await tx.insert(shareListings).values({
					companyId,
					sellerId: account.id,
					quantity: floatShares,
					pricePerUnit: startingPrice
				});
			}
		});

		return {
			success: true,
			message: `Company is now public: ${totalShares.toLocaleString()} shares issued at $${startingPrice.toLocaleString()}/share`
		};
	},

	// List shares for sale. The founder can never list below their locked block.
	createShareListing: async ({ params, locals, request }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);
		const formData = await request.formData();
		const quantity = parseInt(formData.get("quantity") as string);
		const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

		if (!quantity || quantity < 1 || !pricePerUnit || pricePerUnit < ECONOMY_CONFIG.MIN_SHARE_PRICE) {
			return fail(400, { error: "Invalid listing data" });
		}

		const [company] = await db.select({ ownerId: companies.ownerId }).from(companies).where(eq(companies.id, companyId));
		if (!company) return fail(404, { error: "Company not found" });

		const [shares] = await db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
		if (!shares) return fail(400, { error: "Company is not public" });

		const [holding] = await db
			.select()
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, account.id)));

		if (!holding || holding.quantity < quantity) {
			return fail(400, { error: "You don't own enough shares" });
		}

		if (account.id === company.ownerId && holding.quantity - quantity < shares.founderLockedShares) {
			return fail(400, {
				error: `As the founder you must keep at least ${shares.founderLockedShares.toLocaleString()} locked shares`
			});
		}

		await db.transaction(async (tx) => {
			await tx
				.update(shareHoldings)
				.set({ quantity: holding.quantity - quantity, updatedAt: new Date() })
				.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, account.id)));

			await tx.insert(shareListings).values({ companyId, sellerId: account.id, quantity, pricePerUnit });
		});

		return { success: true, message: "Share listing created" };
	},

	// Cancel one of your own share listings, returning the shares to your holding.
	removeShareListing: async ({ locals, request }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);

		const [listing] = await db.select().from(shareListings).where(eq(shareListings.id, listingId));
		if (!listing) return fail(404, { error: "Listing not found" });
		if (listing.sellerId !== account.id) return fail(403, { error: "Not your listing" });

		await db.transaction(async (tx) => {
			const [holding] = await tx
				.select()
				.from(shareHoldings)
				.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, account.id)));

			if (holding) {
				await tx
					.update(shareHoldings)
					.set({ quantity: holding.quantity + listing.quantity, updatedAt: new Date() })
					.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, account.id)));
			} else {
				await tx.insert(shareHoldings).values({ companyId: listing.companyId, userId: account.id, quantity: listing.quantity });
			}

			await tx.delete(shareListings).where(eq(shareListings.id, listingId));
		});

		return { success: true, message: "Listing removed" };
	},

	// Buy shares from another shareholder's listing.
	buyShareListing: async ({ locals, request }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		const [listing] = await db.select().from(shareListings).where(eq(shareListings.id, listingId));
		if (!listing) return fail(404, { error: "Listing not found" });
		if (listing.sellerId === account.id) return fail(400, { error: "Cannot buy your own listing" });
		if (!quantity || quantity < 1 || quantity > listing.quantity) return fail(400, { error: "Invalid quantity" });

		const totalPrice = Number(listing.pricePerUnit) * quantity;

		const [buyerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
		if (!buyerWallet || Number(buyerWallet.balance) < totalPrice) {
			return fail(400, { error: "Insufficient funds" });
		}

		await db.transaction(async (tx) => {
			const [sellerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));

			const buyerBalanceAfter = Number(buyerWallet.balance) - totalPrice;
			const sellerBalanceAfter = Number(sellerWallet?.balance ?? 0) + totalPrice;

			await tx
				.update(userWallets)
				.set({ balance: buyerBalanceAfter, updatedAt: new Date() })
				.where(eq(userWallets.userId, account.id));

			if (sellerWallet) {
				await tx
					.update(userWallets)
					.set({ balance: sellerBalanceAfter, updatedAt: new Date() })
					.where(eq(userWallets.userId, listing.sellerId));
			}

			const [buyerHolding] = await tx
				.select()
				.from(shareHoldings)
				.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, account.id)));

			if (buyerHolding) {
				await tx
					.update(shareHoldings)
					.set({ quantity: buyerHolding.quantity + quantity, updatedAt: new Date() })
					.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, account.id)));
			} else {
				await tx.insert(shareHoldings).values({ companyId: listing.companyId, userId: account.id, quantity });
			}

			if (quantity === listing.quantity) {
				await tx.delete(shareListings).where(eq(shareListings.id, listingId));
			} else {
				await tx.update(shareListings).set({ quantity: listing.quantity - quantity }).where(eq(shareListings.id, listingId));
			}

			await tx.insert(shareTransactions).values({
				companyId: listing.companyId,
				listingId: listing.id,
				buyerId: account.id,
				sellerId: listing.sellerId,
				quantity,
				totalPrice
			});

			await tx.insert(transactionHistory).values({
				userId: account.id,
				transactionType: "share_purchase",
				amount: -totalPrice,
				balanceAfter: buyerBalanceAfter,
				description: `Bought ${quantity.toLocaleString()} share${quantity > 1 ? "s" : ""} for $${totalPrice.toLocaleString()}`,
				relatedUserId: listing.sellerId,
				relatedEntityType: "company",
				relatedEntityId: listing.companyId
			});

			await tx.insert(transactionHistory).values({
				userId: listing.sellerId,
				transactionType: "share_sale",
				amount: totalPrice,
				balanceAfter: sellerBalanceAfter,
				description: `Sold ${quantity.toLocaleString()} share${quantity > 1 ? "s" : ""} for $${totalPrice.toLocaleString()}`,
				relatedUserId: account.id,
				relatedEntityType: "company",
				relatedEntityId: listing.companyId
			});
		});

		sendNotificationIfEnabled(listing.sellerId, "notifyMarketSales", {
			title: "📈 Shares Sold",
			body: `Someone bought ${quantity.toLocaleString()} of your shares for $${totalPrice.toLocaleString()}.`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: `/company/${listing.companyId}`,
				tag: `share-sale-${listing.id}`
			}
		}).catch((err) => console.error("Failed to send share sale notification:", err));

		return { success: true, message: "Purchase successful" };
	}
};
