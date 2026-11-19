// Reconnaissance against a real (in-memory) Postgres with the demo world:
// launching (cost, cooldown), filing reports, sensors vs weather and air
// defence, staleness, who may read a report, and intel in battle.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq, inArray } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	battleParticipants,
	battles,
	intelReports,
	militaryUnits,
	reconMissions,
	regions,
	states,
	userWallets,
	type IntelFindings
} from "../schema";
import {
	ReconError,
	launchRecon,
	picturesByRegion,
	reportForSide,
	resolveReconMissions,
	sideOf,
	sideReports
} from "../services/military/recon";
import { fuseIntel, isFresh } from "../services/military/intel";
import { processCombatRound } from "../services/military/battle-engine";
import { INTEL_VALID_HOURS, SENSORS, airDefenceStrength, droneInterceptChance } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number; // user-1 and user-2 live here; at war with both others
let sylvania: number;
let borduria: number;
let targetRegion: number; // Sylvanian region with the artillery regiment
let battleRegion: number;
let battleId: number;

const MIN = 60_000;
const HOUR = 3600_000;
const clearDay = () => ({ weather: "clear" as const, night: false, cover: "open" as const });
const overcast = () => ({ weather: "cloudy" as const, night: false, cover: "open" as const });
const noError = () => () => 0.5; // estimate() with rng 0.5 adds no error

const balance = async (userId: string) =>
	(await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]!.balance;

