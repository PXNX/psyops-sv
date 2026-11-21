// Pure manpower rules: every recruitable unit costs civilians, the pool can
// only be drawn down to the floor, and an empty region cannot raise armies.
import { describe, expect, it } from "@rstest/core";
import { POPULATION_FLOOR } from "../population.config";
import { UNIT_MANPOWER_COST, afterRecruitment, canCoverManpower, manpowerCostOf } from "../manpower.config";

const UNIT_TYPES = [
	"infantry",
	"armor",
	"mechanized",
	"artillery",
	"air_defence",
	"fighter_squadron",
	"bomber_squadron",
	"frigate",
	"submarine",
	"carrier",
	"landing_ship",
	"marine"
];

describe("unit manpower costs", () => {
	it("prices every recruitable unit", () => {
		for (const type of UNIT_TYPES) {
			expect(UNIT_MANPOWER_COST[type]).toBeGreaterThan(0);
			expect(manpowerCostOf(type)).toBe(UNIT_MANPOWER_COST[type]);
		}
	});

	it("treats an unknown unit type as having no recruit cost", () => {
		expect(manpowerCostOf("nonsense")).toBe(0);
		expect(canCoverManpower(100_000, manpowerCostOf("nonsense"))).toBe(true);
	});

	it("only lets a region spare recruits above the population floor", () => {
		expect(canCoverManpower(10_000, 8_000)).toBe(true);
		expect(canCoverManpower(9_000, 8_000)).toBe(true); // exactly the floor may remain
		expect(canCoverManpower(8_999, 8_000)).toBe(false); // would dip below the floor
		expect(canCoverManpower(POPULATION_FLOOR, 1)).toBe(false);
	});

	it("never drops a region below the floor when recruits are taken", () => {
		expect(afterRecruitment(10_000, 8_000)).toBe(2_000);
		expect(afterRecruitment(2_000, 8_000)).toBe(POPULATION_FLOOR);
		expect(afterRecruitment(10_000, -5)).toBe(10_000);
	});
});
