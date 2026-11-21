// State debt, civilian stances, bailouts and one-off milestones against the
// real in-memory Postgres. The seed world has three states and five accounts.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { stateTreasury, states, userFirsts, userWallets } from "../schema";
import { STANCE_CONFIG, clampStance, stanceLabel } from "#lib/config/index.js";
import {
	adjustCivilianStance,
	casualtyStancePenalty,
	civilianStance,
	stancesHeldBy,
	stancesToward
} from "../services/politics/civilian-stance";
import { bailoutState, bailoutStanceGain, BailoutError, stateDebt } from "../services/economy/bailout";
import { buyStateBond, redeemBond } from "../services/economy/bonds";
import { reachFirstTime, takeFirstTimeDetail } from "../services/politics/first-time";

let handle: MockDbHandle;
let a: number;
let b: number;
let c: number;

beforeAll(async () => {
	handle = await createMockDb();
	const rows = await handle.db.select({ id: states.id }).from(states).orderBy(states.id);
	[a, b, c] = rows.map((r) => r.id);
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("civilian stance config", () => {
	it("clamps and labels scores", () => {
		expect(clampStance(500)).toBe(STANCE_CONFIG.MAX);
		expect(clampStance(-500)).toBe(STANCE_CONFIG.MIN);
		expect(stanceLabel(-60)).toBe("hostile");
		expect(stanceLabel(0)).toBe("neutral");
		expect(stanceLabel(70)).toBe("warm");
		expect(casualtyStancePenalty(0)).toBe(0);
		expect(casualtyStancePenalty(5000)).toBeLessThan(casualtyStancePenalty(1000));
	});
});

describe("civilian stances", () => {
	it("is neutral until something happens, then accumulates per pair", async () => {
		expect(await civilianStance(handle.db, a, b)).toBe(0);
		await adjustCivilianStance(handle.db, a, b, -18, new Date("2026-01-01T00:00:00Z"));
		await adjustCivilianStance(handle.db, a, b, -5);
		expect(await civilianStance(handle.db, a, b)).toBe(-23);
		// The reverse opinion is unaffected, and a state has no opinion of itself.
		expect(await civilianStance(handle.db, b, a)).toBe(0);
		expect(await adjustCivilianStance(handle.db, a, a, 50)).toBe(0);

		await adjustCivilianStance(handle.db, c, b, 22);
		const towardB = await stancesToward(handle.db, b);
		expect(towardB).toEqual(expect.arrayContaining([expect.objectContaining({ stateId: a, stance: -23 })]));
		const heldByA = await stancesHeldBy(handle.db, a);
		expect(heldByA).toHaveLength(1);
		expect(heldByA[0]!.label).toBe("unfriendly");
	});
});

describe("state debt and bailouts", () => {
	it("credits a bond as debt and clears that debt when it is redeemed", async () => {
		const before = await stateDebt(handle.db, c);
		const bond = await buyStateBond(handle.db, { userId: "user-5", stateId: c, principal: 10_000 });
		expect(await stateDebt(handle.db, c)).toBe(before + 10_000);
		await redeemBond(handle.db, { bondId: bond.id, userId: "user-5" });
		expect(await stateDebt(handle.db, c)).toBe(before);
	});

	it("rejects a bailout below the minimum or to itself", async () => {
		await expect(
			bailoutState(handle.db, { donorStateId: a, recipientStateId: b, amount: 100, authorizedBy: "user-1" })
		).rejects.toThrow(BailoutError);
		await expect(
			bailoutState(handle.db, { donorStateId: a, recipientStateId: a, amount: 20_000, authorizedBy: "user-1" })
		).rejects.toThrow(BailoutError);
	});

	it("moves money, pays down debt and buys goodwill with the rescued civilians", async () => {
		await handle.db
			.update(stateTreasury)
			.set({ debt: 50_000 })
			.where(eq(stateTreasury.stateId, b));
		const donorBefore = await handle.db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, a));
		const recipientBefore = await handle.db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, b));
		const stanceBefore = await civilianStance(handle.db, b, a);

		const result = await bailoutState(handle.db, {
			donorStateId: a,
			recipientStateId: b,
			amount: 20_000,
			authorizedBy: "user-1"
		});
		expect(result.debtRelieved).toBe(20_000);
		expect(result.stanceGain).toBe(bailoutStanceGain(20_000));
		expect(await stateDebt(handle.db, b)).toBe(30_000);

		const donorAfter = await handle.db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, a));
		const recipientAfter = await handle.db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, b));
		expect(Number(donorAfter[0]!.balance)).toBe(Number(donorBefore[0]!.balance) - 20_000);
		expect(Number(recipientAfter[0]!.balance)).toBe(Number(recipientBefore[0]!.balance) + 20_000);
		expect(await civilianStance(handle.db, b, a)).toBe(stanceBefore + result.stanceGain);
	});

	it("cannot spend more than the donor treasury holds", async () => {
		await expect(
			bailoutState(handle.db, { donorStateId: a, recipientStateId: c, amount: 99_000_000, authorizedBy: "user-1" })
		).rejects.toThrow(BailoutError);
	});
});

describe("one-off milestones", () => {
	it("claims a detail exactly once", async () => {
		await reachFirstTime(handle.db, "user-4", "company");
		await reachFirstTime(handle.db, "user-4", "company"); // idempotent
		expect((await handle.db.select().from(userFirsts).where(eq(userFirsts.userId, "user-4"))).length).toBe(1);
		expect(await takeFirstTimeDetail(handle.db, "user-4", "company")).toBe(true);
		expect(await takeFirstTimeDetail(handle.db, "user-4", "company")).toBe(false);
		expect(await takeFirstTimeDetail(handle.db, "user-4", "president")).toBe(false);
	});
});

// Keep the wallet import meaningful: the seed's balances must remain untouched
// by bailouts, which move treasury money only.
it("bailouts never touch player wallets", async () => {
	const wallet = await handle.db.select().from(userWallets).where(eq(userWallets.userId, "user-1"));
	expect(Number(wallet[0]!.balance)).toBe(50_000);
});
