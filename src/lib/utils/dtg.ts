// src/lib/utils/dtg.ts
// NATO DTG (date-time group), the one absolute timestamp format used across
// the app: "12 NOV 2026, 13:44". Times are UTC (Zulu), so a timestamp reads
// the same no matter where the player or the server is located.

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** "12 NOV 2026" */
export function dtgDate(date: Date | string | number): string {
	const d = new Date(date);
	return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "12 NOV" — short axis label, same uppercase month as the full group. */
export function dtgShortDate(date: Date | string | number): string {
	return dtgDate(date).slice(0, 6);
}

/** "13:44" */
export function dtgTime(date: Date | string | number): string {
	const d = new Date(date);
	return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "12 NOV 2026, 13:44" */
export function dtg(date: Date | string | number): string {
	return `${dtgDate(date)}, ${dtgTime(date)}`;
}

/** Compact group for tight overlays: "121344Z NOV 26". */
export function dtgCompact(date: Date | string | number): string {
	const d = new Date(date);
	return `${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCFullYear() % 100)}`;
}

/** UTC calendar key, "2026-11-12" — used to group messages by day. */
export function dtgDayKey(date: Date | string | number): string {
	const d = new Date(date);
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whole UTC days between two moments (positive when `date` is in the past). */
export function dtgDaysAgo(date: Date | string | number, now: Date = new Date()): number {
	const start = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	return Math.round((start(now) - start(new Date(date))) / 86_400_000);
}
