// Airstrike maths (config/game/strike.config.ts), civilian population
// (population.config.ts) and IHL scoring (ihl.config.ts): pure functions,
// deterministic with a seeded rng.
import { describe, expect, it } from "@rstest/core";
import {
	ACCURACY_MAX,
	INTEL_BLIND,
	IHL_HALF_LIFE_DAYS,
	IHL_MORALE_MAX,
	POPULATION_MAX,
	POPULATION_MIN,
	WEAPONS,
	assessIhl,
	derivedPopulation,
	effectMagnitude,
	exposedCivilians,
	ihlDecay,
	ihlEasyExpulsion,
	ihlEmbargoFactor,
	ihlMoraleFactor,
	ihlScore,
	ihlStanding,
	levelsDestroyed,
	planStrike,
	regionPopulation,
	reparationsOwed,
	riskLevel,
	rollStrike,
	seededRandom,
	stackedPenalty,
	strikeAccuracy,
	strikeInterceptChance,
	targetMilitaryValue,
	unitDamage,
	violationPoints,
	type StrikeContext
} from "#lib/config/index.js";
import { decideExpulsion } from "../../service/blocExpulsion";

const ctx = (over: Partial<StrikeContext> = {}): StrikeContext => ({
	conditions: { weather: "clear", night: false, cover: "open" },
	adUnits: 0,
	intelConfidence: 1,
	buildingsSeen: true,
	ownTroopsEngaged: false,
	population: 200_000,
	density: 40,
	enemyUnits: 2,
	...over
});

/** An rng that returns the given numbers in turn. */
const seq =
	(...xs: number[]) =>
	() =>
		xs.shift() ?? 0.5;

describe("civilian population", () => {
	it("derives a stable figure within bounds when none is stored", () => {
		for (let id = 1; id < 300; id++) {
			const p = derivedPopulation({ id });
			expect(p).toBeGreaterThanOrEqual(POPULATION_MIN);
			expect(p).toBeLessThanOrEqual(POPULATION_MAX);
			expect(derivedPopulation({ id })).toBe(p);
		}
	});

	it("grows with buildings and in cities", () => {
		const bare = derivedPopulation({ id: 7, terrain: "plains" });
		expect(derivedPopulation({ id: 7, terrain: "plains", infrastructure: 4, education: 2 })).toBeGreaterThan(bare);
		expect(derivedPopulation({ id: 7, terrain: "urban" })).toBeGreaterThan(bare);
		expect(derivedPopulation({ id: 7, terrain: "mountain" })).toBeLessThan(bare);
	});

	it("prefers the stored figure", () => {
		expect(regionPopulation({ id: 7, population: 12_345 })).toBe(12_345);
		expect(regionPopulation({ id: 7, population: 0 })).toBe(derivedPopulation({ id: 7 }));
		expect(regionPopulation({ id: 7, population: null })).toBe(derivedPopulation({ id: 7 }));
	});
});

