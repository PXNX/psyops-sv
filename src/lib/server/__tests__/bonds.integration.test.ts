// State bonds against the real in-memory Postgres: purchase, fortnightly
// coupons, early redemption and maturity all move wallet and treasury money.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { stateTreasury, states, userWallets } from "../schema";
import { bondCoupons, stateBonds } from "../schema-investments";
import {
	BondError,
	bondPortfolio,
	buyStateBond,
	couponAmount,
	redeemBond,
	runBondCoupons
} from "../services/economy/bonds";

const DAY = 86_400_000;
const t0 = new Date("2026-03-02T09:00:00Z");

describe("coupon math", () => {
	it("pays 5% a year in fortnightly slices", () => {
		expect(couponAmount(1_000, 5)).toBe(2);
		expect(couponAmount(10_000, 5)).toBe(19);
		expect(couponAmount(1_000, 0)).toBe(0);
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

		// Nothing is due in the first fortnight.
		expect((await runBondCoupons(handle.db, new Date(t0.getTime() + 13 * DAY))).couponsPaid).toBe(0);

		const first = await runBondCoupons(handle.db, new Date(t0.getTime() + 15 * DAY));
		expect(first.couponsPaid).toBe(1);
		expect(first.interest).toBe(19);
		expect(await wallet()).toBe(before - 10_000 + 19);
		expect((await bondPortfolio(handle.db, "user-1"))[0]!.earned).toBe(19);

		// At 90 days the final coupon and the principal come back together.
		const final = await runBondCoupons(handle.db, new Date(t0.getTime() + 91 * DAY));
		expect(final.matured).toBe(1);
		expect(await wallet()).toBe(before - 10_000 + 19 + 19 + 10_000);
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
