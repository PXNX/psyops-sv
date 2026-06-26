// src/routes/market/[item]/+page.server.ts

import { db } from "$lib/server/db";
import {
	marketListings,
	marketPriceHistory,
	marketStatistics,
	resourceInventory,
	productInventory,
	stateResourceInventory,
	stateProductInventory,
	stateTreasury,
	governmentBudgetTransactions,
	userWallets,
	residences,
	regions,
	stateTaxes,
	marketListingCooldowns,
	presidents,
	ministers,
	states
} from "$lib/server/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import { calculateAndCollectTax } from "$lib/server/taxes";
import type { Actions, PageServerLoad } from "./$types";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";

const RESOURCES = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
const PRODUCTS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];

export const load: PageServerLoad = async ({ locals, params }) => {
	const account = locals.account!;
	const itemName = params.item;

	let itemType: "resource" | "product";
	if (RESOURCES.includes(itemName)) itemType = "resource";
	else if (PRODUCTS.includes(itemName)) itemType = "product";
	else throw error(404, "Item not found");

	const [residence] = await db
		.select({ regionId: residences.regionId, stateId: regions.stateId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, account.id))
		.limit(1);

	let [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
	if (!wallet) {
		await db.insert(userWallets).values({ userId: account.id, balance: 10000 });
		[wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
	}

	// User's inventory for this item
	let userItemQuantity = 0;
	if (itemType === "resource") {
		const [inv] = await db
			.select()
			.from(resourceInventory)
			.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));
		userItemQuantity = inv?.quantity ?? 0;
	} else {
		const [inv] = await db
			.select()
			.from(productInventory)
			.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
		userItemQuantity = inv?.quantity ?? 0;
	}

	const [statistics] = await db
		.select()
		.from(marketStatistics)
		.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)))
		.limit(1);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const priceHistory = await db
		.select()
		.from(marketPriceHistory)
		.where(
			and(
				eq(marketPriceHistory.itemType, itemType),
				eq(marketPriceHistory.itemName, itemName),
				gte(marketPriceHistory.recordedAt, thirtyDaysAgo)
			)
		)
		.orderBy(marketPriceHistory.recordedAt);

	// All listings ordered by price, then split
	const allListings = await db
		.select()
		.from(marketListings)
		.where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)))
		.orderBy(marketListings.pricePerUnit);

	const myListing = allListings.find((l) => l.sellerId === account.id) ?? null;
	const otherListings = allListings.filter((l) => l.sellerId !== account.id);

	let taxRate = 0;
	if (residence?.stateId) {
		const [stateTax] = await db
			.select({ taxRate: stateTaxes.taxRate })
			.from(stateTaxes)
			.where(
				and(
					eq(stateTaxes.stateId, residence.stateId),
					eq(stateTaxes.taxType, "market_transaction"),
					eq(stateTaxes.isActive, true)
				)
			)
			.limit(1);
		taxRate = stateTax?.taxRate || 0;
	}

	const [cooldown] = await db
		.select()
		.from(marketListingCooldowns)
		.where(eq(marketListingCooldowns.userId, account.id));

	let cooldownRemaining = 0;
	if (cooldown) {
		const hourInMs = 60 * 60 * 1000;
		const timeSinceRemoval = Date.now() - new Date(cooldown.lastRemovedAt).getTime();
		cooldownRemaining = Math.max(0, hourInMs - timeSinceRemoval);
	}

	// Check if user is president or minister of economy of any state
	const [presidency] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, account.id))
		.limit(1);

	const [economyMinistry] = await db
		.select({ stateId: ministers.stateId })
		.from(ministers)
		.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "economy")))
		.limit(1);

	let governmentState: { id: number; name: string; treasuryBalance: number } | null = null;
	const govStateId = presidency?.stateId ?? economyMinistry?.stateId ?? null;
	if (govStateId) {
		const [state] = await db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, govStateId)).limit(1);
		const [treasury] = await db.select({ balance: stateTreasury.balance }).from(stateTreasury).where(eq(stateTreasury.stateId, govStateId)).limit(1);
		if (state) {
			governmentState = {
				id: state.id,
				name: state.name,
				treasuryBalance: Number(treasury?.balance ?? 0)
			};
		}
	}

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		itemName,
		itemType,
		statistics,
		priceHistory,
		myListing,
		otherListings,
		taxRate,
		userItemQuantity,
		cooldownRemaining,
		governmentState
	};
};