describe("strike odds", () => {
	it("intercepts by air defence like a drone, scaled by the weapon's exposure", () => {
		expect(strikeInterceptChance("cruise_missile", 0)).toBe(0);
		expect(strikeInterceptChance("attack_drone", 2)).toBeCloseTo(0.5);
		expect(strikeInterceptChance("cruise_missile", 2)).toBeCloseTo(0.5 * WEAPONS.cruise_missile.adExposure);
		// Capped like recon: 90% before exposure.
		expect(strikeInterceptChance("attack_drone", 10)).toBeCloseTo(0.9);
		expect(strikeInterceptChance("ballistic_missile", 10)).toBeLessThan(strikeInterceptChance("cruise_missile", 10));
	});

	it("needs intel: blind strikes are far less accurate", () => {
		const sharp = strikeAccuracy("power_grid", "cruise_missile", ctx());
		const blind = strikeAccuracy("power_grid", "cruise_missile", ctx({ intelConfidence: 0, buildingsSeen: false }));
		expect(blind.value).toBeCloseTo(WEAPONS.cruise_missile.baseAccuracy * INTEL_BLIND);
		expect(sharp.value).toBeGreaterThan(blind.value * 1.8);
		expect(sharp.value).toBeLessThanOrEqual(ACCURACY_MAX);
		// The breakdown explains the number.
		expect(blind.factors.map((f) => f.label)).toContain("Intel 0%");
	});

	it("an imaged installation counts more than a picture of the forces", () => {
		const seen = strikeAccuracy("power_grid", "cruise_missile", ctx({ intelConfidence: 0.3, buildingsSeen: true }));
		const unseen = strikeAccuracy("power_grid", "cruise_missile", ctx({ intelConfidence: 0.3, buildingsSeen: false }));
		expect(seen.value).toBeGreaterThan(unseen.value);
	});

	it("clouds and night hurt laser and camera guidance, barely GPS", () => {
		const cloudyNight = { weather: "cloudy" as const, night: true, cover: "open" as const };
		const gps = strikeAccuracy("fortifications", "gps_bomb", ctx({ conditions: cloudyNight }));
		const laser = strikeAccuracy("fortifications", "guided_bomb", ctx({ conditions: cloudyNight }));
		const clearLaser = strikeAccuracy("fortifications", "guided_bomb", ctx());
		expect(gps.value).toBeGreaterThan(laser.value);
		expect(laser.value).toBeLessThan(clearLaser.value * 0.6);
	});

	it("units dig into forest; buildings don't hide", () => {
		const forest = { weather: "clear" as const, night: false, cover: "forest" as const };
		expect(strikeAccuracy("units", "close_air_support", ctx({ conditions: forest })).value).toBeLessThan(
			strikeAccuracy("units", "close_air_support", ctx()).value
		);
		expect(strikeAccuracy("power_grid", "cruise_missile", ctx({ conditions: forest })).value).toBe(
			strikeAccuracy("power_grid", "cruise_missile", ctx()).value
		);
	});

	it("forward observers give tactical strikes a floor of intel", () => {
		const blind = strikeAccuracy("units", "close_air_support", ctx({ intelConfidence: 0 }));
		const spotted = strikeAccuracy("units", "close_air_support", ctx({ intelConfidence: 0, ownTroopsEngaged: true }));
		expect(spotted.value).toBeGreaterThan(blind.value);
	});
});

describe("resolving a strike", () => {
	it("is deterministic for a seeded rng", () => {
		const plan = planStrike("logistics", "cruise_missile", ctx({ adUnits: 1 }));
		const a = rollStrike(plan, seededRandom(42));
		const b = rollStrike(plan, seededRandom(42));
		expect(a).toEqual(b);
	});

	it("intercepted, hit, partial, miss by the rolls", () => {
		const plan = planStrike("bridges", "cruise_missile", ctx({ adUnits: 2 }));
		expect(plan.interceptChance).toBeGreaterThan(0.2);
		expect(rollStrike(plan, seq(0, 0, 0.5, 0.5)).outcome).toBe("intercepted");
		expect(rollStrike(plan, seq(0.99, 0, 0.5, 0.5)).outcome).toBe("hit");
		const partialAt = plan.accuracy + (1 - plan.accuracy) * 0.2;
		expect(rollStrike(plan, seq(0.99, partialAt, 0.5, 0.5)).outcome).toBe("partial");
		expect(rollStrike(plan, seq(0.99, 0.999, 0.5, 0.5)).outcome).toBe("miss");
	});

	it("an intercepted strike harms nobody and destroys nothing", () => {
		const plan = planStrike("power_grid", "cruise_missile", ctx({ adUnits: 4 }));
		const roll = rollStrike(plan, seq(0, 0, 0.5, 0.5));
		expect(roll.civilianCasualties).toBe(0);
		expect(levelsDestroyed("power_grid", "cruise_missile", roll)).toBe(0);
		expect(effectMagnitude("power_grid", "cruise_missile", roll.damageScale)).toBe(0);
	});

	it("a hit knocks levels down and leaves an effect; heavy weapons do more", () => {
		const hit = { outcome: "hit" as const };
		expect(levelsDestroyed("power_grid", "cruise_missile", hit)).toBe(1);
		expect(levelsDestroyed("power_grid", "ballistic_missile", hit)).toBe(2);
		expect(levelsDestroyed("power_grid", "cruise_missile", { outcome: "partial" })).toBe(0);
		expect(effectMagnitude("logistics", "cruise_missile", 1)).toBeCloseTo(0.3);
		expect(effectMagnitude("logistics", "cruise_missile", 0.4)).toBeCloseTo(0.12);
		expect(effectMagnitude("logistics", "ballistic_missile", 1)).toBeCloseTo(0.45);
		expect(unitDamage("close_air_support", { damageScale: 1, damageSpread: 1 })).toBe(35);
	});

	it("misses land among civilians: more harm than a hit", () => {
		const plan = planStrike("power_grid", "cruise_missile", ctx({ density: 300 }));
		const hit = rollStrike(plan, seq(0.99, 0, 0.5, 0.5));
		const miss = rollStrike(plan, seq(0.99, 0.999, 0.5, 0.5));
		expect(miss.civilianCasualties).toBeGreaterThan(hit.civilianCasualties * 2);
	});

	it("effects stack up to a cap", () => {
		expect(stackedPenalty("supply", [0.3, 0.3])).toBe(0.5);
		expect(stackedPenalty("supply", [0.1, 0.15])).toBeCloseTo(0.25);
		expect(stackedPenalty("energy", [])).toBe(0);
	});
});

