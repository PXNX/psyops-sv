// src/lib/config/game/manpower.config.ts
// Recruiting a unit takes people out of the civilian population, not just
// money out of a wallet. The region a recruit comes from loses that many
// civilians when training starts; they become the soldiers in military_units.
// If the region has too few people left above the population floor, the unit
// cannot be raised at all. This is the "manpower pool" that makes a large
// standing army a real cost on a state, and feeds the conscription pressure in
// stability.config.ts (soldiers per 1,000 remaining civilians).
//
// Pure data and pure functions only (client and server).
import { POPULATION_FLOOR } from "./population.config";

/** Civilians a fresh unit pulls out of its home region. Land units are the hungriest. */
export const UNIT_MANPOWER_COST: Record<string, number> = {
	infantry: 8_000,
	marine: 7_000,
	mechanized: 6_000,
	armor: 5_000,
	artillery: 5_000,
	air_defence: 4_000,
	carrier: 4_000,
	bomber_squadron: 3_000,
	fighter_squadron: 2_500,
	landing_ship: 2_500,
	frigate: 2_000,
	submarine: 1_500
};

/** Manpower a unit of this type needs; 0 for an unknown type. */
export function manpowerCostOf(unitType: string): number {
	return UNIT_MANPOWER_COST[unitType] ?? 0;
}

/**
 * Whether a region with `population` civilians can spare `cost` of them.
 * Recruiting never pushes a region below the same floor strike casualties
 * respect, so a depopulated region cannot raise endless armies.
 */
export function canCoverManpower(population: number, cost: number): boolean {
	return Number.isFinite(population) && Number.isFinite(cost) && cost >= 0 && population - cost >= POPULATION_FLOOR;
}

/** How many civilians of `population` are left after raising `cost` worth of units. */
export function afterRecruitment(population: number, cost: number): number {
	return Math.max(POPULATION_FLOOR, population - Math.max(0, Math.round(cost)));
}
