import { describe, expect, it } from "@rstest/core";
import { shareReturn } from "../economy/returns";

describe("share return on investment", () => {
	it("adds dividends to the price gain", () => {
		const r = shareReturn({ shares: 100, costBasis: 1000, dividends: 250, price: 15 });
		expect(r.value).toBe(1500);
		expect(r.gain).toBe(750);
		expect(r.roiPercent).toBe(75);
	});

	it("reports a loss when the quote falls below cost", () => {
		expect(shareReturn({ shares: 10, costBasis: 1000, dividends: 0, price: 80 }).roiPercent).toBe(-20);
	});

	it("has no ROI for gifted shares with no cost basis", () => {
		expect(shareReturn({ shares: 10, costBasis: 0, dividends: 100, price: 10 }).roiPercent).toBeNull();
	});
});