describe("civilian risk", () => {
	it("is higher in dense cities than in the countryside", () => {
		const city = { weather: "clear" as const, night: false, cover: "urban" as const };
		const urban = planStrike("power_grid", "cruise_missile", ctx({ density: 400, conditions: city }));
		const rural = planStrike("power_grid", "cruise_missile", ctx({ density: 20 }));
		expect(urban.exposed).toBeGreaterThan(rural.exposed * 20);
		expect(urban.expectedCasualties).toBeGreaterThan(rural.expectedCasualties);
		expect(["high", "extreme"]).toContain(urban.risk);
		expect(["none", "low"]).toContain(rural.risk);
	});

	it("falls with accuracy (intel) and with precise, small weapons", () => {
		const blind = planStrike("units", "unguided_bombs", ctx({ density: 150, intelConfidence: 0 }));
		const sharp = planStrike("units", "unguided_bombs", ctx({ density: 150, intelConfidence: 1 }));
		const drone = planStrike("units", "attack_drone", ctx({ density: 150, intelConfidence: 1 }));
		expect(blind.expectedCasualties).toBeGreaterThan(sharp.expectedCasualties);
		expect(drone.expectedCasualties).toBeLessThan(sharp.expectedCasualties);
	});

	it("counts hospital occupants", () => {
		expect(exposedCivilians("hospital", ctx({ density: 0 }))).toBe(250);
	});

	it("labels risk levels", () => {
		expect(riskLevel(0)).toBe("none");
		expect(riskLevel(3)).toBe("low");
		expect(riskLevel(20)).toBe("medium");
		expect(riskLevel(120)).toBe("high");
		expect(riskLevel(500)).toBe("extreme");
	});
});

