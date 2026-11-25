// Public buildings a state can construct in its regions. Each completed
// building raises one of the region's levels by one (see
// services/politics/construction.service.ts); a region needs some
// infrastructure before it can host the bigger projects.
export type BuildingType =
	| "hospital"
	| "school"
	| "power_plant"
	| "infrastructure"
	| "fortifications"
	| "radar"
	| "grid"
	| "energy_storage"
	| "datacenter"
	| "internet_backbone"
	| "network_switch"
	| "radio_mast"
	| "airbase";

/** The `regions` column a building type raises. */
export type RegionStat =
	| "infrastructure"
	| "education"
	| "hospitals"
	| "economy"
	| "fortifications"
	| "radar"
	| "grid"
	| "storage"
	| "connectivity"
	| "airbase";

export interface BuildingCosts {
	currency: number;
	iron?: number;
	copper?: number;
	steel?: number;
	gunpowder?: number;
	wood?: number;
	coal?: number;
	rare_earth?: number;
	silicon?: number;
	/** Finished products (e.g. server hardware) drawn from the state stockpile. */
	hardware?: number;
}

export interface BuildingTemplate {
	type: BuildingType;
	name: string;
	icon: string;
	/** Region level this building raises by one when it's finished. */
	stat: RegionStat;
	statLabel: string;
	maxLevel: number;
	/** Currency from the state treasury, the rest from the state stockpile. */
	costs: BuildingCosts;
	/** A site counted by other systems instead of raising a region stat. */
	siteOnly?: boolean;
	/** Only parliament can enact it (no direct order by president or governor). */
	lawOnly?: boolean;
	/** In days. */
	constructionTime: number;
	/** Infrastructure level the region needs first. */
	infrastructureRequired: number;
	description: string;
	benefits: string[];
}

