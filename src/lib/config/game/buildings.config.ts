// Public buildings a state can construct in its regions. Each completed
// building raises one of the region's levels by one (see
// services/politics/construction.service.ts); a region needs some
// infrastructure before it can host the bigger projects.
export type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications" | "radar";

/** The `regions` column a building type raises. */
export type RegionStat = "infrastructure" | "education" | "hospitals" | "economy" | "fortifications" | "radar";

export interface BuildingCosts {
	currency: number;
	iron?: number;
	copper?: number;
	steel?: number;
	gunpowder?: number;
	wood?: number;
	coal?: number;
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
	/** In days. */
	constructionTime: number;
	/** Infrastructure level the region needs first. */
	infrastructureRequired: number;
	description: string;
	benefits: string[];
}

export const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
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
	}
};

export const VALID_BUILDING_TYPES = Object.keys(BUILDING_TEMPLATES) as BuildingType[];

export const isBuildingType = (value: string): value is BuildingType => value in BUILDING_TEMPLATES;

// Border maintenance costs (for closed borders)
export const BORDER_MAINTENANCE = {
	dailyCost: 50000,
	resourceCosts: {
		steel: 10,
		gunpowder: 20
	}
} as const;
