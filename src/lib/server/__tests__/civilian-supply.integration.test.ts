// Civilian needs are read from the world as it stands: water works finish on
// their own schedule, a starved grid causes brownouts, and a state's hardship
// is the average of its regions.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regions, stateEnergy } from "../schema";
import { civicProjects } from "../schema-investments";
import {
	regionCivilianNeeds,
	regionsCivilianNeeds,
	stateCivilianNeeds
} from "../services/civilians/supply";

let handle: MockDbHandle;
let regionId: number;
let stateId: number;

describe("civilian supply", () => {
	beforeAll(async () => {
		handle = await createMockDb();
		const [region] = await handle.db
			.select({ id: regions.id, stateId: regions.stateId })
			.from(regions)
			.limit(1);
		regionId = region!.id;
		stateId = region!.stateId!;
	}, 900_000);

	afterAll(async () => {
		await handle?.close();
	});

	it("computes all four needs for a real region", async () => {
		const needs = await regionCivilianNeeds(handle.db, regionId);
		expect(needs).not.toBeNull();
		expect(needs!.population).toBeGreaterThan(0);
		for (const key of ["food", "electricity", "heat", "water"] as const) {
			expect(needs![key].demand).toBeGreaterThanOrEqual(0);
			expect(needs![key].sufficiency).toBeGreaterThanOrEqual(0);
			expect(needs![key].sufficiency).toBeLessThanOrEqual(1);
		}
		expect(needs!.hardship).toBeGreaterThanOrEqual(0);
		expect(needs!.hardship).toBeLessThanOrEqual(1);
	});

	it("batches a set of regions and skips unknown ids", async () => {
		const map = await regionsCivilianNeeds(handle.db, [regionId, 999999]);
		expect(map.has(regionId)).toBe(true);
		expect(map.has(999999)).toBe(false);
	});

	it("improves water when a water works completes", async () => {
		const before = (await regionCivilianNeeds(handle.db, regionId))!.water.sufficiency;
		await handle.db.insert(civicProjects).values({
			userId: "user-1",
			regionId,
			buildingType: "water_works",
			completed: false,
			startedAt: new Date("2020-01-01"),
			completesAt: new Date("2020-01-02")
		});
		const after = (await regionCivilianNeeds(handle.db, regionId, new Date("2020-01-03")))!;
		expect(after.water.sufficiency).toBeGreaterThanOrEqual(before);
		const [project] = await handle.db.select().from(civicProjects).where(eq(civicProjects.buildingType, "water_works"));
		expect(project!.completed).toBe(true);
	});

	it("causes brownouts when the state grid is starved", async () => {
		const [row] = await handle.db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId));
		const original = row?.totalProduction ?? 1000;
		if (row) await handle.db.update(stateEnergy).set({ totalProduction: 1 }).where(eq(stateEnergy.stateId, stateId));
		else await handle.db.insert(stateEnergy).values({ stateId, totalProduction: 1, usedProduction: 0 });
		const brownout = (await regionCivilianNeeds(handle.db, regionId))!;
		expect(brownout.electricity.sufficiency).toBeLessThan(1);
		expect(brownout.heat.sufficiency).toBeLessThan(1);
		expect(brownout.shortages).toContain("electricity");
		if (row) await handle.db.update(stateEnergy).set({ totalProduction: original }).where(eq(stateEnergy.stateId, stateId));
	});

	it("aggregates hardship across the state's regions", async () => {
		const summary = await stateCivilianNeeds(handle.db, stateId);
		expect(summary.regions.size).toBeGreaterThan(0);
		expect(summary.hardship).toBeGreaterThanOrEqual(0);
		expect(summary.worstHardship).toBeGreaterThanOrEqual(summary.hardship);
		expect(summary.worst.food).toBeGreaterThanOrEqual(0);
	});
});
