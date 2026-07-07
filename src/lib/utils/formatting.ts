// src/lib/utils/formatting.ts
import * as m from "$lib/paraglide/messages";

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function ddmmyyyyhhmm(d: Date) {
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ddmmyyyy(d: Date) {
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatDate(date: Date | string) {
	return ddmmyyyy(new Date(date));
}

export function formatDateTime(dateString: string) {
	return ddmmyyyyhhmm(new Date(dateString));
}

export function formatTime(dateString: string) {
	return ddmmyyyyhhmm(new Date(dateString));
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

export const getRegionName = (regionId: number): string => {
	const messages = m as unknown as Record<string, (() => string) | undefined>;
	return messages[`region_${regionId}`]?.() ?? `Region ${regionId}`;
};
