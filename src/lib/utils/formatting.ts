// src/lib/utils/formatting.ts
export function formatDate(date: Date | string) {
	return new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getDaysRemaining(expiresAt: Date | string) {
	const now = new Date();
	const expires = new Date(expiresAt);
	const diff = expires.getTime() - now.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
