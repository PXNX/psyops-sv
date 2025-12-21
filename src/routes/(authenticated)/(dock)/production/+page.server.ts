// src/routes/production/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	factories,
	factoryWorkers,
	marketListings,
	productInventory,
	productionQueue,
	regionalResources,
	regions,
	resourceInventory,
	stateEnergy,
	userWallets
} from "$lib/server/schema";
import { calculateAndCollectTax } from "$lib/server/taxes";
import { fail } from "@sveltejs/kit";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

// Production recipes
const PRODUCTION_RECIPES = {
	rifles: {
		inputs: { iron: 5, steel: 3, wood: 2 },
		output: 10,
		duration: 60 * 60 // 1 hour in seconds
	},
	ammunition: {
		inputs: { copper: 3, gunpowder: 2 },
		output: 100,
		duration: 30 * 60 // 30 minutes
	},
	artillery: {
		inputs: { steel: 10, iron: 8, gunpowder: 5 },
		output: 2,
		duration: 120 * 60 // 2 hours
	},
	vehicles: {
		inputs: { steel: 15, iron: 10, copper: 5 },
		output: 1,
		duration: 180 * 60 // 3 hours
	},
	explosives: {
		inputs: { gunpowder: 10, steel: 3 },
		output: 20,
		duration: 45 * 60 // 45 minutes
	}
};

// Raw resources that can be mined from regions
const MINABLE_RESOURCES = ["iron", "copper", "coal", "wood"] as const;
type MinableResource = (typeof MINABLE_RESOURCES)[number];

function isMinableResource(resource: string): resource is MinableResource {
	return MINABLE_RESOURCES.includes(resource as any);
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's resources
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));

	// Get user's products
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));

	// Get active production
	const activeProduction = await db
		.select()
		.from(productionQueue)
		.where(eq(productionQueue.userId, account.id))
		.limit(1);

	// Check for completed production
	if (activeProduction.length > 0) {
		const prod = activeProduction[0];
		if (new Date(prod.completesAt) <= new Date()) {
			// Production complete - add to inventory
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

				// Remove from queue
				await tx.delete(productionQueue).where(eq(productionQueue.id, prod.id));
			});

			// Reload after completion
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
				stateEnergy: null
			};
		}
	}

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Get user's current job with region and state info
	const [currentJob] = await db
		.select({
			id: factoryWorkers.id,
			factoryId: factoryWorkers.factoryId,
			jobType: factoryWorkers.jobType,
			lastWorked: factoryWorkers.lastWorked,
			factoryName: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			companyName: companies.name,
			companyLogo: companies.logo,
			wage: factories.workerWage,
			regionId: factories.regionId,
			stateId: regions.stateId
		})
		.from(factoryWorkers)
		.innerJoin(factories, eq(factoryWorkers.factoryId, factories.id))
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.where(eq(factoryWorkers.userId, account.id));

	// Get state energy if user has a job
	let stateEnergyData = null;
	if (currentJob && currentJob.stateId) {
		[stateEnergyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, currentJob.stateId));
	}

	return {
		resources,
		products,
		activeProduction,
		recipes: PRODUCTION_RECIPES,
		wallet: wallet || { balance: 10000 },
		currentJob: currentJob || null,
		stateEnergy: stateEnergyData
	};
};

