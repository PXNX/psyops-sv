// Hospital capacity can be switched off by a hack and overwhelmed by a war;
// the remaining care feeds mortality, births and who is well enough to work.
import { describe, expect, it } from "@rstest/core";
import {
	HOSPITALS,
	hospitalAvailability,
	hospitalCapacity,
	hospitalDeaths,
	hospitalDemand,
	hospitalReplication,
	healthyWorkforce
} from "../hospitals.config";

describe("hospital capacity", () => {
	it("scales with hospital levels", () => {
		expect(hospitalCapacity(10, 0, 0)).toBe(10 * HOSPITALS.BEDS_PER_LEVEL);
		expect(hospitalCapacity(0, 0, 0)).toBe(0);
	});

	it("loses beds to a grid shutdown and a disrupted supply line", () => {
		const full = hospitalCapacity(10, 0, 0);
		expect(hospitalCapacity(10, 100, 0)).toBeLessThan(full);
		expect(hospitalCapacity(10, 0, 100)).toBeLessThan(full);
		expect(hospitalCapacity(10, 100, 100)).toBeLessThan(hospitalCapacity(10, 100, 0));
		expect(hospitalCapacity(10, 100, 100)).toBeGreaterThan(0);
	});
});

describe("hospital demand", () => {
	it("grows with people, wounded soldiers and recent strike casualties", () => {
		const routine = hospitalDemand(100_000, 0, 0);
		expect(hospitalDemand(200_000, 0, 0)).toBeGreaterThan(routine);
		expect(hospitalDemand(100_000, 1_000, 0)).toBeGreaterThan(routine);
		expect(hospitalDemand(100_000, 0, 500)).toBeGreaterThan(routine);
	});

	it("reports full care when there is nobody to treat", () => {
		expect(hospitalAvailability(0, 0)).toBe(1);
	});

	it("clamps to a share of demand that can be met", () => {
		expect(hospitalAvailability(500, 1_000)).toBe(0.5);
		expect(hospitalAvailability(2_000, 1_000)).toBe(1);
		expect(hospitalAvailability(0, 1_000)).toBe(0);
	});
});

describe("the cost of no care", () => {
	it("raises deaths, lowers births and keeps only part of the workforce", () => {
		expect(hospitalDeaths(0)).toBeGreaterThan(0);
		expect(hospitalDeaths(1)).toBe(0);
		expect(hospitalReplication(0)).toBeLessThan(1);
		expect(hospitalReplication(1)).toBe(1);
		expect(healthyWorkforce(0)).toBeLessThan(1);
		expect(healthyWorkforce(1)).toBe(1);
	});
});
