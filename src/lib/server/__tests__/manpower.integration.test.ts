// Recruitment draws civilians out of a region's population pool, inside the
// same transaction that creates the unit. These tests cover the pool itself.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regions } from "../schema";
import { POPULATION_FLOOR } from "#lib/config/index.js";
import { manpowerCheck, regionManpower, reserveManpower } from "../services/military/manpower";

let handle: MockDbHandle;
let regionId: number;

beforeAll(async () => {
	handle = await createMockDb();
	const [r] = await handle.db.select().from(regions).limit(1);
	regionId = r!.id;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

const setPopulation = (n: number) => handle.db.update(regions).set({ population: n }).where(eq(regions.id, regionId));
const stored = async () => (await handle.db.select({ p: regions.population }).from(regions).where(eq(regions.id, regionId)))[0]!.p;

describe("manpower pool", () => {
	it("reads the region's current civilian population", async () => {
		await setPopulation(20_000);
		expect(await regionManpower(handle.db, regionId)).toBe(20_000);
	});

	it("checks affordability against the unit's recruit cost", async () => {
		const check = await manpowerCheck(handle.db, regionId, "infantry");
		expect(check.cost).toBe(8_000);
		expect(check.enough).toBe(true);
	});

	it("converts civilians into soldiers, never below the floor", async () => {
		const after = await handle.db.transaction((tx) => reserveManpower(tx, regionId, 8_000));
		expect(after).toBe(12_000);
		expect(await stored()).toBe(12_000);

		const floored = await handle.db.transaction((tx) => reserveManpower(tx, regionId, 50_000));
		expect(floored).toBe(POPULATION_FLOOR);
		expect(await stored()).toBe(POPULATION_FLOOR);
	});

	it("refuses to raise a unit once the pool is exhausted", async () => {
		const check = await manpowerCheck(handle.db, regionId, "infantry");
		expect(check.enough).toBe(false);
		expect(check.available).toBe(POPULATION_FLOOR);
	});
});
