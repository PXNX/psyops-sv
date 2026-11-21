// Space, AI and the shadow economy against a real (in-memory) Postgres:
// launching satellites and the bonuses they give, ASAT operations and their
// attribution, AI levels paid in chips and rare earths, and smuggling routes
// whose runs can be delivered or seized.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	governmentBudgetTransactions,
	productInventory,
	regions,
	residences,
	resourceInventory,
	satellites,
	smugglingRoutes,
	smugglingRuns,
	spaceOperations,
	stateProductInventory,
	stateResourceInventory,
	stateSpaceDefence,
	stateTreasury,
	states,
	transactionHistory,
	userWallets
} from "../schema";
import {
	SpaceError,
	launchSatellite,
	launchSpaceOperation,
	nextSpaceDefenceCost,
	satelliteFleet,
	spaceAuthority,
	spaceBonuses,
	spaceDefenceLevel,
	spaceLedger,
	upgradeSpaceDefence
} from "../services/military/space";
import {
	AiError,
	aiAuthority,
	aiBonuses,
	aiLevel,
	upgradeAi
} from "../services/military/ai";
import { SmugglingError, openSmugglingRoute, routesForState, runSmuggling, runsByUser } from "../services/economy/smuggling";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let home: number;
const president = "user-1";
const runner = "user-2";

const HOUR = 3600_000;
const T = new Date();
const at = (h: number) => new Date(T.getTime() + h * HOUR);
const draws = (...xs: number[]) => {
	let i = 0;
	return () => xs[Math.min(i++, xs.length - 1)]!;
};

const balance = async (stateId: number) =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance);

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	home = (await handle.db.select().from(regions).where(eq(regions.stateId, freedonia)))[0]!.id;
	await handle.db.update(stateTreasury).set({ balance: 100_000_000 });
	await handle.db
		.insert(stateProductInventory)
		.values({ stateId: freedonia, productType: "chips", quantity: 5000 })
		.onConflictDoUpdate({ target: [stateProductInventory.stateId, stateProductInventory.productType], set: { quantity: 5000 } });
	await handle.db
		.insert(stateResourceInventory)
		.values({ stateId: freedonia, resourceType: "rare_earth", quantity: 2000 })
		.onConflictDoUpdate({ target: [stateResourceInventory.stateId, stateResourceInventory.resourceType], set: { quantity: 2000 } });
	// The runner lives in Freedonia and has a cargo of chips.
	await handle.db
		.insert(residences)
		.values({ userId: runner, regionId: home, homeRegionId: home })
		.onConflictDoUpdate({ target: residences.userId, set: { regionId: home, homeRegionId: home } });
	await handle.db
		.insert(productInventory)
		.values({ userId: runner, productType: "chips", quantity: 500 })
		.onConflictDoUpdate({ target: [productInventory.userId, productInventory.productType], set: { quantity: 500 } });
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("space programme", () => {
	it("only presidents and defence ministers run the programme", async () => {
		expect(await spaceAuthority(handle.db, president)).toEqual({ stateId: freedonia, role: "president" });
		expect(await spaceAuthority(handle.db, "user-9")).toBeNull();
	});

	it("launches a satellite, paying in money, chips and rare earths", async () => {
		const before = await balance(freedonia);
		const result = await launchSatellite(handle.db, {
			stateId: freedonia,
			launchedBy: president,
			kind: "navigation",
			name: "Pathfinder-1",
			now: at(0)
		});
		expect(result.cost).toBe(300_000);
		expect(result.operationalAt.getTime()).toBe(at(16).getTime());
		expect(await balance(freedonia)).toBe(before - result.cost);
		expect((await satelliteFleet(handle.db, freedonia)).some((s) => s.name === "Pathfinder-1")).toBe(true);
		const bonuses = await spaceBonuses(handle.db, freedonia);
		expect(bonuses.gps).toBeGreaterThan(1);
		expect(bonuses.upkeep).toBeGreaterThan(0);
	});

	it("rejects a satellite without enough chips", async () => {
		await handle.db.update(stateProductInventory).set({ quantity: 1 }).where(eq(stateProductInventory.productType, "chips"));
		await expect(
			launchSatellite(handle.db, { stateId: freedonia, launchedBy: president, kind: "recon", name: "Poor-1", now: at(1) })
		).rejects.toThrow(SpaceError);
		await handle.db.update(stateProductInventory).set({ quantity: 5000 }).where(eq(stateProductInventory.productType, "chips"));
	});

	it("hardens space defence and raises the cost each level", async () => {
		expect(await spaceDefenceLevel(handle.db, sylvania)).toBe(0);
		const cost = await nextSpaceDefenceCost(handle.db, sylvania);
		expect(cost).toBe(120_000);
		await handle.db
			.insert(spaceOperations)
			.values({ stateId: sylvania, kind: "asat_strike", outcome: "success", cost: 0, successChance: 50, attributionChance: 50 });
		// Upgrade uses the caller's authority, so give Sylvania's president the role.
		await expect(upgradeSpaceDefence(handle.db, "user-3")).resolves.toBe(1);
		expect(await spaceDefenceLevel(handle.db, sylvania)).toBe(1);
	});

	it("blinds an enemy satellite and logs attribution", async () => {
		const [target] = await handle.db
			.insert(satellites)
			.values({
				stateId: sylvania,
				name: "Spy-2",
				kind: "recon",
				orbit: "leo",
				health: 100,
				status: "operational",
				operationalAt: at(-10)
			})
			.returning({ id: satellites.id });
		// [success, attribution]
		const result = await launchSpaceOperation(handle.db, {
			stateId: freedonia,
			orderedBy: president,
			kind: "asat_strike",
			targetStateId: sylvania,
			satelliteId: target.id,
			rng: draws(0, 0),
			now: at(5)
		});
		expect(result.succeeded).toBe(true);
		expect(result.satelliteDestroyed).toBe(true);
		expect(result.attributed).toBe(true);
		expect((await handle.db.select().from(spaceOperations).where(eq(spaceOperations.stateId, freedonia))).length).toBe(1);
		expect((await spaceLedger(handle.db, freedonia)).length).toBe(1);
	});
});

