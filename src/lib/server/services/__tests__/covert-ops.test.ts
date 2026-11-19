// The pure rules of cyber operations and psyops: odds and why, the rolls,
// morale stacking, population, battle modifiers, war exhaustion, planted
// intel and jammed sensors in a recon pass.
import { describe, expect, it } from "@rstest/core";
import {
	COVERT_OPS,
	CYBER,
	CYBER_DEFENCE,
	PSYOPS,
	covertOdds,
	cyberDefenceUpgradeCost,
	deceivedCount,
	gridFactor,
	moraleMagnitude,
	populationFactor,
	psyopsBattleModifier,
	psyopsExhaustion,
	rollOperation,
	seesThrough,
	stackMorale,
	theftAmount
} from "#lib/config/index.js";
import { scanRegion } from "../military/intel";

/** An rng that returns the given draws in order (then repeats the last). */
const seq =
	(...xs: number[]) =>
	() => {
		let i = 0;
		return () => xs[Math.min(i++, xs.length - 1)]!;
	};

const base = { defenceLevel: 0, atWar: true, recentOps: 0, targetResilient: false };

describe("odds", () => {
	it("starts from the operation's base odds at war against an undefended target", () => {
		const o = covertOdds("grid_attack", base);
		expect(o.success).toBe(COVERT_OPS.grid_attack.baseSuccess);
		expect(o.attribution).toBe(COVERT_OPS.grid_attack.baseAttribution);
		expect(o.factors).toEqual([]);
	});

	it("cyber defence lowers success and raises attribution, and says so", () => {
		const o = covertOdds("grid_attack", { ...base, defenceLevel: 3 });
		expect(o.success).toBeCloseTo(0.6 - 3 * CYBER_DEFENCE.SUCCESS_PER_LEVEL);
		expect(o.attribution).toBeCloseTo(0.35 + 3 * CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL);
		expect(o.factors[0]!.label).toMatch(/defence level 3/);
	});

	it("cyber defence doesn't stop propaganda", () => {
		expect(covertOdds("morale_campaign", { ...base, defenceLevel: 5 }).success).toBe(0.7);
	});

	it("peacetime raises attribution; repeated ops put the target on alert", () => {
		expect(covertOdds("leaflet_drop", { ...base, atWar: false }).attribution).toBeCloseTo(
			0.6 + CYBER.PEACETIME_ATTRIBUTION
		);
		const hot = covertOdds("c2_disruption", { ...base, recentOps: 10 });
		expect(hot.success).toBeCloseTo(0.6 - CYBER.HEAT_MAX_STACKS * CYBER.HEAT_SUCCESS);
		expect(hot.factors[0]!.label).toMatch(/4 recent ops/);
	});

	it("counter-propaganda blunts psyops only", () => {
		expect(covertOdds("morale_campaign", { ...base, targetResilient: true }).success).toBeCloseTo(
			0.7 - PSYOPS.RESILIENCE_SUCCESS
		);
		expect(covertOdds("grid_attack", { ...base, targetResilient: true }).success).toBe(0.6);
	});

	it("never goes below 5% / above 95%", () => {
		const o = covertOdds("financial_theft", { ...base, defenceLevel: 5, recentOps: 4, atWar: false });
		expect(o.success).toBe(CYBER.SUCCESS_MIN);
		expect(o.attribution).toBe(CYBER.ATTRIBUTION_MAX);
	});

	it("defensive campaigns always work and are yours", () => {
		expect(covertOdds("counter_propaganda", { ...base, defenceLevel: 5 })).toEqual({
			success: 1,
			attribution: 0,
			factors: []
		});
	});

	it("cyber defence gets dearer per level and stops at the cap", () => {
		expect(cyberDefenceUpgradeCost(0)).toBe(CYBER_DEFENCE.BASE_COST);
		expect(cyberDefenceUpgradeCost(2)).toBe(3 * CYBER_DEFENCE.BASE_COST);
		expect(cyberDefenceUpgradeCost(CYBER_DEFENCE.MAX_LEVEL)).toBeNull();
	});
});

describe("rolling an operation", () => {
	const odds = { success: 0.6, attribution: 0.3 };

	it("a visible success is always noticed; attribution is its own roll", () => {
		expect(rollOperation(odds, true, seq(0.1, 0.99, 0.99)())).toEqual({
			succeeded: true,
			detected: true,
			attributed: false
		});
		expect(rollOperation(odds, true, seq(0.1, 0.99, 0.1)()).attributed).toBe(true);
	});

	it("planted intel that works goes unnoticed unless traced", () => {
		expect(rollOperation(odds, false, seq(0.1, 0.0, 0.99)())).toEqual({
			succeeded: true,
			detected: false,
			attributed: false
		});
	});

	it("a botch leaves traces: higher attribution, maybe detection", () => {
		// 0.36 < 0.3 × 1.25 = 0.375: traced only because it failed.
		expect(rollOperation(odds, true, seq(0.9, 0.99, 0.36)())).toEqual({
			succeeded: false,
			detected: true,
			attributed: true
		});
		// Not traced, but noticed: 0.5 < 0.375 + 0.25.
		expect(rollOperation(odds, true, seq(0.9, 0.5, 0.99)())).toEqual({
			succeeded: false,
			detected: true,
			attributed: false
		});
		expect(rollOperation(odds, true, seq(0.9, 0.99, 0.99)()).detected).toBe(false);
	});
});

