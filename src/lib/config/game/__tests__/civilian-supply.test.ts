// Basic needs are derived rules: a well-served region is fine, a blockade or
// a degraded grid makes itself felt, and water is shared with water-hungry
// companies. All of it is pure arithmetic, so it is tested without a database.
import { describe, expect, it } from "@rstest/core";
import {
	factoryWaterDraw,
	factoryWaterFactor,
	hardshipExtraDeaths,
	hardshipExtraEmigration,
	opinionLossFromHardship,
	regionNeeds,
	stabilityFromHardship,
	type NeedsInput
} from "../civilian-supply.config";

const served: NeedsInput = {
	population: 100_000,
	terrain: "plains",
	infrastructure: 0,
	gridCapacity: 1000,
	gridUsed: 0,
	populationShare: 1,
	waterWorks: 0,
	factoryWaterDemand: 0,
	tradeFactor: 1,
	environment: "standard"
};

describe("regionNeeds", () => {
	it("leaves a well-served region with no hardship", () => {
		const n = regionNeeds(served);
		expect(n.food.sufficiency).toBe(1);
		expect(n.water.sufficiency).toBe(1);
		expect(n.electricity.sufficiency).toBe(1);
		expect(n.heat.sufficiency).toBe(1);
		expect(n.hardship).toBe(0);
		expect(n.shortages).toEqual([]);
	});

	it("starves a city that cannot import food under blockade", () => {
		const n = regionNeeds({
			...served,
			population: 500_000,
			terrain: "city",
			tradeFactor: 0.3
		});
		expect(n.food.sufficiency).toBeLessThan(0.5);
		expect(n.water.sufficiency).toBeLessThan(0.5);
		expect(n.shortages).toContain("food");
		expect(n.shortages).toContain("water");
		expect(n.hardship).toBeGreaterThan(0.3);
	});

	it("cuts electricity and heat when the grid is degraded", () => {
		const n = regionNeeds({ ...served, gridCapacity: 3 });
		expect(n.electricity.sufficiency).toBeCloseTo(0.6, 3);
		expect(n.heat.sufficiency).toBeCloseTo(0.6, 3);
		expect(n.shortages).toEqual(["electricity", "heat"]);
	});

	it("asks more heat of cold terrain on the same grid", () => {
		const plain = regionNeeds({ ...served, gridCapacity: 5 });
		const mountain = regionNeeds({ ...served, gridCapacity: 5, terrain: "mountain" });
		expect(plain.heat.sufficiency).toBe(1);
		expect(mountain.heat.sufficiency).toBeLessThan(0.6);
	});

	it("protects water with water works and pollutes it with unrestricted extraction", () => {
		const desert = { ...served, terrain: "desert" as const };
		expect(regionNeeds(desert).water.sufficiency).toBeLessThan(0.2);
		expect(regionNeeds({ ...desert, waterWorks: 3 }).water.sufficiency).toBe(1);
		expect(regionNeeds({ ...served, environment: "unrestricted" }).water.sufficiency).toBe(0.75);
	});

	it("shares water with factories that need it", () => {
		const fab = { ...served, factoryWaterDemand: factoryWaterDraw("chips") };
		expect(factoryWaterDraw("chips")).toBeGreaterThan(0);
		expect(regionNeeds(fab).water.sufficiency).toBeLessThan(1);
		expect(regionNeeds({ ...fab, waterWorks: 1 }).water.sufficiency).toBe(1);
	});
});

describe("factory water", () => {
	it("throttles water-hungry companies and leaves the rest alone", () => {
		expect(factoryWaterFactor("chips", 0.5)).toBe(0.5);
		expect(factoryWaterFactor("chips", 0.1)).toBe(0.3);
		expect(factoryWaterFactor("rifles", 0.1)).toBe(1);
		expect(factoryWaterDraw(null)).toBe(0);
	});
});

describe("hardship effects", () => {
	it("grows monotonically and leaves a comfortable region alone", () => {
		expect(opinionLossFromHardship(0)).toBe(0);
		expect(opinionLossFromHardship(1)).toBeGreaterThan(opinionLossFromHardship(0.5));
		expect(stabilityFromHardship(0)).toBe(0);
		expect(stabilityFromHardship(1)).toBeLessThan(stabilityFromHardship(0.5));
		expect(hardshipExtraDeaths(0.2)).toBe(0);
		expect(hardshipExtraDeaths(1)).toBeGreaterThan(hardshipExtraDeaths(0.5));
		expect(hardshipExtraEmigration(0.1)).toBe(0);
		expect(hardshipExtraEmigration(1)).toBeGreaterThan(hardshipExtraEmigration(0.5));
	});
});
