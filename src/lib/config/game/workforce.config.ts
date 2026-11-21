// src/lib/config/game/workforce.config.ts
// Civilians are not just a headcount: in peacetime most of them work. A
// region's civilian population supplies a labour pool, factories hire from it
// for the shifts their player-run roster cannot cover, and the work pays.
//
// The loop is deliberately cash-based and needs no new tables:
//   civilians work a factory's free slots -> the company earns revenue from
//   what they make -> it pays them a wage out of its budget -> the state
//   collects income tax on that wage. A company that cannot afford the wage
//   simply employs fewer civilians, and a region runs out of workers as its
//   population is drafted away or killed.
//
// Pure data and pure functions only (client and server).
export const CIVILIAN_WORK = {
	/** Share of a region's civilians available for factory work. */
	LABOUR_SHARE: 0.4,
	/** A civilian's weekly wage as a share of the factory's posted worker wage. */
	WAGE_FACTOR: 0.4,
	/** Units a civilian makes per week as a share of the factory's productionRate. */
	OUTPUT_FACTOR: 0.6,
	/** Days in one workforce tick (matches the weekly population cron). */
	TICK_DAYS: 7,
	/** Value of one unit of output, used to turn a shift's make into cash. */
	GOOD_VALUE: {
		iron: 10,
		copper: 15,
		steel: 50,
		gunpowder: 30,
		wood: 5,
		coal: 8,
		oil: 20,
		gas: 18,
		uranium: 90,
		rare_earth: 120,
		silicon: 40,
		fuel: 45,
		enriched_uranium: 300,
		rifles: 100,
		ammunition: 5,
		artillery: 500,
		vehicles: 1000,
		explosives: 200,
		chips: 350,
		electronics: 700,
		machine_tools: 500,
		fab_equipment: 900
	} as Record<string, number>,
	/** Fallback value for a good with no price list entry. */
	DEFAULT_GOOD_VALUE: 20
} as const;

/** Civilians of `population` who can take a factory job. */
export function civilianLabour(population: number): number {
	return Math.max(0, Math.floor(population * CIVILIAN_WORK.LABOUR_SHARE));
}

/** Weekly wage of one civilian worker at a factory paying `postedWage`. */
export function civilianWage(postedWage: number): number {
	return Math.max(1, Math.round(postedWage * CIVILIAN_WORK.WAGE_FACTOR));
}

/**
 * Cash a group of civilian workers brings into the company over `days`.
 * Priced from the factory's output and rate, so a vehicle plant earns far
 * more per worker than a coal mine.
 */
export function civilianRevenue(
	productionRate: number,
	good: string | null | undefined,
	workers: number,
	days: number
): number {
	if (workers <= 0 || days <= 0) return 0;
	const value = CIVILIAN_WORK.GOOD_VALUE[good ?? ""] ?? CIVILIAN_WORK.DEFAULT_GOOD_VALUE;
	return Math.round(workers * Math.max(0, productionRate) * CIVILIAN_WORK.OUTPUT_FACTOR * value * (days / 7));
}

/**
 * How many civilians a factory can actually hire: limited by the region's
 * spare labour, the slots its player roster leaves free, and its budget.
 */
export function employableCivilians(
	labour: number,
	freeSlots: number,
	budget: number,
	weeklyWage: number,
	days: number
): number {
	if (weeklyWage <= 0 || days <= 0) return 0;
	const wage = Math.round(weeklyWage * (days / 7));
	const affordable = wage > 0 ? Math.floor(Math.max(0, budget) / wage) : 0;
	return Math.max(0, Math.min(Math.floor(labour), Math.floor(freeSlots), affordable));
}
