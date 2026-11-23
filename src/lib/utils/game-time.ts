// Game calendar: one real week is one in-game year. Short tactical systems
// (battles, sorties, cron ticks) keep using real time; long-lived institutions
// — bonds, offices, dynasties — use this calendar instead.

export const REAL_DAY_MS = 86_400_000;
export const GAME_YEAR_MS = 7 * REAL_DAY_MS;
export const GAME_EPOCH = Date.UTC(2026, 0, 5); // the first Monday of the era

/** Convert game years to real milliseconds. */
export const gameYearsToMs = (years: number) => years * GAME_YEAR_MS;

/** The in-game year at a real instant. Year 1 starts at the epoch. */
export function gameYear(at: Date | number = Date.now()): number {
	const time = typeof at === "number" ? at : at.getTime();
	return Math.max(1, Math.floor((time - GAME_EPOCH) / GAME_YEAR_MS) + 1);
}

/** Position within the current game year, 0–1. */
export function gameYearProgress(at: Date | number = Date.now()): number {
	const time = typeof at === "number" ? at : at.getTime();
	const offset = ((time - GAME_EPOCH) % GAME_YEAR_MS + GAME_YEAR_MS) % GAME_YEAR_MS;
	return offset / GAME_YEAR_MS;
}

/** A game date, e.g. "Year 4, spring". */
export function gameDate(at: Date | number = Date.now()): string {
	const season = ["winter", "spring", "summer", "autumn"][Math.floor(gameYearProgress(at) * 4)] ?? "winter";
	return `Year ${gameYear(at)}, ${season}`;
}

/** How long until a real timestamp, in game years. */
export function gameYearsUntil(target: Date | number, now: Date | number = Date.now()): number {
	const time = typeof target === "number" ? target : target.getTime();
	const current = typeof now === "number" ? now : now.getTime();
	return Math.max(0, (time - current) / GAME_YEAR_MS);
}
