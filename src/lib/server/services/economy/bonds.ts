// src/lib/server/services/economy/bonds.ts
// State bonds: the player lends money to a state treasury and earns a fixed
// coupon every two weeks. Everything that moves money runs in one transaction
// and uses the shared wallet/treasury helpers, so a failed coupon can never
// leave a bond half-paid.
//
// No SvelteKit virtual modules at the top level: integration tests import this
// file directly.

import { and, eq, gt, gte, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { states, stateTreasury, userProfiles } from "../../schema";
import { bondCoupons, stateBondOfferings, stateBonds } from "../../schema-investments";
import { creditWallet, debitWallet, type Executor } from "../../money";
import { canManagePortfolio, stateRoles } from "../government/authority";
import { bondRiskFor } from "./bond-risk.js";
import { INVESTMENTS_CONFIG } from "#lib/config/game/investments.config.js";
import { REAL_DAY_MS, gameYearsToMs } from "#lib/utils/game-time.js";

const DAY = REAL_DAY_MS;
const { BOND_MIN_PRINCIPAL, BOND_TERM_DAYS, COUPON_PERIOD_DAYS } = INVESTMENTS_CONFIG;

/** A bond operation the user should see as a validation error. */
export class BondError extends Error {}

/** One coupon: the annual rate split by how many periods fit in a game year. */
export function couponAmount(principal: number, ratePercent: number): number {
	if (principal <= 0 || ratePercent <= 0) return 0;
	const periodsPerGameYear = gameYearsToMs(1) / (COUPON_PERIOD_DAYS * DAY);
	return Math.round((principal * ratePercent) / 100 / periodsPerGameYear);
}

/** When the next coupon falls due. */
export function nextCouponAt(lastCouponAt: Date | string, now: Date = new Date()): Date {
	const next = new Date(lastCouponAt).getTime() + COUPON_PERIOD_DAYS * DAY;
	// A bond bought before a missed coupon catches up from now, so the cron
	// never pays a whole year of coupons in one run after downtime.
	return next < now.getTime() - COUPON_PERIOD_DAYS * DAY ? new Date(now.getTime()) : new Date(next);
}

/** Only a state's president or economy minister may hand out its bonds. */
export async function canIssueStateBonds(db: Database, userId: string, stateId: number): Promise<boolean> {
	const roles = await stateRoles(db, userId);
	return canManagePortfolio(roles, stateId, "economy_energy");
}

/** Open an offering. Exported so tests can seed one without faking an office. */
export async function createBondOffering(
	db: Database,
	{ authorizedBy, stateId, principal, now = new Date() }: { authorizedBy: string; stateId: number; principal: number; now?: Date }
) {
	if (!Number.isSafeInteger(principal) || principal < BOND_MIN_PRINCIPAL) {
		throw new BondError(`An offering must be at least ${BOND_MIN_PRINCIPAL.toLocaleString()} currency.`);
	}
	const [offering] = await db
		.insert(stateBondOfferings)
		.values({ stateId, authorizedBy, principal, remaining: principal, createdAt: now })
		.returning();
	return offering!;
}

/** Authoritative wrapper: check the office, then open the offering. */
export async function issueBondOffering(
	db: Database,
	{ userId, stateId, principal, now = new Date() }: { userId: string; stateId: number; principal: number; now?: Date }
) {
	if (!(await canIssueStateBonds(db, userId, stateId))) {
		throw new BondError("Only the president or economy minister of this state can issue bonds.");
	}
	return createBondOffering(db, { authorizedBy: userId, stateId, principal, now });
}

/** Every offering investors can still buy, with the official who opened it. */
export async function openBondOfferings(db: Database) {
	return db
		.select({
			id: stateBondOfferings.id,
			stateId: stateBondOfferings.stateId,
			stateName: states.name,
			issuerName: userProfiles.name,
			principal: stateBondOfferings.principal,
			remaining: stateBondOfferings.remaining,
			createdAt: stateBondOfferings.createdAt
		})
		.from(stateBondOfferings)
		.innerJoin(states, eq(states.id, stateBondOfferings.stateId))
		.leftJoin(userProfiles, eq(userProfiles.accountId, stateBondOfferings.authorizedBy))
		.where(gt(stateBondOfferings.remaining, 0))
		.orderBy(states.name, stateBondOfferings.id);
}

/** Offerings opened by one state, for its own leadership view. */
export async function stateBondOfferingsFor(db: Database, stateId: number) {
	return db
		.select({
			id: stateBondOfferings.id,
			principal: stateBondOfferings.principal,
			remaining: stateBondOfferings.remaining,
			createdAt: stateBondOfferings.createdAt,
			issuerName: userProfiles.name
		})
		.from(stateBondOfferings)
		.leftJoin(userProfiles, eq(userProfiles.accountId, stateBondOfferings.authorizedBy))
		.where(eq(stateBondOfferings.stateId, stateId))
		.orderBy(stateBondOfferings.id);
}

/**
 * Buy a slice of an offering: the wallet is debited, the state treasury gets
 * the loan, and the bond records the official who handed it out. The guarded
 * decrement stops two investors racing for the last of an offering.
 */
export async function buyStateBond(
	db: Database,
	{ userId, offeringId, principal, now = new Date() }: { userId: string; offeringId: number; principal: number; now?: Date }
) {
	if (!Number.isSafeInteger(principal) || principal < BOND_MIN_PRINCIPAL) {
		throw new BondError(`A bond must be at least ${BOND_MIN_PRINCIPAL.toLocaleString()} currency.`);
	}
	const [offering] = await db
		.select()
		.from(stateBondOfferings)
		.where(eq(stateBondOfferings.id, offeringId))
		.limit(1);
	if (!offering) throw new BondError("That bond offering no longer exists.");

	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(stateBondOfferings)
			.set({ remaining: sql`${stateBondOfferings.remaining} - ${principal}` })
			.where(
				and(eq(stateBondOfferings.id, offeringId), gte(stateBondOfferings.remaining, principal))
			)
			.returning({ stateId: stateBondOfferings.stateId, authorizedBy: stateBondOfferings.authorizedBy });
		if (!claimed) throw new BondError("That offering no longer has enough left.");
		// The coupon is fixed for the life of this bond, but priced from the
		// borrowing state's risk at the moment it is bought.
		const risk = await bondRiskFor(db, claimed.stateId, now);

		await debitWallet(tx, userId, principal);
		await tx
			.insert(stateTreasury)
			.values({
				stateId: claimed.stateId,
				balance: principal,
				totalCollected: principal,
				totalSpent: 0,
				debt: principal
			})
			.onConflictDoUpdate({
				target: stateTreasury.stateId,
				set: {
					balance: sql`${stateTreasury.balance} + ${principal}`,
					totalCollected: sql`${stateTreasury.totalCollected} + ${principal}`,
					// A bond is a loan: the treasury gains cash and gains debt.
					debt: sql`${stateTreasury.debt} + ${principal}`,
					updatedAt: now
				}
			});
		const [bond] = await tx
			.insert(stateBonds)
			.values({
				userId,
				stateId: claimed.stateId,
				offeringId,
				issuedBy: claimed.authorizedBy,
				principal,
				couponRatePercent: risk.ratePercent,
				purchasedAt: now,
				lastCouponAt: now,
				maturesAt: new Date(now.getTime() + BOND_TERM_DAYS * DAY)
			})
			.returning();
		return bond!;
	});
}

