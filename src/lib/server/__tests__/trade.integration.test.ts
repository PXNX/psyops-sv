// Air and sea trade against a real (in-memory) Postgres: opening lanes,
// collecting revenue, and how an airspace closure cuts a rival's income.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { governmentBudgetTransactions, stateTreasury, states } from "../schema";
import {
	TradeError,
	closureAuthority,
	closeZone,
	collectTradeRevenue,
	lanesOf,
	openTradeLane,
	tradeAuthority,
	tradeFactors,
	zoneStrengthOn
} from "../services/economy/trade";
import { laneRevenue } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
const HOUR = 3600_000;
const T = new Date();
const balance = async (id: number) =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, id)))[0]!.balance);

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	await handle.db.update(stateTreasury).set({ balance: 100_000_000 });
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("authority and lanes", () => {
	it("separates economic and security portfolios", async () => {
		expect(await tradeAuthority(handle.db, "user-1")).toEqual({ stateId: freedonia, role: "president" });
		expect(await closureAuthority(handle.db, "user-1")).toEqual({ stateId: freedonia, role: "president" });
		expect(await tradeAuthority(handle.db, "user-9")).toBeNull();
	});

	it("opens an air lane and collects one cycle of revenue", async () => {
		const before = await balance(freedonia);
		const result = await openTradeLane(handle.db, {
			stateId: freedonia,
			openedBy: "user-1",
			partnerStateId: sylvania,
			kind: "air",
			capacity: 50
		});
		expect(result.cost).toBe(600_000);
		expect(await balance(freedonia)).toBe(before - result.cost);
		expect((await lanesOf(handle.db, freedonia)).length).toBe(1);

		const paid = await collectTradeRevenue(handle.db, T);
		expect(paid.lanes).toBeGreaterThanOrEqual(1);
		expect(await balance(freedonia)).toBe(before - result.cost + laneRevenue("air", 50, 1));
	});

	it("refuses a duplicate lane", async () => {
		await expect(
			openTradeLane(handle.db, {
				stateId: freedonia,
				openedBy: "user-1",
				partnerStateId: sylvania,
				kind: "air",
				capacity: 50
			})
		).rejects.toThrow(TradeError);
	});
});

describe("closures", () => {
	it("an enemy airspace closure grounds our air freight", async () => {
		const before = await tradeFactors(handle.db, freedonia, T);
		const result = await closeZone(handle.db, {
			stateId: sylvania,
			orderedBy: "user-3",
			kind: "airspace",
			targetStateId: freedonia,
			hours: 24,
			now: T
		});
		expect(result.cost).toBeGreaterThan(0);
		expect(await zoneStrengthOn(handle.db, freedonia, "airspace", T)).toBeCloseTo(1);
		const after = await tradeFactors(handle.db, freedonia, T);
		expect(after.air).toBeLessThan(before.air);
		expect(after.sea).toBe(before.sea);

		const paid = await collectTradeRevenue(handle.db, new Date(T.getTime() + HOUR));
		expect(paid.total).toBeGreaterThan(0);
		expect(
			(await handle.db.select().from(governmentBudgetTransactions).where(eq(governmentBudgetTransactions.transactionType, "zone_closure")))
				.length
		).toBe(1);
	});

	it("enforces a cooldown on repeated closures", async () => {
		await expect(
			closeZone(handle.db, {
				stateId: sylvania,
				orderedBy: "user-3",
				kind: "airspace",
				targetStateId: freedonia,
				hours: 24,
				now: new Date(T.getTime() + 2 * HOUR)
			})
		).rejects.toThrow(/recently/);
	});
});
