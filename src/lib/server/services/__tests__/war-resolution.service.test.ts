import { describe, it, expect } from "@rstest/core";
import {
	WAR_CONFIG,
	accumulateExhaustion,
	hoursBetween,
	isWarExhausted,
	isWarStale
} from "../../../config/game/war.config";

describe("War resolution - exhaustion accrual", () => {
	it("accumulates exhaustion over time", () => {
		expect(accumulateExhaustion(0, 10)).toBe(5); // 10h × 0.5/h
		expect(accumulateExhaustion(20, 40)).toBe(40);
	});

	it("caps at the exhaustion limit", () => {
		expect(accumulateExhaustion(99, 100)).toBe(WAR_CONFIG.EXHAUSTION_LIMIT);
		expect(accumulateExhaustion(100, 100)).toBe(WAR_CONFIG.EXHAUSTION_LIMIT);
		expect(accumulateExhaustion(150, 10)).toBe(WAR_CONFIG.EXHAUSTION_LIMIT);
	});

	it("does not accrue without elapsed time", () => {
		expect(accumulateExhaustion(30, 0)).toBe(30);
		expect(accumulateExhaustion(30, -5)).toBe(30);
	});

	it("marks a war exhausted exactly at the limit", () => {
		expect(isWarExhausted(100)).toBe(true);
		expect(isWarExhausted(99.9)).toBe(false);
	});
});

describe("War resolution - stalemate", () => {
	const now = new Date("2026-11-17T00:00:00Z");

	it("flags a war with no activity for STALEMATE_DAYS", () => {
		const lastActivity = new Date(now.getTime() - (WAR_CONFIG.STALEMATE_DAYS + 1) * 86400000);
		expect(isWarStale(lastActivity, now)).toBe(true);
	});

	it("keeps a recently fought war alive", () => {
		const lastActivity = new Date(now.getTime() - (WAR_CONFIG.STALEMATE_DAYS - 1) * 86400000);
		expect(isWarStale(lastActivity, now)).toBe(false);
	});

	it("treats exactly STALEMATE_DAYS as stale", () => {
		const lastActivity = new Date(now.getTime() - WAR_CONFIG.STALEMATE_DAYS * 86400000);
		expect(isWarStale(lastActivity, now)).toBe(true);
	});
});

describe("War resolution - helpers", () => {
	it("computes fractional hours between dates", () => {
		const from = new Date("2026-11-17T00:00:00Z");
		const to = new Date("2026-11-17T06:30:00Z");
		expect(hoursBetween(from, to)).toBe(6.5);
		expect(hoursBetween(to, from)).toBe(0);
	});
});
