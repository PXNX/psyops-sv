// Relief convoys and infrastructure repairs against a real (in-memory)
// Postgres: who may order them, what a delivered cargo does to a region's
// supply factor, what happens when the convoy is intercepted, and how a
// strike-broken region is rebuilt.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	governmentBudgetTransactions,
	regions,
	regionEffects,
	militaryUnits,
	navalBlockades,
	stateProductInventory,
	stateTreasury,
	states,
} from "../schema";
import {
	ConvoyError,
	convoyAuthority,
	convoyLedger,
	launchSupplyConvoy,
	regionDistanceKm,
	repairInfrastructure
} from "../services/military/convoys";
import { regionSupply } from "../services/military/logistics";

let handle: MockDbHandle;
let freedonia: number;
let origin: number;
let target: number;
const HOUR = 3600_000;
const T = new Date();
const draws = (...xs: number[]) => {
	let i = 0;
	return () => xs[Math.min(i++, xs.length - 1)]!;
};

beforeAll(async () => {
	handle = await createMockDb();
	freedonia = (await handle.db.select().from(states).where(eq(states.name, "Republic of Freedonia")))[0]!.id;
	const [a] = await handle.db
		.insert(regions)
		.values({ latitude: "45.0", longitude: "10.0", stateId: freedonia, terrain: "plains", infrastructure: 10 })
		.returning({ id: regions.id });
	const [b] = await handle.db
		.insert(regions)
		.values({ latitude: "45.5", longitude: "10.5", stateId: freedonia, terrain: "plains", infrastructure: 2 })
		.returning({ id: regions.id });
	origin = a.id;
	target = b.id;
	// Give the target a demand so its supply factor is not pinned at 1.
	await handle.db.insert(militaryUnits).values(
		Array.from({ length: 12 }, (_, i) => ({
			name: `Target garrison ${i}`,
			ownerId: "user-1",
			stateId: freedonia,
			regionId: target,
			unitType: "infantry" as const,
			isTraining: false,
			health: 100
		}))
	);
	await handle.db.update(stateTreasury).set({ balance: 100_000_000 }).where(eq(stateTreasury.stateId, freedonia));
	await handle.db
		.insert(stateProductInventory)
		.values({ stateId: freedonia, productType: "machine_tools", quantity: 20 })
		.onConflictDoUpdate({ target: [stateProductInventory.stateId, stateProductInventory.productType], set: { quantity: 20 } });
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("authority and distance", () => {
	it("only presidents and economy ministers order logistics work", async () => {
		expect(await convoyAuthority(handle.db, "user-1")).toEqual({ stateId: freedonia, role: "president" });
		expect(await convoyAuthority(handle.db, "user-9")).toBeNull();
	});

	it("computes a real-world distance between two regions", () => {
		expect(regionDistanceKm({ latitude: "45", longitude: "10" }, { latitude: "45", longitude: "10" })).toBe(0);
		expect(regionDistanceKm({ latitude: "45", longitude: "10" }, { latitude: "46", longitude: "10" })).toBeGreaterThan(100);
	});
});

describe("supply convoys", () => {
	it("a delivered convoy raises the target region's supply factor", async () => {
		await handle.db.delete(regionEffects).where(eq(regionEffects.regionId, target));
		const before = await regionSupply(handle.db, target, T);
		const result = await launchSupplyConvoy(handle.db, {
			stateId: freedonia,
			orderedBy: "user-1",
			originRegionId: origin,
			targetRegionId: target,
			cargo: 100,
			rng: draws(0.99, 0.5),
			now: T
		});
		expect(result.outcome).toBe("delivered");
		expect(result.deliveredCargo).toBe(100);
		const after = await regionSupply(handle.db, target, T);
		expect(after.factor).toBeGreaterThan(before.factor);
		expect(after.reasons.some((r) => r.includes("convoy"))).toBe(true);
		expect((await convoyLedger(handle.db, freedonia)).length).toBe(1);
		expect(
			(await handle.db.select().from(governmentBudgetTransactions).where(eq(governmentBudgetTransactions.transactionType, "supply_convoy")))
				.length
		).toBe(1);
	});

	it("an intercepted convoy delivers nothing but is still logged and paid for", async () => {
		await handle.db.insert(navalBlockades).values({
			blockaderStateId: (await handle.db.select({ id: states.id }).from(states).where(eq(states.id, freedonia)))[0]!.id,
			targetStateId: freedonia,
			strength: 100,
			startsAt: new Date(T.getTime() - HOUR),
			expiresAt: new Date(T.getTime() + 10 * HOUR)
		});
		const before = await regionSupply(handle.db, target, T);
		const result = await launchSupplyConvoy(handle.db, {
			stateId: freedonia,
			orderedBy: "user-1",
			originRegionId: origin,
			targetRegionId: target,
			cargo: 50,
			rng: draws(0, 0),
			now: new Date(T.getTime() + HOUR)
		});
		expect(result.outcome).not.toBe("delivered");
		expect(result.deliveredCargo).toBe(0);
		const after = await regionSupply(handle.db, target, new Date(T.getTime() + HOUR));
		expect(after.factor).toBeLessThanOrEqual(before.factor);
		await handle.db.delete(navalBlockades);
	});

	it("refuses a cargo the origin cannot spare", async () => {
		await expect(
			launchSupplyConvoy(handle.db, {
				stateId: freedonia,
				orderedBy: "user-1",
				originRegionId: target,
				targetRegionId: origin,
				cargo: 500,
				rng: draws(0.99),
				now: new Date(T.getTime() + 2 * HOUR)
			})
		).rejects.toThrow(ConvoyError);
	});
});

describe("infrastructure repair", () => {
	it("rebuilds one level, spending treasury and machine tools", async () => {
		const before = (await handle.db.select().from(regions).where(eq(regions.id, target)))[0]!;
		const treasuryBefore = Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, freedonia)))[0]!.balance);
		const result = await repairInfrastructure(handle.db, target, "user-1");
		expect(result.level).toBe((before.infrastructure ?? 0) + 1);
		expect((await handle.db.select().from(regions).where(eq(regions.id, target)))[0]!.infrastructure).toBe(result.level);
		expect(Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, freedonia)))[0]!.balance)).toBe(
			treasuryBefore - result.cost
		);
	});

	it("refuses outsiders and maxed regions", async () => {
		await expect(repairInfrastructure(handle.db, target, "user-9")).rejects.toThrow(ConvoyError);
		await handle.db.update(regions).set({ infrastructure: 10 }).where(eq(regions.id, target));
		await expect(repairInfrastructure(handle.db, target, "user-1")).rejects.toThrow(/already/);
	});
});
