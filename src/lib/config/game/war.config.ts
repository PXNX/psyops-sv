// War resolution configuration
// Wars do not last forever: the war-resolution cron (/api/cron/wars) accumulates
// exhaustion on every active war and ends wars that have gone stale, been
// surrendered or whose side has lost every region.

export const WAR_CONFIG = {
	// Exhaustion an active war gains per hour, regardless of fighting.
	EXHAUSTION_PER_HOUR: 0.5,

	// Exhaustion at which the war is force-ended in a white peace.
	EXHAUSTION_LIMIT: 100,

	// A war with no battle activity for this many days ends as a stalemate.
	STALEMATE_DAYS: 7
} as const;

/** Hours between two dates, as a fraction. */
export function hoursBetween(from: Date, to: Date): number {
	return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

/**
 * Exhaustion after `hoursElapsed` hours of active war. Gains are capped at
 * `max`; a war already at or above the cap gains nothing.
 */
export function accumulateExhaustion(
	current: number,
	hoursElapsed: number,
	perHour: number = WAR_CONFIG.EXHAUSTION_PER_HOUR,
	max: number = WAR_CONFIG.EXHAUSTION_LIMIT
): number {
	if (current >= max || hoursElapsed <= 0) return Math.min(current, max);
	return Math.min(max, current + hoursElapsed * perHour);
}

/** Whether the war's exhaustion has reached the forced-white-peace limit. */
export function isWarExhausted(exhaustion: number, limit: number = WAR_CONFIG.EXHAUSTION_LIMIT): boolean {
	return exhaustion >= limit;
}

/**
 * Whether a war counts as stale: no battle activity for `staleDays` days.
 * `lastActivityAt` is the war's most recent battle timestamp, or its
 * declaration date when it never had a battle.
 */
export function isWarStale(lastActivityAt: Date, now: Date, staleDays: number = WAR_CONFIG.STALEMATE_DAYS): boolean {
	return now.getTime() - lastActivityAt.getTime() >= staleDays * 24 * 60 * 60 * 1000;
}
