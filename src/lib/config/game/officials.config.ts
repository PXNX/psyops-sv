// Pay for the people who run a state, and the emergency power parliament can
// use to pause elections. Amounts are per seven-day pay period.
export const OFFICIALS_CONFIG = {
	/** Weekly salary of a parliament member; the base amount parliament sets. */
	DEFAULT_MP_SALARY: 1_000,
	MAX_MP_SALARY: 100_000,
	MINISTER_MULTIPLIER: 3,
	PRESIDENT_MULTIPLIER: 5,
	PAY_PERIOD_DAYS: 7,
	/** Declarations always last a week; the proposal records it for the record. */
	MARTIAL_LAW_DAYS: 7
} as const;

/** The weekly pay for an office, derived from the parliament-set base. */
export function officialSalary(base: number, role: "member" | "minister" | "president"): number {
	const multiplier =
		role === "president"
			? OFFICIALS_CONFIG.PRESIDENT_MULTIPLIER
			: role === "minister"
				? OFFICIALS_CONFIG.MINISTER_MULTIPLIER
				: 1;
	return Math.max(0, Math.round(base)) * multiplier;
}
