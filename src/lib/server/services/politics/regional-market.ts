// src/lib/server/services/politics/regional-market.ts
// A governor trades raw materials on the player market for their region:
// purchases are paid from the regional budget and land in the regional
// stockpile; sales are listings whose units come out of the stockpile and
// whose proceeds go to the budget. Buying runs through the same listing
// steps as any other purchase (services/economy/market-trade.ts).
//
// Every write locks the region's budget or region row and re-checks the
// role, the balance and the stock inside the transaction, so two clicks
// can't spend the same money or the same units twice.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, asc, eq, gt } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { getRegionName } from "#lib/utils/region-name.js";
import { governors, marketListings, regionBudgets, regions } from "#lib/server/schema.js";
import { closeTrade, MarketTradeError, paySeller, takeListingStock } from "../economy/market-trade";
import { debitRegionBudget, isGovernorOf, RegionalBudgetError } from "./regional-budget";
import { addRegionResource, isRegionalResource, regionStockpile, takeRegionResource } from "./regional-stockpile";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const MAX_UNITS = 1_000_000_000;
const isCount = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_UNITS;

export class RegionalMarketError extends Error {}

/** The regions a player governs, for the market's "Trade for" switch. */
export async function governedRegions(db: Db, userId: string): Promise<{ id: number; name: string }[]> {
	const rows = await db
		.select({ id: governors.regionId })
		.from(governors)
		.where(eq(governors.userId, userId))
		.orderBy(governors.regionId);
	return rows.map((r) => ({ id: r.id, name: getRegionName(r.id) }));
}

/** Lock the region's budget row (creating it) so the balance can't move under us. */
async function lockBudget(tx: Tx, regionId: number): Promise<number> {
	await tx.insert(regionBudgets).values({ regionId }).onConflictDoNothing({ target: regionBudgets.regionId });
	const [row] = await tx
		.select({ balance: regionBudgets.balance })
		.from(regionBudgets)
		.where(eq(regionBudgets.regionId, regionId))
		.for("update");
	return row?.balance ?? 0;
}

async function requireGovernor(tx: Tx, userId: string, regionId: number) {
	if (!(await isGovernorOf(tx, userId, regionId))) {
		throw new RegionalMarketError("Only the region's governor can trade for it.");
	}
}

/**
 * The governor buys `quantity` units of a listing for the region. Paid from
 * the regional budget (no market tax, like the state), delivered to the
 * regional stockpile, the seller paid as for any other purchase.
 */
export async function buyListingForRegion(
	db: Database,
	input: { regionId: number; userId: string; listingId: number; quantity: number }
): Promise<{ total: number; balance: number; itemName: string }> {
	if (!isCount(input.quantity)) throw new RegionalMarketError("Choose how many units to buy.");
	return db.transaction(async (tx) => {
		await lockBudget(tx, input.regionId);
		await requireGovernor(tx, input.userId, input.regionId);

		const [listing] = await tx.select().from(marketListings).where(eq(marketListings.id, input.listingId));
		if (!listing) throw new RegionalMarketError("That listing is gone.");
		if (listing.itemType !== "resource" || !isRegionalResource(listing.itemName)) {
			throw new RegionalMarketError("A region only stocks raw materials.");
		}
		if (listing.sellerRegionId === input.regionId) {
			throw new RegionalMarketError("The region can't buy its own listing.");
		}
		// The governor can't pay themselves out of the regional budget.
		if (listing.sellerId === input.userId && !listing.sellerRegionId) {
			throw new RegionalMarketError("The region can't buy your own listing.");
		}
		if (input.quantity > listing.quantity) throw new RegionalMarketError("There aren't that many units on offer.");

		const total = listing.pricePerUnit * input.quantity;
		try {
			const { remaining } = await takeListingStock(tx, listing.id, input.quantity);
			const balance = await debitRegionBudget(tx, input.regionId, total, {
				kind: "market_buy",
				description: `Bought ${input.quantity}x ${listing.itemName} at $${listing.pricePerUnit}/ea`,
				actorId: input.userId
			});
			await paySeller(tx, listing, input.quantity, total, { userId: input.userId, label: "a region" });
			await addRegionResource(tx, input.regionId, listing.itemName, input.quantity);
			await closeTrade(tx, listing, input.quantity, remaining);
			return { total, balance, itemName: listing.itemName };
		} catch (err) {
			if (err instanceof RegionalBudgetError || err instanceof MarketTradeError) {
				throw new RegionalMarketError(err.message);
			}
			throw err;
		}
	});
}

