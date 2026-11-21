// Supply chains against a real (in-memory) Postgres: what a region can carry,
// how strikes and blockades throttle it, and how that reaches combat output
// and factory production.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	battleParticipants,
	battles,
	militaryUnits,
	navalBlockades,
	regionEffects,
	regions,
	states
} from "../schema";
import { processCombatRound } from "../services/military/battle-engine";
import { regionSupply, stateSupply } from "../services/military/logistics";

let handle: MockDbHandle;
let regionId: number;
let stateId: number;
let battleId: number;

const HOUR = 3600_000;
const T = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	const [battle] = await handle.db.select().from(battles).where(eq(battles.phase, "active"));
	battleId = battle!.id;
	regionId = battle!.regionId;
	stateId = (await handle.db.select().from(regions).where(eq(regions.id, regionId)))[0]!.stateId!;
	// Make sure the region actually has something drawing supply.
	await handle.db.insert(militaryUnits).values(
		Array.from({ length: 20 }, (_, i) => ({
			name: `Logistics test garrison ${i}`,
			ownerId: "user-1",
			stateId,
			regionId,
			unitType: "infantry" as const,
			isTraining: false,
			health: 100,
			supplyLevel: 100
		}))
	);
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("region supply", () => {
	it("reports infrastructure, demand and a bounded factor", async () => {
		const s = await regionSupply(handle.db, regionId, T);
		expect(s.regionId).toBe(regionId);
		expect(s.capacity).toBeGreaterThan(0);
		expect(s.demand).toBeGreaterThan(0);
		expect(s.factor).toBeGreaterThanOrEqual(0.25);
		expect(s.factor).toBeLessThanOrEqual(1);
	});

	it("falls when a strike cuts bridges and logistics", async () => {
		await handle.db.delete(regionEffects).where(eq(regionEffects.regionId, regionId));
		const before = (await regionSupply(handle.db, regionId, T)).factor;
		await handle.db.insert(regionEffects).values({
			regionId,
			stateId,
			kind: "supply",
			magnitude: 60,
			startsAt: new Date(T.getTime() - HOUR),
			expiresAt: new Date(T.getTime() + HOUR)
		});
		const after = await regionSupply(handle.db, regionId, T);
		expect(after.factor).toBeLessThan(before);
		expect(after.reasons.some((r) => r.includes("strike"))).toBe(true);
		// An expired effect no longer counts.
		const later = await regionSupply(handle.db, regionId, new Date(T.getTime() + 2 * HOUR));
		expect(later.factor).toBe(before);
		await handle.db.delete(regionEffects).where(eq(regionEffects.regionId, regionId));
	});

	it("falls further under a naval blockade", async () => {
		const before = (await regionSupply(handle.db, regionId, T)).factor;
		await handle.db.insert(navalBlockades).values({
			blockaderStateId: (await handle.db.select({ id: states.id }).from(states).where(eq(states.id, stateId)))[0]!.id,
			targetStateId: stateId,
			strength: 80,
			startsAt: new Date(T.getTime() - HOUR),
			expiresAt: new Date(T.getTime() + HOUR)
		});
		const after = await regionSupply(handle.db, regionId, T);
		expect(after.factor).toBeLessThan(before);
		expect(after.blockadeStrength).toBeCloseTo(0.8);
		expect(after.reasons.some((r) => r.includes("blockade"))).toBe(true);
		expect((await stateSupply(handle.db, stateId, T)).blockaded).toBe(true);
		await handle.db.delete(navalBlockades);
	});
});

describe("supply in battle", () => {
	it("burns unit supply each round so prolonged fighting weakens an army", async () => {
		const unitIds = (
			await handle.db
				.select({ unitId: battleParticipants.unitId })
				.from(battleParticipants)
				.where(eq(battleParticipants.battleId, battleId))
		).map((p) => p.unitId);
		const allBefore = await handle.db
			.select({ id: militaryUnits.id, supplyLevel: militaryUnits.supplyLevel })
			.from(militaryUnits);
		const before = new Map(allBefore.filter((u) => unitIds.includes(u.id)).map((u) => [u.id, u.supplyLevel]));
		await processCombatRound(handle.db, battleId);
		const allAfter = await handle.db
			.select({ id: militaryUnits.id, supplyLevel: militaryUnits.supplyLevel })
			.from(militaryUnits);
		const after = new Map(allAfter.filter((u) => unitIds.includes(u.id)).map((u) => [u.id, u.supplyLevel]));
		expect([...before.keys()].some((id) => (after.get(id) ?? 100) < before.get(id)!)).toBe(true);
	});
});
