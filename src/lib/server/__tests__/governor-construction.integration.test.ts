// A governor builds civilian works in their region from the regional budget
// and the regional stockpile; defences and the airbase stay with the state.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	governors,
	ministers,
	regionBudgets,
	regionResourceInventory,
	regions,
	stateBuildings,
	stateResourceInventory
} from "../schema";
import { canOrderConstruction } from "../services/politics/construction-access";
import { ConstructionError, startConstruction } from "../services/politics/construction.service";
import { regionStockpile } from "../services/politics/regional-stockpile";
import { BUILDING_TEMPLATES, GOVERNOR_BUILDINGS } from "#lib/config/index.js";

let handle: MockDbHandle;
let stateId: number;
let regionId: number;
const governorId = "user-2";

const setBudget = (balance: number) =>
	handle.db
		.insert(regionBudgets)
		.values({ regionId, balance })
		.onConflictDoUpdate({ target: regionBudgets.regionId, set: { balance } });
const setStock = async (stock: Record<string, number>) => {
	await handle.db.delete(regionResourceInventory).where(eq(regionResourceInventory.regionId, regionId));
	const rows = Object.entries(stock).map(([resource, quantity]) => ({
		regionId,
		resourceType: resource as never,
		quantity
	}));
	if (rows.length) await handle.db.insert(regionResourceInventory).values(rows);
};
const materials = (type: keyof typeof BUILDING_TEMPLATES) =>
	Object.fromEntries(Object.entries(BUILDING_TEMPLATES[type].costs).filter(([r]) => r !== "currency")) as Record<
		string,
		number
	>;

beforeAll(async () => {
	handle = await createMockDb();
	const [g] = await handle.db
		.select({ regionId: governors.regionId, stateId: regions.stateId })
		.from(governors)
		.innerJoin(regions, eq(governors.regionId, regions.id))
		.where(eq(governors.userId, governorId));
	regionId = g!.regionId;
	stateId = g!.stateId!;
	// A plain governor, no state office.
	await handle.db.delete(ministers).where(eq(ministers.userId, governorId));
	await handle.db.update(regions).set({ infrastructure: 5 }).where(eq(regions.id, regionId));
	await handle.db.delete(stateBuildings).where(eq(stateBuildings.regionId, regionId));
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("governor build permissions", () => {
	it("offers a governor only the civilian subset, paid by the region", async () => {
		const access = await canOrderConstruction(handle.db, governorId, stateId, regionId);
		expect(access.roles).toEqual(["governor"]);
		expect(access.stateTypes).toEqual([]);
		expect([...access.regionTypes].sort()).toEqual([...GOVERNOR_BUILDINGS].sort());
		for (const t of ["airbase", "fortifications", "radar", "datacenter"] as const) {
			expect(access.types).not.toContain(t);
		}
	});

	it("gives nothing to a governor of another region", async () => {
		const [other] = await handle.db.select({ id: regions.id }).from(regions).where(eq(regions.stateId, stateId));
		const otherId = other!.id === regionId ? regionId + 1 : other!.id;
		const access = await canOrderConstruction(handle.db, governorId, stateId, otherId);
		expect(access.regionTypes).toEqual([]);
	});

	it("refuses a state-only building from the regional budget, even with the money", async () => {
		await setBudget(10_000_000);
		await setStock({ steel: 10_000, iron: 10_000, coal: 10_000, copper: 10_000 });
		for (const type of ["fortifications", "radar", "airbase"] as const) {
			await expect(
				startConstruction(handle.db, { stateId, regionId, type, builtBy: governorId, payFrom: "region" })
			).rejects.toThrow(/built by the state/);
		}
	});
});

describe("regional construction materials", () => {
	it("takes the materials from the regional stockpile, not the state's", async () => {
		await handle.db.delete(stateBuildings).where(eq(stateBuildings.regionId, regionId));
		const need = materials("school");
		await setStock(Object.fromEntries(Object.entries(need).map(([r, q]) => [r, q + 7])));
		await setBudget(BUILDING_TEMPLATES.school.costs.currency);
		const stateBefore = await handle.db
			.select()
			.from(stateResourceInventory)
			.where(eq(stateResourceInventory.stateId, stateId));

		await startConstruction(handle.db, {
			stateId,
			regionId,
			type: "school",
			builtBy: governorId,
			payFrom: "region"
		});

		const after = await regionStockpile(handle.db, regionId);
		for (const r of Object.keys(need)) expect(after[r]).toBe(7);
		expect(
			await handle.db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, stateId))
		).toEqual(stateBefore);
	});

	it("refuses when the regional stockpile is short, whatever the state holds", async () => {
		await handle.db.delete(stateBuildings).where(eq(stateBuildings.regionId, regionId));
		await setBudget(10_000_000);
		await setStock({});
		for (const [resource, quantity] of Object.entries(materials("hospital"))) {
			await handle.db
				.insert(stateResourceInventory)
				.values({ stateId, resourceType: resource as never, quantity: quantity * 10 })
				.onConflictDoUpdate({
					target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
					set: { quantity: quantity * 10 }
				});
		}
		await expect(
			startConstruction(handle.db, { stateId, regionId, type: "hospital", builtBy: governorId, payFrom: "region" })
		).rejects.toThrow(/regional stockpile is .* short/);
	});

	it("lets only one of two simultaneous orders use the same materials", async () => {
		await handle.db.delete(stateBuildings).where(eq(stateBuildings.regionId, regionId));
		await setBudget(10_000_000);
		// Enough for exactly one grid level or one radio mast (both need steel).
		await setStock({ steel: 250, copper: 300, coal: 100 });
		const results = await Promise.allSettled([
			startConstruction(handle.db, { stateId, regionId, type: "grid", builtBy: governorId, payFrom: "region" }),
			startConstruction(handle.db, { stateId, regionId, type: "radio_mast", builtBy: governorId, payFrom: "region" })
		]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(results.find((r) => r.status === "rejected")?.reason).toBeInstanceOf(ConstructionError);
		const stock = await regionStockpile(handle.db, regionId);
		for (const q of Object.values(stock)) expect(q).toBeGreaterThanOrEqual(0);
	});
});
