// Logistics and supply chains: the unglamorous thing that decides whether an
// army can fight, a factory can run and a blockaded state can build chips.
//
// A region has a supply capacity from its infrastructure, its borders and
// whether it has a port. Every unit and factory in it draws from that
// capacity. Strikes on bridges/logistics, a blockade at sea and rough terrain
// cut the capacity; the remainder becomes a supply factor that multiplies
// combat output and factory production and eats into unit supply levels.
//
// This is the bridge between the domains: sea power strangles supply, air
// power cuts it further, cyber degrades the grid that moves it, and smuggling
// puts cargo back into the destination's stockpile.
//
// Pure data and pure functions only: services and the client import it.

export interface LogisticsRegion {
	id: number;
	infrastructure?: number | null;
	terrain?: string | null;
}

export const LOGISTICS = {
	/** Tons of supply a bare region can move per day. */
	BASE_CAPACITY: 40,
	/** Added per infrastructure level. */
	INFRASTRUCTURE_CAPACITY: 28,
	/** Added per friendly neighbouring region with a rail/road link. */
	BORDER_CAPACITY: 14,
	/** Added when the region is coastal (port throughput). */
	PORT_CAPACITY: 25,
	/** Terrain's effect on movement. Missing terrain is treated as 1. */
	TERRAIN_FACTOR: {
		plains: 1.1,
		fields: 1.15,
		urban: 1.05,
		city: 1.05,
		town: 1.05,
		shore: 1.2,
		lake: 0.95,
		forest: 0.8,
		hills: 0.75,
		jungle: 0.65,
		desert: 0.6,
		mountain: 0.5
	} as Record<string, number>,
	/** Daily draw of each ready unit type (unknown types draw the default). */
	UNIT_DRAW: {
		infantry: 12,
		marine: 14,
		armor: 30,
		mechanized: 24,
		artillery: 22,
		air_defence: 18,
		fighter_squadron: 35,
		bomber_squadron: 40,
		frigate: 28,
		submarine: 24,
		carrier: 60,
		landing_ship: 25
	} as Record<string, number>,
	DEFAULT_UNIT_DRAW: 15,
	/** Daily draw of one factory/fabrication line, on top of its recipe inputs. */
	FACTORY_DRAW: 12,
	FAB_DRAW: 22,
	/** Supply factor never drops below this: even cut-off troops scavenge. */
	MIN_FACTOR: 0.25,
	/** Maximum cut from one active logistics strike (0.8 = 80%). */
	DISRUPTION_CAP: 0.8,
	/** Extra cut to capacity at full blockade strength. */
	BLOCKADE_CAPACITY_CUT: 0.4,
	/** Supply points a unit burns per combat round (before its region factor). */
	SUPPLY_COST_PER_ROUND: 8,
	/** Supply modifiers: at level 0 a unit fights at 40%, at 100 at full strength. */
	UNIT_SUPPLY_FLOOR: 0.4
} as const;

/** Supply capacity of a region before demand and disruptions. */
export function regionSupplyCapacity(
	region: LogisticsRegion,
	neighbourCount: number,
	coastal: boolean
): number {
	const infra = Math.max(0, region.infrastructure ?? 0);
	const raw =
		LOGISTICS.BASE_CAPACITY +
		infra * LOGISTICS.INFRASTRUCTURE_CAPACITY +
		Math.max(0, neighbourCount) * LOGISTICS.BORDER_CAPACITY +
		(coastal ? LOGISTICS.PORT_CAPACITY : 0);
	const terrain = LOGISTICS.TERRAIN_FACTOR[region.terrain ?? "plains"] ?? 1;
	return Math.round(raw * terrain);
}

/** Daily draw of the units and factories sitting in a region. */
export function supplyDemand(unitTypes: string[], factoryTypes: string[]): number {
	const units = unitTypes.reduce((sum, t) => sum + (LOGISTICS.UNIT_DRAW[t] ?? LOGISTICS.DEFAULT_UNIT_DRAW), 0);
	const factories = factoryTypes.reduce(
		(sum, t) => sum + (t === "fabrication" ? LOGISTICS.FAB_DRAW : t === "general" ? 0 : LOGISTICS.FACTORY_DRAW),
		0
	);
	return units + factories;
}

/** Combined disruption multiplier from active strikes and a blockade. */
export function disruptionFactor(logisticsEffects: number[], blockadeStrength = 0): number {
	const strike = stackedDisruption(logisticsEffects);
	const sea = Math.max(0, Math.min(1, blockadeStrength)) * LOGISTICS.BLOCKADE_CAPACITY_CUT;
	return Math.max(0.05, 1 - Math.min(LOGISTICS.DISRUPTION_CAP, strike) - sea);
}

/** Multiple supply strikes stack with diminishing returns (max DISRUPTION_CAP). */
export function stackedDisruption(magnitudes: number[]): number {
	let remaining = 1;
	let total = 0;
	for (const m of magnitudes) {
		const effect = Math.max(0, Math.min(1, m)) * remaining;
		total += effect;
		remaining *= 0.5;
	}
	return Math.min(LOGISTICS.DISRUPTION_CAP, total);
}

