import { describe, expect, it } from "@rstest/core";
import { bestAsk, offeredQuantity } from "./market-price";

describe("market price is the lowest offer", () => {
	it("picks the cheapest live ask", () => {
		expect(
			bestAsk([
				{ pricePerUnit: 120, quantity: 5 },
				{ pricePerUnit: 95, quantity: 1 }
			])
		).toBe(95);
	});

	it("ignores sold-out offers", () => {
		expect(
			bestAsk([
				{ pricePerUnit: 5, quantity: 0 },
				{ pricePerUnit: 120, quantity: 2 }
			])
		).toBe(120);
	});

	it("returns null for an empty book", () => {
		expect(bestAsk([])).toBeNull();
		expect(bestAsk([{ pricePerUnit: 10, quantity: 0 }])).toBeNull();
	});

	it("counts the units available at the cheapest offer", () => {
		expect(
			offeredQuantity([
				{ pricePerUnit: 5, quantity: 0 },
				{ pricePerUnit: 9, quantity: 3 },
				{ pricePerUnit: 12, quantity: 40 }
			])
		).toBe(3);
	});
});
