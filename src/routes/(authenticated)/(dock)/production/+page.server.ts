// src/routes/production/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	companyBudgets,
	factories,
	factoryWorkers,
	files,
	productInventory,
	productionQueue,
	regions,
	resourceInventory,
	states,
	userWallets
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { calculateShiftStatus, collectWages, startWorkShift } from "$lib/server/service/factoryWork";
import { fail } from "@sveltejs/kit";
import { and, eq, sql, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

// Production recipes
const PRODUCTION_RECIPES = {
	rifles: {
		inputs: { iron: 5, steel: 3, wood: 2 },
		output: 10,
		duration: 60 * 60
	},
	ammunition: {
		inputs: { copper: 3, gunpowder: 2 },
		output: 100,
		duration: 30 * 60
	},
	artillery: {
		inputs: { steel: 10, iron: 8, gunpowder: 5 },
		output: 2,
		duration: 120 * 60
	},
	vehicles: {
		inputs: { steel: 15, iron: 10, copper: 5 },
		output: 1,
		duration: 180 * 60
	},
	explosives: {
		inputs: { gunpowder: 10, steel: 3 },
		output: 20,
		duration: 45 * 60
	}
} as const;

type ProductType = keyof typeof PRODUCTION_RECIPES;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));

	const activeProduction = await db
		.select()
		.from(productionQueue)
		.where(eq(productionQueue.userId, account.id))
		.limit(1);

	// Check if user owns a company
	const [userCompany] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

	if (activeProduction.length > 0) {
		const prod = activeProduction[0];
		if (new Date(prod.completesAt) <= new Date()) {
			await db.transaction(async (tx) => {
				const existing = await tx
					.select()
					.from(productInventory)
					.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, prod.productType)));

				if (existing.length > 0) {
					await tx
						.update(productInventory)
						.set({
							quantity: sql`${productInventory.quantity} + ${prod.quantity}`,
							updatedAt: new Date()
						})
						.where(eq(productInventory.id, existing[0].id));
				} else {
					await tx.insert(productInventory).values({
						userId: account.id,
						productType: prod.productType,
						quantity: prod.quantity
					});
				}

				await tx.delete(productionQueue).where(eq(productionQueue.id, prod.id));
			});

			return {
				resources: await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id)),
				products: await db.select().from(productInventory).where(eq(productInventory.userId, account.id)),
				activeProduction: [],
				recipes: PRODUCTION_RECIPES,
				wallet: await db
					.select()
					.from(userWallets)
					.where(eq(userWallets.userId, account.id))
					.then((r) => r[0] || { balance: 10000 }),
				currentJob: null,
				userCompany: null,
				availableFactories: [],
				companyLogoUrl: null
			};
		}
	}

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	const [currentJob] = await db
		.select({
			id: factoryWorkers.id,
			factoryId: factoryWorkers.factoryId,
			jobType: factoryWorkers.jobType,
			lastWorked: factoryWorkers.lastWorked,
			wageAtShiftStart: factoryWorkers.wageAtShiftStart,
			factoryName: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			companyName: companies.name,
			companyLogo: companies.logo,
			companyId: factories.companyId,
			wage: factories.workerWage,
			regionId: factories.regionId,
			stateId: regions.stateId,
			ownerId: companies.ownerId,
			productionRate: factories.productionRate
		})
		.from(factoryWorkers)
		.innerJoin(factories, eq(factoryWorkers.factoryId, factories.id))
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.where(eq(factoryWorkers.userId, account.id));

	// Calculate shift status if user has a job
	let shiftStatus = null;
	if (currentJob?.lastWorked) {
		shiftStatus = calculateShiftStatus(currentJob.lastWorked);
	}

	// Get company budget if user has a job
	let companyBudget: { balance: number } | null = null;
	if (currentJob) {
		const [budget] = await db.select().from(companyBudgets).where(eq(companyBudgets.companyId, currentJob.companyId));
		companyBudget = budget || null;
	}

	// Get company logo URL if available
	let companyLogoUrl: string | null = null;
	if (currentJob?.companyLogo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, currentJob.companyLogo)
		});
		if (logoFile) {
			companyLogoUrl = await getSignedDownloadUrl(logoFile.key);
		}
	}

	// Get available factories to work at
	const availableFactories = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			workerWage: factories.workerWage,
			maxWorkers: factories.maxWorkers,
			productionRate: factories.productionRate,
			companyName: companies.name,
			companyId: factories.companyId,
			stateName: states.name,
			regionId: factories.regionId
		})
		.from(factories)
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.innerJoin(states, eq(regions.stateId, states.id))
		.limit(20);

	// Get company budgets for all factories
	const companyIds = [...new Set(availableFactories.map((f) => f.companyId))];
	const budgets =
		companyIds.length > 0
			? await db
					.select({
						companyId: companyBudgets.companyId,
						balance: companyBudgets.balance
					})
					.from(companyBudgets)
					.where(inArray(companyBudgets.companyId, companyIds))
			: [];

	const budgetMap = new Map(budgets.map((b) => [b.companyId, b.balance]));

	// Get worker counts for each factory
	const workerCounts = await db
		.select({
			factoryId: factoryWorkers.factoryId,
			count: sql<number>`count(*)::int`
		})
		.from(factoryWorkers)
		.groupBy(factoryWorkers.factoryId);

	const workerCountMap = new Map(workerCounts.map((w) => [w.factoryId, w.count]));

	const factoriesWithCounts = availableFactories.map((f) => ({
		...f,
		currentWorkers: workerCountMap.get(f.id) || 0,
		companyBalance: budgetMap.get(f.companyId) || 0,
		canAffordWage: (budgetMap.get(f.companyId) || 0) >= f.workerWage
	}));

	return {
		resources,
		products,
		activeProduction,
		recipes: PRODUCTION_RECIPES,
		wallet: wallet || { balance: 10000 },
		currentJob: currentJob || null,
		shiftStatus,
		companyBudget,
		userCompany: userCompany || null,
		availableFactories: factoriesWithCounts,
		companyLogoUrl
	};
};

