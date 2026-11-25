// Airstrikes against a real (in-memory) Postgres with the demo world:
// who may order them, cost and cooldowns, damage and lasting effects, what
// they do to battles and factories, civilian casualties, IHL violations,
// reparations and the bloc-expulsion rule.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	battleParticipants,
	battles,
	governmentBudgetTransactions,
	ihlViolations,
	intelReports,
	militaryUnits,
	ministers,
	reconMissions,
	regionEffects,
	regions,
	states,
	stateTreasury,
	strikes
} from "../schema";
import {
	StrikeError,
	battleStrikeModifiers,
	energyPenalty,
	launchStrike,
	strikeAuthority,
	strikeLog,
	strikeOptions,
	strikeProductionFactor
} from "../services/military/strike";
import { expulsionPassShare, ihlRecord, ihlScoreOf } from "../services/military/ihl";
import { statePopulation } from "../services/population";
import { processCombatRound } from "../services/military/battle-engine";
import { WEAPONS, derivedPopulation, ihlEmbargoFactor } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number; // user-1 is president; at war with Sylvania (bloc war) and Borduria
let sylvania: number; // user-3 is president
let region1: number; // Freedonia, urban
let region2: number; // Freedonia, battle: Sylvania attacking
let region3: number; // Sylvania, forest, power 3, hospitals 2
let region4: number; // Sylvania, borders region2
let battle1: number;

const HOUR = 3600_000;
const T = new Date();
const at = (h: number) => new Date(T.getTime() + h * HOUR);
const clearDay = () => ({ weather: "clear" as const, night: false, cover: "open" as const });
/** Rolls in order: intercept, accuracy, damage spread, casualty spread. */
const seq =
	(...xs: number[]) =>
	() =>
		xs.shift() ?? 0.5;
const HIT = () => seq(0.99, 0, 0.5, 0.5);

const treasury = async (stateId: number) =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance;
const region = async (id: number) => (await handle.db.select().from(regions).where(eq(regions.id, id)))[0]!;

