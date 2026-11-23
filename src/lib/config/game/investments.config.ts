// src/lib/config/game/investments.config.ts
// The oligarch's money instruments. Durations are expressed in game years:
// one real week is one in-game year (see utils/game-time.ts).

import { gameYearsToMs } from "#lib/utils/game-time.js";

const YEAR = gameYearsToMs(1);

export const INVESTMENTS_CONFIG = {
	/** Smallest bond a player can buy. */
	BOND_MIN_PRINCIPAL: 1_000,
	/** Annual coupon, in percent of principal. */
	BOND_COUPON_PERCENT: 5,
	/** Bonds mature after 12 game years — about three real months. */
	BOND_TERM_DAYS: Math.round((12 * YEAR) / 86_400_000),
	/** Coupons are paid twice a game year — every 3.5 real days. */
	COUPON_PERIOD_DAYS: (0.5 * YEAR) / 86_400_000,
	/** Earnings reports cover half a game year. */
	EARNINGS_PERIOD_DAYS: (0.5 * YEAR) / 86_400_000,
	/** Anchor for the twice-a-game-year schedule (a Monday, UTC). */
	BIWEEKLY_ANCHOR: "2026-01-05T00:00:00.000Z"
} as const;
