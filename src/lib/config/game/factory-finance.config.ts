// src/lib/config/game/factory-finance.config.ts
// The money side of running a factory: what it costs to expand, how unfair pay
// turns into a strike, the productivity that comes from an uninterrupted run,
// and a proper EBITDA (earnings before interest, tax, depreciation and
// amortisation). Pure data and pure functions, shared by client and server.
import { CIVILIAN_WORK } from "./workforce.config";

export const FACTORY_FINANCE = {
	/** A neutral benchmark for a decent wage in this economy. */
	LIVING_WAGE: 1_500,
	/** Workers compare with other factories in their region; pay below this share of the local average is unfair. */
	PEER_SHARE: 0.9,
	/** Hardship (food/power/water/heat shortfalls) pushes the wage workers need up. */
	HARDSHIP_BONUS: 0.25,
	/** A company flush with cash cannot claim it cannot afford a fair wage. */
	ABILITY_SHARE: 0.1,
	/** A gap below this share of a fair wage is tolerated without a walkout. */
	TOLERANCE: 0.1,
	/** Output loss at the worst observed unfairness. */
	MAX_SEVERITY: 90,
	/** A crew can walk out at most once in this many days. */
	STRIKE_MIN_INTERVAL_DAYS: 7,
	/** Even a total strike leaves a skeleton shift this productive. */
	STRIKE_OUTPUT_FLOOR: 0.1,
	/** Productivity gained per completed, uninterrupted shift. */
	PRODUCTIVITY_PER_SHIFT: 0.005,
	/** Cap on the productivity bonus from a long run. */
	PRODUCTIVITY_CAP: 0.5,

	/** Posts added by one expansion. */
	EXPANSION_POSTS: 5,
	/** Company cash charged per added post. */
	EXPANSION_COST_PER_POST: 20_000,
	/** Hours the works take before the new posts come online. */
	EXPANSION_HOURS: 24
} as const;

/** Value of one unit of a good, shared with the civilian-work pricing. */
export function goodValue(good: string | null | undefined): number {
	return CIVILIAN_WORK.GOOD_VALUE[good ?? ""] ?? CIVILIAN_WORK.DEFAULT_GOOD_VALUE;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface FairWageInput {
	/** Wage currently posted. */
	paidWage: number;
	/** Average wage of other factories in the same region, or null if there are none. */
	peerWage: number | null;
	/** Civilian hardship in the region, 0-1. */
	hardship: number;
	/** Company budget available to pay the payroll. */
	companyBudget: number;
	/** Workers on the company's payroll. */
	workerCount: number;
}

/**
 * The wage workers will accept, from four realistic pressures: a living wage
 * baseline, the local labour market, the region's cost of living (hardship),
 * and what the company can plainly afford. Rounded to a tidy 50.
 */
export function fairWage(input: FairWageInput): number {
	const peer = input.peerWage && input.peerWage > 0 ? input.peerWage * FACTORY_FINANCE.PEER_SHARE : 0;
	const base = Math.max(FACTORY_FINANCE.LIVING_WAGE, peer);
	const costOfLiving = 1 + clamp(input.hardship, 0, 1) * FACTORY_FINANCE.HARDSHIP_BONUS;
	const budgetPerWorker = Math.max(0, input.companyBudget) / Math.max(1, input.workerCount);
	const ability = clamp(budgetPerWorker / FACTORY_FINANCE.LIVING_WAGE - 1, 0, 1);
	const affordability = 1 + ability * FACTORY_FINANCE.ABILITY_SHARE;
	return Math.max(1, Math.ceil((base * costOfLiving * affordability) / 50) * 50);
}

/** How hard the crew walks out: 0 means no strike, otherwise an output loss in percent. */
export function strikeSeverity(paidWage: number, demandedWage: number): number {
	const gap = (demandedWage - paidWage) / Math.max(1, demandedWage);
	if (gap <= FACTORY_FINANCE.TOLERANCE) return 0;
	return Math.round(clamp(gap * 100, 0, FACTORY_FINANCE.MAX_SEVERITY));
}

/** Output multiplier while a strike of `severity` percent is on. */
export function strikeOutputFactor(severity: number): number {
	return Math.max(FACTORY_FINANCE.STRIKE_OUTPUT_FLOOR, 1 - clamp(severity, 0, 100) / 100);
}

/** A clean, uninterrupted run makes the floor more productive over time. */
export function productivityFactor(uninterruptedShifts: number): number {
	return 1 + Math.min(FACTORY_FINANCE.PRODUCTIVITY_CAP, Math.max(0, uninterruptedShifts) * FACTORY_FINANCE.PRODUCTIVITY_PER_SHIFT);
}

/** A crew may walk out again only after the minimum interval. */
export function canStrike(lastStrikeAt: Date | string | null | undefined, now: Date = new Date()): boolean {
	if (!lastStrikeAt) return true;
	const elapsed = now.getTime() - new Date(lastStrikeAt).getTime();
	return elapsed >= FACTORY_FINANCE.STRIKE_MIN_INTERVAL_DAYS * 86_400_000;
}

/** Company cash needed to add `posts` posts. */
export function expansionCost(posts: number): number {
	return Math.max(0, Math.ceil(posts)) * FACTORY_FINANCE.EXPANSION_COST_PER_POST;
}

/** When an expansion filed at `now` comes online. */
export function expansionDueAt(now: Date = new Date()): Date {
	return new Date(now.getTime() + FACTORY_FINANCE.EXPANSION_HOURS * 3_600_000);
}

export interface Ebitda {
	revenue: number;
	operatingCosts: number;
	ebitda: number;
	/** EBITDA / revenue, 0 when there was no revenue. */
	margin: number;
}

/**
 * Operating performance before financing and taxes: the value of what came
 * off the line minus the cash it took to run it (wages and materials).
 */
export function factoryEbitda(input: {
	good: string | null | undefined;
	outputUnits: number;
	wageCost: number;
	inputCost?: number;
}): Ebitda {
	const revenue = Math.round(Math.max(0, input.outputUnits) * goodValue(input.good));
	const operatingCosts = Math.max(0, input.wageCost) + Math.max(0, input.inputCost ?? 0);
	const ebitda = revenue - operatingCosts;
	return { revenue, operatingCosts, ebitda, margin: revenue > 0 ? Math.round((ebitda / revenue) * 1000) / 10 : 0 };
}
