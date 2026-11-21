// src/lib/config/game/hospitals.config.ts
// Hospitals are a capacity that can be overwhelmed and switched off. Wars fill
// them with wounded soldiers and bombarded civilians; cyber attacks on the grid
// and poisoned supply lines take beds and wards offline. What is left decides
// how well a region's people survive, how many children are born, and how many
// civilians are well enough to work.
//
// Pure data and pure functions only (client and server).
export const HOSPITALS = {
	/** Beds a fully staffed, powered hospital level provides. */
	BEDS_PER_LEVEL: 600,
	/** One bed per this many civilians for routine care. */
	POPULATION_PER_BED: 250,
	/** A recent civilian casualty occupies this many beds during the window. */
	BEDS_PER_STRIKE_CASUALTY: 1.5,
	/** How long strike casualties keep a bed (days). */
	CASUALTY_WINDOW_DAYS: 30,
	/** Share of capacity lost when the grid is fully down. */
	POWER_SHARE: 0.7,
	/** Share of capacity lost when supply lines are fully disrupted. */
	SUPPLY_SHARE: 0.5,
	/** Never let the arithmetic claim less than this share of the beds work. */
	MIN_CAPACITY_SHARE: 0.1,
	/** Extra annual mortality when nobody can get care. */
	SHORTFALL_DEATHS_PER_YEAR: 0.03,
	/** Birth multiplier when nobody can get care. */
	SHORTFALL_REPLICATION: 0.85,
	/** Share of the labour pool still well enough to work when care collapses. */
	SHORTFALL_WORKFORCE: 0.7
} as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Beds actually usable after power and supply disruption (0-100 percent effects). */
export function hospitalCapacity(hospitalLevels: number, gridPercent: number, supplyPercent: number): number {
	const power = Math.max(HOSPITALS.MIN_CAPACITY_SHARE, 1 - (Math.max(0, gridPercent) / 100) * HOSPITALS.POWER_SHARE);
	const supply = Math.max(HOSPITALS.MIN_CAPACITY_SHARE, 1 - (Math.max(0, supplyPercent) / 100) * HOSPITALS.SUPPLY_SHARE);
	return Math.max(0, Math.round(hospitalLevels * HOSPITALS.BEDS_PER_LEVEL * power * supply));
}

/** Beds the state's people and its wounded need right now. */
export function hospitalDemand(civilians: number, woundedSoldiers: number, recentCasualties: number): number {
	const routine = Math.max(0, civilians) / HOSPITALS.POPULATION_PER_BED;
	const wounds = Math.max(0, woundedSoldiers);
	const casualties = Math.max(0, recentCasualties) * HOSPITALS.BEDS_PER_STRIKE_CASUALTY;
	return Math.max(0, Math.round(routine + wounds + casualties));
}

/** Share of demand the surviving hospitals can meet (0 = overwhelmed, 1 = fine). */
export function hospitalAvailability(capacity: number, demand: number): number {
	if (demand <= 0) return 1;
	return Math.round(clamp01(capacity / demand) * 1000) / 1000;
}

/** Health staff is one more limit on who can work. */
export function healthyWorkforce(availability: number): number {
	return HOSPITALS.SHORTFALL_WORKFORCE + (1 - HOSPITALS.SHORTFALL_WORKFORCE) * clamp01(availability);
}

/** Extra deaths a region suffers when its hospitals cannot cope. */
export function hospitalDeaths(availability: number): number {
	return HOSPITALS.SHORTFALL_DEATHS_PER_YEAR * (1 - clamp01(availability));
}

/** Fewer babies are born into a place with no functioning healthcare. */
export function hospitalReplication(availability: number): number {
	return HOSPITALS.SHORTFALL_REPLICATION + (1 - HOSPITALS.SHORTFALL_REPLICATION) * clamp01(availability);
}
