// src/lib/server/service/birthday.util.ts
// Pure (dependency-free) helpers for account birthday reward calculations.
// Kept import-free so they can be unit tested without SvelteKit path aliases.

export const BIRTHDAY_REWARD_AMOUNT = 10000;

const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Number of full years between the account creation date and `now`. */
export function fullYearsSince(createdAt: Date, now: Date): number {
	return Math.floor((now.getTime() - createdAt.getTime()) / MILLISECONDS_PER_YEAR);
}

/**
 * Anniversary years (1-based) that have not yet been collected. Year 1 is the
 * first anniversary. Missed years accumulate here until they are collected.
 */
export function computeUncollectedYears(totalYears: number, collectedYears: Set<number>): number[] {
	const uncollectedYears: number[] = [];
	for (let year = 1; year <= totalYears; year++) {
		if (!collectedYears.has(year)) {
			uncollectedYears.push(year);
		}
	}
	return uncollectedYears;
}

/** Total currency for the given number of uncollected anniversary years. */
export function computeRewardTotal(uncollectedYearCount: number): number {
	return uncollectedYearCount * BIRTHDAY_REWARD_AMOUNT;
}

/** Whether `now` falls on the same month and day as the account creation date. */
export function isBirthdayToday(createdAt: Date, now: Date): boolean {
	return now.getMonth() === createdAt.getMonth() && now.getDate() === createdAt.getDate();
}
