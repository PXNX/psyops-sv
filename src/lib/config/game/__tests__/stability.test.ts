// Pure rules for regime stability: each lever moves the score the right way,
// every contribution is capped, and the population dynamics stay sane.
import { describe, expect, it } from "@rstest/core";
import {
	POPULATION_DYNAMICS,
	STABILITY,
	clampStability,
	populationDelta,
	regimeStability,
	stabilityLabel,
	stabilityMoraleFactor,
	stabilityWarLimitFactor,
	type StabilityFactors
} from "../stability.config";

const neutral: StabilityFactors = {
	opinion: 50,
	ihlScore: 0,
	environment: "standard",
	conscription: 0,
	education: 0,
	wages: STABILITY.WAGE_REFERENCE,
	cyber: 0,
	propagandaFor: 0,
	propagandaAgainst: 0,
	defending: false,
	hardship: 0
};

describe("regimeStability", () => {
	it("sits at the neutral base with no pressures", () => {
		const r = regimeStability(neutral);
		expect(r.score).toBe(50);
		expect(r.label).toBe("stable");
		expect(r.breakdown).toHaveLength(11);
		expect(r.breakdown.reduce((s, c) => s + c.value, 0)).toBe(0);
	});

	it("rewards a well-run, defended state", () => {
		const r = regimeStability({
			...neutral,
			opinion: 70,
			education: 3,
			wages: 2_000,
			environment: "conservation",
			defending: true,
			propagandaFor: 10
		});
		expect(r.score).toBeGreaterThan(70);
		expect(r.label).toBe("loyal");
		expect(r.breakdown.find((c) => c.key === "defence")!.value).toBe(STABILITY.RALLY_DEFENCE);
	});

	it("punishes war crimes, harsh extraction and conscription", () => {
		const bad = regimeStability({
			...neutral,
			ihlScore: 60,
			environment: "unrestricted",
			conscription: 12,
			opinion: 32,
			cyber: 20,
			propagandaAgainst: 30
		});
		expect(bad.score).toBeLessThan(30);
		expect(bad.label).toBe("collapsing");
		expect(bad.breakdown.find((c) => c.key === "war_crimes")!.value).toBeLessThan(0);
		expect(bad.breakdown.find((c) => c.key === "environment")!.value).toBe(-12);
	});

	it("caps each lever so one crisis cannot erase the base", () => {
		const worst = regimeStability({ ...neutral, ihlScore: 10_000, conscription: 1_000, cyber: 1_000 });
		expect(worst.breakdown.find((c) => c.key === "war_crimes")!.value).toBe(STABILITY.WAR_CRIME_CAP);
		expect(worst.breakdown.find((c) => c.key === "conscription")!.value).toBe(STABILITY.CONSCRIPTION_CAP);
		expect(worst.breakdown.find((c) => c.key === "cyber")!.value).toBe(STABILITY.CYBER_CAP);
		expect(worst.score).toBeGreaterThanOrEqual(0);
	});

	it("gives the rally bonus only while defending", () => {
		const defending = regimeStability({ ...neutral, defending: true });
		expect(defending.score - regimeStability(neutral).score).toBe(STABILITY.RALLY_DEFENCE);
	});

	it("punishes unmet food, power, heat and water needs", () => {
		const short = regimeStability({ ...neutral, hardship: 0.8 });
		expect(short.score).toBeLessThan(regimeStability(neutral).score);
		expect(short.breakdown.find((c) => c.key === "services")!.value).toBe(-11.2);
	});
});

describe("stability labels and morale", () => {
	it("labels the whole 0-100 range monotonically", () => {
		expect(stabilityLabel(0)).toBe("collapsing");
		expect(stabilityLabel(25)).toBe("unrest");
		expect(stabilityLabel(40)).toBe("uneasy");
		expect(stabilityLabel(60)).toBe("stable");
		expect(stabilityLabel(85)).toBe("loyal");
		expect(clampStability(-20)).toBe(0);
		expect(clampStability(500)).toBe(100);
	});

	it("turns stability into a bounded battle morale multiplier", () => {
		expect(stabilityMoraleFactor(50)).toBe(1);
		expect(stabilityMoraleFactor(0)).toBeLessThan(1);
		expect(stabilityMoraleFactor(100)).toBeGreaterThan(1);
		expect(stabilityMoraleFactor(100)).toBeLessThanOrEqual(1.1);
		expect(stabilityMoraleFactor(0)).toBeGreaterThanOrEqual(0.9);
	});

	it("scales the war-exhaustion limit from unrest to loyalty", () => {
		expect(stabilityWarLimitFactor(0)).toBe(0.8);
		expect(stabilityWarLimitFactor(50)).toBe(1);
		expect(stabilityWarLimitFactor(100)).toBe(1.2);
	});
});

describe("populationDelta", () => {
	const base = {
		days: 365,
		atWar: false,
		environment: "standard" as const,
		conscription: 0,
		stability: 60,
		hardship: 0
	};

	it("grows a settled, healthy region slowly", () => {
		expect(populationDelta(100_000, base)).toBeGreaterThan(0);
	});

	it("shrinks a region under war, harsh rule, mass conscription and unrest", () => {
		const grim = { ...base, atWar: true, environment: "unrestricted" as const, conscription: 20, stability: 10 };
		expect(populationDelta(100_000, grim)).toBeLessThan(0);
	});

	it("scales linearly with the number of days and never returns a fraction", () => {
		const month = populationDelta(100_000, { ...base, days: 30 });
		expect(populationDelta(100_000, { ...base, days: 90 })).toBeCloseTo(month * 3, -1);
		expect(Number.isInteger(month)).toBe(true);
	});

	it("clamps runaway growth and collapse", () => {
		const boom = populationDelta(1_000, { ...base, environment: "conservation", stability: 100 });
		expect(boom).toBeLessThanOrEqual(1_000 * POPULATION_DYNAMICS.MAX_ANNUAL_CHANGE);
	});

	it("loses people when basic needs are not met", () => {
		expect(populationDelta(100_000, { ...base, hardship: 1 })).toBeLessThan(populationDelta(100_000, base));
		expect(populationDelta(100_000, { ...base, hardship: 0.2 })).toBe(populationDelta(100_000, base));
	});

	it("leaves empty or invalid populations alone", () => {
		expect(populationDelta(0, base)).toBe(0);
		expect(populationDelta(-5, base)).toBe(0);
		expect(populationDelta(1000, { ...base, days: 0 })).toBe(0);
	});
});