/** Pay a coupon out of the state treasury, creating the payout record. */
async function payCoupon(tx: Executor, bond: typeof stateBonds.$inferSelect, amount: number, now: Date) {
	const [treasury] = await tx
		.update(stateTreasury)
		.set({
			balance: sql`${stateTreasury.balance} - ${amount}`,
			totalSpent: sql`${stateTreasury.totalSpent} + ${amount}`,
			updatedAt: now
		})
		.where(and(eq(stateTreasury.stateId, bond.stateId), gte(stateTreasury.balance, amount)))
		.returning({ balance: stateTreasury.balance });
	if (!treasury) throw new BondError("Treasury cannot cover this coupon.");
	await creditWallet(tx, bond.userId, amount);
	await tx.insert(bondCoupons).values({ bondId: bond.id, amount, paidAt: now });
}

/**
 * The biweekly tick: pay every due coupon and return matured principal.
 * One bond failing (usually an empty treasury) rolls back on its own and
 * never stops the others.
 */
export async function runBondCoupons(db: Database, now = new Date()) {
	const due = await db
		.select()
		.from(stateBonds)
		.where(
			and(
				isNull(stateBonds.redeemedAt),
				lte(stateBonds.lastCouponAt, new Date(now.getTime() - COUPON_PERIOD_DAYS * DAY))
			)
		);
	let couponsPaid = 0;
	let matured = 0;
	let skipped = 0;
	let interest = 0;
	for (const bond of due) {
		try {
			await db.transaction(async (tx) => {
				const amount = couponAmount(bond.principal, bond.couponRatePercent);
				await payCoupon(tx, bond, amount, now);
				if (bond.maturesAt <= now) {
					const [treasury] = await tx
						.update(stateTreasury)
						.set({
							balance: sql`${stateTreasury.balance} - ${bond.principal}`,
							totalSpent: sql`${stateTreasury.totalSpent} + ${bond.principal}`,
							debt: sql`greatest(0, ${stateTreasury.debt} - ${bond.principal})`,
							updatedAt: now
						})
						.where(and(eq(stateTreasury.stateId, bond.stateId), gte(stateTreasury.balance, bond.principal)))
						.returning({ balance: stateTreasury.balance });
					if (!treasury) throw new BondError("Treasury cannot repay this bond.");
					await creditWallet(tx, bond.userId, bond.principal);
					await tx.update(stateBonds).set({ redeemedAt: now }).where(eq(stateBonds.id, bond.id));
					matured++;
				} else {
					await tx
						.update(stateBonds)
						.set({ lastCouponAt: nextCouponAt(bond.lastCouponAt, now) })
						.where(eq(stateBonds.id, bond.id));
				}
			});
			interest += couponAmount(bond.principal, bond.couponRatePercent);
			couponsPaid++;
		} catch {
			skipped++;
		}
	}
	return { couponsPaid, matured, skipped, interest };
}

