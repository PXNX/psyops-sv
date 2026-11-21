// Conscription pressure and hospital strain against a real (in-memory) Postgres.
// Wounded units, a grid attack and strike casualties all crowd the hospitals.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { militaryUnits, regions, stateEffects, strikes } from "../schema";
import { statePressure } from "../services/civilians/pressure";

let handle: MockDbHandle;
let stateId: number;
let regionId: number;
let unitId: number;
const now = new Date();
const DAY = 86_400_000;

beforeAll(async () => {
	handle = await createMockDb();
	const [r] = (await handle.db.select().from(regions)).filter((row) => row.stateId != null);
	regionId = r!.id;
	stateId = r!.stateId!;
	// Keep the state's total civilian count predictable: floor every other
	// region, then give the one under test a known population.
	await handle.db.update(regions).set({ population: 1_000, hospitals: 0 }).where(eq(regions.stateId, stateId));
	await handle.db.update(regions).set({ population: 200_000, hospitals: 10 }).where(eq(regions.id, regionId));
	await handle.db.delete(militaryUnits).where(eq(militaryUnits.stateId, stateId));
	const [unit] = await handle.db
		.insert(militaryUnits)
		.values({
			name: "Test Battalion",
			ownerId: "user-1",
			stateId,
			regionId,
			unitType: "infantry",
			health: 100,
			organization: 100,
			supplyLevel: 100,
			isTraining: false
		})
		.returning();
	unitId = unit!.id;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("conscription and hospital pressure", () => {
	it("derives a general-conscription band from the standing army", async () => {
		const p = await statePressure(handle.db, stateId, now);
		expect(p!.soldiers).toBe(8_000);
		expect(p!.band.key).toBe("general");
		expect(p!.hospitalLevels).toBe(10);
		expect(p!.hospital).toBe(1);
	});

	it("falls when the grid is hacked and wounded soldiers fill the beds", async () => {
		const healthy = (await statePressure(handle.db, stateId, now))!.hospital;
		await handle.db.insert(stateEffects).values({
			stateId,
			kind: "grid_degraded",
			magnitude: 100,
			startsAt: now,
			expiresAt: new Date(now.getTime() + DAY)
		});
		await handle.db.update(militaryUnits).set({ health: 50 }).where(eq(militaryUnits.id, unitId));
		const hacked = (await statePressure(handle.db, stateId, now))!.hospital;
		expect(hacked).toBeLessThan(healthy);
	});

	it("falls further as recent strike casualties take beds", async () => {
		const before = (await statePressure(handle.db, stateId, now))!.hospital;
		await handle.db.insert(strikes).values({
			attackerStateId: stateId,
			targetStateId: stateId,
			regionId,
			tier: "tactical",
			target: "hospital",
			weapon: "guided_bomb",
			outcome: "hit",
			cost: 10_000,
			interceptChance: 0,
			accuracy: 100,
			intelConfidence: 100,
			conditions: { weather: "clear", night: false, cover: "urban" },
			damage: {},
			civilianCasualties: 1_000
		});
		const after = await statePressure(handle.db, stateId, now);
		expect(after!.recentCasualties).toBe(1_000);
		expect(after!.hospital).toBeLessThan(before);
	});

	it("returns to a volunteer band when the army is disbanded", async () => {
		await handle.db.delete(militaryUnits).where(and(eq(militaryUnits.stateId, stateId), eq(militaryUnits.id, unitId)));
		const p = await statePressure(handle.db, stateId, now);
		expect(p!.soldiers).toBe(0);
		expect(p!.band.key).toBe("volunteer");
	});
});
