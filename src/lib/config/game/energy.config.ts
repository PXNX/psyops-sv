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

// --- REGIONAL SITING, GRID NETWORKS AND STORAGE ---------------------------
//
// A plant's nameplate output is only a starting point. Where it stands matters:
// solar bakes in the deserts and the tropics, wind howls along coasts and
// plains, a dam needs water, and geothermal needs the right geology. The grid
// level of the region is its transmission and distribution network: without it
// the power cannot reach anyone, however many reactors are built. Storage
// smooths the dips of intermittent sources instead of wasting their surplus.
//
// Everything here is a pure function of data the world already carries
// (latitude, derived terrain, region levels), so it works for the 1,038 real
// regions as well as the seeded demo world.

/** The bits of a region the siting rules need. */
export interface SitingRegion {
	latitude: number | string;
	terrain?: string | null;
	/** Buildable grid-network level (transmission and distribution). */
	grid?: number | null;
	/** Battery / pumped-storage level. */
	storage?: number | null;
}

export const SITING = {
	/** Siting factor is clamped to this band so no plant is useless or absurd. */
	MIN_FACTOR: 0.45,
	MAX_FACTOR: 1.6,
	/** MW of transmission capacity per grid-network level. */
	MW_PER_GRID_LEVEL: 120,
	/** MW of dispatchable buffer per storage level. */
	MW_PER_STORAGE_LEVEL: 60,
	/** Share of intermittent output lost to weather without any storage. */
	INTERMITTENCY_LOSS: 0.15,
	/** Storage removes this much of that loss per level. */
	STORAGE_SMOOTHING: 0.04,
	/** Most of the dips can be smoothed, but never all of them. */
	MIN_INTERMITTENCY_LOSS: 0.03,
	/** Terrains that can cool a thermal plant or hold a reservoir. */
	WATER_TERRAINS: ["lake", "lakes", "shore", "river"],
	/** Mountain valleys count as dam sites too. */
	DAM_TERRAINS: ["lake", "lakes", "shore", "river", "mountain", "hills"]
} as const;

/** Terrain multipliers. Missing terrains fall back to 1. */
const TERRAIN_FACTOR: Record<PowerPlantType, Record<string, number>> = {
	coal: { urban: 0.8, city: 0.8, mountain: 0.85 },
	gas: { urban: 0.85, city: 0.85 },
	nuclear: { urban: 0.8, city: 0.8 },
	solar: {
		desert: 1.45, plains: 1.1, fields: 1.1, shore: 1, hills: 1, mountain: 0.9,
		lake: 0.95, forest: 0.8, jungle: 0.7, town: 0.75, urban: 0.65, city: 0.6
	},
	wind: {
		shore: 1.45, plains: 1.2, fields: 1.15, hills: 1.2, mountain: 1.1,
		lake: 1.1, desert: 0.9, forest: 0.75, jungle: 0.8, town: 0.8, urban: 0.7, city: 0.65
	},
	hydro: {
		lake: 1.6, lakes: 1.6, shore: 1.4, river: 1.5, mountain: 1.45, hills: 1.2,
		forest: 0.9, jungle: 0.9, plains: 0.6, desert: 0.45, urban: 0.4, city: 0.35
	},
	geothermal: {
		mountain: 1.6, hills: 1.15, shore: 0.95, plains: 0.6, desert: 0.7,
		forest: 0.6, jungle: 0.6, lake: 0.7, urban: 0.5, city: 0.45
	},
	fusion: { mountain: 1.05, shore: 1.05, desert: 1.05 }
};

/** Grid level a plant needs before it can be connected. */
export const PLANT_GRID_REQUIRED: Record<PowerPlantType, number> = {
	solar: 1,
	wind: 1,
	coal: 1,
	gas: 2,
	hydro: 2,
	geothermal: 2,
	nuclear: 3,
	fusion: 4
};

/** How long a plant takes to build, in days, and what it is built from. */
export interface PlantConstructionSpec {
	days: number;
	/** From the state stockpile (the heavy, domestic work). */
	domestic: Partial<Record<string, number>>;
	/** Imported components bought on the world market with treasury. */
	imported: Partial<Record<EnergyPart, number>>;
}

export const ENERGY_PARTS = [
	"solar_panels",
	"wind_turbines",
	"industrial_turbines",
	"gas_turbines",
	"hydro_turbines",
	"drill_rig",
	"reactor_vessel",
	"control_systems"
] as const;
export type EnergyPart = (typeof ENERGY_PARTS)[number];

/** Fixed world-market prices for imported plant components. */
export const ENERGY_PART_PRICES: Record<EnergyPart, number> = {
	solar_panels: 12_000,
	wind_turbines: 45_000,
	industrial_turbines: 80_000,
	gas_turbines: 90_000,
	hydro_turbines: 50_000,
	drill_rig: 120_000,
	reactor_vessel: 400_000,
	control_systems: 60_000
};

