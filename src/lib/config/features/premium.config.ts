// Premium membership configuration.

export type PremiumPlan = {
	id: string;
	label: string;
	days: number;
	/** Price when purchased with in-game currency. */
	currencyPrice: number;
	/** Price in Telegram Stars (XTR) when purchased through the Telegram bot. */
	telegramStars: number;
};

export const PREMIUM_PLANS = {
	weekly: {
		id: "weekly",
		label: "Weekly",
		days: 7,
		currencyPrice: 100_000,
		telegramStars: 150
	},
	monthly: {
		id: "monthly",
		label: "Monthly",
		days: 30,
		currencyPrice: 300_000,
		telegramStars: 500
	},
	seasonal: {
		id: "seasonal",
		label: "Seasonal",
		days: 90,
		currencyPrice: 750_000,
		telegramStars: 1200
	}
} as const satisfies Record<string, PremiumPlan>;

export type PremiumPlanId = keyof typeof PREMIUM_PLANS;

export function isPremiumPlanId(value: string): value is PremiumPlanId {
	return value in PREMIUM_PLANS;
}

/** Returns true when the given premium expiry is set and still in the future. */
export function isPremiumActive(premiumUntil: Date | string | null | undefined): boolean {
	if (!premiumUntil) return false;
	return new Date(premiumUntil).getTime() > Date.now();
}
