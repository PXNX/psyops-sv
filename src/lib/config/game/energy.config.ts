// Energy: the power plants a state can build, what they burn, and why a
// diversified grid is better than one big plant.
//
// Every factory, mine and fabrication line draws from the state grid. A grid
// of one plant type is cheap to run but fragile: a strike, a drought, a fuel
// embargo or a single accident takes a large share of it offline. A mix of
// sources keeps the lights on and earns a small efficiency bonus.
//
// Pure data and pure functions only: the economy page imports this for the
// plant catalogue, services for upkeep and diversity.

export type PowerPlantType =
	| "coal"
	| "gas"
	| "nuclear"
	| "solar"
	| "wind"
	| "hydro"
	| "geothermal"
	| "fusion";

export interface PowerPlantSpec {
	label: string;
	icon: string;
	/** Power output in the game's energy units. */
	output: number;
	/** Treasury cost to build. */
	cost: number;
	/** Daily upkeep in treasury. */
	upkeepPerDay: number;
	/** Resource burned per day (null = none). */
	fuel: { resource: "coal" | "gas" | "uranium" | "fuel" | "enriched_uranium"; units: number } | null;
	/** Renewable plants don't run out and need no fuel. */
	renewable: boolean;
	/** Requires a coastal or river region. */
	needsWater: boolean;
	/** How exposed the plant is to sabotage and strikes (1 = normal). */
	fragility: number;
	blurb: string;
}

export const POWER_PLANTS: Record<PowerPlantType, PowerPlantSpec> = {
	coal: {
		label: "Coal plant",
		icon: "🏭",
		output: 100,
		cost: 500_000,
		upkeepPerDay: 6_000,
		fuel: { resource: "coal", units: 200 },
		renewable: false,
		needsWater: false,
		fragility: 1.2,
		blurb: "Cheap, dirty and reliable. Burns coal and is a favourite target for grid attacks."
	},
	gas: {
		label: "Gas plant",
		icon: "🔥",
		output: 150,
		cost: 750_000,
		upkeepPerDay: 9_000,
		fuel: { resource: "gas", units: 150 },
		renewable: false,
		needsWater: false,
		fragility: 1,
		blurb: "Fast to ramp up and down. Depends on gas imports, so a blockade hurts."
	},
	nuclear: {
		label: "Nuclear plant",
		icon: "☢️",
		output: 500,
		cost: 2_500_000,
		upkeepPerDay: 20_000,
		fuel: { resource: "enriched_uranium", units: 2 },
		renewable: false,
		needsWater: true,
		fragility: 1.4,
		blurb: "Huge output from little fuel. Needs cooling water, enriched uranium and heavy security."
	},
	solar: {
		label: "Solar farm",
		icon: "☀️",
		output: 50,
		cost: 400_000,
		upkeepPerDay: 2_000,
		fuel: null,
		renewable: true,
		needsWater: false,
		fragility: 0.7,
		blurb: "No fuel, little upkeep, but modest output and easily damaged by weather and strikes."
	},
	wind: {
		label: "Wind farm",
		icon: "🌬️",
		output: 75,
		cost: 600_000,
		upkeepPerDay: 3_000,
		fuel: null,
		renewable: true,
		needsWater: false,
		fragility: 0.8,
		blurb: "Clean and cheap to run. Output depends on siting, not on fuel imports."
	},
	hydro: {
		label: "Hydroelectric dam",
		icon: "🌊",
		output: 200,
		cost: 1_000_000,
		upkeepPerDay: 7_000,
		fuel: null,
		renewable: true,
		needsWater: true,
		fragility: 0.9,
		blurb: "Steady renewable power, but needs a river or a coast and is a strategic target."
	},
	geothermal: {
		label: "Geothermal plant",
		icon: "🌋",
		output: 120,
		cost: 900_000,
		upkeepPerDay: 5_000,
		fuel: null,
		renewable: true,
		needsWater: false,
		fragility: 0.75,
		blurb: "Runs day and night on the earth's heat. Only worth building where the geology allows it."
	},
	fusion: {
		label: "Fusion pilot plant",
		icon: "⚛️",
		output: 900,
		cost: 6_000_000,
		upkeepPerDay: 40_000,
		fuel: { resource: "enriched_uranium", units: 1 },
		renewable: false,
		needsWater: true,
		fragility: 1.6,
		blurb: "A research reactor that actually produces: enormous output, enormous cost, enormous target."
	}
};

export const POWER_PLANT_TYPES = Object.keys(POWER_PLANTS) as PowerPlantType[];

export const ENERGY_CONFIG = {
	/** A state's grid gets this bonus for each additional plant type beyond the first… */
	DIVERSITY_PER_TYPE: 0.03,
	/** …up to this much. */
	DIVERSITY_MAX: 0.15,
	/** Minimum share of a grid one plant type may hold before it counts as a single point of failure. */
	CONCENTRATION_WARN: 0.6,
	/** Energy a factory needs to run. */
	FACTORY_DRAW: 50,
	/** Energy a fabrication line (chips, electronics) needs. */
	FAB_DRAW: 100
} as const;

/** Efficiency multiplier for a grid with this many distinct plant types. */
export function energyDiversityFactor(distinctTypes: number): number {
	const extra = Math.max(0, distinctTypes - 1);
	return Math.round((1 + Math.min(ENERGY_CONFIG.DIVERSITY_MAX, extra * ENERGY_CONFIG.DIVERSITY_PER_TYPE)) * 1000) / 1000;
}

/** The share of total output held by the largest single plant type. */
export function gridConcentration(byType: Partial<Record<PowerPlantType, number>>): number {
	const total = Object.values(byType).reduce((s, n) => s + Math.max(0, n ?? 0), 0);
	if (total <= 0) return 0;
	const largest = Math.max(...Object.values(byType).map((n) => Math.max(0, n ?? 0)));
	return Math.round((largest / total) * 1000) / 1000;
}

/** Daily fuel a set of plants burns, by resource. */
export function dailyFuelUse(plants: { plantType: PowerPlantType; count?: number }[]): Partial<Record<string, number>> {
	const use: Record<string, number> = {};
	for (const plant of plants) {
		const spec = POWER_PLANTS[plant.plantType];
		if (!spec?.fuel) continue;
		use[spec.fuel.resource] = (use[spec.fuel.resource] ?? 0) + spec.fuel.units * (plant.count ?? 1);
	}
	return use;
}

/** Daily upkeep of a set of plants. */
export function dailyUpkeep(plants: { plantType: PowerPlantType; count?: number }[]): number {
	return plants.reduce((sum, p) => sum + (POWER_PLANTS[p.plantType]?.upkeepPerDay ?? 0) * (p.count ?? 1), 0);
}
