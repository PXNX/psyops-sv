// Stock-market rules: IPO pricing from company book value and the 72-hour gate.
import { describe, expect, it } from "@rstest/core";
import { ECONOMY_CONFIG } from "../economy.config";
import { STOCKS, ipoSharePrice, listingDueAt } from "../stocks.config";

describe("ipoSharePrice", () => {
	it("divides cash plus factory book value by the shares issued", () => {
		// 50k cash + one 100k factory, over 1,000 shares.
		expect(ipoSharePrice(50_000, 1, 1_000)).toBe(150);
		expect(ipoSharePrice(0, 0, 1_000)).toBe(ECONOMY_CONFIG.MIN_SHARE_PRICE);
	});

	it("never quotes below the market minimum and ignores negative inputs", () => {
		expect(ipoSharePrice(-1_000, -2, 1_000)).toBe(ECONOMY_CONFIG.MIN_SHARE_PRICE);
		expect(ipoSharePrice(100, 1, 1)).toBe(100 + STOCKS.FACTORY_BOOK_VALUE);
	});
});

describe("listingDueAt", () => {
	it("opens trading 72 hours after filing", () => {
		const filed = new Date("2026-01-01T00:00:00Z");
		const due = listingDueAt(filed);
		expect((due.getTime() - filed.getTime()) / 3_600_000).toBe(72);
	});
});
