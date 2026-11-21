// src/lib/server/services/economy/returns.ts
// Return on investment for company shares: dividends received plus the change
// in share price, measured against what the holding cost. A share is quoted at
// the lowest live offer (see dividends.sharePrices), so the gain tracks what
// the position could be sold for today.

import { eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { companies, companyShares, dividendPayouts, shareHoldings, shareTransactions } from "../../schema";
import { sharePrices } from "./dividends";

export interface ShareReturn {
	companyId: number;
	companyName: string;
	shares: number;
	price: number;
	value: number;
	costBasis: number;
	dividends: number;
	gain: number;
	roiPercent: number | null;
}

/** Pure return math, so the numbers can be pinned without a database. */
export function shareReturn({
	shares,
	costBasis,
	dividends,
	price
}: {
	shares: number;
	costBasis: number;
	dividends: number;
	price: number;
}) {
	const value = shares * price;
	const gain = value + dividends - costBasis;
	return {
		value,
		gain,
		roiPercent: costBasis > 0 ? Math.round((gain / costBasis) * 1000) / 10 : null
	};
}

/** One row per company the player holds shares in, newest quote included. */
export async function portfolioReturns(db: Database, userId: string): Promise<ShareReturn[]> {
	const holdings = await db
		.select({
			companyId: shareHoldings.companyId,
			companyName: companies.name,
			shares: shareHoldings.quantity,
			ipoPrice: companyShares.ipoPrice
		})
		.from(shareHoldings)
		.innerJoin(companies, eq(shareHoldings.companyId, companies.id))
		.innerJoin(companyShares, eq(shareHoldings.companyId, companyShares.companyId))
		.where(eq(shareHoldings.userId, userId));
	const companyIds = holdings.map((h) => h.companyId);
	if (!companyIds.length) return [];

	const [purchases, dividends, prices] = await Promise.all([
		db
			.select({
				companyId: shareTransactions.companyId,
				paid: sql<number>`sum(${shareTransactions.totalPrice})`.mapWith(Number),
				shares: sql<number>`sum(${shareTransactions.quantity})`.mapWith(Number)
			})
			.from(shareTransactions)
			.where(eq(shareTransactions.buyerId, userId))
			.groupBy(shareTransactions.companyId),
		db
			.select({
				companyId: dividendPayouts.companyId,
				paid: sql<number>`sum(${dividendPayouts.amount})`.mapWith(Number)
			})
			.from(dividendPayouts)
			.where(eq(dividendPayouts.userId, userId))
			.groupBy(dividendPayouts.companyId),
		sharePrices(db, companyIds)
	]);

	const paidByCompany = new Map(purchases.map((p) => [p.companyId, p]));
	const dividendsByCompany = new Map(dividends.map((d) => [d.companyId, d.paid]));
	const ipoByCompany = new Map(holdings.map((h) => [h.companyId, Number(h.ipoPrice)]));

	return holdings.map((h) => {
		const bought = paidByCompany.get(h.companyId);
		const perShare = bought && bought.shares > 0 ? bought.paid / bought.shares : (ipoByCompany.get(h.companyId) ?? 0);
		const costBasis = Math.round(perShare * h.shares);
		const paidDividends = dividendsByCompany.get(h.companyId) ?? 0;
		const price = prices.get(h.companyId) ?? perShare;
		return {
			companyId: h.companyId,
			companyName: h.companyName,
			shares: h.shares,
			price,
			costBasis,
			dividends: paidDividends,
			...shareReturn({ shares: h.shares, costBasis, dividends: paidDividends, price })
		};
	});
}
