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

export const getRegionName = (regionId: number): string => {
	const key = `region_${regionId}`;
	return m[key]();
};
