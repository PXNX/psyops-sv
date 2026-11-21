// src/lib/config/game/investments.config.ts
// The oligarch's money instruments: state bonds and the fortnightly report
// cycle that pays their coupons and publishes company earnings.

export const INVESTMENTS_CONFIG = {
	/** Smallest bond a player can buy. */
	BOND_MIN_PRINCIPAL: 1_000,
	/** Annual coupon, in percent of principal. */
	BOND_COUPON_PERCENT: 5,
	/** Bonds mature after 90 days; the principal is returned automatically. */
	BOND_TERM_DAYS: 90,
	/** Coupons are paid every 14 days (26 periods a year). */
	COUPON_PERIOD_DAYS: 14,
	/** How many days of earnings one report covers. */
	EARNINGS_PERIOD_DAYS: 14,
	/** Anchor for the every-other-week schedule (a Monday, UTC). */
	BIWEEKLY_ANCHOR: "2026-01-05T00:00:00.000Z"
} as const;
