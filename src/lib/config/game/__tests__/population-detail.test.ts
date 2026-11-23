import { describe, expect, it } from "@rstest/core";
import { populationBreakdown, populationDelta, type PopulationPressure } from "../stability.config.js";

const base: PopulationPressure = {
	days: 365,
	atWar: false,
	environment: "standard",
	conscription: 0,
	stability: 60,
	hardship: 0
};

describe("populationBreakdown", () => {
	it("matches populationDelta", () => {
		const breakdown = populationBreakdown(1_000_000, base);
		expect(breakdown.net).toBe(populationDelta(1_000_000, base));
		expect(breakdown.contributions.reduce((s, c) => s + c.value, 0)).toBeGreaterThan(0);
	});

	it("lists war, conscription and hardship as negative", () => {
		const breakdown = populationBreakdown(
			1_000_000,
			{ ...base, atWar: true, conscription: 20, stability: 20, hardship: 0.5 }
		);
		const byLabel = Object.fromEntries(breakdown.contributions.map((c) => [c.label, c.value]));
		expect(byLabel["War deaths"]).toBeLessThan(0);
		expect(byLabel["Conscription"]).toBeLessThan(0);
		expect(byLabel["Emigration (instability)"]).toBeLessThan(0);
		expect(byLabel["Hardship mortality"]).toBeLessThan(0);
		expect(breakdown.net).toBeLessThan(populationDelta(1_000_000, base));
	});
});
