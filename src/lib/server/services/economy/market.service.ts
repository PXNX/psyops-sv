// Market service - handles marketplace operations
import type { Database } from "../../db";
import { marketListings, marketTransactions } from "../../schema";
import { eq, and, gt, gte, sql } from "drizzle-orm";

export class MarketService {
	constructor(private db: Database) {}

	async createListing(data: typeof marketListings.$inferInsert) {
		const [listing] = await this.db.insert(marketListings).values(data).returning();
		return listing;
	}

	async getListings(itemType: string, itemName: string) {
		return await this.db
			.select()
			.from(marketListings)
			.where(
				and(
					eq(marketListings.itemType, itemType),
					eq(marketListings.itemName, itemName),
					gt(marketListings.quantity, 0)
				)
			)
			.orderBy(marketListings.pricePerUnit);
	}

	async getUserListings(userId: string) {
		return await this.db.select().from(marketListings).where(eq(marketListings.sellerId, userId));
	}

	async removeListing(listingId: number) {
		await this.db.delete(marketListings).where(eq(marketListings.id, listingId));
	}

	/**
	 * Buy part or all of a listing. Runs in one transaction and takes the
	 * stock with a conditional decrement, so two buyers racing for the last
	 * units can never both succeed (no overselling, no negative stock).
	 */
	async buyListing(listingId: number, buyerId: string, quantity: number) {
		if (!Number.isSafeInteger(quantity) || quantity < 1) {
			throw new Error("Invalid quantity");
		}

		return await this.db.transaction(async (tx) => {
			const [listing] = await tx
				.update(marketListings)
				.set({ quantity: sql`${marketListings.quantity} - ${quantity}` })
				.where(and(eq(marketListings.id, listingId), gte(marketListings.quantity, quantity)))
				.returning();

			if (!listing) {
				const [exists] = await tx
					.select({ id: marketListings.id })
					.from(marketListings)
					.where(eq(marketListings.id, listingId));
				throw new Error(exists ? "Not enough stock left" : "Listing not found");
			}
			if (listing.sellerId === buyerId) {
				throw new Error("Cannot buy your own listing");
			}

			const [transaction] = await tx
				.insert(marketTransactions)
				.values({
					listingId,
					buyerId,
					sellerId: listing.sellerId,
					quantity,
					totalPrice: Number(listing.pricePerUnit) * quantity
				})
				.returning();

			// A sold-out listing stays at quantity 0 instead of being deleted:
			// market_transactions cascades on listing delete, so removing it here
			// would erase the sale we just recorded. getListings hides it.

			return transaction;
		});
	}
}
