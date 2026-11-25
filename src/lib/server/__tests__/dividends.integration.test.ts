// Dividends against a real (in-memory) Postgres with the demo world: the
// pro-rata split and its rounding, the cooldown, the minimums, budget checks,
// and the automatic payout policy.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@rstest/core";
import { and, eq, inArray } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	companies,
	companyBudgets,
	companyShares,
	dividendPayouts,
	inboxMessages,
	shareHoldings,
	shareListings,
	transactionHistory,
	userWallets
} from "../schema";
import {
	DividendError,
	automaticPool,
	declareDividend,
	dividendCooldownEndsAt,
	dividendOverview,
	dividendRuleViolation,
	dividendYieldPercent,
	runAutomaticDividends,
	setDividendPolicy,
	splitDividend
} from "../services/economy/dividends";
import { ECONOMY_CONFIG } from "#lib/config/index.js";

const HOUR = 3600_000;

describe("splitDividend (pure)", () => {
	it("pays every share the same whole amount", () => {
		const split = splitDividend(1000, [
			{ userId: "a", shares: 510 },
			{ userId: "b", shares: 300 },
			{ userId: "c", shares: 190 }
		]);
		expect(split.perShare).toBe(1);
		expect(split.payouts.map((p) => p.amount)).toEqual([510, 300, 190]);
		expect(split.total).toBe(1000);
		expect(split.remainder).toBe(0);
	});

	it("floors to whole currency per share and keeps the remainder", () => {
		const split = splitDividend(2999, [
			{ userId: "a", shares: 600 },
			{ userId: "b", shares: 400 }
		]);
		expect(split.perShare).toBe(2);
		expect(split.payouts.map((p) => p.amount)).toEqual([1200, 800]);
		expect(split.total).toBe(2000);
		expect(split.remainder).toBe(999);
		expect(split.total + split.remainder).toBe(2999);
	});

	it("pays nothing when the pool can't give each share one unit", () => {
		const split = splitDividend(999, [{ userId: "a", shares: 1000 }]);
		expect(split.perShare).toBe(0);
		expect(split.total).toBe(0);
		expect(split.remainder).toBe(999);
	});

	it("ignores empty holdings and copes with no holders", () => {
		expect(splitDividend(500, [{ userId: "a", shares: 0 }]).payouts).toEqual([]);
		expect(splitDividend(500, []).remainder).toBe(500);
	});

	it("computes the automatic pool from the budget above the reserve", () => {
		expect(automaticPool(100_000, 40_000, 50)).toBe(30_000);
		expect(automaticPool(10_000, 40_000, 50)).toBe(0);
		expect(automaticPool(10_001, 0, 33)).toBe(3300);
		expect(automaticPool(10_000, 0, 250)).toBe(10_000);
	});

	it("checks minimums and the budget", () => {
		expect(dividendRuleViolation({ perShare: 0, total: 0 }, 1e9)).toMatch(/per share/);
		expect(dividendRuleViolation({ perShare: 1, total: ECONOMY_CONFIG.DIVIDEND_MIN_TOTAL - 1 }, 1e9)).toMatch(
			/in total/
		);
		expect(dividendRuleViolation({ perShare: 5, total: 5000 }, 4999)).toMatch(/budget/);
		expect(dividendRuleViolation({ perShare: 5, total: 5000 }, 5000)).toBeNull();
	});

	it("reports cooldown and yield", () => {
		const now = new Date("2026-01-02T12:00:00Z");
		expect(dividendCooldownEndsAt(null, now)).toBeNull();
		expect(dividendCooldownEndsAt(new Date(now.getTime() - 25 * HOUR), now)).toBeNull();
		expect(dividendCooldownEndsAt(new Date(now.getTime() - 1 * HOUR), now)?.getTime()).toBe(
			now.getTime() + (ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS - 1) * HOUR
		);
		expect(dividendYieldPercent(5, 100)).toBe(5);
		expect(dividendYieldPercent(1, 3)).toBe(33.3);
		expect(dividendYieldPercent(5, null)).toBeNull();
	});
});

