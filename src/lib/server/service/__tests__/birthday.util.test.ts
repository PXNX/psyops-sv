import { describe, it, expect } from "@rstest/core";
import {
	BIRTHDAY_REWARD_AMOUNT,
	computeRewardTotal,
	computeUncollectedYears,
	fullYearsSince,
	isBirthdayToday
} from "../birthday.util";

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365.25 * DAY;

describe("birthday.util - fullYearsSince", () => {
	it("returns 0 before the first anniversary", () => {
		const created = new Date("2020-01-01T00:00:00Z");
		const now = new Date(created.getTime() + 100 * DAY);
		expect(fullYearsSince(created, now)).toBe(0);
	});

	it("returns 1 on the first anniversary", () => {
		const created = new Date("2020-01-01T00:00:00Z");
		const now = new Date(created.getTime() + YEAR);
		expect(fullYearsSince(created, now)).toBe(1);
	});

	it("returns the number of full years for older accounts", () => {
		const created = new Date("2020-01-01T00:00:00Z");
		const now = new Date(created.getTime() + 3 * YEAR + 10 * DAY);
		expect(fullYearsSince(created, now)).toBe(3);
	});
});

describe("birthday.util - computeUncollectedYears", () => {
	it("returns nothing when no anniversaries have passed", () => {
		expect(computeUncollectedYears(0, new Set())).toEqual([]);
	});

	it("lists every year when none are collected", () => {
		expect(computeUncollectedYears(3, new Set())).toEqual([1, 2, 3]);
	});

	it("accumulates missed years for later collection", () => {
		// Account is 4 years old, only year 1 was collected.
		expect(computeUncollectedYears(4, new Set([1]))).toEqual([2, 3, 4]);
	});

	it("returns nothing when all years are already collected", () => {
		expect(computeUncollectedYears(3, new Set([1, 2, 3]))).toEqual([]);
	});

	it("skips arbitrary already-collected years", () => {
		expect(computeUncollectedYears(5, new Set([2, 4]))).toEqual([1, 3, 5]);
	});
});

describe("birthday.util - computeRewardTotal", () => {
	it("is zero when nothing is uncollected", () => {
		expect(computeRewardTotal(0)).toBe(0);
	});

	it("equals the per-year reward for a single year", () => {
		expect(computeRewardTotal(1)).toBe(BIRTHDAY_REWARD_AMOUNT);
	});

	it("sums up multiple missed years", () => {
		expect(computeRewardTotal(3)).toBe(3 * BIRTHDAY_REWARD_AMOUNT);
	});
});

describe("birthday.util - isBirthdayToday", () => {
	it("is true when month and day match", () => {
		const created = new Date(2020, 5, 15, 8, 0, 0);
		const now = new Date(2024, 5, 15, 20, 30, 0);
		expect(isBirthdayToday(created, now)).toBe(true);
	});

	it("is false on a different day", () => {
		const created = new Date(2020, 5, 15);
		const now = new Date(2024, 5, 16);
		expect(isBirthdayToday(created, now)).toBe(false);
	});

	it("is false in a different month", () => {
		const created = new Date(2020, 5, 15);
		const now = new Date(2024, 6, 15);
		expect(isBirthdayToday(created, now)).toBe(false);
	});
});
