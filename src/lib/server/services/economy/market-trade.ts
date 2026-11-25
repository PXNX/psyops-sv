// src/lib/server/services/economy/market-trade.ts
// The steps every purchase from a market listing shares, whoever buys
// (a player, the state or a region) and whoever sells (a player or a
// region): take the units off the listing, pay the seller, record the trade.
// Each runs inside the buyer's transaction.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { marketListings, marketPriceHistory, transactionHistory, userWallets } from "#lib/server/schema.js";
import { creditRegionBudget } from "../politics/regional-budget";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Listing = typeof marketListings.$inferSelect;

/** A trade that can't go through for a reason the buyer should see. */
export class MarketTradeError extends Error {}

/**
 * Take `quantity` units off a listing with a conditional decrement: if
 * another buyer got there first, this matches no row and throws, so a
 * listing is never oversold.
 */
export async function takeListingStock(tx: Tx, listingId: number, quantity: number): Promise<{ remaining: number }> {
	const [taken] = await tx
		.update(marketListings)
		.set({ quantity: sql`${marketListings.quantity} - ${quantity}` })
		.where(and(eq(marketListings.id, listingId), gte(marketListings.quantity, quantity)))
		.returning({ remaining: marketListings.quantity });
	if (!taken) throw new MarketTradeError("Someone else just bought these. Refresh and try again.");
	return taken;
}

/**
 * Pay the seller `amount` for `quantity` units: a region's listing pays into
 * its budget (with a ledger line), a player's into their wallet (with a
 * transaction history line).
 */
export async function paySeller(
	tx: Tx,
	listing: Listing,
	quantity: number,
	amount: number,
	buyer: { userId: string; label?: string }
) {
	const what = `${quantity}x ${listing.itemName} at $${listing.pricePerUnit}/ea`;
	if (listing.sellerRegionId) {
		await creditRegionBudget(tx, listing.sellerRegionId, amount, {
			kind: "market_sale",
			description: `Sold ${what}${buyer.label ? ` to ${buyer.label}` : ""}`,
			actorId: buyer.userId
		});
		return;
	}
	const [wallet] = await tx
		.update(userWallets)
		.set({ balance: sql`${userWallets.balance} + ${amount}`, updatedAt: new Date() })
		.where(eq(userWallets.userId, listing.sellerId))
		.returning({ balance: userWallets.balance });
	if (!wallet) throw new MarketTradeError("Seller wallet not found");
	await tx.insert(transactionHistory).values({
		userId: listing.sellerId,
		transactionType: "market_sale",
		amount,
		balanceAfter: wallet.balance,
		description: `Sold ${what}${buyer.label ? ` to ${buyer.label}` : ""}`,
		relatedUserId: buyer.label ? null : buyer.userId,
		relatedEntityType: "listing",
		relatedEntityId: listing.id
	});
}

/** Write the trade to the price history and drop the listing once it's sold out. */
export async function closeTrade(tx: Tx, listing: Listing, quantity: number, remaining: number) {
	await tx.insert(marketPriceHistory).values({
		itemType: listing.itemType,
		itemName: listing.itemName,
		pricePerUnit: listing.pricePerUnit,
		quantity,
		transactionType: "sale"
	});
	if (remaining === 0) await tx.delete(marketListings).where(eq(marketListings.id, listing.id));
}