export const actions: Actions = {
	createListing: async ({ request, locals, params }) => {
		const account = locals.account!;
		const itemName = params.item;

		let itemType: "resource" | "product";
		if (RESOURCES.includes(itemName)) itemType = "resource";
		else if (PRODUCTS.includes(itemName)) itemType = "product";
		else return fail(400, { message: "Invalid item" });

		// Enforce one listing per user per item
		const [existingListing] = await db
			.select()
			.from(marketListings)
			.where(
				and(
					eq(marketListings.sellerId, account.id),
					eq(marketListings.itemType, itemType),
					eq(marketListings.itemName, itemName)
				)
			);

		if (existingListing) {
			return fail(400, { message: "You already have an active listing for this item." });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(marketListingCooldowns)
			.where(eq(marketListingCooldowns.userId, account.id));

		if (cooldown) {
			const hourInMs = 60 * 60 * 1000;
			const timeSinceRemoval = Date.now() - new Date(cooldown.lastRemovedAt).getTime();
			if (timeSinceRemoval < hourInMs) {
				const remainingMinutes = Math.ceil((hourInMs - timeSinceRemoval) / 60000);
				return fail(429, {
					message: `Wait ${remainingMinutes} more minutes before creating a new listing`,
					cooldownRemaining: hourInMs - timeSinceRemoval
				});
			}
		}

		const formData = await request.formData();
		const quantity = parseInt(formData.get("quantity") as string);
		const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

		if (!quantity || quantity < 1 || !pricePerUnit || pricePerUnit < 1) {
			return fail(400, { message: "Invalid listing data" });
		}

		if (itemType === "resource") {
			const [resource] = await db
				.select()
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));

			if (!resource || resource.quantity < quantity) return fail(400, { message: "Insufficient resources" });

			await db
				.update(resourceInventory)
				.set({ quantity: resource.quantity - quantity, updatedAt: new Date() })
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));
		} else {
			const [product] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));

			if (!product || product.quantity < quantity) return fail(400, { message: "Insufficient products" });

			await db
				.update(productInventory)
				.set({ quantity: product.quantity - quantity, updatedAt: new Date() })
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
		}

		await db.insert(marketListings).values({ sellerId: account.id, itemType, itemName, quantity, pricePerUnit });
		await updateMarketStatistics(itemType, itemName);
		return { success: true, message: "Listing created" };
	},

	updateListing: async ({ request, locals, params }) => {
		const account = locals.account!;
		const itemName = params.item;

		let itemType: "resource" | "product";
		if (RESOURCES.includes(itemName)) itemType = "resource";
		else if (PRODUCTS.includes(itemName)) itemType = "product";
		else return fail(400, { message: "Invalid item" });

		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);
		const newQuantity = parseInt(formData.get("quantity") as string);
		const newPrice = parseInt(formData.get("pricePerUnit") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing || listing.sellerId !== account.id) return fail(403, { message: "Not your listing" });
		if (!newQuantity || newQuantity < 1 || !newPrice || newPrice < 1) return fail(400, { message: "Invalid data" });

		const quantityDiff = newQuantity - listing.quantity;

		if (quantityDiff !== 0) {
			if (itemType === "resource") {
				const [inv] = await db
					.select()
					.from(resourceInventory)
					.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));

				if (quantityDiff > 0 && (!inv || inv.quantity < quantityDiff)) {
					return fail(400, { message: "Insufficient items in inventory" });
				}

				const newInvQty = (inv?.quantity ?? 0) - quantityDiff;
				if (inv) {
					await db
						.update(resourceInventory)
						.set({ quantity: newInvQty, updatedAt: new Date() })
						.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));
				} else {
					await db
						.insert(resourceInventory)
						.values({ userId: account.id, resourceType: itemName as any, quantity: newInvQty });
				}
			} else {
				const [inv] = await db
					.select()
					.from(productInventory)
					.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));

				if (quantityDiff > 0 && (!inv || inv.quantity < quantityDiff)) {
					return fail(400, { message: "Insufficient items in inventory" });
				}

				const newInvQty = (inv?.quantity ?? 0) - quantityDiff;
				if (inv) {
					await db
						.update(productInventory)
						.set({ quantity: newInvQty, updatedAt: new Date() })
						.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
				} else {
					await db
						.insert(productInventory)
						.values({ userId: account.id, productType: itemName as any, quantity: newInvQty });
				}
			}
		}

		await db
			.update(marketListings)
			.set({ quantity: newQuantity, pricePerUnit: newPrice })
			.where(eq(marketListings.id, listingId));

		await updateMarketStatistics(itemType, itemName);
		return { success: true, message: "Listing updated" };
	},

	buyListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing) return fail(404, { message: "Listing not found" });
		if (listing.sellerId === account.id) return fail(400, { message: "Cannot buy your own listing" });
		if (quantity < 1 || quantity > listing.quantity) return fail(400, { message: "Invalid quantity" });

		const [buyerResidence] = await db
			.select({ stateId: regions.stateId })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		const result = await db.transaction(async (tx) => {
			let taxCalculation = { grossAmount, taxAmount: 0, netAmount: grossAmount, applicableTaxes: [] as any[] };

			if (buyerResidence?.stateId) {
				taxCalculation = await calculateAndCollectTax(
					buyerResidence.stateId,
					"market_transaction",
					grossAmount,
					account.id,
					tx
				);
			}

			const totalCost = taxCalculation.netAmount + taxCalculation.taxAmount;
			const [buyerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, account.id));

			if (!buyerWallet || buyerWallet.balance < totalCost) {
				throw new Error("Insufficient funds");
			}

			const [sellerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));
			if (!sellerWallet) {
				throw new Error("Seller wallet not found");
			}

			await tx
				.update(userWallets)
				.set({ balance: buyerWallet.balance - totalCost, updatedAt: new Date() })
				.where(eq(userWallets.userId, account.id));
			await tx
				.update(userWallets)
				.set({ balance: sellerWallet.balance + taxCalculation.netAmount, updatedAt: new Date() })
				.where(eq(userWallets.userId, listing.sellerId));

			if (listing.itemType === "resource") {
				const [existing] = await tx
					.select()
					.from(resourceInventory)
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
				if (existing) {
					await tx
						.update(resourceInventory)
						.set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
						.where(
							and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
						);
				} else {
					await tx
						.insert(resourceInventory)
						.values({ userId: account.id, resourceType: listing.itemName as any, quantity });
				}
			} else {
				const [existing] = await tx
					.select()
					.from(productInventory)
					.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));
				if (existing) {
					await tx
						.update(productInventory)
						.set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
						.where(
							and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
						);
				} else {
					await tx
						.insert(productInventory)
						.values({ userId: account.id, productType: listing.itemName as any, quantity });
				}
			}

			await tx
				.insert(marketPriceHistory)
				.values({
					itemType: listing.itemType,
					itemName: listing.itemName,
					pricePerUnit: listing.pricePerUnit,
					quantity,
					transactionType: "sale"
				});

			if (quantity === listing.quantity) {
				await tx.delete(marketListings).where(eq(marketListings.id, listingId));
			} else {
				await tx
					.update(marketListings)
					.set({ quantity: listing.quantity - quantity })
					.where(eq(marketListings.id, listingId));
			}

			return { taxAmount: taxCalculation.taxAmount };
		});

		await updateMarketStatistics(listing.itemType, listing.itemName);

		sendNotificationIfEnabled(listing.sellerId, "notifyMarketSales", {
			title: "💰 Market Sale",
			body: `Someone purchased ${quantity}x ${listing.itemName} from your listing for $${(listing.pricePerUnit * quantity).toLocaleString()}.`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: `/market/${listing.itemName}`,
				tag: `market-sale-${listing.id}`
			}
		}).catch((err) => console.error("Failed to send market sale notification:", err));

		return { success: true, message: "Purchase successful", taxPaid: result.taxAmount };
		},

		buyListingAsState: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		// Verify the user is president or minister of economy
		const [presidency] = await db
			.select({ stateId: presidents.stateId })
			.from(presidents)
			.where(eq(presidents.userId, account.id))
			.limit(1);

		const [economyMinistry] = await db
			.select({ stateId: ministers.stateId })
			.from(ministers)
			.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "economy")))
			.limit(1);

		const stateId = presidency?.stateId ?? economyMinistry?.stateId ?? null;
		if (!stateId) return fail(403, { message: "Only the president or minister of economy can buy for the state" });

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing) return fail(404, { message: "Listing not found" });
		if (quantity < 1 || quantity > listing.quantity) return fail(400, { message: "Invalid quantity" });

		const totalCost = listing.pricePerUnit * quantity;

		// Check treasury balance
		const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);
		if (!treasury || Number(treasury.balance) < totalCost) {
			return fail(400, { message: "Insufficient treasury funds" });
		}

		// Deduct from treasury
		const newBalance = Number(treasury.balance) - totalCost;
		await db
			.update(stateTreasury)
			.set({
				balance: newBalance,
				totalSpent: sql`${stateTreasury.totalSpent} + ${totalCost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		// Pay seller
		const [sellerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));
		if (sellerWallet) {
			await db
				.update(userWallets)
				.set({ balance: sellerWallet.balance + totalCost, updatedAt: new Date() })
				.where(eq(userWallets.userId, listing.sellerId));
		}

		// Add to state inventory
		if (listing.itemType === "resource") {
			const [existing] = await db
				.select()
				.from(stateResourceInventory)
				.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, listing.itemName as any)));
			if (existing) {
				await db
					.update(stateResourceInventory)
					.set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
					.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, listing.itemName as any)));
			} else {
				await db.insert(stateResourceInventory).values({ stateId, resourceType: listing.itemName as any, quantity });
			}
		} else {
			const [existing] = await db
				.select()
				.from(stateProductInventory)
				.where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, listing.itemName as any)));
			if (existing) {
				await db
					.update(stateProductInventory)
					.set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
					.where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, listing.itemName as any)));
			} else {
				await db.insert(stateProductInventory).values({ stateId, productType: listing.itemName as any, quantity });
			}
		}

		// Record transaction
		await db.insert(governmentBudgetTransactions).values({
			stateId,
			transactionType: "resource_purchase",
			amount: -totalCost,
			balanceAfter: newBalance,
			description: `Purchased ${quantity}x ${listing.itemName} from market`,
			authorizedBy: account.id,
			itemType: listing.itemType,
			itemName: listing.itemName,
			quantity,
			pricePerUnit: listing.pricePerUnit
		});

		// Record price history
		await db.insert(marketPriceHistory).values({
			itemType: listing.itemType,
			itemName: listing.itemName,
			pricePerUnit: listing.pricePerUnit,
			quantity,
			transactionType: "sale"
		});

		// Update or remove listing
		if (quantity === listing.quantity) {
			await db.delete(marketListings).where(eq(marketListings.id, listingId));
		} else {
			await db
				.update(marketListings)
				.set({ quantity: listing.quantity - quantity })
				.where(eq(marketListings.id, listingId));
		}

		await updateMarketStatistics(listing.itemType, listing.itemName);
		return { success: true, message: `State purchased ${quantity}x ${listing.itemName} for $${totalCost.toLocaleString()}` };
	},

	removeListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing) return fail(404, { message: "Listing not found" });
		if (listing.sellerId !== account.id) return fail(403, { message: "Not your listing" });

		if (listing.itemType === "resource") {
			const [existing] = await db
				.select()
				.from(resourceInventory)
				.where(
					and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
				);
			if (existing) {
				await db
					.update(resourceInventory)
					.set({ quantity: existing.quantity + listing.quantity, updatedAt: new Date() })
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
			} else {
				await db
					.insert(resourceInventory)
					.values({ userId: account.id, resourceType: listing.itemName as any, quantity: listing.quantity });
			}
		} else {
			const [existing] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));
			if (existing) {
				await db
					.update(productInventory)
					.set({ quantity: existing.quantity + listing.quantity, updatedAt: new Date() })
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);
			} else {
				await db
					.insert(productInventory)
					.values({ userId: account.id, productType: listing.itemName as any, quantity: listing.quantity });
			}
		}

		await db.delete(marketListings).where(eq(marketListings.id, listingId));

		const [existingCooldown] = await db
			.select()
			.from(marketListingCooldowns)
			.where(eq(marketListingCooldowns.userId, account.id));
		if (existingCooldown) {
			await db
				.update(marketListingCooldowns)
				.set({ lastRemovedAt: new Date() })
				.where(eq(marketListingCooldowns.userId, account.id));
		} else {
			await db.insert(marketListingCooldowns).values({ userId: account.id, lastRemovedAt: new Date() });
		}

		await updateMarketStatistics(listing.itemType, listing.itemName);
		return { success: true, message: "Listing removed. Wait 1 hour before creating a new listing." };
	}
};

async function updateMarketStatistics(itemType: string, itemName: string) {
	const listings = await db
		.select()
		.from(marketListings)
		.where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)));

	if (listings.length === 0) {
		await db
			.delete(marketStatistics)
			.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));
		return;
	}

	const prices = listings.map((l) => l.pricePerUnit);
	const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length);
	const lowestPrice = Math.min(...prices);
	const highestPrice = Math.max(...prices);
	const totalVolume = listings.reduce((sum, l) => sum + l.quantity, 0);

	const [existing] = await db
		.select()
		.from(marketStatistics)
		.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));

	if (existing) {
		await db
			.update(marketStatistics)
			.set({
				currentAvgPrice: avgPrice,
				lowestPrice,
				highestPrice,
				totalVolume,
				activeListings: listings.length,
				lastUpdated: new Date()
			})
			.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));
	} else {
		await db
			.insert(marketStatistics)
			.values({
				itemType,
				itemName,
				currentAvgPrice: avgPrice,
				lowestPrice,
				highestPrice,
				totalVolume,
				activeListings: listings.length
			});
	}
}
