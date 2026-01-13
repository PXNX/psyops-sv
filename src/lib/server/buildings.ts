// lib/server/buildings.ts

export type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure";

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

	costs: BuildingCosts;
	constructionTime: number; // in days
	infrastructureRequired: number;
	powerConsumption: number; // MW
}

export const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
	hospital: {
		type: "hospital",
		costs: {
			currency: 50000,
			steel: 100,
			copper: 50,
			wood: 200
		},
		constructionTime: 7,
		infrastructureRequired: 10,
		powerConsumption: 20
	},
	school: {
		type: "school",

		costs: {
			currency: 40000,
			steel: 80,
			wood: 300
		},
		constructionTime: 5,
		infrastructureRequired: 5,
		powerConsumption: 15
	},
	power_plant: {
		type: "power_plant",

		costs: {
			currency: 100000,
			steel: 300,
			copper: 200,
			coal: 500
		},
		constructionTime: 14,
		infrastructureRequired: 15,
		powerConsumption: 0 // Produces power, doesn't consume
	},
	infrastructure: {
		type: "infrastructure",

		costs: {
			currency: 30000,
			steel: 50,
			wood: 100,
			coal: 200
		},
		constructionTime: 3,
		infrastructureRequired: 0,
		powerConsumption: 0
	}
};

// Helper function to get building template
export function getBuildingTemplate(type: BuildingType): BuildingTemplate {
	return BUILDING_TEMPLATES[type];
}

// Helper function to check if resources are sufficient
export function canAffordBuilding(
	type: BuildingType,
	availableResources: Record<string, number>
): { canAfford: boolean; missing: Record<string, number> } {
	const template = BUILDING_TEMPLATES[type];
	const missing: Record<string, number> = {};
	let canAfford = true;

	for (const [resource, required] of Object.entries(template.costs)) {
		const available = availableResources[resource] || 0;
		if (available < required) {
			canAfford = false;
			missing[resource] = required - available;
		}
	}

	return { canAfford, missing };
}

// Helper function to format resource costs for display
export function formatBuildingCosts(type: BuildingType): string {
	const template = BUILDING_TEMPLATES[type];
	const costs: string[] = [];

	for (const [resource, amount] of Object.entries(template.costs)) {
		if (resource === "currency") {
			costs.push(`${amount.toLocaleString()} 💰`);
		} else {
			const icon = getResourceIcon(resource);
			costs.push(`${amount} ${icon} ${resource}`);
		}
	}

	return costs.join(", ");
}

// Helper function to get resource icons
function getResourceIcon(resource: string): string {
	const icons: Record<string, string> = {
		iron: "⚙️",
		copper: "🔶",
		steel: "🔩",
		gunpowder: "💥",
		wood: "🪵",
		coal: "⚫"
	};
	return icons[resource] || "📦";
}

// Helper function to calculate total construction time
export function calculateConstructionTime(type: BuildingType, infrastructureBonus: number = 0): number {
	const baseTime = BUILDING_TEMPLATES[type].constructionTime;
	// Each 10 points of infrastructure reduces construction time by 10%, max 50% reduction
	const reduction = Math.min(infrastructureBonus / 10, 5) * 0.1;
	return Math.ceil(baseTime * (1 - reduction));
}

// Export all building types for validation
export const VALID_BUILDING_TYPES: BuildingType[] = ["hospital", "school", "power_plant", "infrastructure"];
