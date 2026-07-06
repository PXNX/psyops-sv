// src/lib/server/service/birthday.ts
// Account "birthday" (creation anniversary) rewards.
//
// A player's birthday is the anniversary of their account creation. On each
// anniversary a reward becomes available. Rewards stay available until
// collected, so if a player misses one or more birthdays the uncollected
// rewards accumulate and are summed up on the next collection.

import { db } from "$lib/server/db";
import { birthdayRewards, userWallets } from "$lib/server/schema";
import { eq, sql } from "drizzle-orm";
import {
	BIRTHDAY_REWARD_AMOUNT,
	computeRewardTotal,
	computeUncollectedYears,
	fullYearsSince,
	isBirthdayToday
} from "./birthday.util";

export { BIRTHDAY_REWARD_AMOUNT } from "./birthday.util";

export interface BirthdayInfo {
	/** Whether today matches the account's creation month and day. */
	isBirthday: boolean;
	/** Full years the account has existed (0 before the first anniversary). */
	totalYears: number;
	/** Anniversary years (1-based) that have not been collected yet. */
	uncollectedYears: number[];
	/** Combined currency the player would receive by collecting now. */
	rewardTotal: number;
	/** Currency granted per uncollected year. */
	rewardPerYear: number;
}

async function getCollectedYears(userId: string): Promise<Set<number>> {
	const collectedRewards = await db
		.select({ year: birthdayRewards.year })
		.from(birthdayRewards)
		.where(eq(birthdayRewards.userId, userId));
	return new Set(collectedRewards.map((r) => r.year));
}

/**
 * Compute the birthday reward state for a user without mutating anything.
 */
export async function getBirthdayInfo(userId: string, createdAt: Date): Promise<BirthdayInfo> {
	const now = new Date();
	const created = new Date(createdAt);
	const totalYears = fullYearsSince(created, now);

	const collectedYears = await getCollectedYears(userId);
	const uncollectedYears = computeUncollectedYears(totalYears, collectedYears);

	return {
		isBirthday: isBirthdayToday(created, now),
		totalYears,
		uncollectedYears,
		rewardTotal: computeRewardTotal(uncollectedYears.length),
		rewardPerYear: BIRTHDAY_REWARD_AMOUNT
	};
}

export type CollectBirthdayResult =
	{ ok: true; collectedYears: number[]; totalReward: number } | { ok: false; reason: "none_available" };

/**
 * Collect every uncollected birthday reward for a user in a single transaction,
 * crediting the summed currency to their wallet. Safe against double-collection:
 * only years actually inserted (respecting the unique constraint) are paid out.
 */
export async function collectBirthdayRewards(userId: string, createdAt: Date): Promise<CollectBirthdayResult> {
	const now = new Date();
	const created = new Date(createdAt);
	const totalYears = fullYearsSince(created, now);

	if (totalYears < 1) {
		return { ok: false, reason: "none_available" };
	}

	return db.transaction(async (tx) => {
		const collectedRewards = await tx
			.select({ year: birthdayRewards.year })
			.from(birthdayRewards)
			.where(eq(birthdayRewards.userId, userId));
		const collectedYears = new Set(collectedRewards.map((r) => r.year));

		const yearsToCollect = computeUncollectedYears(totalYears, collectedYears);
		if (yearsToCollect.length === 0) {
			return { ok: false, reason: "none_available" };
		}

		// Insert one row per year, ignoring any that were already collected
		// concurrently, so we never pay twice for the same anniversary.
		const inserted = await tx
			.insert(birthdayRewards)
			.values(yearsToCollect.map((year) => ({ userId, year })))
			.onConflictDoNothing({ target: [birthdayRewards.userId, birthdayRewards.year] })
			.returning({ year: birthdayRewards.year });

		const collectedYearsList = inserted.map((r) => r.year);
		const totalReward = computeRewardTotal(collectedYearsList.length);

		if (totalReward === 0) {
			return { ok: false, reason: "none_available" };
		}

		const existingWallet = await tx.query.userWallets.findFirst({
			where: eq(userWallets.userId, userId)
		});
		if (existingWallet) {
			await tx
				.update(userWallets)
				.set({ balance: sql`${userWallets.balance} + ${totalReward}` })
				.where(eq(userWallets.userId, userId));
		} else {
			await tx.insert(userWallets).values({ userId, balance: 10000 + totalReward });
		}

		return { ok: true, collectedYears: collectedYearsList, totalReward };
	});
}
