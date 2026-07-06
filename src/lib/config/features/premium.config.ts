// Premium membership configuration.

export type PremiumPlan = {
	id: string;
	label: string;
	days: number;
	/** Price in Telegram Stars (XTR) when purchased through the Telegram bot. */
	telegramStars: number;
};

export const PREMIUM_PLANS = {
	monthly: {
		id: "monthly",
		label: "1 Month",
		days: 30,
		telegramStars: 500
	},
	semiannual: {
		id: "semiannual",
		label: "6 Months",
		days: 180,
		telegramStars: 2500
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
