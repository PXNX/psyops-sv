// Research money and levels against a real in-memory Postgres: presidents and
// the responsible minister may fund a field, prerequisites gate advanced work,
// and the treasury and ledger stay in step.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { governmentBudgetTransactions, ministers, stateResearch, stateTreasury, states } from "../schema";
import { RESEARCH_AREAS, researchCost } from "#lib/config/index.js";
import {
	ResearchError,
	creditResearchPoints,
	fundResearch,
	researchLevels,
	researchPoints
} from "../services/government/research";

let handle: MockDbHandle;
let freedonia: number;
let balanceBefore: number;

const president = "user-1";
const scienceMinister = "user-2";
const outsider = "user-9";

beforeAll(async () => {
	handle = await createMockDb();
	freedonia = (await handle.db.select().from(states).where(eq(states.name, "Republic of Freedonia")))[0]!.id;
	await handle.db.update(stateTreasury).set({ balance: 10_000_000 }).where(eq(stateTreasury.stateId, freedonia));
	balanceBefore = Number(
		(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, freedonia)))[0]!.balance
	);
	await handle.db.insert(ministers).values({ userId: scienceMinister, stateId: freedonia, ministry: "health" });
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

const treasury = async () =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, freedonia)))[0]!.balance);

describe("funding research", () => {
	it("charges the treasury and advances the field for the president", async () => {
		const cost = researchCost("health", 0)!;
		const result = await fundResearch(handle.db, { stateId: freedonia, area: "health", fundedBy: president });
		expect(result).toEqual({ area: "health", level: 1, cost });
		expect(await treasury()).toBe(balanceBefore - cost);
		expect((await researchLevels(handle.db, freedonia)).health).toBe(1);
		const [ledger] = await handle.db
			.select()
			.from(governmentBudgetTransactions)
			.where(eq(governmentBudgetTransactions.transactionType, "research"));
		expect(ledger?.authorizedBy).toBe(president);
		expect(ledger?.amount).toBe(cost);
	});

	it("lets the responsible minister unlock a dependent field", async () => {
		const cost = researchCost("antivirus", 0)!;
		const result = await fundResearch(handle.db, { stateId: freedonia, area: "antivirus", fundedBy: scienceMinister });
		expect(result).toEqual({ area: "antivirus", level: 1, cost });
		expect((await researchLevels(handle.db, freedonia)).antivirus).toBe(1);
	});

	it("refuses outsiders and locked or maxed fields", async () => {
		await expect(
			fundResearch(handle.db, { stateId: freedonia, area: "production", fundedBy: outsider })
		).rejects.toThrow(ResearchError);
		await expect(fundResearch(handle.db, { stateId: freedonia, area: "space", fundedBy: president })).rejects.toThrow(
			ResearchError
		);
		await handle.db
			.insert(stateResearch)
			.values({ stateId: freedonia, area: "production", level: RESEARCH_AREAS.production.maxLevel, points: 0 })
			.onConflictDoUpdate({
				target: [stateResearch.stateId, stateResearch.area],
				set: { level: RESEARCH_AREAS.production.maxLevel }
			});
		await expect(
			fundResearch(handle.db, { stateId: freedonia, area: "production", fundedBy: president })
		).rejects.toThrow(ResearchError);
	});

	it("rejects an area that does not exist", async () => {
		await expect(
			fundResearch(handle.db, { stateId: freedonia, area: "nonsense", fundedBy: president })
		).rejects.toThrow(ResearchError);
	});
});

describe("banked research points", () => {
	it("accumulates and ignores negative or fractional grants", async () => {
		await creditResearchPoints(handle.db, freedonia, 5.9);
		await creditResearchPoints(handle.db, freedonia, -10);
		expect(await researchPoints(handle.db, freedonia)).toBe(5);
		const [row] = await handle.db
			.select()
			.from(stateResearch)
			.where(and(eq(stateResearch.stateId, freedonia), eq(stateResearch.area, "points")));
		expect(row?.level).toBe(0);
	});
});
