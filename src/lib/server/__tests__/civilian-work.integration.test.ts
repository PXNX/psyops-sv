// Civilians at work against a real (in-memory) Postgres: a factory's free
// shifts are filled from its region's population, the company pays wages,
// earns revenue and the state taxes the wage as income.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { companyBudgets, factories, factoryWorkers, regions, stateTaxes, taxRevenue } from "../schema";
import { runCivilianWork } from "../services/economy/civilian-work";

let handle: MockDbHandle;
let factoryId: number;
let companyId: number;
let regionId: number;
let stateId: number | null;
const now = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	const [row] = await handle.db
		.select({
			factoryId: factories.id,
			companyId: factories.companyId,
			regionId: factories.regionId,
			stateId: regions.stateId
		})
		.from(factories)
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.limit(1);
	factoryId = row!.factoryId;
	companyId = row!.companyId;
	regionId = row!.regionId;
	stateId = row!.stateId;

	// Only this factory may hire, so the result is deterministic.
	await handle.db.update(factories).set({ maxWorkers: 0 });
	await handle.db
		.update(factories)
		.set({ maxWorkers: 10, productionRate: 10, workerWage: 1500 })
		.where(eq(factories.id, factoryId));
	await handle.db.delete(factoryWorkers).where(eq(factoryWorkers.factoryId, factoryId));
	// A mid-level school gives a known, education-driven labour pool.
	await handle.db
		.update(regions)
		.set({ population: 100_000, education: 4 })
		.where(eq(regions.id, regionId));
	await handle.db.update(companyBudgets).set({ balance: 1_000_000 }).where(eq(companyBudgets.companyId, companyId));
	if (stateId != null) {
		await handle.db.insert(stateTaxes).values({ stateId, taxType: "income", taxRate: 10, isActive: true });
	}
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("runCivilianWork", () => {
	it("staffs the free shifts, pays wages, earns revenue and collects income tax", async () => {
		const revenueBefore = (await handle.db.select().from(taxRevenue)).length;
		const result = await runCivilianWork(handle.db, now, 7);
		expect(result.factoriesStaffed).toBe(1);
		expect(result.civiliansEmployed).toBeGreaterThan(0);
		expect(result.civiliansEmployed).toBeLessThanOrEqual(10);
		expect(result.wagesPaid).toBeGreaterThan(0);
		expect(result.revenue).toBeGreaterThan(0);
		if (stateId != null) {
			expect(result.taxCollected).toBeGreaterThan(0);
			expect((await handle.db.select().from(taxRevenue)).length).toBeGreaterThan(revenueBefore);
		}
	});

	it("employs nobody when the company cannot pay a wage", async () => {
		await handle.db.update(companyBudgets).set({ balance: 0 }).where(eq(companyBudgets.companyId, companyId));
		const result = await runCivilianWork(handle.db, now, 7);
		expect(result.factoriesStaffed).toBe(0);
		expect(result.civiliansEmployed).toBe(0);
		expect(result.wagesPaid).toBe(0);
		expect(result.revenue).toBe(0);
	});
});