export const PLANT_CONSTRUCTION: Record<PowerPlantType, PlantConstructionSpec> = {
	coal: { days: 8, domestic: { steel: 300, coal: 200 }, imported: { industrial_turbines: 4 } },
	gas: { days: 7, domestic: { steel: 250, copper: 120 }, imported: { gas_turbines: 3 } },
	nuclear: {
		days: 18,
		domestic: { steel: 800, copper: 400, uranium: 50 },
		imported: { reactor_vessel: 1, control_systems: 4 }
	},
	solar: { days: 5, domestic: { steel: 80, copper: 200, silicon: 120 }, imported: { solar_panels: 20 } },
	wind: { days: 6, domestic: { steel: 200, copper: 150 }, imported: { wind_turbines: 8 } },
	hydro: { days: 10, domestic: { steel: 400, copper: 200 }, imported: { hydro_turbines: 6 } },
	geothermal: { days: 9, domestic: { steel: 300, copper: 180 }, imported: { drill_rig: 2 } },
	fusion: {
		days: 24,
		domestic: { steel: 1500, copper: 800, rare_earth: 200 },
		imported: { reactor_vessel: 2, control_systems: 10 }
	}
};

/** Import surcharge when the state is blockaded (parts must run the gauntlet). */
export const BLOCKADE_PART_SURCHARGE = 0.35;

/** Price of one imported component, optionally under blockade. */
export function partPrice(part: EnergyPart, blockaded = false): number {
	return Math.round(ENERGY_PART_PRICES[part] * (blockaded ? 1 + BLOCKADE_PART_SURCHARGE : 1));
}

/** Treasury cost of a plant's imported components. */
export function importedPartsCost(plantType: PowerPlantType, blockaded = false): number {
	return Object.entries(PLANT_CONSTRUCTION[plantType].imported).reduce(
		(sum, [part, units]) => sum + partPrice(part as EnergyPart, blockaded) * (units ?? 0),
		0
	);
}

const clampFactor = (n: number) =>
	Math.round(Math.min(SITING.MAX_FACTOR, Math.max(SITING.MIN_FACTOR, n)) * 1000) / 1000;

/**
 * How well a plant type works in a region. Latitude drives the sun and wind
 * belts; terrain decides whether a dam, a geothermal well or a cooling lake
 * is possible. The returned factor multiplies the plant's nameplate output.
 */
export function plantSiting(plantType: PowerPlantType, region: SitingRegion): { factor: number; notes: string[] } {
	const lat = Math.abs(Number(region.latitude) || 0);
	const terrain = region.terrain ?? "plains";
	const notes: string[] = [];
	let factor = 1;

	if (plantType === "solar") {
		factor = 1.35 - 0.008 * lat;
		notes.push(lat < 30 ? "Low-latitude sunshine" : lat > 55 ? "Weak high-latitude sun" : "Moderate sunlight");
	} else if (plantType === "wind") {
		factor = 0.85 + 0.006 * lat;
		notes.push(lat > 45 ? "Strong mid-latitude winds" : "Light winds");
	} else if (plantType === "hydro" || plantType === "geothermal") {
		factor = 1;
	}

	const terrainFactor = TERRAIN_FACTOR[plantType][terrain] ?? 1;
	if (terrainFactor !== 1) notes.push(`${terrain} terrain`);
	factor *= terrainFactor;

	return { factor: clampFactor(factor), notes };
}

/** Player-readable siting problems; empty means the site is legal. */
export function sitingProblems(plantType: PowerPlantType, region: SitingRegion): string[] {
	const problems: string[] = [];
	const terrain = region.terrain ?? "plains";
	const spec = POWER_PLANTS[plantType];
	const grid = Number(region.grid ?? 0);
	const required = PLANT_GRID_REQUIRED[plantType];

	if (grid < required) {
		problems.push(`Needs grid-network level ${required} in this region (it has ${grid}).`);
	}
	if (spec.needsWater) {
		const allowed: readonly string[] = plantType === "hydro" ? SITING.DAM_TERRAINS : SITING.WATER_TERRAINS;
		if (!allowed.includes(terrain)) {
			problems.push(
				plantType === "hydro"
					? "A dam needs a lake, coast, river or mountain valley."
					: "This plant needs a lake or coast for cooling water."
			);
		}
	}
	return problems;
}

/** Dispatchable MW a region's grid and storage can carry. */
export function gridCapacity(gridLevel: number): number {
	return Math.max(0, Math.floor(gridLevel)) * SITING.MW_PER_GRID_LEVEL;
}

export function storageCapacity(storageLevel: number): number {
	return Math.max(0, Math.floor(storageLevel)) * SITING.MW_PER_STORAGE_LEVEL;
}

/** Loss factor for intermittent sources at a given storage level. */
export function intermittencyLoss(storageLevel: number): number {
	return Math.max(
		SITING.MIN_INTERMITTENCY_LOSS,
		SITING.INTERMITTENCY_LOSS - Math.max(0, Math.floor(storageLevel)) * SITING.STORAGE_SMOOTHING
	);
}

/** Actual MW a plant of this type would deliver in this region right now. */
export function plantOutput(
	plantType: PowerPlantType,
	region: SitingRegion,
	gridLevel = Number(region.grid ?? 0),
	storageLevel = Number(region.storage ?? 0)
): number {
	const spec = POWER_PLANTS[plantType];
	if (!spec) return 0;
	let output = spec.output * plantSiting(plantType, region).factor;
	if (spec.renewable) output *= 1 - intermittencyLoss(storageLevel);

	// Transmission is a hard ceiling: without a grid there is no way to reach
	// customers, and surplus beyond grid + storage is curtailed.
	const grid = gridCapacity(gridLevel);
	if (grid <= 0) return 0;
	const ceiling = grid + storageCapacity(storageLevel);
	if (output > ceiling) output = ceiling;
	return Math.max(0, Math.round(output));
}