export const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
	airbase: {
		type: "airbase",
		name: "Airbase",
		icon: "🛫",
		stat: "airbase",
		statLabel: "Airbase",
		maxLevel: 1,
		lawOnly: true,
		costs: { currency: 600_000, steel: 1_200, iron: 400, coal: 200 },
		constructionTime: 10,
		infrastructureRequired: 3,
		description:
			"Runways, hardened shelters and fuel depots. Squadrons can only be based at and fly from an airbase; it has to be enacted by law.",
		benefits: [
			"Squadrons can be stationed here",
			"Air missions reach targets within each type's range of the base",
			"New squadrons are stationed at the state's nearest airbase"
		]
	},
	infrastructure: {
		type: "infrastructure",
		name: "Infrastructure",
		icon: "🛣️",
		stat: "infrastructure",
		statLabel: "Infrastructure",
		maxLevel: 20,
		costs: { currency: 30000, steel: 50, wood: 100, coal: 200 },
		constructionTime: 3,
		infrastructureRequired: 0,
		description: "Roads, bridges and railways. Everything else is built on it.",
		benefits: ["+1 infrastructure level", "Unlocks schools, hospitals, power plants and forts"]
	},
	school: {
		type: "school",
		name: "School",
		icon: "🏫",
		stat: "education",
		statLabel: "Education",
		maxLevel: 10,
		costs: { currency: 40000, steel: 80, wood: 300 },
		constructionTime: 5,
		infrastructureRequired: 1,
		description: "Schools and universities for a skilled workforce.",
		benefits: ["+1 education level"]
	},
	hospital: {
		type: "hospital",
		name: "Hospital",
		icon: "🏥",
		stat: "hospitals",
		statLabel: "Hospitals",
		maxLevel: 10,
		costs: { currency: 50000, steel: 100, copper: 50, wood: 200 },
		constructionTime: 7,
		infrastructureRequired: 2,
		description: "Medical care for the region's people.",
		benefits: ["+1 hospital level"]
	},
	power_plant: {
		type: "power_plant",
		name: "Power plant",
		icon: "⚡",
		stat: "economy",
		statLabel: "Power",
		maxLevel: 10,
		costs: { currency: 100000, steel: 300, copper: 200, coal: 500 },
		constructionTime: 14,
		infrastructureRequired: 3,
		description: "Electricity for the region's industry.",
		benefits: ["+1 power level"]
	},
	fortifications: {
		type: "fortifications",
		name: "Fortifications",
		icon: "🛡️",
		stat: "fortifications",
		statLabel: "Fortifications",
		maxLevel: 20,
		costs: { currency: 150000, steel: 500, iron: 300, coal: 200 },
		constructionTime: 7,
		infrastructureRequired: 3,
		description: "Bunkers and defensive lines.",
		benefits: ["+1 fortification level", "Attackers deal 2% less damage per level in battles here"]
	},
	radar: {
		type: "radar",
		name: "Air-defence radar",
		icon: "📡",
		stat: "radar",
		statLabel: "Radar coverage",
		maxLevel: 3,
		costs: { currency: 90000, steel: 200, copper: 150 },
		constructionTime: 4,
		infrastructureRequired: 2,
		description: "Early-warning and fire-control radars for the region's air defence.",
		benefits: [
			"+1 radar coverage level",
			"Cues air defence: each level counts as half an air-defence unit",
			"Shooting down drones and incoming strikes",
			"Enemy SEAD can knock the radars out"
		]
	},
	grid: {
		type: "grid",
		name: "Grid network",
		icon: "🔌",
		stat: "grid",
		statLabel: "Grid network",
		maxLevel: 12,
		costs: { currency: 120000, steel: 250, copper: 300, coal: 100 },
		constructionTime: 4,
		infrastructureRequired: 2,
		description:
			"Substations, transformers and transmission lines. Every regional plant needs a network to reach its customers.",
		benefits: [
			"+120 MW of transmission capacity per level",
			"Unlocks bigger plants: nuclear needs level 3, fusion level 4",
			"Plants above the local capacity are curtailed"
		]
	},
	energy_storage: {
		type: "energy_storage",
		name: "Battery storage",
		icon: "🔋",
		stat: "storage",
		statLabel: "Energy storage",
		maxLevel: 8,
		costs: { currency: 180000, steel: 150, copper: 250, rare_earth: 40 },
		constructionTime: 5,
		infrastructureRequired: 3,
		description: "Grid-scale batteries and pumped storage. They soak up surplus and smooth the dips of solar and wind.",
		benefits: [
			"+60 MW of dispatchable capacity per level",
			"Removes up to 32% of the intermittency loss on renewables",
			"Keeps the lights on when the sun sets"
		]
	},
	datacenter: {
		type: "datacenter",
		name: "Datacenter",
		icon: "🖥️",
		stat: "economy",
		statLabel: "Computing",
		siteOnly: true,
		maxLevel: 20,
		costs: { currency: 750_000, steel: 800, silicon: 400, hardware: 60_000 },
		constructionTime: 20,
		infrastructureRequired: 4,
		description:
			"A full computing site: halls of server hardware, substations and cooling plant. It sharpens cyber operations and research, but only works with a steady supply of electricity and water.",
		benefits: [
			"Counts as one computing site for cyber and research",
			"Needs 60,000 server hardware to build",
			"Requires reliable power and cooling water to operate"
		]
	},
	internet_backbone: {
		type: "internet_backbone",
		name: "Internet backbone",
		icon: "🌐",
		stat: "connectivity",
		statLabel: "Connectivity",
		maxLevel: 10,
		costs: { currency: 220_000, steel: 200, copper: 400, silicon: 80 },
		constructionTime: 10,
		infrastructureRequired: 2,
		description: "Fibre trunk lines and exchange points linking the region to the wider network.",
		benefits: ["+1 connectivity level", "Civilian goodwill", "Faster business and datacenter links"]
	},
	network_switch: {
		type: "network_switch",
		name: "Network switches",
		icon: "🔀",
		stat: "connectivity",
		statLabel: "Connectivity",
		maxLevel: 10,
		costs: { currency: 140_000, steel: 120, copper: 260, silicon: 60 },
		constructionTime: 6,
		infrastructureRequired: 2,
		description: "Local switching gear that brings reliable broadband to towns and factories.",
		benefits: ["+1 connectivity level", "Civilian goodwill"]
	},
	radio_mast: {
		type: "radio_mast",
		name: "Radio mast",
		icon: "📡",
		stat: "connectivity",
		statLabel: "Connectivity",
		maxLevel: 10,
		costs: { currency: 90_000, steel: 180, copper: 90 },
		constructionTime: 4,
		infrastructureRequired: 1,
		description: "Sending masts for mobile and emergency traffic where fibre cannot reach.",
		benefits: ["+1 connectivity level", "Civilian goodwill"]
	}
};

export const VALID_BUILDING_TYPES = Object.keys(BUILDING_TEMPLATES) as BuildingType[];

/**
 * What a region's governor may order on their own, paid from the regional
 * budget and stockpile: civilian works that serve the people living there.
 * Defences (forts, radar), the airbase (law only) and datacenters (a
 * strategic cyber site that needs the state's server hardware) stay with
 * the state's government.
 */
export const GOVERNOR_BUILDINGS: readonly BuildingType[] = [
	"infrastructure",
	"school",
	"hospital",
	"power_plant",
	"grid",
	"energy_storage",
	"internet_backbone",
	"network_switch",
	"radio_mast"
];

export const isGovernorBuilding = (type: BuildingType): boolean =>
	GOVERNOR_BUILDINGS.includes(type) && !BUILDING_TEMPLATES[type].lawOnly;

export const isBuildingType = (value: string): value is BuildingType => value in BUILDING_TEMPLATES;

// Border maintenance costs (for closed borders)
export const BORDER_MAINTENANCE = {
	dailyCost: 50000,
	resourceCosts: {
		steel: 10,
		gunpowder: 20
	}
} as const;
