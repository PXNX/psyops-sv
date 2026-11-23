// src/lib/config/game/civilian-supply.config.ts
// Food, electricity, heat and water are not just inputs to factories: people
// need them to stay alive and to put up with their government. This module
// turns the world's existing records into a per-region picture of what
// civilians can get versus what they need, and into the price of coming up
// short. Water is special — it is also an input to water-hungry companies, so
// a drought or a poisoned aqueduct starves a fab as well as a household.
//
// Everything is derived on read: no new tables, no migration. Pure data and
// pure functions only, so the client and the server share the same rules.

export const CIVILIAN_NEEDS = ["food", "electricity", "heat", "water"] as const;
export type CivilianNeed = (typeof CIVILIAN_NEEDS)[number];

export const NEED_META: Record<CivilianNeed, { label: string; icon: string; blurb: string }> = {
	food: {
		label: "Food",
		icon: "🌾",
		blurb: "Fields and imports feed the region. A blockade empties the markets of cities that cannot grow their own."
	},
	electricity: {
		label: "Electricity",
		icon: "⚡",
		blurb: "Civilians draw from the part of the state grid left over after industry. Grid attacks and blockades cause brownouts."
	},
	heat: {
		label: "Heat",
		icon: "🔥",
		blurb: "Heating runs on the same grid. Cold mountain and northern regions need far more of it than temperate ones."
	},
	water: {
		label: "Water",
		icon: "💧",
		blurb: "Rivers, coasts, aquifers and water works supply households — and the factories that cool or wash with it."
	}
};

export interface NeedSupply {
	/** What the region wants, in abstract utility units (MW for power and heat). */
	demand: number;
	/** What it can actually get today. */
	capacity: number;
	/** capacity / demand, clamped to 0..1. 1 means everyone is served. */
	sufficiency: number;
}

export interface RegionNeeds {
	food: NeedSupply;
	electricity: NeedSupply;
	heat: NeedSupply;
	water: NeedSupply;
	/** Weighted shortfall across all four needs, 0..1. */
	hardship: number;
	/** Needs below the shortage threshold, worst first. */
	shortages: CivilianNeed[];
}

/** Tunables behind the supply arithmetic. */
export const CIVILIAN_SUPPLY = {
	// Daily demand per civilian, in abstract units (MW for power and heat).
	FOOD_PER_CAPITA: 1,
	WATER_PER_CAPITA: 1,
	ELEC_PER_CAPITA_MW: 0.00005,
	HEAT_PER_CAPITA_MW: 0.00005,

	// How a region's own land covers its needs. The remainder of food is
	// imported and so depends on trade access.
	FOOD_INFRASTRUCTURE_BONUS: 0.01,
	FOOD_IMPORT_SHARE: 0.85,
	/** One completed water works serves this many civilian-equivalents. */
	WATER_WORKS_CAPACITY: 80_000,

	/** Exploitation laws pollute or protect the water table. */
	WATER_QUALITY: {
		conservation: 1,
		standard: 1,
		industrial: 0.9,
		unrestricted: 0.75
	} as Record<string, number>,

	/** Share of a need's shortfall that feeds the overall hardship score. */
	WEIGHTS: {
		food: 0.35,
		water: 0.3,
		electricity: 0.2,
		heat: 0.15
	} as Record<CivilianNeed, number>,

	/** A need below this share of demand counts as a visible shortage. */
	SHORTAGE_THRESHOLD: 0.85,
	/** Even a parched fab can limp along on this share of its water. */
	FACTORY_WATER_FLOOR: 0.3
} as const;

/** Farm output by terrain. Cities and deserts live off imported food. */
export const FOOD_TERRAIN: Record<string, number> = {
	fields: 1.35,
	plains: 1.05,
	shore: 0.8,
	forest: 0.5,
	lakes: 0.5,
	lake: 0.5,
	town: 0.55,
	hills: 0.6,
	jungle: 0.45,
	mountain: 0.25,
	urban: 0.2,
	city: 0.12,
	desert: 0.15
};

/** Fresh water by terrain — lakes and coasts have plenty, deserts do not. */
export const WATER_TERRAIN: Record<string, number> = {
	lake: 2,
	lakes: 2,
	shore: 1.6,
	jungle: 1.1,
	forest: 0.95,
	plains: 1,
	fields: 0.9,
	town: 0.9,
	hills: 0.8,
	mountain: 0.6,
	urban: 0.5,
	city: 0.45,
	desert: 0.1
};

/** Heating demand by terrain — cold, high ground needs far more. */
export const HEAT_CLIMATE: Record<string, number> = {
	mountain: 1.8,
	hills: 1.3,
	forest: 1.2,
	lake: 1.1,
	plains: 1,
	fields: 1,
	town: 1,
	urban: 0.9,
	city: 0.9,
	shore: 0.9,
	jungle: 0.5,
	desert: 0.6
};