describe("IHL assessment", () => {
	const base = {
		target: "fortifications" as const,
		weapon: "gps_bomb" as const,
		cover: "open" as const,
		exposed: 100,
		accuracy: 0.9,
		expectedCasualties: 2,
		militaryValue: 50
	};

	it("finds nothing wrong with a precise strike on a military objective", () => {
		expect(assessIhl(base)).toEqual([]);
	});

	it("always flags protected targets as grave", () => {
		const f = assessIhl({ ...base, target: "hospital", militaryValue: 0 });
		expect(f.map((x) => [x.kind, x.severity])).toEqual([["protected_target", 3]]);
	});

	it("flags unguided bombs in a city as indiscriminate", () => {
		const f = assessIhl({ ...base, weapon: "unguided_bombs", cover: "urban" });
		expect(f.map((x) => x.kind)).toContain("indiscriminate");
	});

	it("flags harm beyond the military value as disproportionate, gross beyond 3x", () => {
		expect(assessIhl({ ...base, expectedCasualties: 60 })[0]).toMatchObject({ kind: "disproportionate", severity: 1 });
		expect(assessIhl({ ...base, expectedCasualties: 200 })[0]).toMatchObject({ kind: "disproportionate", severity: 2 });
	});

	it("a dense-city grid strike without intel is disproportionate; with intel it isn't", () => {
		const city = { weather: "clear" as const, night: false, cover: "urban" as const };
		const blind = planStrike(
			"power_grid",
			"cruise_missile",
			ctx({ density: 250, conditions: city, intelConfidence: 0, buildingsSeen: false })
		);
		const sharp = planStrike("power_grid", "cruise_missile", ctx({ density: 250, conditions: city }));
		expect(blind.ihl.map((x) => x.kind)).toContain("disproportionate");
		expect(sharp.ihl).toEqual([]);
	});

	it("values unit strikes by what is there", () => {
		expect(targetMilitaryValue("units", 0)).toBe(40);
		expect(targetMilitaryValue("units", 4)).toBe(100);
		expect(targetMilitaryValue("units", 50)).toBe(150);
	});
});

describe("IHL standing", () => {
	const now = new Date("2026-06-01T00:00:00Z");
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

	it("adds casualty points, capped", () => {
		expect(violationPoints(10, 0)).toBe(10);
		expect(violationPoints(10, 250)).toBe(20);
		expect(violationPoints(10, 100_000)).toBe(50);
	});

	it("halves every half-life", () => {
		expect(ihlDecay(now, now)).toBe(1);
		expect(ihlDecay(daysAgo(IHL_HALF_LIFE_DAYS), now)).toBeCloseTo(0.5);
		expect(ihlScore([{ points: 40, createdAt: daysAgo(IHL_HALF_LIFE_DAYS * 2) }], now)).toBeCloseTo(10);
	});

	it("maps scores to standings and consequences", () => {
		expect(ihlStanding(0).standing).toBe("compliant");
		expect(ihlStanding(15).standing).toBe("concerns");
		expect(ihlStanding(50).standing).toBe("violator");
		expect(ihlStanding(150).standing).toBe("pariah");
		expect(ihlMoraleFactor(0)).toBe(1);
		expect(ihlMoraleFactor(50)).toBeCloseTo(0.9);
		expect(ihlMoraleFactor(10_000)).toBeCloseTo(1 - IHL_MORALE_MAX);
		expect(ihlEmbargoFactor(0)).toBe(1);
		expect(ihlEmbargoFactor(50)).toBeCloseTo(1.5);
		expect(ihlEmbargoFactor(500)).toBe(2);
		expect(reparationsOwed(20, 100)).toBe(150_000);
		expect(ihlEasyExpulsion(39)).toBe(false);
		expect(ihlEasyExpulsion(40)).toBe(true);
	});

	it("lets a bloc expel a violator with a third of the votes", () => {
		const t = { pro: 1, contra: 0, voters: 2, expired: false };
		expect(decideExpulsion(t)).toBeNull();
		expect(decideExpulsion({ ...t, passShare: 1 / 3 })).toBe("expelled");
		// The default rule is unchanged.
		expect(decideExpulsion({ pro: 2, contra: 0, voters: 3, expired: false })).toBe("expelled");
		expect(decideExpulsion({ pro: 1, contra: 1, voters: 2, expired: false })).toBe("rejected");
		expect(decideExpulsion({ pro: 1, contra: 2, voters: 4, expired: false, passShare: 1 / 3 })).toBeNull();
		expect(decideExpulsion({ pro: 1, contra: 3, voters: 4, expired: false, passShare: 1 / 3 })).toBe("rejected");
		expect(decideExpulsion({ pro: 1, contra: 1, voters: 4, expired: true, passShare: 1 / 3 })).toBe("expelled");
	});
});