beforeAll(async () => {
	handle = await createMockDb();
	// The demo world ships with strikes, effects and intel of its own; these
	// tests start from a clean slate so cooldowns and intel are theirs alone.
	await handle.db.delete(regionEffects);
	await handle.db.delete(ihlViolations);
	await handle.db.delete(strikes);
	await handle.db.delete(intelReports);
	await handle.db.delete(reconMissions);
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	const [battle] = await handle.db.select().from(battles).where(eq(battles.phase, "active"));
	battle1 = battle!.id;
	region2 = battle!.regionId;
	const rs = await handle.db.select().from(regions);
	region1 = rs.find((r) => r.stateId === freedonia && r.id !== region2)!.id;
	region3 = rs.find((r) => r.stateId === sylvania && r.terrain === "forest")!.id;
	region4 = rs.find((r) => r.stateId === sylvania && r.terrain === "hills")!.id;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("authority", () => {
	it("is the president's or the defence minister's", async () => {
		expect(await strikeAuthority(handle.db, "user-1")).toMatchObject({ stateId: freedonia, role: "president" });
		expect(await strikeAuthority(handle.db, "user-2")).toBeNull();
		await expect(
			launchStrike(handle.db, {
				userId: "user-2",
				regionId: region3,
				target: "power_grid",
				weapon: "cruise_missile",
				notify: false
			})
		).rejects.toThrow(StrikeError);
		await handle.db.insert(ministers).values({ userId: "user-2", stateId: freedonia, ministry: "defense" });
		expect(await strikeAuthority(handle.db, "user-2")).toMatchObject({ stateId: freedonia, role: "defense" });
		await handle.db.delete(ministers).where(eq(ministers.userId, "user-2"));
	});

	it("offers the planner on enemy regions only, with the reasons weapons are unavailable", async () => {
		const own = await strikeOptions(handle.db, "user-1", region1, T);
		expect(own.reason).toMatch(/your side/);
		const opts = await strikeOptions(handle.db, "user-1", region4, T);
		expect(opts.reason).toBeNull();
		expect(opts.warId).toBeTruthy();
		expect(opts.hops).toBe(1);
		expect(opts.weapons.find((w) => w.id === "cruise_missile")!.reason).toBeNull();
		expect(opts.weapons.find((w) => w.id === "guided_bomb")!.reason).toMatch(/bomber/);
		// No visual pass: air defence is unknown, intel is blind.
		expect(opts.adKnown).toBe(false);
		expect(opts.context!.intelConfidence).toBe(0);
		expect(opts.context!.population).toBeGreaterThan(0);
	});
});

describe("a strategic strike", () => {
	it("charges the treasury, knocks out a power level and cuts the enemy's energy", async () => {
		const before = await treasury(freedonia);
		const power = (await region(region3)).economy!;
		const { strike, plan } = await launchStrike(handle.db, {
			userId: "user-1",
			regionId: region3,
			target: "power_grid",
			weapon: "cruise_missile",
			now: T,
			rng: HIT(),
			conditions: clearDay,
			notify: false
		});
		expect(strike.outcome).toBe("hit");
		expect(strike.tier).toBe("strategic");
		expect(strike.cost).toBe(WEAPONS.cruise_missile.cost);
		expect(strike.accuracy).toBe(Math.round(plan.accuracy * 100));
		expect((await region(region3)).economy).toBe(power - 1);
		expect(strike.damage.levels).toEqual({ economy: 1 });
		expect(await energyPenalty(handle.db, sylvania, at(1))).toBeCloseTo(0.25);
		expect(await energyPenalty(handle.db, sylvania, at(25))).toBe(0);
		expect(await strikeProductionFactor(handle.db, sylvania, region3, at(1))).toBeCloseTo(0.75);
		const [tx] = await handle.db
			.select()
			.from(governmentBudgetTransactions)
			.where(
				and(
					eq(governmentBudgetTransactions.stateId, freedonia),
					eq(governmentBudgetTransactions.transactionType, "airstrike")
				)
			);
		expect(tx!.amount).toBe(-strike.cost);
		// No violations here, so no reparations.
		expect(await treasury(freedonia)).toBe(before - strike.cost);
	});

	it("can't strike the same tier again before the cooldown, and charges nothing", async () => {
		const before = await treasury(freedonia);
		await expect(
			launchStrike(handle.db, {
				userId: "user-1",
				regionId: region4,
				target: "industry",
				weapon: "cruise_missile",
				now: at(1),
				notify: false
			})
		).rejects.toThrow(/re-arming/);
		expect(await treasury(freedonia)).toBe(before);
	});
});

describe("an operational strike", () => {
	it("cuts the enemy's supply in battles next door", async () => {
		await launchStrike(handle.db, {
			userId: "user-1",
			regionId: region4,
			target: "logistics",
			weapon: "cruise_missile",
			now: T,
			rng: HIT(),
			conditions: clearDay,
			notify: false
		});
		// Region 4 borders the battle in region 2, where Sylvania attacks.
		const mods = await battleStrikeModifiers(
			handle.db,
			{ regionId: region2, attackerStateId: sylvania, defenderStateId: freedonia },
			at(1)
		);
		expect(mods.supply.attacker).toBeCloseTo(0.7);
		expect(mods.supply.defender).toBe(1);
		const round = await processCombatRound(handle.db, battle1);
		expect(round!.strikes.supply.attacker).toBeLessThan(1);
	});

	it("can be intercepted by air defence the attacker didn't know about", async () => {
		await handle.db.insert(militaryUnits).values({
			name: "9th Air Defence Battalion",
			ownerId: "user-3",
			stateId: sylvania,
			regionId: region4,
			unitType: "air_defence",
			isTraining: false
		});
		const forts = (await region(region4)).fortifications;
		const { strike } = await launchStrike(handle.db, {
			userId: "user-1",
			regionId: region4,
			target: "fortifications",
			weapon: "cruise_missile",
			now: at(4),
			rng: seq(0, 0, 0.5, 0.5),
			conditions: clearDay,
			notify: false
		});
		expect(strike.outcome).toBe("intercepted");
		// The odds on record are what the commander saw: no known air defence.
		expect(strike.interceptChance).toBe(0);
		expect(strike.civilianCasualties).toBe(0);
		expect((await region(region4)).fortifications).toBe(forts);
	});
});

describe("a tactical strike", () => {
	it("needs a ready aircraft and damages enemy units in the battle", async () => {
		await expect(
			launchStrike(handle.db, {
				userId: "user-3",
				regionId: region2,
				target: "units",
				weapon: "close_air_support",
				now: T,
				notify: false
			})
		).rejects.toThrow(/aircraft/);
		// Squadrons fly only from an airbase, and the target must be in range of it.
		await handle.db.update(regions).set({ airbase: 1 }).where(eq(regions.id, region4));
		await handle.db.insert(militaryUnits).values({
			name: "1st Fighter Wing",
			ownerId: "user-3",
			stateId: sylvania,
			regionId: region4,
			unitType: "fighter_squadron",
			isTraining: false
		});
		const [defender] = await handle.db
			.select()
			.from(battleParticipants)
			.where(and(eq(battleParticipants.battleId, battle1), eq(battleParticipants.side, "defender")));
		const { strike } = await launchStrike(handle.db, {
			userId: "user-3",
			regionId: region2,
			target: "units",
			weapon: "close_air_support",
			now: T,
			rng: HIT(),
			conditions: clearDay,
			notify: false
		});
		expect(strike.outcome).toBe("hit");
		expect(strike.battleId).toBe(battle1);
		expect(strike.unitId).toBeTruthy();
		const [after] = await handle.db.select().from(battleParticipants).where(eq(battleParticipants.id, defender!.id));
		expect(after!.currentStrength).toBe(Math.max(0, defender!.currentStrength - WEAPONS.close_air_support.unitDamage));
		expect(strike.damage.units?.[0]?.damage).toBeGreaterThan(0);

		// The squadron needs time before its next sortie.
		await expect(
			launchStrike(handle.db, {
				userId: "user-3",
				regionId: region2,
				target: "units",
				weapon: "close_air_support",
				now: at(2),
				notify: false
			})
		).rejects.toThrow(/aircraft/);
	});
});

describe("civilians and IHL", () => {
	it("records casualties and takes them off the region's population", async () => {
		const r = await region(region1);
		const before = derivedPopulation(r);
		const statePop = await statePopulation(handle.db, freedonia);
		const { strike } = await launchStrike(handle.db, {
			userId: "user-3",
			regionId: region1,
			target: "power_grid",
			weapon: "ballistic_missile",
			now: T,
			// Misses: lands among the houses.
			rng: seq(0.99, 0.999, 0.5, 0.9),
			conditions: () => ({ weather: "clear", night: false, cover: "urban" }),
			notify: false
		});
		expect(strike.outcome).toBe("miss");
		expect(strike.civilianCasualties).toBeGreaterThan(0);
		expect((await region(region1)).population).toBe(before - strike.civilianCasualties);
		expect(await statePopulation(handle.db, freedonia)).toBe(statePop - strike.civilianCasualties);
	});

	it("striking a hospital is a grave violation: reparations, standing, easier expulsion", async () => {
		const sylvaniaBefore = await treasury(sylvania);
		const hospitals = (await region(region3)).hospitals!;
		const { strike, violations } = await launchStrike(handle.db, {
			userId: "user-1",
			regionId: region3,
			target: "hospital",
			weapon: "cruise_missile",
			now: at(9),
			rng: HIT(),
			conditions: clearDay,
			notify: false
		});
		expect(strike.protectedTarget).toBe(true);
		expect((await region(region3)).hospitals).toBe(hospitals - 1);
		expect(violations[0]!.kind).toBe("protected_target");
		const rows = await handle.db.select().from(ihlViolations).where(eq(ihlViolations.strikeId, strike.id));
		expect(rows[0]).toMatchObject({ stateId: freedonia, victimStateId: sylvania, severity: 3 });
		expect(strike.damage.reparations).toBeGreaterThan(0);
		expect(await treasury(sylvania)).toBe(sylvaniaBefore + strike.damage.reparations!);

		const score = await ihlScoreOf(handle.db, freedonia, at(9));
		expect(score).toBeGreaterThanOrEqual(40);
		const record = await ihlRecord(handle.db, freedonia, at(9));
		expect(["violator", "pariah"]).toContain(record.standing);
		expect(record.moraleFactor).toBeLessThan(1);
		expect(record.violations[0]!.kind).toBe("protected_target");
		expect(await expulsionPassShare(handle.db, freedonia, at(9))).toBeCloseTo(1 / 3);
		// Its next strikes cost more (arms embargo), and its troops fight worse.
		const opts = await strikeOptions(handle.db, "user-1", region4, at(9));
		expect(opts.weapons.find((w) => w.id === "cruise_missile")!.cost).toBe(
			Math.round(WEAPONS.cruise_missile.cost * ihlEmbargoFactor(score))
		);
		const mods = await battleStrikeModifiers(
			handle.db,
			{ regionId: region2, attackerStateId: sylvania, defenderStateId: freedonia },
			at(9)
		);
		expect(mods.morale.defender).toBeLessThan(1);
		// It fades: four half-lives later the state is back below "violator".
		expect(await ihlScoreOf(handle.db, freedonia, at(9 + 24 * 28))).toBeLessThan(10);
	});

	it("logs strikes by region and war", async () => {
		const byRegion = await strikeLog(handle.db, { regionId: region3 });
		expect(byRegion.map((s) => s.target)).toEqual(["hospital", "power_grid"]);
		expect(byRegion[0]!.violations[0]!.kind).toBe("protected_target");
		const [s] = await handle.db.select().from(strikes).where(eq(strikes.regionId, region3)).limit(1);
		expect((await strikeLog(handle.db, { warId: s!.warId! })).length).toBeGreaterThanOrEqual(2);
		const effects = await handle.db.select().from(regionEffects);
		expect(effects.map((e) => e.kind).sort()).toEqual(["energy", "supply"]);
	});
});