export const actions: Actions = {
	startWork: async ({ locals }) => {
		const account = locals.account!;

		// Get user's current job
		const [job] = await db
			.select({
				id: factoryWorkers.id,
				factoryId: factoryWorkers.factoryId
			})
			.from(factoryWorkers)
			.where(eq(factoryWorkers.userId, account.id));

		if (!job) {
			return fail(400, { error: "You don't have a job" });
		}

		const result = await startWorkShift(account.id, job.factoryId);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		return { success: true, message: result.message };
	},

	startProduction: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const productType = data.get("productType") as string;
		const quantityMultiplier = parseInt(data.get("quantity") as string) || 1;

		if (!productType || !(productType in PRODUCTION_RECIPES)) {
			return fail(400, { error: "Invalid product type" });
		}

		const recipe = PRODUCTION_RECIPES[productType as ProductType];

		const existing = await db.select().from(productionQueue).where(eq(productionQueue.userId, account.id));

		if (existing.length > 0) {
			return fail(400, { error: "Already producing something" });
		}

		const userResources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));
		const resourceMap = new Map(userResources.map((r) => [r.resourceType, r.quantity]));

		for (const [resource, required] of Object.entries(recipe.inputs)) {
			const available = resourceMap.get(resource as any) || 0;
			if (available < required * quantityMultiplier) {
				return fail(400, {
					error: `Insufficient ${resource}: need ${required * quantityMultiplier}, have ${available}`
				});
			}
		}

		await db.transaction(async (tx) => {
			for (const [resource, required] of Object.entries(recipe.inputs)) {
				const [inv] = await tx
					.select()
					.from(resourceInventory)
					.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, resource as any)));

				if (inv) {
					await tx
						.update(resourceInventory)
						.set({
							quantity: sql`${resourceInventory.quantity} - ${required * quantityMultiplier}`,
							updatedAt: new Date()
						})
						.where(eq(resourceInventory.id, inv.id));
				}
			}

			const completesAt = new Date(Date.now() + recipe.duration * 1000 * quantityMultiplier);
			await tx.insert(productionQueue).values({
				userId: account.id,
				productType: productType as any,
				quantity: recipe.output * quantityMultiplier,
				completesAt
			});
		});

		return { success: true };
	},

	collectWage: async ({ locals }) => {
		const account = locals.account!;

		// Get user's current job
		const [job] = await db
			.select({
				factoryId: factoryWorkers.factoryId
			})
			.from(factoryWorkers)
			.where(eq(factoryWorkers.userId, account.id));

		if (!job) {
			return fail(400, { error: "You don't have a job" });
		}

		const result = await collectWages(account.id, job.factoryId);

		if (!result.success) {
			return fail(400, {
				error: result.error,
				companyBankrupt: result.companyBankrupt,
				owedAmount: result.owedAmount,
				companyBalance: result.companyBalance
			});
		}

		return {
			success: true,
			message: result.message,
			earned: result.earned,
			grossWage: result.grossWage,
			taxPaid: result.taxPaid,
			resourcesProduced: result.resourcesProduced
		};
	}
};
