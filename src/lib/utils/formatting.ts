// src/lib/utils/formatting.ts
import * as m from "#lib/paraglide/messages.js";
import { dtg, dtgDate, dtgTime } from "./dtg.js";

/** "12 NOV 2026" — NATO DTG in UTC. */
export function formatDate(date: Date | string) {
	return dtgDate(date);
}

/** "12 NOV 2026, 13:44" — NATO DTG in UTC. */
export function formatDateTime(dateString: Date | string) {
	return dtg(dateString);
}

/** "13:44" — NATO DTG time in UTC. */
export function formatTime(dateString: Date | string) {
	return dtgTime(dateString);
}

export function getDaysRemaining(expiresAt: Date | string) {
	const now = new Date();
	const expires = new Date(expiresAt);
	const diff = expires.getTime() - now.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Human-readable duration between two dates (e.g. "1y 3mo 5d").
 * If `end` is omitted, the duration is measured up to now.
 */
export function getDurationText(start: Date | string, end?: Date | string | null) {
	const startDate = new Date(start);
	const endDate = end ? new Date(end) : new Date();
	let ms = endDate.getTime() - startDate.getTime();
	if (ms < 0 || Number.isNaN(ms)) ms = 0;
	const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
	const years = Math.floor(totalDays / 365);
	const months = Math.floor((totalDays % 365) / 30);
	const days = totalDays % 30;
	const parts: string[] = [];
	if (years > 0) parts.push(`${years}y`);
	if (months > 0) parts.push(`${months}mo`);
	if (days > 0 || parts.length === 0) parts.push(`${days}d`);
	return parts.join(" ");
}

/** A region's name, in the current language unless `locale` is given. */
export const getRegionName = (regionId: number, locale?: "en" | "de"): string => {
	const messages = m as unknown as Record<
		string,
		((inputs?: object, options?: { locale?: string }) => string) | undefined
	>;
	return messages[`region_${regionId}`]?.({}, locale ? { locale } : undefined) ?? `Region ${regionId}`;
};

/** URL of a region's coat of arms (SVG, from tools/map/fetch-coats.ts). */
export const regionCoatUrl = (regionId: number | string): string => `/coats/${regionId}.svg`;