/** Share of demand a region can actually satisfy (0.25-1). */
export function logisticsSupplyFactor(capacity: number, demand: number, disruption = 1): number {
	if (demand <= 0) return 1;
	const effective = Math.max(0, capacity) * Math.max(0, Math.min(1, disruption));
	return Math.round(Math.max(LOGISTICS.MIN_FACTOR, Math.min(1, effective / demand)) * 1000) / 1000;
}

/** Combat multiplier from a unit's own stock and the region's supply factor. */
export function unitSupplyModifier(supplyLevel: number, regionFactor: number): number {
	const stock = Math.max(0, Math.min(100, supplyLevel)) / 100;
	const own = LOGISTICS.UNIT_SUPPLY_FLOOR + (1 - LOGISTICS.UNIT_SUPPLY_FLOOR) * stock;
	return Math.round(own * Math.max(LOGISTICS.MIN_FACTOR, Math.min(1, regionFactor)) * 1000) / 1000;
}

/** Supply a unit loses after one combat round (harder when its region is cut off). */
export function roundSupplyCost(regionFactor: number): number {
	return Math.max(1, Math.round(LOGISTICS.SUPPLY_COST_PER_ROUND / Math.max(LOGISTICS.MIN_FACTOR, regionFactor)));
}

/** Chance a blockade runner loses part of a cargo (sea control vs blockade). */
export function convoyInterdictionChance(blockadeStrength: number, escorts: number): number {
	const raw = blockadeStrength * 0.6 - escorts * 0.02;
	return Math.round(Math.max(0, Math.min(0.9, raw)) * 1000) / 1000;
}

/** Share of a convoy that gets through intact. */
export function convoySurvival(blockadeStrength: number, escorts: number): number {
	return Math.round((1 - convoyInterdictionChance(blockadeStrength, escorts)) * 1000) / 1000;
}

// ── Convoy operations and repairs ───────────────────────────────────────────

export const CONVOY = {
	/** Treasury cost of dispatching one convoy, before cargo. */
	BASE_COST: 20_000,
	/** Treasury cost per cargo point. */
	COST_PER_UNIT: 80,
	/** Cargo a convoy can carry at once. */
	MAX_CARGO: 500,
	/** Hours of travel per 100 km of distance. */
	HOURS_PER_100KM: 0.5,
	/** Hours a delivered cargo keeps a region's supply boosted. */
	BOOST_HOURS: 36,
	/** Capacity multiplier one full cargo gives a region. */
	BOOST_PER_CARGO: 0.0008,
	/** Cap on the combined convoy boost. */
	BOOST_MAX: 0.8,
	/** A convoy cannot exceed this share of the origin's spare capacity. */
	ORIGIN_SPARE_SHARE: 0.8
} as const;

/** Treasury cost of a convoy of `cargo` supply units. */
export function convoyCost(cargo: number): number {
	return CONVOY.BASE_COST + Math.max(0, Math.floor(cargo)) * CONVOY.COST_PER_UNIT;
}

/** Travel time from the distance between origin and destination. */
export function convoyTravelHours(distanceKm: number): number {
	return Math.max(2, Math.round(distanceKm / 100 * CONVOY.HOURS_PER_100KM));
}

/** Cargo a region can spare without starving itself. */
export function convoyCargoLimit(capacity: number, demand: number): number {
	const spare = Math.max(0, capacity * CONVOY.ORIGIN_SPARE_SHARE - demand);
	return Math.max(0, Math.min(CONVOY.MAX_CARGO, Math.floor(spare)));
}

/** Supply boost from delivered convoys (negative effect magnitudes). */
export function supplyBoost(magnitudes: number[]): number {
	const best = magnitudes.reduce((min, m) => Math.min(min, m), 0);
	return Math.round(Math.min(CONVOY.BOOST_MAX, Math.max(0, -best)) * 1000) / 1000;
}

/** Region capacity multiplier from a delivered convoy's cargo. */
export function convoyBoost(cargo: number, demand: number): number {
	const ratio = demand > 0 ? cargo / demand : 0;
	return Math.round(Math.min(CONVOY.BOOST_MAX, ratio * CONVOY.BOOST_PER_CARGO * 100) * 1000) / 1000;
}

// ── Infrastructure repair ───────────────────────────────────────────────────

export const REPAIR = {
	/** Treasury cost of one infrastructure level, scaled by how broken it is. */
	BASE_COST: 80_000,
	/** Extra cost per missing level (a wrecked region is harder to fix). */
	COST_PER_MISSING_LEVEL: 25_000,
	/** Machine tools needed for the repair crews. */
	TOOLS: 2,
	MAX_LEVEL: 10
} as const;

export function repairCost(currentLevel: number): number {
	const missing = Math.max(0, REPAIR.MAX_LEVEL - currentLevel);
	return REPAIR.BASE_COST + missing * REPAIR.COST_PER_MISSING_LEVEL;
}

export function canRepair(currentLevel: number): boolean {
	return currentLevel < REPAIR.MAX_LEVEL;
}