/**
 * The governor lists `quantity` units from the regional stockpile. One
 * listing per region and resource; the units leave the stockpile now and
 * come back if the listing is withdrawn.
 */
export async function listForRegion(
	db: Database,
	input: { regionId: number; userId: string; resource: string; quantity: number; pricePerUnit: number }
): Promise<{ listingId: number }> {
	if (!isRegionalResource(input.resource)) throw new RegionalMarketError("A region only sells raw materials.");
	if (!isCount(input.quantity) || !isCount(input.pricePerUnit)) {
		throw new RegionalMarketError("Enter a quantity and a price per unit.");
	}
	return db.transaction(async (tx) => {
		// The region row is the lock for "one listing per resource".
		await tx.select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).for("update");
		await requireGovernor(tx, input.userId, input.regionId);

		const [existing] = await tx
			.select({ id: marketListings.id })
			.from(marketListings)
			.where(
				and(
					eq(marketListings.sellerRegionId, input.regionId),
					eq(marketListings.itemType, "resource"),
					eq(marketListings.itemName, input.resource)
				)
			)
			.limit(1);
		if (existing) throw new RegionalMarketError("The region already has a listing for this resource.");

		if (!(await takeRegionResource(tx, input.regionId, input.resource, input.quantity))) {
			throw new RegionalMarketError(`The regional stockpile doesn't have ${input.quantity} ${input.resource}.`);
		}
		const [listing] = await tx
			.insert(marketListings)
			.values({
				sellerId: input.userId,
				sellerRegionId: input.regionId,
				itemType: "resource",
				itemName: input.resource,
				quantity: input.quantity,
				pricePerUnit: input.pricePerUnit
			})
			.returning({ id: marketListings.id });
		return { listingId: listing!.id };
	});
}

/**
 * The governor withdraws one of the region's listings; what's left goes back
 * to the regional stockpile. Deleting the row is the claim, so a double
 * click can't return the units twice.
 */
export async function withdrawRegionListing(
	db: Database,
	input: { regionId: number; userId: string; listingId: number }
): Promise<{ itemName: string; quantity: number }> {
	return db.transaction(async (tx) => {
		await requireGovernor(tx, input.userId, input.regionId);
		const [removed] = await tx
			.delete(marketListings)
			.where(and(eq(marketListings.id, input.listingId), eq(marketListings.sellerRegionId, input.regionId)))
			.returning();
		if (!removed) throw new RegionalMarketError("That listing is gone.");
		await addRegionResource(tx, input.regionId, removed.itemName, removed.quantity);
		return { itemName: removed.itemName, quantity: removed.quantity };
	});
}

/**
 * What the market page needs to trade one resource for a region the player
 * governs: the budget, the stock, the region's own listing and the cheapest
 * offer the region may buy (not its own, not the governor's personal one).
 */
export async function regionTradeDesk(db: Db, region: { id: number; name: string }, itemName: string, userId: string) {
	const [[budget], stockpile, listings] = await Promise.all([
		db
			.select({ balance: regionBudgets.balance })
			.from(regionBudgets)
			.where(eq(regionBudgets.regionId, region.id))
			.limit(1),
		regionStockpile(db, region.id),
		db
			.select()
			.from(marketListings)
			.where(
				and(
					eq(marketListings.itemType, "resource"),
					eq(marketListings.itemName, itemName),
					gt(marketListings.quantity, 0)
				)
			)
			.orderBy(asc(marketListings.pricePerUnit), asc(marketListings.id))
	]);
	const own = listings.find((l) => l.sellerRegionId === region.id);
	const best = listings.find((l) => l.sellerRegionId !== region.id && !(l.sellerId === userId && !l.sellerRegionId));
	return {
		regionId: region.id,
		regionName: region.name,
		balance: budget?.balance ?? 0,
		stock: stockpile[itemName] ?? 0,
		listing: own ? { id: own.id, quantity: own.quantity, pricePerUnit: own.pricePerUnit } : null,
		bestOffer: best ? { id: best.id, quantity: best.quantity, pricePerUnit: best.pricePerUnit } : null
	};
}
