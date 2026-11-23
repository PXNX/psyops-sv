// State bonds against the real in-memory Postgres: purchase, coupons on the
// game calendar, early redemption and maturity all move wallet and treasury
// money. One real week is one game year, so a coupon is half a game year.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { stateTreasury, states, userWallets } from "../schema";
import { bondCoupons, stateBonds } from "../schema-investments";
import { INVESTMENTS_CONFIG } from "#lib/config/game/investments.config.js";
import {
	BondError,
	bondPortfolio,
	buyStateBond,
	couponAmount,
	redeemBond,
	runBondCoupons
} from "../services/economy/bonds";

const DAY = 86_400_000;
const PERIOD_DAYS = INVESTMENTS_CONFIG.COUPON_PERIOD_DAYS;
const TERM_DAYS = INVESTMENTS_CONFIG.BOND_TERM_DAYS;
const t0 = new Date("2026-03-02T09:00:00Z");

describe("coupon math", () => {
	it("pays 5% a game year in half-year slices", () => {
		expect(couponAmount(1_000, 5)).toBe(25);
		expect(couponAmount(10_000, 5)).toBe(250);
		expect(couponAmount(1_000, 0)).toBe(0);
	});
	it("pays two coupons per game year", () => {
		expect(INVESTMENTS_CONFIG.COUPON_PERIOD_DAYS).toBe(3.5);
		expect(INVESTMENTS_CONFIG.BOND_TERM_DAYS).toBe(84);
	});
});

describe("state bonds", () => {
	let handle: MockDbHandle;
	let stateId: number;

	const wallet = async () =>
		Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, "user-1")))[0]!.balance);
	const treasury = async () =>
		Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance);

	beforeAll(async () => {
		handle = await createMockDb();
		const [state] = await handle.db.select({ id: states.id }).from(states).limit(1);
		stateId = state!.id;
	}, 900_000);

	afterAll(async () => {
		await handle?.close();
	});

	it("rejects a bond below the minimum", async () => {
		await expect(buyStateBond(handle.db, { userId: "user-1", stateId, principal: 999, now: t0 })).rejects.toThrow(
			BondError
		);
	});

	it("buys a bond, pays coupons and returns the principal at maturity", async () => {
		const before = await wallet();
		const beforeTreasury = await treasury();
		const bond = await buyStateBond(handle.db, { userId: "user-1", stateId, principal: 10_000, now: t0 });
		expect(await wallet()).toBe(before - 10_000);
		expect(await treasury()).toBe(beforeTreasury + 10_000);

		// Nothing is due before half a game year has passed.
		expect((await runBondCoupons(handle.db, new Date(t0.getTime() + (PERIOD_DAYS - 0.5) * DAY))).couponsPaid).toBe(0);

		const first = await runBondCoupons(handle.db, new Date(t0.getTime() + (PERIOD_DAYS + 0.5) * DAY));
		expect(first.couponsPaid).toBe(1);
		expect(first.interest).toBe(250);
		expect(await wallet()).toBe(before - 10_000 + 250);
		expect((await bondPortfolio(handle.db, "user-1"))[0]!.earned).toBe(250);

		// At maturity the final coupon and the principal come back together.
		const final = await runBondCoupons(handle.db, new Date(t0.getTime() + (TERM_DAYS + 1) * DAY));
		expect(final.matured).toBe(1);
		expect(await wallet()).toBe(before - 10_000 + 250 + 250 + 10_000);
		const coupons = await handle.db.select().from(bondCoupons).where(eq(bondCoupons.bondId, bond.id));
		expect(coupons).toHaveLength(2);
		expect((await bondPortfolio(handle.db, "user-1"))[0]!.status).toBe("redeemed");
	});

	it("lets the owner cash in early without earning a coupon", async () => {
		const bond = await buyStateBond(handle.db, { userId: "user-2", stateId, principal: 5_000, now: t0 });
		const before = Number(
			(await handle.db.select().from(userWallets).where(eq(userWallets.userId, "user-2")))[0]!.balance
		);
		await redeemBond(handle.db, { bondId: bond.id, userId: "user-2", now: new Date(t0.getTime() + DAY) });
		expect(
			Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, "user-2")))[0]!.balance)
		).toBe(before + 5_000);
		expect((await bondPortfolio(handle.db, "user-2"))[0]!.earned).toBe(0);
		await expect(redeemBond(handle.db, { bondId: bond.id, userId: "user-3" })).rejects.toThrow(BondError);
	});
});
