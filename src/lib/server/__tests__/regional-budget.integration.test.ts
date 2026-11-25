// Regional budgets against a real (in-memory) Postgres with the demo world:
// tax collected in a region is split with the state, and only the governor
// spends the region's share, never more than it holds.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	governors,
	presidents,
	regionBudgetLedger,
	regionBudgets,
	regions,
	stateBuildings,
	stateResourceInventory,
	stateTaxes,
	stateTreasury,
	states
} from "../schema";
import { calculateAndCollectTax } from "../taxes";
import {
	RegionalBudgetError,
	regionBudgetSummary,
	setRegionShareOverride,
	setStateRegionalShare,
	startProgramme
} from "../services/politics/regional-budget";
import { regionOpinionBreakdown } from "../services/politics/civic.service";
import { ConstructionError, startConstruction } from "../services/politics/construction.service";
import { BUILDING_TEMPLATES, REGIONAL_PROGRAMMES } from "#lib/config/index.js";

let handle: MockDbHandle;
let stateId: number;
let regionId: number;
let governorId: string;
let presidentId: string;

const treasury = async () =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance;
const budget = async () =>
	(await handle.db.select().from(regionBudgets).where(eq(regionBudgets.regionId, regionId)))[0]?.balance ?? 0;
const setBudget = (balance: number) =>
	handle.db
		.insert(regionBudgets)
		.values({ regionId, balance })
		.onConflictDoUpdate({ target: regionBudgets.regionId, set: { balance } });

beforeAll(async () => {
	handle = await createMockDb();
	const [g] = await handle.db
		.select({ userId: governors.userId, regionId: governors.regionId, stateId: regions.stateId })
		.from(governors)
		.innerJoin(regions, eq(governors.regionId, regions.id))
		.where(eq(governors.userId, "user-2"));
	governorId = g!.userId;
	regionId = g!.regionId;
	stateId = g!.stateId!;
	presidentId = (await handle.db.select().from(presidents).where(eq(presidents.stateId, stateId)))[0]!.userId;
	await handle.db.delete(regionBudgetLedger);
	await handle.db.delete(regionBudgets);
	await handle.db.update(states).set({ regionalTaxShare: 20 }).where(eq(states.id, stateId));
	await handle.db.insert(stateTaxes).values({ stateId, taxType: "income", taxRate: 10, isActive: true });
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("tax collection", () => {
	it("splits tax raised in a region between its budget and the treasury", async () => {
		const before = await treasury();
		const tax = await calculateAndCollectTax(stateId, "income", 10_000, governorId, handle.db, regionId);
		expect(tax.taxAmount).toBe(1000);
		expect(await budget()).toBe(200);
		expect((await treasury()) - before).toBe(800);
		const [line] = await handle.db.select().from(regionBudgetLedger).where(eq(regionBudgetLedger.regionId, regionId));
		expect(line).toMatchObject({ kind: "tax_share", amount: 200, balanceAfter: 200 });
	});

	it("sends everything to the treasury when no region is given", async () => {
		const [b, t] = [await budget(), await treasury()];
		await calculateAndCollectTax(stateId, "income", 10_000, governorId, handle.db);
		expect(await budget()).toBe(b);
		expect((await treasury()) - t).toBe(1000);
	});

	it("follows a region's override over the state share", async () => {
		await setRegionShareOverride(handle.db, { stateId, regionId, userId: presidentId, share: 50 });
		const b = await budget();
		await calculateAndCollectTax(stateId, "income", 10_000, governorId, handle.db, regionId);
		expect((await budget()) - b).toBe(500);
		await setRegionShareOverride(handle.db, { stateId, regionId, userId: presidentId, share: null });
	});
});

describe("setting the share", () => {
	it("lets the president set it, clamped to the maximum", async () => {
		expect(await setStateRegionalShare(handle.db, { stateId, userId: presidentId, share: 80 })).toBe(50);
		await setStateRegionalShare(handle.db, { stateId, userId: presidentId, share: 20 });
	});

	it("refuses a governor or anyone else", async () => {
		await expect(setStateRegionalShare(handle.db, { stateId, userId: governorId, share: 30 })).rejects.toThrow(
			RegionalBudgetError
		);
	});
});

describe("governor spending", () => {
	it("starts a programme, debits the budget, records it and lifts opinion", async () => {
		const festival = REGIONAL_PROGRAMMES.festival;
		await setBudget(festival.cost + 500);
		await startProgramme(handle.db, { regionId, userId: governorId, kind: "festival" });
		expect(await budget()).toBe(500);
		const summary = await regionBudgetSummary(handle.db, regionId, governorId);
		expect(summary.isGovernor).toBe(true);
		expect(summary.programmes.map((p) => p.kind)).toContain("festival");
		expect(summary.ledger[0]).toMatchObject({ kind: "programme", amount: -festival.cost, balanceAfter: 500 });
		const breakdown = await regionOpinionBreakdown(handle.db, regionId);
		expect(breakdown!.components.find((c) => c.key === "programmes")?.points).toBe(festival.opinion);
	});

	it("refuses a non-governor, a running duplicate and an empty budget", async () => {
		await setBudget(1_000_000);
		await expect(startProgramme(handle.db, { regionId, userId: presidentId, kind: "relief" })).rejects.toThrow(
			/governor/
		);
		await expect(startProgramme(handle.db, { regionId, userId: governorId, kind: "festival" })).rejects.toThrow(
			/already running/
		);
		await setBudget(0);
		await expect(startProgramme(handle.db, { regionId, userId: governorId, kind: "relief" })).rejects.toThrow(/short/);
	});

	it("lets only one of two simultaneous orders spend the same money", async () => {
		const relief = REGIONAL_PROGRAMMES.relief;
		const cleanup = REGIONAL_PROGRAMMES.cleanup;
		await setBudget(Math.max(relief.cost, cleanup.cost));
		const results = await Promise.allSettled([
			startProgramme(handle.db, { regionId, userId: governorId, kind: "relief" }),
			startProgramme(handle.db, { regionId, userId: governorId, kind: "cleanup" })
		]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(await budget()).toBeGreaterThanOrEqual(0);
	});

	it("pays public works from the regional budget, materials from the stockpile", async () => {
		await handle.db.update(regions).set({ infrastructure: 0 }).where(eq(regions.id, regionId));
		await handle.db.delete(stateBuildings).where(eq(stateBuildings.regionId, regionId));
		const template = BUILDING_TEMPLATES.infrastructure;
		for (const [resource, quantity] of Object.entries(template.costs)) {
			if (resource === "currency") continue;
			await handle.db
				.insert(stateResourceInventory)
				.values({ stateId, resourceType: resource as never, quantity: quantity * 2 })
				.onConflictDoUpdate({
					target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
					set: { quantity: quantity * 2 }
				});
		}
		const cost = template.costs.currency ?? 0;
		await setBudget(cost);
		const t = await treasury();
		await expect(
			startConstruction(handle.db, {
				stateId,
				regionId,
				type: "infrastructure",
				builtBy: presidentId,
				payFrom: "region"
			})
		).rejects.toThrow(ConstructionError);
		await startConstruction(handle.db, {
			stateId,
			regionId,
			type: "infrastructure",
			builtBy: governorId,
			payFrom: "region"
		});
		expect(await budget()).toBe(0);
		expect(await treasury()).toBe(t);
		const [line] = await handle.db
			.select()
			.from(regionBudgetLedger)
			.where(and(eq(regionBudgetLedger.regionId, regionId), eq(regionBudgetLedger.kind, "construction")));
		expect(line?.amount).toBe(-cost);
	});
});
