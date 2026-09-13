import { db } from "$lib/server/db";
import {
	marketListings,
	marketPriceHistory,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	regions
} from "$lib/server/schema";
import { eq, and, min, gte, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

const RESOURCES = ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as const;
const PRODUCTS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));

	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));

	const lowestPrices = await db
		.select({
			itemType: marketListings.itemType,
			itemName: marketListings.itemName,
			lowestPrice: min(marketListings.pricePerUnit).as("lowest_price"),
			totalListings: sql<number>`count(*)`.as("total_listings"),
			totalQuantity: sql<number>`sum(${marketListings.quantity})`.as("total_quantity")
		})
		.from(marketListings)
		.groupBy(marketListings.itemType, marketListings.itemName);

	const lowestPriceMap: Record<
		string,
		{ lowestPrice: number; totalListings: number; totalQuantity: number }
	> = {};
	for (const item of lowestPrices) {
		lowestPriceMap[item.itemName] = {
			lowestPrice: Number(item.lowestPrice) || 0,
			totalListings: Number(item.totalListings) || 0,
			totalQuantity: Number(item.totalQuantity) || 0
		};
	}

	// 24h price change per item, for a Trade-Republic-style "▲ 2.3%" next to each price.
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const recentHistory = await db
		.select({
			itemName: marketPriceHistory.itemName,
			pricePerUnit: marketPriceHistory.pricePerUnit,
			recordedAt: marketPriceHistory.recordedAt
		})
		.from(marketPriceHistory)
		.where(gte(marketPriceHistory.recordedAt, oneDayAgo))
		.orderBy(marketPriceHistory.recordedAt);

	const firstLastByItem = new Map<string, { first: number; last: number }>();
	for (const row of recentHistory) {
		const existing = firstLastByItem.get(row.itemName);
		if (!existing) firstLastByItem.set(row.itemName, { first: row.pricePerUnit, last: row.pricePerUnit });
		else existing.last = row.pricePerUnit;
	}

	const priceChanges: Record<string, number> = {};
	for (const [itemName, { first, last }] of firstLastByItem) {
		if (first > 0) priceChanges[itemName] = ((last - first) / first) * 100;
	}

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		resources,
		products,
		lowestPrices: lowestPriceMap,
		priceChanges
	};
};