describe("paying dividends", () => {
	let handle: MockDbHandle;
	let companyId: number; // owned by user-1, public: user-1 510 (incl. 10 listed), user-2 300, user-3 190
	let t0: Date;

	const wallet = async (userId: string) =>
		Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]?.balance ?? 0);
	const budget = async () =>
		Number((await handle.db.select().from(companyBudgets).where(eq(companyBudgets.companyId, companyId)))[0]!.balance);
	const setBudget = (balance: number) =>
		handle.db.update(companyBudgets).set({ balance }).where(eq(companyBudgets.companyId, companyId));

	beforeAll(async () => {
		handle = await createMockDb();
		const [company] = await handle.db.select().from(companies).where(eq(companies.name, "Freedonia Mining Corp"));
		companyId = company!.id;
		await handle.db
			.insert(companyShares)
			.values({ companyId, totalShares: 1000, founderLockedShares: 510, ipoPrice: 50 });
		await handle.db.insert(shareHoldings).values([
			{ companyId, userId: "user-1", quantity: 500 },
			{ companyId, userId: "user-2", quantity: 300 },
			{ companyId, userId: "user-3", quantity: 190 }
		]);
		// Shares in escrow on the order book still belong to (and earn for) the seller.
		await handle.db.insert(shareListings).values({ companyId, sellerId: "user-1", quantity: 10, pricePerUnit: 60 });
		t0 = new Date("2026-03-01T10:00:00Z");
	}, 900_000);

	afterAll(async () => {
		await handle?.close();
	});

	beforeEach(async () => {
		await setBudget(200_000);
	});

	it("only lets the owner declare", async () => {
		await expect(
			declareDividend(handle.db, { companyId, userId: "user-2", perShare: 5, now: t0, notify: false })
		).rejects.toThrow(/owner/);
	});

	it("rejects below the minimum and fractional rates without touching anything", async () => {
		await expect(
			declareDividend(handle.db, { companyId, userId: "user-1", perShare: 0, now: t0, notify: false })
		).rejects.toBeInstanceOf(DividendError);
		await expect(
			declareDividend(handle.db, { companyId, userId: "user-1", perShare: 1.5, now: t0, notify: false })
		).rejects.toBeInstanceOf(DividendError);
		const [shares] = await handle.db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
		expect(shares!.lastDividendAt).toBeNull();
	});

	it("refuses when the budget can't cover it, and keeps the cooldown free", async () => {
		await setBudget(4_999);
		await expect(
			declareDividend(handle.db, { companyId, userId: "user-1", perShare: 5, now: t0, notify: false })
		).rejects.toThrow(/budget/);
		expect(await budget()).toBe(4_999);
		const [shares] = await handle.db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
		expect(shares!.lastDividendAt).toBeNull();
	});

	it("pays every holder pro rata in one go", async () => {
		const before = { u1: await wallet("user-1"), u2: await wallet("user-2"), u3: await wallet("user-3") };
		const result = await declareDividend(handle.db, {
			companyId,
			userId: "user-1",
			perShare: 5,
			now: t0,
			notify: false
		});

		expect(result.perShare).toBe(5);
		expect(result.total).toBe(5_000);
		expect(result.recipients).toBe(3);
		expect(await budget()).toBe(195_000);
		expect(await wallet("user-1")).toBe(before.u1 + 2_550); // 500 held + 10 listed
		expect(await wallet("user-2")).toBe(before.u2 + 1_500);
		expect(await wallet("user-3")).toBe(before.u3 + 950);

		const history = await handle.db
			.select()
			.from(transactionHistory)
			.where(and(eq(transactionHistory.transactionType, "dividend_payout"), eq(transactionHistory.userId, "user-2")));
		expect(history).toHaveLength(1);
		expect(Number(history[0]!.amount)).toBe(1_500);
		expect(Number(history[0]!.balanceAfter)).toBe(before.u2 + 1_500);
		expect(history[0]!.description).toBe("Dividend: Freedonia Mining Corp");
		expect(history[0]!.relatedEntityType).toBe("company");
		expect(history[0]!.relatedEntityId).toBe(companyId);

		const rows = await handle.db.select().from(dividendPayouts).where(eq(dividendPayouts.companyId, companyId));
		expect(rows.map((r) => [r.userId, Number(r.amount), r.sharesHeld, Number(r.perShare)]).sort()).toEqual(
			[
				["user-1", 2550, 510, 5],
				["user-2", 1500, 300, 5],
				["user-3", 950, 190, 5]
			].sort()
		);

		const [shares] = await handle.db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
		expect(shares!.lastDividendAt?.getTime()).toBe(t0.getTime());

		// Other holders are told; the owner who declared it isn't.
		const inbox = await handle.db
			.select()
			.from(inboxMessages)
			.where(eq(inboxMessages.subject, "Dividend from Freedonia Mining Corp"));
		expect(inbox.map((m) => m.recipientId).sort()).toEqual(["user-2", "user-3"]);
	});

	it("enforces the cooldown", async () => {
		const later = new Date(t0.getTime() + (ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS - 1) * HOUR);
		await expect(
			declareDividend(handle.db, { companyId, userId: "user-1", perShare: 5, now: later, notify: false })
		).rejects.toThrow(/once every/);
		expect(await budget()).toBe(200_000);
	});

	it("shows the payout in the overview with a yield", async () => {
		const overview = await dividendOverview(handle.db, companyId, "user-2", new Date(t0.getTime() + HOUR));
		expect(overview.history).toHaveLength(1);
		expect(overview.history[0]!.total).toBe(5_000);
		expect(overview.history[0]!.recipients).toBe(3);
		expect(overview.myTotalReceived).toBe(1_500);
		expect(overview.sharePrice).toBe(60); // lowest live ask, ahead of the IPO price
		expect(overview.yieldPercent).toBe(8.3); // 5 paid per share against a 60 ask
	});

	it("quotes a share at the lowest live offer, not a sold-out ask", async () => {
		const extra = await handle.db
			.insert(shareListings)
			.values([
				{ companyId, sellerId: "user-2", quantity: 5, pricePerUnit: 40 },
				{ companyId, sellerId: "user-3", quantity: 0, pricePerUnit: 1 }
			])
			.returning({ id: shareListings.id });
		try {
			expect((await dividendOverview(handle.db, companyId, "user-2")).sharePrice).toBe(40);
		} finally {
			await handle.db.delete(shareListings).where(
				inArray(
					shareListings.id,
					extra.map((r) => r.id)
				)
			);
		}
	});

	it("pays the automatic policy from the budget above the reserve, keeping the remainder", async () => {
		await setDividendPolicy(handle.db, { companyId, userId: "user-1", ratioPercent: 50, reserve: 100_000 });
		await setBudget(110_999); // pool = 50% of 10,999 = 5,499 → 5/share, 499 stays

		// Still on cooldown from the manual payout: nothing happens.
		const early = await runAutomaticDividends(handle.db, { now: new Date(t0.getTime() + 2 * HOUR), notify: false });
		expect(early.paid).toHaveLength(0);

		const now = new Date(t0.getTime() + (ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS + 1) * HOUR);
		const run = await runAutomaticDividends(handle.db, { now, notify: false });
		expect(run.failures).toBe(0);
		expect(run.paid).toHaveLength(1);
		expect(run.paid[0]!.perShare).toBe(5);
		expect(run.paid[0]!.total).toBe(5_000);
		expect(run.paid[0]!.remainder).toBe(499);
		expect(await budget()).toBe(105_999);

		// The owner is told about payouts they didn't trigger.
		const ownerInbox = await handle.db
			.select()
			.from(inboxMessages)
			.where(
				and(eq(inboxMessages.recipientId, "user-1"), eq(inboxMessages.subject, "Dividend from Freedonia Mining Corp"))
			);
		expect(ownerInbox).toHaveLength(1);
	});

	it("skips automatic payouts that would fall under the minimum", async () => {
		await setBudget(100_500); // pool = 250 < minimum
		const now = new Date(t0.getTime() + 3 * ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS * HOUR);
		const run = await runAutomaticDividends(handle.db, { now, notify: false });
		expect(run.paid).toHaveLength(0);
		expect(run.skipped).toBe(1);
		expect(await budget()).toBe(100_500);
	});

	it("validates the policy", async () => {
		await expect(
			setDividendPolicy(handle.db, { companyId, userId: "user-1", ratioPercent: 101, reserve: 0 })
		).rejects.toBeInstanceOf(DividendError);
		await expect(
			setDividendPolicy(handle.db, { companyId, userId: "user-2", ratioPercent: 10, reserve: 0 })
		).rejects.toThrow(/owner/);
	});

	it("turns automatic payouts on by default for a newly filed company", async () => {
		const [other] = (await handle.db.select().from(companies)).filter((c) => c.id !== companyId);
		const [filing] = await handle.db
			.insert(companyShares)
			.values({
				companyId: other!.id,
				totalShares: 100,
				founderLockedShares: 51,
				ipoPrice: 1000
			})
			.returning();
		expect(filing!.dividendPayoutRatio).toBe(ECONOMY_CONFIG.DIVIDEND_DEFAULT_PAYOUT_RATIO);
	});
});