describe("artificial intelligence", () => {
	it("only presidents and economy ministers fund the programme", async () => {
		expect(await aiAuthority(handle.db, president)).toEqual({ stateId: freedonia, role: "president" });
		expect(await aiAuthority(handle.db, "user-9")).toBeNull();
	});

	it("raises the level with chips and rare earths, then sharpens the state", async () => {
		expect(await aiLevel(handle.db, freedonia)).toBe(0);
		const result = await upgradeAi(handle.db, president);
		expect(result.level).toBe(1);
		expect(await aiLevel(handle.db, freedonia)).toBe(1);
		const bonuses = await aiBonuses(handle.db, freedonia);
		expect(bonuses.production).toBeGreaterThan(1);
		expect(bonuses.cyberOffence).toBeGreaterThan(0);
		expect((await handle.db.select().from(governmentBudgetTransactions).where(eq(governmentBudgetTransactions.transactionType, "ai_research"))).length).toBe(1);
	});

	it("refuses to upgrade without chips", async () => {
		await handle.db.update(stateProductInventory).set({ quantity: 0 }).where(eq(stateProductInventory.productType, "chips"));
		await expect(upgradeAi(handle.db, president)).rejects.toThrow(AiError);
		await handle.db.update(stateProductInventory).set({ quantity: 5000 }).where(eq(stateProductInventory.productType, "chips"));
	});
});

describe("smuggling", () => {
	it("opens a route with a risk and a premium", async () => {
		const before = await balance(freedonia);
		const route = await openSmugglingRoute(handle.db, {
			stateId: freedonia,
			openedBy: president,
			targetStateId: sylvania,
			good: "chips"
		});
		expect(route.routeId).toBeTruthy();
		expect(route.risk).toBeGreaterThan(0);
		expect(route.premium).toBeGreaterThan(0);
		expect(await balance(freedonia)).toBe(before - 25_000);
		expect((await routesForState(handle.db, freedonia)).length).toBe(1);
	});

	it("delivers a run: cargo is taken and the runner is paid", async () => {
		const route = (await routesForState(handle.db, freedonia))[0]!;
		const walletBefore = Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, runner)))[0]?.balance ?? 0);
		const result = await runSmuggling(handle.db, { userId: runner, routeId: route.id, quantity: 10, rng: draws(0.99, 0.5), now: at(10) });
		expect(result.outcome).toBe("delivered");
		expect(result.payout).toBeGreaterThan(0);
		const walletAfter = Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, runner)))[0]?.balance ?? 0);
		expect(walletAfter).toBe(walletBefore + result.payout);
		expect((await runsByUser(handle.db, runner)).length).toBe(1);
	});

	it("seizes a run: the cargo is lost and a fine is paid", async () => {
		const route = (await routesForState(handle.db, freedonia))[0]!;
		const walletBefore = Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, runner)))[0]?.balance ?? 0);
		const result = await runSmuggling(handle.db, { userId: runner, routeId: route.id, quantity: 5, rng: draws(0, 0), now: at(20) });
		expect(result.outcome).toBe("seized");
		expect(result.fine).toBeGreaterThan(0);
		const walletAfter = Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, runner)))[0]?.balance ?? 0);
		expect(walletAfter).toBe(Math.max(0, walletBefore - result.fine));
		expect((await handle.db.select().from(transactionHistory).where(eq(transactionHistory.transactionType, "smuggling_fine"))).length).toBe(1);
	});

	it("enforces the cooldown and refuses outsiders", async () => {
		const route = (await routesForState(handle.db, freedonia))[0]!;
		await expect(runSmuggling(handle.db, { userId: runner, routeId: route.id, quantity: 1, rng: () => 0.5, now: at(21) })).rejects.toThrow(
			/recently/
		);
		await expect(
			runSmuggling(handle.db, { userId: "user-8", routeId: route.id, quantity: 1, rng: () => 0.5, now: at(30) })
		).rejects.toThrow(SmugglingError);
	});
});
