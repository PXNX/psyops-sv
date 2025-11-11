import { db } from "$lib/server/db";
import {
	companies,
	factories,
	factoryWorkers,
	marketListings,
	productInventory,
	productionQueue,
	resourceInventory,
	userWallets
} from "$lib/server/schema";
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
				resources,
				products: await db.select().from(productInventory).where(eq(productInventory.userId, account.id)),
				activeProduction: [],
				recipes: PRODUCTION_RECIPES,
				wallet: { balance: 0 },
				marketListings: [],
				factories: [],
				currentJob: null,
				marketStats: { totalListings: 0, totalVolume: 0 },
				resourcePrices: []
			};
		}
	}

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Get market listings
	const listings = await db
		.select({
			id: marketListings.id,
			sellerId: marketListings.sellerId,
			itemType: marketListings.itemType,
			itemName: marketListings.itemName,
			quantity: marketListings.quantity,
			pricePerUnit: marketListings.pricePerUnit,
			createdAt: marketListings.createdAt
		})
		.from(marketListings)
		.orderBy(desc(marketListings.createdAt));

	// Get available factories with company info
	const availableFactories = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
			maxWorkers: factories.maxWorkers,
			companyId: companies.id,
			companyName: companies.name,
			companyLogo: companies.logo
		})
		.from(factories)
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.limit(20);

	// Get user's current job
	const [currentJob] = await db
		.select({
			id: factoryWorkers.id,
			factoryId: factoryWorkers.factoryId,
			jobType: factoryWorkers.jobType,
			lastWorked: factoryWorkers.lastWorked,
			factoryName: factories.name,
			companyName: companies.name,
			companyLogo: companies.logo,
			wage: factories.workerWage
		})
		.from(factoryWorkers)
		.innerJoin(factories, eq(factoryWorkers.factoryId, factories.id))
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.where(eq(factoryWorkers.userId, account.id));

	// Get market statistics for charts
	const marketStats = {
		totalListings: listings.length,
		totalVolume: listings.reduce((sum, l) => sum + l.quantity, 0)
	};

	// Calculate average prices per resource/product for charts
	const resourcePrices = listings.reduce(
		(acc, listing) => {
			const key = `${listing.itemType}-${listing.itemName}`;
			if (!acc[key]) {
				acc[key] = {
					name: listing.itemName,
					type: listing.itemType,
					prices: [],
					quantities: []
				};
			}
			acc[key].prices.push(listing.pricePerUnit);
			acc[key].quantities.push(listing.quantity);
			return acc;
		},
		{} as Record<string, any>
	);

	const priceData = Object.values(resourcePrices).map((item: any) => ({
		name: item.name,
		type: item.type,
		avgPrice: Math.floor(item.prices.reduce((a: number, b: number) => a + b, 0) / item.prices.length),
		totalQuantity: item.quantities.reduce((a: number, b: number) => a + b, 0)
	}));

	return {
		resources,
		products,
		activeProduction,
		recipes: PRODUCTION_RECIPES,
		wallet: wallet || { balance: 10000 },
		marketListings: listings,
		factories: availableFactories,
		currentJob,
		marketStats,
		resourcePrices: priceData
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
			const available = resourceMap.get(resource) || 0;
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

	createListing: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const itemType = data.get("itemType") as string;
		const itemName = data.get("itemName") as string;
		const quantity = parseInt(data.get("quantity") as string);
		const pricePerUnit = parseFloat(data.get("pricePerUnit") as string);

		if (!itemType || !itemName || !quantity || !pricePerUnit) {
			return fail(400, { error: "Missing fields" });
		}

		// Check if user has the items
		if (itemType === "resource") {
			const [inv] = await db
				.select()
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));

			if (!inv || inv.quantity < quantity) {
				return fail(400, { error: "Insufficient resources" });
			}

			// Deduct from inventory and create listing
			await db.transaction(async (tx) => {
				await tx
					.update(resourceInventory)
					.set({
						quantity: sql`${resourceInventory.quantity} - ${quantity}`,
						updatedAt: new Date()
					})
					.where(eq(resourceInventory.id, inv.id));

				await tx.insert(marketListings).values({
					sellerId: account.id,
					itemType,
					itemName,
					quantity,
					pricePerUnit: pricePerUnit
				});
			});
		} else {
			const [inv] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));

			if (!inv || inv.quantity < quantity) {
				return fail(400, { error: "Insufficient products" });
			}

			await db.transaction(async (tx) => {
				await tx
					.update(productInventory)
					.set({
						quantity: sql`${productInventory.quantity} - ${quantity}`,
						updatedAt: new Date()
					})
					.where(eq(productInventory.id, inv.id));

				await tx.insert(marketListings).values({
					sellerId: account.id,
					itemType,
					itemName,
					quantity,
					pricePerUnit: pricePerUnit
				});
			});
		}

		return { success: true };
	},

	buyListing: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const listingId = data.get("listingId") as string;
		const quantity = parseInt(data.get("quantity") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));

		if (!listing) {
			return fail(404, { error: "Listing not found" });
		}

		if (listing.sellerId === account.id) {
			return fail(400, { error: "Cannot buy your own listing" });
		}

		if (quantity > listing.quantity) {
			return fail(400, { error: "Not enough quantity available" });
		}

		const totalPrice = listing.pricePerUnit * quantity;

		// Check buyer's balance
		const [buyerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!buyerWallet || buyerWallet.balance < totalPrice) {
			return fail(400, { error: "Insufficient funds" });
		}

		// Execute transaction
		await db.transaction(async (tx) => {
			// Transfer money
			await tx
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${totalPrice}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			const [sellerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));

			if (sellerWallet) {
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} + ${totalPrice}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, listing.sellerId));
			} else {
				await tx.insert(userWallets).values({
					userId: listing.sellerId,
					balance: totalPrice
				});
			}

			// Transfer items
			if (listing.itemType === "resource") {
				const [inv] = await tx
					.select()
					.from(resourceInventory)
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);

				if (inv) {
					await tx
						.update(resourceInventory)
						.set({
							quantity: sql`${resourceInventory.quantity} + ${quantity}`,
							updatedAt: new Date()
						})
						.where(eq(resourceInventory.id, inv.id));
				} else {
					await tx.insert(resourceInventory).values({
						userId: account.id,
						resourceType: listing.itemName as any,
						quantity
					});
				}
			} else {
				const [inv] = await tx
					.select()
					.from(productInventory)
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);

				if (inv) {
					await tx
						.update(productInventory)
						.set({
							quantity: sql`${productInventory.quantity} + ${quantity}`,
							updatedAt: new Date()
						})
						.where(eq(productInventory.id, inv.id));
				} else {
					await tx.insert(productInventory).values({
						userId: account.id,
						productType: listing.itemName as any,
						quantity
					});
				}
			}

			// Update or remove listing
			if (quantity === listing.quantity) {
				await tx.delete(marketListings).where(eq(marketListings.id, listingId));
			} else {
				await tx
					.update(marketListings)
					.set({ quantity: listing.quantity - quantity })
					.where(eq(marketListings.id, listingId));
			}
		});

		return { success: true };
	},

	work: async ({ request, locals }) => {
		const account = locals.account!;

		const data = await request.formData();
		const factoryId = data.get("factoryId") as string;

		const [factory] = await db
			.select({
				id: factories.id,
				ownerId: companies.ownerId,
				factoryType: factories.factoryType,
				resourceOutput: factories.resourceOutput,
				workerWage: factories.workerWage,
				productionRate: factories.productionRate
			})
			.from(factories)
			.innerJoin(companies, eq(factories.companyId, companies.id))
			.where(eq(factories.id, factoryId));

		if (!factory) {
			return fail(404, { error: "Factory not found" });
		}

		// Check if already working
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

		// Pay worker and give owner resources
		await db.transaction(async (tx) => {
			// Pay worker
			const [workerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, account.id));

			if (workerWallet) {
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} + ${factory.workerWage}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));
			} else {
				await tx.insert(userWallets).values({
					userId: account.id,
					balance: factory.workerWage
				});
			}

			// Give owner resources (if mine)
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

		return { success: true, earned: factory.workerWage };
	}
};
