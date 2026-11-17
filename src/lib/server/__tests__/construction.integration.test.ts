// Public construction against a real (in-memory) Postgres with the demo world.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { accounts, regions, stateBuildings, stateResourceInventory, stateTreasury } from "../schema";
import {
	ConstructionError,
	checkConstruction,
	completePendingConstructions,
	startConstruction
} from "../services/politics/construction.service";
import { BUILDING_TEMPLATES } from "#lib/config/index.js";

let handle: MockDbHandle;
let stateId: number;
let regionId: number;
let userId: string;

const treasury = async () =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance;
const stock = async (resource: string) =>
	(
		await handle.db
			.select()
			.from(stateResourceInventory)
			.where(
				and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resource as never))
			)
	)[0]?.quantity ?? 0;

async function fund(money: number, resources: Record<string, number>) {
	await handle.db.update(stateTreasury).set({ balance: money }).where(eq(stateTreasury.stateId, stateId));
	for (const [resourceType, quantity] of Object.entries(resources)) {
		await handle.db
			.insert(stateResourceInventory)
			.values({ stateId, resourceType: resourceType as never, quantity })
			.onConflictDoUpdate({
				target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
				set: { quantity }
			});
	}
}

beforeAll(async () => {
	handle = await createMockDb();
	const [t] = await handle.db.select().from(stateTreasury).limit(1);
	stateId = t!.stateId;
	const [r] = await handle.db.select().from(regions).where(eq(regions.stateId, stateId)).limit(1);
	regionId = r!.id;
	await handle.db
		.update(regions)
		.set({ infrastructure: 0, education: 0, hospitals: 0, economy: 0, fortifications: 0 })
		.where(eq(regions.id, regionId));
	userId = (await handle.db.select().from(accounts).limit(1))[0]!.id;
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("checkConstruction", () => {
	const region = { infrastructure: 0, education: 0, hospitals: 0, economy: 0, fortifications: 0 };
	const rich = { treasury: 1e12, stockpile: new Proxy({}, { get: () => 1e9 }) as Record<string, number> };

	it("needs infrastructure before bigger projects", () => {
		expect(checkConstruction({ type: "infrastructure", quantity: 1, region, pending: 0, ...rich }).ok).toBe(true);
		const hospital = checkConstruction({ type: "hospital", quantity: 1, region, pending: 0, ...rich });
		expect(hospital.ok).toBe(false);
		expect(hospital.problems.join()).toContain("infrastructure level 2");
	});

	it("builds one level at a time, up to the maximum", () => {
		const max = BUILDING_TEMPLATES.school.maxLevel;
		const almost = { ...region, infrastructure: 5, education: max - 1 };
		expect(checkConstruction({ type: "school", quantity: 1, region: almost, pending: 0, ...rich }).ok).toBe(true);
		expect(checkConstruction({ type: "school", quantity: 2, region: almost, pending: 0, ...rich }).ok).toBe(false);
		expect(checkConstruction({ type: "school", quantity: 1, region: almost, pending: 1, ...rich }).ok).toBe(false);
		const full = { ...almost, education: max };
		expect(checkConstruction({ type: "school", quantity: 1, region: full, pending: 0, ...rich }).ok).toBe(false);
	});

	it("names what the state is short of", () => {
		const check = checkConstruction({
			type: "infrastructure",
			quantity: 1,
			region,
			pending: 0,
			treasury: 0,
			stockpile: {}
		});
		expect(check.ok).toBe(false);
		expect(check.problems.some((p) => p.includes("treasury"))).toBe(true);
		expect(check.problems.some((p) => p.includes("steel"))).toBe(true);
	});
});

describe("startConstruction / completePendingConstructions", () => {
	it("refuses and charges nothing when the state can't pay", async () => {
		await fund(10, {});
		await expect(
			startConstruction(handle.db, { stateId, regionId, type: "infrastructure", quantity: 1, builtBy: userId })
		).rejects.toBeInstanceOf(ConstructionError);
		expect(await treasury()).toBe(10);
	});

	it("charges treasury and stockpile and queues the buildings", async () => {
		const { costs } = BUILDING_TEMPLATES.infrastructure;
		await fund(costs.currency + 5, { steel: 1000, wood: 1000, coal: 1000 });
		await startConstruction(handle.db, { stateId, regionId, type: "infrastructure", builtBy: userId });

		expect(await treasury()).toBe(5);
		expect(await stock("steel")).toBe(1000 - costs.steel!);
		const queued = await handle.db
			.select()
			.from(stateBuildings)
			.where(and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, true)));
		expect(queued).toHaveLength(1);
	});

	it("won't start the next level while one is going up", async () => {
		await fund(1e7, { steel: 1000, wood: 1000, coal: 1000 });
		await expect(
			startConstruction(handle.db, { stateId, regionId, type: "infrastructure", builtBy: userId })
		).rejects.toThrow("still under construction");
	});

	it("raises the region's level once the building is finished, and only once", async () => {
		await handle.db
			.update(stateBuildings)
			.set({ constructionCompletesAt: new Date(Date.now() - 1000) })
			.where(eq(stateBuildings.regionId, regionId));
		const [a, b] = await Promise.all([
			completePendingConstructions(handle.db, { regionId }),
			completePendingConstructions(handle.db, { regionId })
		]);
		expect(a + b).toBe(1);
		const [region] = await handle.db.select().from(regions).where(eq(regions.id, regionId));
		expect(region!.infrastructure).toBe(1);
	});

	it("now allows a school, which needs infrastructure 1", async () => {
		await fund(1e7, { steel: 1000, wood: 1000 });
		await expect(
			startConstruction(handle.db, { stateId, regionId, type: "school", builtBy: userId })
		).resolves.toBeTruthy();
	});

	it("refuses a region of another state", async () => {
		const [other] = await handle.db
			.select()
			.from(regions)
			.where(eq(regions.stateId, stateId + 1));
		if (!other) return;
		await expect(
			startConstruction(handle.db, {
				stateId,
				regionId: other.id,
				type: "infrastructure",
				quantity: 1,
				builtBy: userId
			})
		).rejects.toThrow("doesn't belong");
	});
});
