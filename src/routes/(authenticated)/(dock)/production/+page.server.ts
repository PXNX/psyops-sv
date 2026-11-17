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
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const MAX_BATCHES = 100;
class ProductionRefused extends Error {}

type ProductType = ProductionType;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// None of these depend on each other (nor on the production-completion transaction below), so fetch them together
	// Collect finished production first. Deleting the queue row is the claim,
	// so a second tab or the premium job can't credit it again.
	await db.transaction(async (tx) => {
		const [done] = await tx
			.delete(productionQueue)
			.where(and(eq(productionQueue.userId, account.id), lte(productionQueue.completesAt, new Date())))
			.returning();
		if (!done) return;
		const [existing] = await tx
			.select({ id: productInventory.id })
			.from(productInventory)
			.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, done.productType)));
		if (existing) {
			await tx
				.update(productInventory)
				.set({ quantity: sql`${productInventory.quantity} + ${done.quantity}`, updatedAt: new Date() })
				.where(eq(productInventory.id, existing.id));
		} else {
			await tx
				.insert(productInventory)
				.values({ userId: account.id, productType: done.productType, quantity: done.quantity });
		}
	});

	const [
		resources,
		products,
		activeProduction,
		[userCompany],
		[wallet],
		[currentJob],
		availableFactories,
		workerCounts
	] = await Promise.all([
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
		const productType = String(data.get("productType") ?? "");
		const quantityMultiplier = Number(data.get("quantity") ?? 1);

		if (!(productType in PRODUCTION_RECIPES)) {
			return fail(400, { error: "Invalid product type" });
		}
		if (!Number.isInteger(quantityMultiplier) || quantityMultiplier < 1 || quantityMultiplier > MAX_BATCHES) {
			return fail(400, { error: `Produce between 1 and ${MAX_BATCHES} batches.` });
		}

		const recipe = PRODUCTION_RECIPES[productType as ProductType];

		// Inputs are only taken if they're all still there; one queue slot per
		// player (unique user_id), so a second start fails instead of stacking.
		const problem = await db
			.transaction(async (tx) => {
				const [busy] = await tx
					.select({ id: productionQueue.id })
					.from(productionQueue)
					.where(eq(productionQueue.userId, account.id));
				if (busy) throw new ProductionRefused("Already producing something");

				for (const [resource, required] of Object.entries(recipe.inputs)) {
					const needed = required * quantityMultiplier;
					const [taken] = await tx
						.update(resourceInventory)
						.set({ quantity: sql`${resourceInventory.quantity} - ${needed}`, updatedAt: new Date() })
						.where(
							and(
								eq(resourceInventory.userId, account.id),
								eq(resourceInventory.resourceType, resource as never),
								gte(resourceInventory.quantity, needed)
							)
						)
						.returning({ id: resourceInventory.id });
					if (!taken) throw new ProductionRefused(`Not enough ${resource}: need ${needed}.`);
				}

				await tx.insert(productionQueue).values({
					userId: account.id,
					productType: productType as never,
					quantity: recipe.output * quantityMultiplier,
					completesAt: new Date(Date.now() + recipe.duration * 1000 * quantityMultiplier)
				});
				return null;
			})
			.catch((err) => {
				if (err instanceof ProductionRefused) return err.message;
				throw err;
			});
		if (problem) return fail(400, { error: problem });

		return { success: true, message: `Production started: ${recipe.output * quantityMultiplier} ${productType}.` };
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
