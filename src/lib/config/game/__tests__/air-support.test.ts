import { describe, expect, it } from "@rstest/core";
import { AIRCRAFT, AIR_SUPPORT, airSupportContribution, airSupportFactor } from "../aircraft.config.js";

const cas = { unitType: "close_air_support", health: 100, fuel: 100, distanceHexes: 1 };

describe("air support for a division", () => {
	it("gives no bonus without aircraft", () => {
		expect(airSupportFactor([])).toBe(1);
	});

	it("rewards close support fully and other types at half weight", () => {
		const fighter = { ...cas, unitType: "fighterjet" };
		expect(airSupportContribution(cas)).toBeCloseTo(AIRCRAFT.close_air_support.attack * AIR_SUPPORT.perAttack);
		expect(airSupportContribution(fighter)).toBeCloseTo(AIRCRAFT.fighterjet.attack * 0.5 * AIR_SUPPORT.perAttack);
		expect(airSupportFactor([cas])).toBeGreaterThan(airSupportFactor([fighter]));
	});

	it("ignores aircraft that are out of range, grounded, unfuelled or in training", () => {
		const reach = AIRCRAFT.close_air_support.rangeHexes;
		expect(airSupportContribution({ ...cas, distanceHexes: reach })).toBeGreaterThan(0);
		expect(airSupportContribution({ ...cas, distanceHexes: reach + 1 })).toBe(0);
		expect(airSupportContribution({ ...cas, health: 0 })).toBe(0);
		expect(airSupportContribution({ ...cas, fuel: 0 })).toBe(0);
		expect(airSupportContribution({ ...cas, isTraining: true })).toBe(0);
	});

	it("scales with the aircraft's health and is capped", () => {
		expect(airSupportContribution({ ...cas, health: 50 })).toBeCloseTo(airSupportContribution(cas) / 2);
		expect(airSupportFactor(Array(50).fill(cas))).toBe(1 + AIR_SUPPORT.maxBonus);
	});
});
