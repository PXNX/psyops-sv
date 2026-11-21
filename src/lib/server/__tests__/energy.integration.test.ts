// Regional energy against a real (in-memory) Postgres: siting and construction,
// completion into the grid, the daily fuel/upkeep tick and the policy that
// splits refined fuel between civilians, the military and export.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	powerPlants,
	regions,
	stateEnergy,
	stateResourceInventory,
	stateTreasury,
	states
} from "../schema";
import {
	EnergyError,
	completePendingPlants,
	dailyEnergyTick,
	energyAuthority,
	quotePlant,
	setFuelShares,
	startPlantConstruction
} from "../services/economy/energy";

let handle: MockDbHandle;
let stateId: number;
let desertRegion: number;
let plainsRegion: number;
const DAY = 24 * 3600_000;

const balance = async () =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance);
const energy = async () => (await handle.db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)))[0]!;
const stock = async (resource: string) =>
	(
		await handle.db
			.select()
			.from(stateResourceInventory)
			.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resource as never)))
	)[0]?.quantity ?? 0;

beforeAll(async () => {
	handle = await createMockDb();
	stateId = (await handle.db.select().from(states)).find((s) => s.name === "Republic of Freedonia")!.id;
	await handle.db.update(stateTreasury).set({ balance: 100_000_000 }).where(eq(stateTreasury.stateId, stateId));
	await handle.db
		.insert(stateEnergy)
		.values({ stateId, totalProduction: 0, usedProduction: 0, civilianShare: 50, militaryShare: 30, exportShare: 20 })
		.onConflictDoUpdate({
			target: stateEnergy.stateId,
			set: { totalProduction: 0, civilianShare: 50, militaryShare: 30, exportShare: 20 }
		});
	const [desert] = await handle.db
		.insert(regions)
		.values({ latitude: "20.0", longitude: "10.0", stateId, terrain: "desert", infrastructure: 5, grid: 5, storage: 3 })
		.returning({ id: regions.id });
	const [plains] = await handle.db
		.insert(regions)
		.values({ latitude: "55.0", longitude: "12.0", stateId, terrain: "plains", infrastructure: 5, grid: 0, storage: 0 })
		.returning({ id: regions.id });
	desertRegion = desert.id;
	plainsRegion = plains.id;
	const goods: [string, number][] = [
		["silicon", 1000], ["copper", 2000], ["steel", 2000], ["coal", 2000],
		["uranium", 500], ["rare_earth", 500], ["fuel", 1000]
	];
	await handle.db
		.insert(stateResourceInventory)
		.values(goods.map(([resourceType, quantity]) => ({ stateId, resourceType: resourceType as never, quantity })))
		.onConflictDoNothing();
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("energy desk authority and siting", () => {
	it("gives the economy portfolio access", async () => {
		expect(await energyAuthority(handle.db, "user-1")).toEqual({ stateId, role: "president" });
		expect(await energyAuthority(handle.db, "user-9")).toBeNull();
	});

	it("rejects a plant on an unconnected or waterless site", async () => {
		const quote = await quotePlant(handle.db, { stateId, regionId: plainsRegion, plantType: "nuclear" });
		expect(quote.problems.some((p) => p.includes("grid-network level"))).toBe(true);
		expect(quote.problems.some((p) => p.includes("cooling water"))).toBe(true);
	});

	it("rewards a sunny desert for solar", async () => {
		const quote = await quotePlant(handle.db, { stateId, regionId: desertRegion, plantType: "solar" });
		expect(quote.problems).toEqual([]);
		expect(quote.output).toBeGreaterThan(0);
		expect(quote.siting.factor).toBeGreaterThan(1);
	});
});

describe("construction and the grid", () => {
	it("pays for imported parts and completes into a regional plant", async () => {
		const before = await balance();
		const quote = await quotePlant(handle.db, { stateId, regionId: desertRegion, plantType: "solar" });
		const built = await startPlantConstruction(handle.db, {
			stateId,
			regionId: desertRegion,
			plantType: "solar",
			name: "Desert Solar One",
			builtBy: "user-1"
		});
		expect(built.output).toBeGreaterThan(0);
		expect(await balance()).toBe(before - quote.partsCost);

		const pending = await handle.db
			.select()
			.from(powerPlants)
			.where(and(eq(powerPlants.stateId, stateId), eq(powerPlants.regionId, desertRegion)));
		expect(pending).toHaveLength(1);
		expect(pending[0]!.isUnderConstruction).toBe(true);
		expect(pending[0]!.isOperational).toBe(false);

		const done = await completePendingPlants(handle.db, { stateId }, new Date(Date.now() + 10 * DAY));
		expect(done).toBeGreaterThanOrEqual(1);
		const [finished] = await handle.db.select().from(powerPlants).where(eq(powerPlants.id, pending[0]!.id));
		expect(finished!.isUnderConstruction).toBe(false);
		expect(finished!.isOperational).toBe(true);
		expect(finished!.powerOutput).toBeGreaterThan(0);
		expect((await energy()).totalProduction).toBeGreaterThan(0);
	});

	it("charges a rejected build to nothing", async () => {
		await expect(
			startPlantConstruction(handle.db, {
				stateId,
				regionId: plainsRegion,
				plantType: "nuclear",
				name: "Bad Reactor",
				builtBy: "user-1"
			})
		).rejects.toThrow(EnergyError);
	});
});

describe("policy and the daily tick", () => {
	it("validates shares and refuses a bad policy", async () => {
		await expect(setFuelShares(handle.db, stateId, { civilian: 50, military: 50, export: 50 })).rejects.toThrow(EnergyError);
		await setFuelShares(handle.db, stateId, { civilian: 40, military: 40, export: 20 });
		const row = await energy();
		expect(row.civilianShare).toBe(40);
		expect(row.militaryShare).toBe(40);
		expect(row.exportShare).toBe(20);
	});

	it("burns fuel, pays upkeep and fills the three pools", async () => {
		// A coal plant gives the tick a fuel and upkeep bill.
		await handle.db
			.insert(stateResourceInventory)
			.values({ stateId, resourceType: "coal" as never, quantity: 5000 })
			.onConflictDoUpdate({ target: [stateResourceInventory.stateId, stateResourceInventory.resourceType], set: { quantity: 5000 } });
		const [coal] = await handle.db
			.insert(regions)
			.values({ latitude: "45.0", longitude: "14.0", stateId, terrain: "plains", infrastructure: 5, grid: 6, storage: 0 })
			.returning({ id: regions.id });
		await startPlantConstruction(handle.db, {
			stateId,
			regionId: coal.id,
			plantType: "coal",
			name: "Coal Station",
			builtBy: "user-1"
		});
		await completePendingPlants(handle.db, { stateId }, new Date(Date.now() + 20 * DAY));

		const fuelBefore = await stock("fuel");
		const coalBefore = await stock("coal");
		const treasuryBefore = await balance();
		const result = await dailyEnergyTick(handle.db, new Date());
		expect(result.states).toBeGreaterThanOrEqual(1);
		expect(await stock("coal")).toBeLessThan(coalBefore);
		expect(await stock("fuel")).toBeLessThan(fuelBefore);
		const after = await energy();
		expect(after.militaryFuel).toBeGreaterThan(0);
		expect(after.civilianFuel).toBeGreaterThan(0);
		expect(after.exportedFuel).toBeGreaterThan(0);
		expect(after.lastEnergyTickAt).not.toBeNull();
		expect(result.exportRevenue).toBeGreaterThan(0);
		expect(await balance()).toBeGreaterThan(treasuryBefore);
	});
});
