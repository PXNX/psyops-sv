// Short, friendly timestamps for posts and front pages.
import { formatDate } from "#lib/utils/formatting.js";

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
	return formatDate(date);
}

/** Long date for bylines and mastheads, e.g. "18 November 2026". */
export function longDate(date: Date | string): string {
	return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Compact mono timestamp: "14:32" today, otherwise "18.11.2026 14:32". */
export function stamp(date: Date | string, now = new Date()): string {
	const d = new Date(date);
	const pad = (n: number) => String(n).padStart(2, "0");
	const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	if (d.toDateString() === now.toDateString()) return time;
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${time}`;
}
