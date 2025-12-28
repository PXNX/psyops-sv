// src/lib/utils/formatting.ts
import * as m from "$lib/paraglide/messages";

export function formatDate(date: Date | string) {
	return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateTime(dateString: string) {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
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