/** Cash in a bond early: the principal comes back, but no coupon is earned. */
export async function redeemBond(
	db: Database,
	{ bondId, userId, now = new Date() }: { bondId: number; userId: string; now?: Date }
) {
	return db.transaction(async (tx) => {
		const [bond] = await tx
			.select()
			.from(stateBonds)
			.where(and(eq(stateBonds.id, bondId), eq(stateBonds.userId, userId), isNull(stateBonds.redeemedAt)))
			.limit(1);
		if (!bond) throw new BondError("Bond not found or already redeemed.");
		const [treasury] = await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${bond.principal}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${bond.principal}`,
				debt: sql`greatest(0, ${stateTreasury.debt} - ${bond.principal})`,
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, bond.stateId), gte(stateTreasury.balance, bond.principal)))
			.returning({ balance: stateTreasury.balance });
		if (!treasury) throw new BondError("That treasury cannot repay the bond right now.");
		await creditWallet(tx, userId, bond.principal);
		const [redeemed] = await tx
			.update(stateBonds)
			.set({ redeemedAt: now })
			.where(eq(stateBonds.id, bond.id))
			.returning();
		return redeemed!;
	});
}

/** A player's bonds with their interest history and status. */
export async function bondPortfolio(db: Database, userId: string, now = new Date()) {
	const bonds = await db.select().from(stateBonds).where(eq(stateBonds.userId, userId)).orderBy(stateBonds.purchasedAt);
	const coupons = await db
		.select({ bondId: bondCoupons.bondId, amount: bondCoupons.amount })
		.from(bondCoupons)
		.innerJoin(stateBonds, eq(bondCoupons.bondId, stateBonds.id))
		.where(eq(stateBonds.userId, userId));
	return bonds.map((bond) => {
		const earned = coupons.filter((c) => c.bondId === bond.id).reduce((sum, c) => sum + c.amount, 0);
		const status = bond.redeemedAt ? "redeemed" : bond.maturesAt <= now ? "matured" : "active";
		return {
			...bond,
			earned,
			status,
			nextCouponAt: bond.redeemedAt ? null : nextCouponAt(bond.lastCouponAt, now),
			nextCoupon: status === "active" ? couponAmount(bond.principal, bond.couponRatePercent) : 0
		};
	});
}
