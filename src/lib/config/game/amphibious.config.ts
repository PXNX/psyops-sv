// src/lib/config/game/amphibious.config.ts
// Beach landings and paradrops need local dominance. Shore AA and fortifications
// make both operations risky even when the sea or sky is yours.

export const BEACH_OPS = {
	/** Own+allied strength must be at least this multiple of hostile strength. */
	seaDominance: 1.5,
	airDominance: 1.5,
	/** Base chance an opposed landing/drop fails before defender bonuses. */
	baseFailure: 0.1,
	/** Each point of coastal anti-air adds this much failure chance. */
	aaFailure: 0.004,
	/** Each fortification level on the beach adds this much failure chance. */
	fortFailure: 0.04,
	/** How long a successful beachhead/supply effect lasts. */
	beachheadHours: 12,
	/** Damage taken by transports/landing craft when a landing fails. */
	failedLandingDamage: 25
} as const;
