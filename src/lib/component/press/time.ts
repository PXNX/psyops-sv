// Short, friendly timestamps for posts and front pages.
import { dtg, dtgDate, dtgTime, dtgDaysAgo } from "#lib/utils/dtg.js";

/** "just now", "5m", "3h", "2d", then the date. */
export function timeAgo(date: Date | string, now = Date.now()): string {
	const then = new Date(date).getTime();
	const minutes = Math.floor((now - then) / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return dtgDate(date);
}

/** Long date for bylines and mastheads, e.g. "18 NOV 2026". */
export function longDate(date: Date | string): string {
	return dtgDate(date);
}

/** NATO DTG: "14:32" today, otherwise "18 NOV 2026, 14:32". */
export function stamp(date: Date | string, now = new Date()): string {
	if (dtgDaysAgo(date, now) === 0) return dtgTime(date);
	return dtg(date);
}