describe("effects", () => {
	it("morale losses stack with diminishing returns towards the cap", () => {
		expect(stackMorale([6])).toBe(6);
		expect(stackMorale([6, 6])).toBe(10.2);
		expect(stackMorale([6, 6, 6])).toBe(13.1);
		expect(stackMorale(Array(10).fill(6))).toBeLessThan(PSYOPS.MORALE_CAP);
		expect(stackMorale([])).toBe(0);
	});

	it("big populations are harder to sway, small ones easier", () => {
		expect(populationFactor(PSYOPS.POPULATION_REF)).toBe(1);
		expect(populationFactor(PSYOPS.POPULATION_REF * 4)).toBe(0.5);
		expect(populationFactor(PSYOPS.POPULATION_REF / 100)).toBe(PSYOPS.POPULATION_FACTOR_MAX);
		expect(populationFactor(0)).toBe(1);
		expect(moraleMagnitude(6, PSYOPS.POPULATION_REF * 4, true)).toBe(1.5);
	});

	it("morale, boosts and C2 disruption combine into one battle factor", () => {
		expect(psyopsBattleModifier({ morale: [], boosts: [], c2: [] }).factor).toBe(1);
		const m = psyopsBattleModifier({ morale: [6, 6], boosts: [5], c2: [30] });
		expect(m.moraleLoss).toBe(10.2);
		expect(m.boost).toBe(5);
		expect(m.coordinationLoss).toBe(30 * CYBER.C2_BATTLE_SHARE);
		expect(m.factor).toBe(Math.round((1 - 0.102) * 1.05 * (1 - 0.09) * 1000) / 1000);
		expect(psyopsBattleModifier({ morale: [], boosts: [5, 5, 5], c2: [] }).boost).toBe(PSYOPS.BOOST_CAP);
	});

	it("campaigns add war exhaustion up to a cap", () => {
		expect(psyopsExhaustion(["morale_campaign", "leaflet_drop", "grid_attack"])).toBe(4);
		expect(psyopsExhaustion(Array(20).fill("morale_campaign"))).toBe(PSYOPS.EXHAUSTION_CAP);
	});

	it("a treasury breach takes a slice, capped", () => {
		expect(theftAmount(500_000)).toBe(20_000);
		expect(theftAmount(100_000_000)).toBe(CYBER.THEFT_MAX);
		expect(theftAmount(-5)).toBe(0);
		expect(gridFactor(25)).toBe(0.75);
	});
});

describe("planted intel and jammed sensors in a recon pass", () => {
	const scan = (extra: Partial<Parameters<typeof scanRegion>[0]>) =>
		scanRegion({
			sensor: "sat_eo",
			conditions: { weather: "clear", night: false, cover: "open" },
			hostileUnitTypes: ["infantry", "infantry", "infantry", "artillery"],
			recentlyFired: 0,
			airDefenceUnits: 0,
			owner: { id: 1, name: "X" },
			buildings: null,
			battle: null,
			rng: () => 0.5, // no estimation error
			...extra
		});
	const count = (f: ReturnType<typeof scan>, c: string) => f.categories.find((x) => x.category === c)?.count ?? 0;

	it("inflated: counts go up and decoy vehicles appear, coverage stays honest", () => {
		const truth = scan({});
		const fooled = scan({ deception: { magnitude: PSYOPS.INFLATE, roll: 0.99 } });
		expect(count(truth, "infantry")).toBe(3);
		expect(count(fooled, "infantry")).toBe(deceivedCount(3, PSYOPS.INFLATE));
		expect(count(fooled, "vehicle")).toBe(PSYOPS.DECOY_VEHICLES);
		expect(fooled.coverage).toEqual(truth.coverage);
	});

	it("concealed: units vanish from the picture", () => {
		const fooled = scan({ deception: { magnitude: PSYOPS.CONCEAL, roll: 0.99 } });
		expect(count(fooled, "infantry")).toBe(deceivedCount(3, PSYOPS.CONCEAL));
		expect(count(fooled, "artillery")).toBe(0);
	});

	it("a sharp pass sees through it", () => {
		const truth = scan({});
		const p = truth.coverage.infantry;
		expect(seesThrough({ magnitude: 80, roll: 0 }, p)).toBe(true);
		const seen = scan({ deception: { magnitude: PSYOPS.INFLATE, roll: p * PSYOPS.SEE_THROUGH - 0.01 } });
		expect(count(seen, "infantry")).toBe(3);
	});

	it("jammed sensor links lower coverage", () => {
		const clear = scan({});
		const jammed = scan({ degradation: 0.3 });
		expect(jammed.coverage.infantry).toBeLessThan(clear.coverage.infantry);
	});
});
