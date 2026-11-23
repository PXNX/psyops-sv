// Factory money rules: fair pay, strikes, productivity and EBITDA.
import { describe, expect, it } from "@rstest/core";
import {
	FACTORY_FINANCE,
	canStrike,
	expansionCost,
	expansionDueAt,
	factoryEbitda,
	fairWage,
	productivityFactor,
	strikeOutputFactor,
	strikeSeverity
} from "../factory-finance.config";

describe("fair wage", () => {
	it("starts from a living wage and rises with peers, hardship and affordability", () => {
		const base = { paidWage: 1000, peerWage: null, hardship: 0, companyBudget: 0, workerCount: 1 };
		expect(fairWage(base)).toBe(FACTORY_FINANCE.LIVING_WAGE);
		expect(fairWage({ ...base, peerWage: 3000 })).toBeGreaterThan(fairWage(base));
		expect(fairWage({ ...base, hardship: 1 })).toBeGreaterThan(fairWage(base));
		expect(fairWage({ ...base, companyBudget: 1_000_000, workerCount: 1 })).toBeGreaterThan(fairWage(base));
	});
});

describe("strikes", () => {
	it("only walks out above the tolerance gap, harder when pay is more unfair", () => {
		expect(strikeSeverity(1500, 1500)).toBe(0);
		expect(strikeSeverity(1450, 1500)).toBe(0);
		const mild = strikeSeverity(1200, 2000);
		const severe = strikeSeverity(600, 2000);
		expect(mild).toBeGreaterThan(0);
		expect(severe).toBeGreaterThan(mild);
		expect(severe).toBeLessThanOrEqual(FACTORY_FINANCE.MAX_SEVERITY);
	});

	it("caps output while on strike and leaves a skeleton shift at worst", () => {
		expect(strikeOutputFactor(0)).toBe(1);
		expect(strikeOutputFactor(50)).toBe(0.5);
		expect(strikeOutputFactor(200)).toBe(FACTORY_FINANCE.STRIKE_OUTPUT_FLOOR);
	});

	it("can only strike once a week", () => {
		const now = new Date("2026-01-08T00:00:00Z");
		expect(canStrike(null, now)).toBe(true);
		expect(canStrike("2026-01-05T00:00:00Z", now)).toBe(false);
		expect(canStrike("2026-01-01T00:00:00Z", now)).toBe(true);
	});
});

describe("productivity", () => {
	it("grows with an uninterrupted run and is capped", () => {
		expect(productivityFactor(0)).toBe(1);
		expect(productivityFactor(100)).toBeGreaterThan(1);
		expect(productivityFactor(100_000)).toBe(1 + FACTORY_FINANCE.PRODUCTIVITY_CAP);
	});
});

describe("expansion", () => {
	it("charges per post and takes 24 hours", () => {
		expect(expansionCost(FACTORY_FINANCE.EXPANSION_POSTS)).toBe(5 * FACTORY_FINANCE.EXPANSION_COST_PER_POST);
		expect(expansionCost(0)).toBe(0);
		const filed = new Date("2026-01-01T00:00:00Z");
		expect((expansionDueAt(filed).getTime() - filed.getTime()) / 3_600_000).toBe(FACTORY_FINANCE.EXPANSION_HOURS);
	});
});

describe("factoryEbitda", () => {
	it("is output value minus wages and materials, with a margin", () => {
		const steel = factoryEbitda({ good: "steel", outputUnits: 10, wageCost: 1_500 });
		expect(steel.revenue).toBe(500);
		expect(steel.ebitda).toBe(-1_000);
		expect(steel.margin).toBe(-200);

		const free = factoryEbitda({ good: "steel", outputUnits: 40, wageCost: 1_500 });
		expect(free.ebitda).toBe(500);
		expect(free.margin).toBe(25);
	});

	it("is zero margin with no revenue", () => {
		expect(factoryEbitda({ good: null, outputUnits: 0, wageCost: 500 }).margin).toBe(0);
	});
});
