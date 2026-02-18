// Market service - handles marketplace operations
import type { Database } from '../../db';
import { marketListings, marketTransactions } from '../../schema';
import { eq, and, gte } from 'drizzle-orm';

export class MarketService {
    constructor(private db: typeof import('../../db').db) { }

    async createListing(data: typeof marketListings.$inferInsert) {
        const [listing] = await this.db.insert(marketListings).values(data).returning();
        return listing;
    }

    async getListings(itemType: string, itemName: string) {
        return await this.db
            .select()
            .from(marketListings)
            .where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)))
            .orderBy(marketListings.pricePerUnit);
    }

    async getUserListings(userId: string) {
        return await this.db.select().from(marketListings).where(eq(marketListings.sellerId, userId));
    }

    async removeListing(listingId: number) {
        await this.db.delete(marketListings).where(eq(marketListings.id, listingId));
    }

    async buyListing(listingId: number, buyerId: string, quantity: number) {
        const listing = await this.db
            .select()
            .from(marketListings)
            .where(eq(marketListings.id, listingId));

        if (!listing[0]) {
            throw new Error('Listing not found');
        }

        const totalPrice = Number(listing[0].pricePerUnit) * quantity;

        // Create transaction
        const [transaction] = await this.db
            .insert(marketTransactions)
            .values({
                listingId,
                buyerId,
                sellerId: listing[0].sellerId,
                quantity,
                totalPrice
            })
            .returning();

        // Update or remove listing
        if (listing[0].quantity <= quantity) {
            await this.removeListing(listingId);
        } else {
            await this.db
                .update(marketListings)
                .set({ quantity: listing[0].quantity - quantity })
                .where(eq(marketListings.id, listingId));
        }

        return transaction;
    }
}
