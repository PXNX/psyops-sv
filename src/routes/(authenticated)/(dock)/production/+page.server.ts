// src/routes/production/+page.server.ts
import { db } from "#lib/server/db.js";
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
} from "#lib/server/schema.js";
import { getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { calculateShiftStatus, collectWages, startWorkShift } from "#lib/server/service/factoryWork.js";
import { PRODUCTION_RECIPES, type ProductionType } from "#lib/config/index.js";
import { fail } from "@sveltejs/kit";
import { and, eq, sql, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

type ProductType = ProductionType;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// None of these depend on each other (nor on the production-completion transaction below), so fetch them together
	const [resources, products, activeProduction, [userCompany], [wallet], [currentJob], availableFactories, workerCounts] =
		await Promise.all([
			db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id)),
			db.select().from(productInventory).where(eq(productInventory.userId, account.id)),
			db.select().from(productionQueue).where(eq(productionQueue.userId, account.id)).limit(1),
			// Check if user owns a company
			db.select().from(companies).where(eq(companies.ownerId, account.id)),
			db.select().from(userWallets).where(eq(userWallets.userId, account.id)),
			db
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
				.where(eq(factoryWorkers.userId, account.id)),
			// Get available factories to work at
			db
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
				.limit(20),
			// Get worker counts for each factory
			db
				.select({
					factoryId: factoryWorkers.factoryId,
					count: sql<number>`count(*)::int`
				})
				.from(factoryWorkers)
				.groupBy(factoryWorkers.factoryId)
		]);

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

			const [freshResources, freshProducts, freshWallet] = await Promise.all([
				db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id)),
				db.select().from(productInventory).where(eq(productInventory.userId, account.id)),
				db
					.select()
					.from(userWallets)
					.where(eq(userWallets.userId, account.id))
					.then((r) => r[0] || { balance: 10000 })
			]);

			return {
				resources: freshResources,
				products: freshProducts,
				activeProduction: [],
				recipes: PRODUCTION_RECIPES,
				wallet: freshWallet,
				currentJob: null,
				userCompany: null,
				availableFactories: [],
				companyLogoUrl: null
			};
		}
	}

	// Calculate shift status if user has a job
	let shiftStatus = null;
	if (currentJob?.lastWorked) {
		shiftStatus = calculateShiftStatus(currentJob.lastWorked);
	}

	// Get company budgets for all factories
	const companyIds = [...new Set(availableFactories.map((f) => f.companyId))];

	// These depend only on the first batch, not on each other
	const [companyBudget, companyLogoUrl, budgets] = await Promise.all([
		// Get company budget if user has a job
		currentJob
			? db
					.select()
					.from(companyBudgets)
					.where(eq(companyBudgets.companyId, currentJob.companyId))
					.then(([budget]): { balance: number } | null => budget || null)
			: null,
		// Get company logo URL if available
		(async (): Promise<string | null> => {
			if (!currentJob?.companyLogo) return null;
			const logoFile = await db.query.files.findFirst({
				where: eq(files.id, currentJob.companyLogo)
			});
			return logoFile ? await getSignedDownloadUrl(logoFile.key) : null;
		})(),
		companyIds.length > 0
			? db
					.select({
						companyId: companyBudgets.companyId,
						balance: companyBudgets.balance
					})
					.from(companyBudgets)
					.where(inArray(companyBudgets.companyId, companyIds))
			: []
	]);

	const budgetMap = new Map(budgets.map((b) => [b.companyId, b.balance]));

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
