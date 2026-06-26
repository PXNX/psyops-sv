import { db } from "$lib/server/db";
import {
	marketListings,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	regions
} from "$lib/server/schema";
import { eq, and, min, sql } from "drizzle-orm";
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

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		resources,
		products,
		lowestPrices: lowestPriceMap
	};
};