export const actions: Actions = {
	startProduction: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const productType = data.get("productType") as string;
		const quantityMultiplier = parseInt(data.get("quantity") as string) || 1;

		if (!PRODUCTION_RECIPES[productType as keyof typeof PRODUCTION_RECIPES]) {
			return fail(400, { error: "Invalid product type" });
		}

		const recipe = PRODUCTION_RECIPES[productType as keyof typeof PRODUCTION_RECIPES];

		// Check if already producing
		const existing = await db.select().from(productionQueue).where(eq(productionQueue.userId, account.id));

		if (existing.length > 0) {
			return fail(400, { error: "Already producing something" });
		}

		// Check resources
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

		// Start production
		await db.transaction(async (tx) => {
			// Deduct resources
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

			// Add to production queue
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

	work: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const factoryId = data.get("factoryId") as string;

		// Get factory with region and state info
		const [factory] = await db
			.select({
				id: factories.id,
				ownerId: companies.ownerId,
				factoryType: factories.factoryType,
				resourceOutput: factories.resourceOutput,
				workerWage: factories.workerWage,
				productionRate: factories.productionRate,
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

		if (!factory.stateId) {
			return fail(400, { error: "Factory must be in a valid state" });
		}

		// Check state energy
		if (factory.stateId) {
			const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, factory.stateId));

			if (energy) {
				const availableEnergy = energy.totalProduction - energy.usedProduction;
				if (availableEnergy < 0) {
					return fail(400, {
						error: "Insufficient state energy. This factory cannot operate until the state increases energy production."
					});
				}
			}
		}

		// Check work cooldown
		const [existingJob] = await db.select().from(factoryWorkers).where(eq(factoryWorkers.userId, account.id));

		if (existingJob && existingJob.lastWorked) {
			const timeSinceWork = Date.now() - new Date(existingJob.lastWorked).getTime();
			const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

			if (timeSinceWork < COOLDOWN) {
				const hoursLeft = Math.ceil((COOLDOWN - timeSinceWork) / (60 * 60 * 1000));
				return fail(400, {
					error: `Must wait ${hoursLeft} hours before working again`
				});
			}
		}

		// Check regional resources for mines (only for raw resources)
		if (factory.factoryType === "mine" && factory.resourceOutput && isMinableResource(factory.resourceOutput)) {
			const [resource] = await db
				.select()
				.from(regionalResources)
				.where(
					and(
						eq(regionalResources.regionId, factory.regionId),
						eq(regionalResources.resourceType, factory.resourceOutput)
					)
				);

			if (!resource || resource.remainingReserves <= 0) {
				return fail(400, {
					error: "This mine has exhausted its resource reserves"
				});
			}

			if (resource.remainingReserves < factory.productionRate) {
				return fail(400, {
					error: `Only ${resource.remainingReserves} units of ${factory.resourceOutput} remaining in this region`
				});
			}
		}

		// Execute work
		await db.transaction(async (tx) => {
			// Calculate tax on mining income
			const taxResult = await calculateAndCollectTax(factory.stateId!, "income", factory.workerWage, account.id);

			// Pay worker (after tax)
			const [workerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, account.id));

			if (workerWallet) {
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} + ${taxResult.netAmount}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));
			} else {
				await tx.insert(userWallets).values({
					userId: account.id,
					balance: taxResult.netAmount
				});
			}

			// Give owner resources (if mine)
			if (factory.factoryType === "mine" && factory.resourceOutput) {
				// Only deduct from regional reserves if it's a raw minable resource
				if (isMinableResource(factory.resourceOutput)) {
					await tx
						.update(regionalResources)
						.set({
							remainingReserves: sql`${regionalResources.remainingReserves} - ${factory.productionRate}`
						})
						.where(
							and(
								eq(regionalResources.regionId, factory.regionId),
								eq(regionalResources.resourceType, factory.resourceOutput)
							)
						);
				}

				// Add to owner's inventory
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

			// Update work record
			if (existingJob) {
				await tx
					.update(factoryWorkers)
					.set({
						lastWorked: new Date(),
						factoryId: factoryId
					})
					.where(eq(factoryWorkers.id, existingJob.id));
			} else {
				await tx.insert(factoryWorkers).values({
					userId: account.id,
					factoryId,
					jobType: "miner",
					lastWorked: new Date()
				});
			}
		});

		return {
			success: true,
			earned: factory.workerWage,
			netEarned: taxResult.netAmount,
			taxPaid: taxResult.taxAmount,
			message: `Worked successfully! Earned ${factory.workerWage.toLocaleString()} currency (${taxResult.netAmount.toLocaleString()} after ${taxResult.taxAmount.toLocaleString()} tax).`
		};
	}
};
