// src/lib/config/game/stocks.config.ts
// Stock-market rules for public companies. The IPO price is not chosen freely:
// it is the company's book value per share, derived from the cash in its budget
// and the factories it owns. A company is public the moment it files, but its
// shares only reach the order book after a 72-hour listing window, giving the
// market time to open. Pure data and pure functions only (client and server).
import { ECONOMY_CONFIG } from "./economy.config";

export const STOCKS = {
	/** Hours between filing for an IPO and the float appearing on the market. */
	LISTING_HOURS: 72,
	/** Book value credited for each factory when pricing an IPO. */
	FACTORY_BOOK_VALUE: 100_000
} as const;

/**
 * Determined IPO price per share: company cash plus the book value of its
 * factories, divided by the shares it issues. Never below the market minimum.
 */
export function ipoSharePrice(balance: number, factoryCount: number, totalShares: number): number {
	const netWorth = Math.max(0, balance) + Math.max(0, factoryCount) * STOCKS.FACTORY_BOOK_VALUE;
	const perShare = Math.floor(netWorth / Math.max(1, totalShares));
	return Math.max(ECONOMY_CONFIG.MIN_SHARE_PRICE, perShare);
}

/** The instant a filed IPO's float is due to go live on the market. */
export function listingDueAt(filedAt: Date | string, now: Date = new Date()): Date {
	const filed = new Date(filedAt).getTime();
	const base = Number.isFinite(filed) ? filed : now.getTime();
	return new Date(base + STOCKS.LISTING_HOURS * 3_600_000);
}
