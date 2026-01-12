// src/routes/market/[item]/+page.server.ts

import { db } from "$lib/server/db";
import {
	marketListings,
	marketPriceHistory,
	marketStatistics,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	regions,
	stateTaxes
} from "$lib/server/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import { calculateAndCollectTax } from "$lib/server/taxes";
import type { Actions, PageServerLoad } from "./$types";

// Valid resource and product types
const RESOURCES = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
const PRODUCTS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];

export const load: PageServerLoad = async ({ locals, params }) => {
	const account = locals.account!;
	const itemName = params.item;

	// Determine item type
	let itemType: "resource" | "product";
	if (RESOURCES.includes(itemName)) {
		itemType = "resource";
	} else if (PRODUCTS.includes(itemName)) {
		itemType = "product";
	} else {
		throw error(404, "Item not found");
	}

	// Get user's residence for tax calculation
	const [residence] = await db
		.select({
			regionId: residences.regionId,
			stateId: regions.stateId
		})
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, account.id))
		.limit(1);

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	if (!wallet) {
		await db.insert(userWallets).values({
			userId: account.id,
			balance: 10000
		});
	}

	// Get market statistics for this item
	const [statistics] = await db
		.select()
		.from(marketStatistics)
		.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)))
		.limit(1);

	// Get price history (last 30 days)
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

	// Get all active listings for this item
	const listings = await db
		.select()
		.from(marketListings)
		.where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)))
		.orderBy(desc(marketListings.createdAt));

	// Get market transaction tax rate
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

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		itemName,
		itemType,
		statistics,
		priceHistory,
		listings,
		taxRate
	};
};

export const actions: Actions = {
	buyListing: async ({ request, locals, params }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const itemName = params.item;

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));

		if (!listing) {
			return fail(404, { message: "Listing not found" });
		}

		if (listing.sellerId === account.id) {
			return fail(400, { message: "Cannot buy your own listing" });
		}

		if (quantity < 1 || quantity > listing.quantity) {
			return fail(400, { message: "Invalid quantity" });
		}

		const [buyerResidence] = await db
			.select({
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		let taxCalculation = {
			grossAmount,
			taxAmount: 0,
			netAmount: grossAmount,
			applicableTaxes: []
		};

		if (buyerResidence?.stateId) {
			taxCalculation = await calculateAndCollectTax(
				buyerResidence.stateId,
				"market_transaction",
				grossAmount,
				account.id
			);
		}

		const totalCost = taxCalculation.netAmount + taxCalculation.taxAmount;

		const [buyerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!buyerWallet || buyerWallet.balance < totalCost) {
			return fail(400, { message: "Insufficient funds" });
		}

		const [sellerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));

		if (!sellerWallet) {
			return fail(500, { message: "Seller wallet not found" });
		}

		// Update wallets
		await db
			.update(userWallets)
			.set({
				balance: buyerWallet.balance - totalCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		await db
			.update(userWallets)
			.set({
				balance: sellerWallet.balance + taxCalculation.netAmount,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, listing.sellerId));

		// Update inventory
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
					.set({
						quantity: existing.quantity + quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
			} else {
				await db.insert(resourceInventory).values({
					userId: account.id,
					resourceType: listing.itemName as any,
					quantity
				});
			}
		} else if (listing.itemType === "product") {
			const [existing] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));

			if (existing) {
				await db
					.update(productInventory)
					.set({
						quantity: existing.quantity + quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);
			} else {
				await db.insert(productInventory).values({
					userId: account.id,
					productType: listing.itemName as any,
					quantity
				});
			}
		}

		// Record price history
		await db.insert(marketPriceHistory).values({
			itemType: listing.itemType,
			itemName: listing.itemName,
			pricePerUnit: listing.pricePerUnit,
			quantity,
			transactionType: "sale"
		});

		// Update or delete listing
		if (quantity === listing.quantity) {
			await db.delete(marketListings).where(eq(marketListings.id, listingId));
		} else {
			await db
				.update(marketListings)
				.set({
					quantity: listing.quantity - quantity
				})
				.where(eq(marketListings.id, listingId));
		}

		// Update market statistics
		await updateMarketStatistics(listing.itemType, listing.itemName);

		return {
			success: true,
			message: "Purchase successful"
		};
	},

	removeListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));

		if (!listing) {
			return fail(404, { message: "Listing not found" });
		}

		if (listing.sellerId !== account.id) {
			return fail(403, { message: "Not your listing" });
		}

		// Return items to inventory
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
					.set({
						quantity: existing.quantity + listing.quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
			} else {
				await db.insert(resourceInventory).values({
					userId: account.id,
					resourceType: listing.itemName as any,
					quantity: listing.quantity
				});
			}
		} else if (listing.itemType === "product") {
			const [existing] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));

			if (existing) {
				await db
					.update(productInventory)
					.set({
						quantity: existing.quantity + listing.quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);
			} else {
				await db.insert(productInventory).values({
					userId: account.id,
					productType: listing.itemName as any,
					quantity: listing.quantity
				});
			}
		}

		await db.delete(marketListings).where(eq(marketListings.id, listingId));

		// Update market statistics
		await updateMarketStatistics(listing.itemType, listing.itemName);

		return {
			success: true,
			message: "Listing removed successfully"
		};
	}
};

// Helper function to update market statistics
async function updateMarketStatistics(itemType: string, itemName: string) {
	const listings = await db
		.select()
		.from(marketListings)
		.where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)));

	if (listings.length === 0) {
		// Delete statistics if no listings exist
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
		await db.insert(marketStatistics).values({
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