/** What the service has to know about a region to work its needs out. */
export interface NeedsInput {
	population: number;
	terrain: string;
	infrastructure: number;
	/** Effective state grid capacity after grid attacks and blockade (MW). */
	gridCapacity: number;
	/** Grid already claimed by industry and buildings (MW). */
	gridUsed: number;
	/** This region's share of the state's population, 0..1. */
	populationShare: number;
	/** Completed water_works civic projects in the region. */
	waterWorks: number;
	/** Extra water demand from water-hungry factories (civilian-equivalents). */
	factoryWaterDemand: number;
	/** Trade access, 0..1. Blockades and sanctions cut food imports. */
	tradeFactor: number;
	/** The state's extraction law — unrestricted extraction poisons water. */
	environment: string;
	/** Relief from the civilian fuel pool, 0..1 (share of heat demand covered). */
	fuelHeatRelief?: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const supply = (demand: number, capacity: number): NeedSupply => ({
	demand: Math.round(demand),
	capacity: Math.round(capacity),
	sufficiency: demand <= 0 ? 1 : round3(clamp01(capacity / demand))
});

/**
 * Work out one region's four basic needs from the inputs above. Cheap enough
 * to run for a whole world on every read; no I/O happens here.
 */
export function regionNeeds(input: NeedsInput): RegionNeeds {
	const pop = Math.max(0, Number.isFinite(input.population) ? input.population : 0);
	const terrain = input.terrain ?? "plains";

	const foodDemand = pop * CIVILIAN_SUPPLY.FOOD_PER_CAPITA;
	const foodLocal = pop * (FOOD_TERRAIN[terrain] ?? 1) * (1 + Math.max(0, input.infrastructure) * CIVILIAN_SUPPLY.FOOD_INFRASTRUCTURE_BONUS);
	const food = supply(foodDemand, foodLocal + pop * CIVILIAN_SUPPLY.FOOD_IMPORT_SHARE * clamp01(input.tradeFactor));

	const waterDemand = pop * CIVILIAN_SUPPLY.WATER_PER_CAPITA + Math.max(0, input.factoryWaterDemand);
	const waterRaw = pop * (WATER_TERRAIN[terrain] ?? 1) + Math.max(0, input.waterWorks) * CIVILIAN_SUPPLY.WATER_WORKS_CAPACITY;
	const water = supply(waterDemand, waterRaw * (CIVILIAN_SUPPLY.WATER_QUALITY[input.environment] ?? 1));

	const elecDemand = pop * CIVILIAN_SUPPLY.ELEC_PER_CAPITA_MW;
	const availableGrid = Math.max(0, input.gridCapacity - input.gridUsed) * clamp01(input.populationShare);
	const electricity = supply(elecDemand, availableGrid);

	// Heat rides on the same grid; colder terrain simply asks more of it. A
	// state that voted to burn its refined fuel at home eases that demand.
	const heatDemand =
		pop *
		CIVILIAN_SUPPLY.HEAT_PER_CAPITA_MW *
		(HEAT_CLIMATE[terrain] ?? 1) *
		(1 - Math.max(0, Math.min(1, input.fuelHeatRelief ?? 0)));
	const heat = supply(heatDemand, availableGrid);

	const needs = { food, electricity, heat, water };
	const hardship = round3(
		CIVILIAN_NEEDS.reduce((sum, key) => sum + CIVILIAN_SUPPLY.WEIGHTS[key] * (1 - needs[key].sufficiency), 0)
	);
	const shortages = CIVILIAN_NEEDS.filter((key) => needs[key].sufficiency < CIVILIAN_SUPPLY.SHORTAGE_THRESHOLD).sort(
		(a, b) => needs[a].sufficiency - needs[b].sufficiency
	);

	return { ...needs, hardship, shortages };
}

/** What a region's hardship costs it in civilian opinion (a positive number). */
export function opinionLossFromHardship(hardship: number): number {
	return Math.round(clamp01(hardship) * 20);
}

/** The matching contribution to regime stability (negative, capped). */
export function stabilityFromHardship(hardship: number): number {
	const penalty = Math.round(clamp01(hardship) * 14);
	return penalty === 0 ? 0 : -penalty;
}

/** Extra annual deaths from hunger, thirst, cold and dark. */
export function hardshipExtraDeaths(hardship: number): number {
	const h = clamp01(hardship);
	return h <= 0.3 ? 0 : Math.round(((h - 0.3) / 0.7) * 0.02 * 100_000) / 100_000;
}

/** People leave a place that cannot keep them alive, even if it is otherwise calm. */
export function hardshipExtraEmigration(hardship: number): number {
	const h = clamp01(hardship);
	return h <= 0.2 ? 0 : Math.round(((h - 0.2) / 0.8) * 0.03 * 100_000) / 100_000;
}

/**
 * Water each factory needs per day, expressed as the number of civilians it
 * consumes the same amount as. Empty for industries that can do without.
 */
export const FACTORY_WATER_DRAW: Record<string, number> = {
	steel: 15_000,
	fuel: 22_000,
	enriched_uranium: 22_000,
	chips: 30_000,
	electronics: 18_000,
	// The computing chain is the thirstiest industry of all: fabs already need
	// ultrapure water, and a datacenter's cooling towers evaporate far more.
	hardware: 45_000,
	datacenter: 60_000,
	machine_tools: 10_000,
	fab_equipment: 20_000
};

export function factoryWaterDraw(output: string | null | undefined): number {
	return output ? (FACTORY_WATER_DRAW[output] ?? 0) : 0;
}

/**
 * Output multiplier for a company whose product needs water. A short supply
 * throttles it rather than stopping it outright; everyone else is unaffected.
 */
export function factoryWaterFactor(output: string | null | undefined, waterSufficiency: number): number {
	if (!factoryWaterDraw(output)) return 1;
	return round3(Math.max(CIVILIAN_SUPPLY.FACTORY_WATER_FLOOR, clamp01(waterSufficiency)));
}
