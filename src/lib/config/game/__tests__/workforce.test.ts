// Pure civilian-work rules: the labour pool, the wage, the revenue a worker
// brings in, and the three limits on how many a factory can hire.
import { describe, expect, it } from "@rstest/core";
import {
	CIVILIAN_WORK,
	civilianLabour,
	civilianRevenue,
	civilianWage,
	employableCivilians,
	labourShare
} from "../workforce.config";

describe("civilian labour", () => {
	it("grows the workforce with the region's education level", () => {
		// No schools: only uneducated manual labour is available.
		expect(labourShare(0)).toBe(CIVILIAN_WORK.LABOUR_SHARE_BASE);
		expect(civilianLabour(100_000, 0)).toBe(20_000);
		expect(civilianLabour(100_000, 4)).toBe(40_000);
		// More schooling means more civilians can take a factory job.
		expect(labourShare(5)).toBeGreaterThan(labourShare(0));
		expect(civilianLabour(100_000, 10)).toBeGreaterThan(civilianLabour(100_000, 0));
	});

	it("caps the educated share and tolerates missing/negative levels", () => {
		expect(labourShare(50)).toBe(CIVILIAN_WORK.LABOUR_SHARE_MAX);
		expect(labourShare(Number.NaN)).toBe(CIVILIAN_WORK.LABOUR_SHARE_BASE);
		expect(labourShare(-3)).toBe(CIVILIAN_WORK.LABOUR_SHARE_BASE);
		expect(civilianLabour(0, 5)).toBe(0);
		expect(civilianLabour(-5, 5)).toBe(0);
	});

	it("pays civilians a fraction of the posted wage, never zero", () => {
		expect(civilianWage(1_500)).toBe(600);
		expect(civilianWage(0)).toBe(1);
	});

	it("prices output by good, rate, headcount and time", () => {
		const coal = civilianRevenue(10, "coal", 2, 7);
		const cars = civilianRevenue(10, "vehicles", 2, 7);
		expect(cars).toBeGreaterThan(coal);
		expect(civilianRevenue(10, "coal", 4, 7)).toBe(2 * coal);
		expect(civilianRevenue(10, "coal", 2, 14)).toBe(2 * coal);
		expect(civilianRevenue(10, "unknown_good", 1, 7)).toBe(
			10 * CIVILIAN_WORK.OUTPUT_FACTOR * CIVILIAN_WORK.DEFAULT_GOOD_VALUE
		);
		expect(civilianRevenue(10, "coal", 0, 7)).toBe(0);
	});
});

describe("employableCivilians", () => {
	it("is capped by labour, free slots and the budget, whichever bites first", () => {
		expect(employableCivilians(100, 5, 1_000_000, 600, 7)).toBe(5); // slots
		expect(employableCivilians(2, 50, 1_000_000, 600, 7)).toBe(2); // labour
		expect(employableCivilians(100, 50, 600, 600, 7)).toBe(1); // budget
		expect(employableCivilians(100, 50, 0, 600, 7)).toBe(0);
		expect(employableCivilians(100, 50, 1_000, 600, 0)).toBe(0);
	});
});
