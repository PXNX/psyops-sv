// Why civilians leave a region, where they go, and what they bring with them.
// Rates are per weekly migration tick and act on the unemployed, not on the
// whole population.
export const MIGRATION_CONFIG = {
	/** Below this unemployment share nobody needs to leave. */
	MIN_UNEMPLOYMENT: 0.2,
	/** Share of the unemployed who leave in one tick when there is nowhere better. */
	LEAVE_RATE: 0.015,
	/** Extra share when jobs are scarce (full unemployment). */
	LEAVE_RATE_MAX: 0.05,
	/** A destination must have at least this much less unemployment. */
	EMPLOYMENT_ADVANTAGE: 0.03,
	/** A destination may be this much less happy and still look better. */
	OPINION_TOLERANCE: 5,
	/** Chance that a mover heads to a foreign state that requires a visa. */
	VISA_CHANCE: 0.04,
	/** Chance that an international move seeds a disease in the destination. */
	DISEASE_CHANCE: 0.03,
	/** People per intel signal a destination gains about the origin state. */
	CIVILIANS_PER_INTEL: 1000,
	/** Unemployment penalty to local civilian opinion, at full scarcity. */
	MAX_UNEMPLOYMENT_OPINION_PENALTY: 18,
	/** Unemployment share at which that full penalty applies. */
	FULL_PENALTY_UNEMPLOYMENT: 0.4
} as const;