beforeAll(async () => {
	handle = await createMockDb();
	// The demo world ships with its own recon passes; these tests file theirs.
	await handle.db.delete(intelReports);
	await handle.db.delete(reconMissions);
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	borduria = all.find((s) => s.name === "Kingdom of Borduria")!.id;
	const [artillery] = await handle.db
		.select()
		.from(militaryUnits)
		.where(eq(militaryUnits.name, "3rd Artillery Regiment"));
	targetRegion = artillery!.regionId;
	const [battle] = await handle.db.select().from(battles).where(eq(battles.phase, "active"));
	battleId = battle!.id;
	battleRegion = battle!.regionId;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("launching a mission", () => {
	it("charges the player and queues the pass", async () => {
		const before = await balance("user-1");
		const now = new Date();
		const mission = await launchRecon(handle.db, { userId: "user-1", regionId: targetRegion, sensor: "drone_eo", now });
		expect(await balance("user-1")).toBe(before - SENSORS.drone_eo.cost);
		expect(mission.status).toBe("in_progress");
		expect(mission.stateId).toBe(freedonia);
		expect(mission.targetStateId).toBe(sylvania);
		expect(mission.completesAt.getTime()).toBe(now.getTime() + SENSORS.drone_eo.durationMinutes * MIN);
	});

	it("enforces the sensor's cooldown without charging", async () => {
		const before = await balance("user-1");
		await expect(
			launchRecon(handle.db, { userId: "user-1", regionId: targetRegion, sensor: "drone_eo" })
		).rejects.toThrow(ReconError);
		expect(await balance("user-1")).toBe(before);

		// After the cooldown it can fly again (checked with a clock in the future).
		const later = new Date(Date.now() + (SENSORS.drone_eo.cooldownMinutes + 1) * MIN);
		await expect(
			launchRecon(handle.db, { userId: "user-1", regionId: targetRegion, sensor: "drone_eo", now: later })
		).resolves.toBeTruthy();
		// Tidy up so the later tests see one pending drone pass.
		await handle.db
			.delete(reconMissions)
			.where(and(eq(reconMissions.launchedBy, "user-1"), eq(reconMissions.launchedAt, later)));
		await handle.db.update(userWallets).set({ balance: before }).where(eq(userWallets.userId, "user-1"));
	});

	it("refuses a player who can't pay", async () => {
		await handle.db.update(userWallets).set({ balance: 100 }).where(eq(userWallets.userId, "user-4"));
		// user-4 lives in Borduria, which is at war with Freedonia.
		const [freedonianRegion] = await handle.db.select().from(regions).where(eq(regions.stateId, freedonia));
		await expect(
			launchRecon(handle.db, { userId: "user-4", regionId: freedonianRegion!.id, sensor: "sat_eo" })
		).rejects.toThrow(/costs/);
		expect(await balance("user-4")).toBe(100);
	});
});

describe("completing a mission", () => {
	it("files nothing before the pass is over, then a report with the hostile units", async () => {
		expect(await resolveReconMissions(handle.db, { now: new Date(Date.now() - HOUR), notify: false })).toHaveLength(0);

		const filed = await resolveReconMissions(handle.db, {
			now: new Date(Date.now() + HOUR),
			conditions: clearDay,
			rng: noError,
			notify: false
		});
		expect(filed).toHaveLength(1);
		const report = filed[0]!;
		expect(report.stateId).toBe(freedonia);
		expect(report.regionId).toBe(targetRegion);
		expect(report.findings.outcome).toBe("ok");
		expect(report.findings.unitTypes).toEqual([{ unitType: "artillery", count: 1, estimated: false }]);
		expect(report.findings.categories.map((c) => [c.category, c.count])).toEqual([["artillery", 1]]);
		expect(report.findings.buildings?.fortifications).toBe(3);
		expect(report.expiresAt.getTime() - report.observedAt.getTime()).toBe(INTEL_VALID_HOURS * HOUR);

		// Resolving again files nothing: the mission was claimed.
		expect(await resolveReconMissions(handle.db, { now: new Date(Date.now() + HOUR), notify: false })).toHaveLength(0);
	});

	it("goes stale after its validity window", async () => {
		const [report] = await sideReports(handle.db, [freedonia], { regionIds: [targetRegion] });
		const fresh = new Date(report!.observedAt.getTime() + HOUR);
		const stale = new Date(report!.observedAt.getTime() + (INTEL_VALID_HOURS + 1) * HOUR);
		expect(isFresh(report!, fresh)).toBe(true);
		expect(isFresh(report!, stale)).toBe(false);
		expect((await picturesByRegion(handle.db, [freedonia], { now: fresh })).has(targetRegion)).toBe(true);
		expect((await picturesByRegion(handle.db, [freedonia], { now: stale })).has(targetRegion)).toBe(false);
		// Stale reports stay in the archive.
		expect(await sideReports(handle.db, [freedonia], { now: stale })).toHaveLength(1);
		expect(await sideReports(handle.db, [freedonia], { now: stale, freshOnly: true })).toHaveLength(0);
	});

	it("is readable by the launcher's side only (state, then bloc)", async () => {
		const [report] = await sideReports(handle.db, [freedonia]);
		expect(await reportForSide(handle.db, (await sideOf(handle.db, freedonia)).stateIds, report!.id)).toBeTruthy();
		expect(await reportForSide(handle.db, (await sideOf(handle.db, sylvania)).stateIds, report!.id)).toBeNull();
		expect(await reportForSide(handle.db, (await sideOf(handle.db, borduria)).stateIds, report!.id)).toBeNull();
		expect(await sideReports(handle.db, (await sideOf(handle.db, borduria)).stateIds)).toHaveLength(0);

		// Bring Borduria into Freedonia's bloc: now it shares the intel.
		const [f] = await handle.db.select().from(states).where(eq(states.id, freedonia));
		await handle.db.update(states).set({ blocId: f!.blocId }).where(eq(states.id, borduria));
		expect(await reportForSide(handle.db, (await sideOf(handle.db, borduria)).stateIds, report!.id)).toBeTruthy();
		await handle.db.update(states).set({ blocId: null }).where(eq(states.id, borduria));
	});
});

describe("sensors and conditions", () => {
	it("clouds blind a visual satellite pass but not radar", async () => {
		await launchRecon(handle.db, { userId: "user-2", regionId: targetRegion, sensor: "sat_eo" });
		await launchRecon(handle.db, { userId: "user-2", regionId: targetRegion, sensor: "sat_sar" });
		const filed = await resolveReconMissions(handle.db, {
			now: new Date(Date.now() + HOUR),
			conditions: overcast,
			rng: noError,
			notify: false
		});
		const eo = filed.find((r) => r.sensor === "sat_eo")!;
		const sar = filed.find((r) => r.sensor === "sat_sar")!;
		expect(eo.findings.outcome).toBe("obscured");
		expect(eo.findings.categories).toHaveLength(0);
		expect(sar.findings.outcome).toBe("ok");
		expect(sar.findings.categories.find((c) => c.category === "artillery")?.count).toBe(1);
		// SAR is poor at infantry: it doesn't observe that category at all.
		expect(sar.findings.coverage.infantry).toBe(0);
	});

	it("radar coverage adds to the air-defence strength", () => {
		// Each radar level cues the air defence like half an AA unit.
		expect(airDefenceStrength(3, 2)).toBe(4);
		expect(droneInterceptChance(4)).toBe(0.9);
	});

	it("satellite revisit time is shared by the whole state", async () => {
		await expect(
			launchRecon(handle.db, { userId: "user-1", regionId: targetRegion, sensor: "sat_eo" })
		).rejects.toThrow(/overhead again/);
	});

	it("air defence shoots a drone down", async () => {
		await handle.db.insert(militaryUnits).values(
			[1, 2, 3].map((n) => ({
				name: `${n} AA Battalion`,
				ownerId: "user-5",
				stateId: sylvania,
				regionId: targetRegion,
				unitType: "air_defence" as const,
				isTraining: false
			}))
		);
		await launchRecon(handle.db, { userId: "user-1", regionId: targetRegion, sensor: "drone_ir" });
		const [report] = await resolveReconMissions(handle.db, {
			now: new Date(Date.now() + HOUR),
			conditions: clearDay,
			rng: () => () => 0.1, // below the 75% intercept chance of three AA units
			notify: false
		});
		expect(report!.findings.outcome).toBe("intercepted");
		// Three AA units plus region 4's two radar levels (half a unit each).
		expect(report!.findings.airDefence).toEqual({ units: 3, radar: 2, interceptChance: 0.9 });
		expect(report!.findings.categories).toHaveLength(0);
	});

	it("fuses passes into one picture", async () => {
		const reports = await sideReports(handle.db, [freedonia], { regionIds: [targetRegion] });
		const picture = fuseIntel(reports, new Date(Date.now() + HOUR));
		expect(picture.sensors.map((s) => s.sensor).sort()).toEqual(["drone_eo", "drone_ir", "sat_eo", "sat_sar"]);
		expect(picture.categories.artillery.count).toBe(1);
		expect(picture.unitTypes).toEqual([{ unitType: "artillery", count: 1, estimated: false }]);
		expect(picture.confidence).toBeGreaterThan(0.5);
	});
});

describe("intel in battle", () => {
	// Put every unit in the battle back to the same state, so two rounds differ
	// only by the intel available.
	const reset = async () => {
		const ps = await handle.db.select().from(battleParticipants).where(eq(battleParticipants.battleId, battleId));
		await handle.db
			.update(battleParticipants)
			.set({ currentStrength: 100, currentOrganization: 100 })
			.where(eq(battleParticipants.battleId, battleId));
		await handle.db
			.update(militaryUnits)
			.set({ experience: 0 })
			.where(
				inArray(
					militaryUnits.id,
					ps.map((p) => p.unitId)
				)
			);
	};

	it("fresh intel on the enemy raises a side's damage; blind attacks are weaker", async () => {
		await reset();
		const blind = (await processCombatRound(handle.db, battleId))!;
		expect(blind.intel.attacker.confidence).toBe(0);
		expect(blind.intel.attacker.indirect).toBe(0.5);

		// Sylvania (the attacker) gets a fresh, high-confidence pass over the battle region.
		const [mission] = await handle.db
			.insert(reconMissions)
			.values({
				launchedBy: "user-3",
				stateId: sylvania,
				targetRegionId: battleRegion,
				targetStateId: freedonia,
				sensor: "sat_eo",
				cost: 0,
				status: "completed",
				completesAt: new Date()
			})
			.returning();
		const findings: IntelFindings = {
			sensor: "sat_eo",
			outcome: "ok",
			conditions: clearDay(),
			ownerStateId: freedonia,
			ownerStateName: null,
			airDefence: null,
			coverage: { infantry: 0.9, vehicle: 0.9, artillery: 0.9, air: 0.9 },
			categories: [{ category: "infantry", count: 1, estimated: false, confidence: 0.9 }],
			unitTypes: [{ unitType: "infantry", count: 1, estimated: false }],
			firingPositions: null,
			buildings: null,
			battle: null
		};
		await handle.db.insert(intelReports).values({
			missionId: mission!.id,
			stateId: sylvania,
			regionId: battleRegion,
			sensor: "sat_eo",
			findings,
			observedAt: new Date(),
			expiresAt: new Date(Date.now() + INTEL_VALID_HOURS * HOUR)
		});

		await reset();
		const informed = (await processCombatRound(handle.db, battleId))!;
		expect(informed.intel.attacker.confidence).toBeCloseTo(0.9, 2);
		expect(informed.intel.attacker.indirect).toBeGreaterThan(blind.intel.attacker.indirect);
		expect(informed.attackerDamage).toBeGreaterThan(blind.attackerDamage);
		// The defender had no intel either time, so its damage didn't change.
		expect(informed.defenderDamage).toBe(blind.defenderDamage);
	});
});
