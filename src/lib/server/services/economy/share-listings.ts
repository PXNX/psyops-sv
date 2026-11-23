// src/lib/server/services/economy/share-listings.ts
// A filed IPO is public immediately, but its float only reaches the order book
// after the 72-hour listing window. This cron-safe service creates that float
// once, at the price determined when the company filed. Safe to re-run: the
// conditional update claims each row so a second run cannot list it twice.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, isNull, lte } from "drizzle-orm";
import type { Database } from "../../db";
import { companies, companyShares, shareListings } from "../../schema";

export interface ShareListingResult {
	/** IPOs whose listing window had elapsed at `now`. */
	due: number;
	/** IPOs whose float was actually created by this run. */
	listed: number;
	/** Total shares put on the order book. */
	sharesListed: number;
}

/** Create the float for every filed IPO whose 72 hours are up. */
export async function listPendingShares(db: Database, now: Date = new Date()): Promise<ShareListingResult> {
	const due = await db
		.select({
			id: companyShares.id,
			companyId: companyShares.companyId,
			ownerId: companies.ownerId,
			totalShares: companyShares.totalShares,
			founderLockedShares: companyShares.founderLockedShares,
			ipoPrice: companyShares.ipoPrice
		})
		.from(companyShares)
		.innerJoin(companies, eq(companies.id, companyShares.companyId))
		.where(and(isNull(companyShares.listedAt), lte(companyShares.listAt, now)));

	const result: ShareListingResult = { due: due.length, listed: 0, sharesListed: 0 };
	for (const row of due) {
		const floatShares = Math.max(0, row.totalShares - row.founderLockedShares);
		const applied = await db.transaction(async (tx) => {
			// The WHERE guard is the claim: only one runner can flip listedAt.
			const claimed = await tx
				.update(companyShares)
				.set({ listedAt: now })
				.where(and(eq(companyShares.id, row.id), isNull(companyShares.listedAt)))
				.returning({ id: companyShares.id });
			if (!claimed.length) return null;
			if (floatShares > 0) {
				await tx.insert(shareListings).values({
					companyId: row.companyId,
					sellerId: row.ownerId,
					quantity: floatShares,
					pricePerUnit: Number(row.ipoPrice),
					createdAt: now
				});
			}
			return { floatShares };
		});
		if (!applied) continue;
		result.listed++;
		result.sharesListed += applied.floatShares;
	}
	return result;
}
