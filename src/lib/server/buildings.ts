// lib/server/buildings.ts
export type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications";

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
	},
	fortifications: {
		type: "fortifications",
		costs: {
			currency: 150000,
			steel: 500,
			iron: 300,
			coal: 200
		},
		constructionTime: 7,
		infrastructureRequired: 15,
		powerConsumption: 5
	}
};

// Border maintenance costs (for closed borders)
export const BORDER_MAINTENANCE = {
	dailyCost: 50000, // Currency per day
	resourceCosts: {
		// Daily resource consumption for border patrol
		steel: 10,
		gunpowder: 20 // Changed from ammunition to gunpowder to match your resource types
	}
} as const;

// Helper function to get building template
export function getBuildingTemplate(type: BuildingType): BuildingTemplate {
	return BUILDING_TEMPLATES[type];
}

// Helper function to check if resources are sufficient
export function canAffordBuilding(
	type: BuildingType,
	availableResources: Record<string, number>,
	quantity: number = 1
): { canAfford: boolean; missing: Record<string, number> } {
	const template = BUILDING_TEMPLATES[type];
	const missing: Record<string, number> = {};
	let canAfford = true;

	for (const [resource, required] of Object.entries(template.costs)) {
		const totalRequired = required * quantity;
		const available = availableResources[resource] || 0;
		if (available < totalRequired) {
			canAfford = false;
			missing[resource] = totalRequired - available;
		}
	}

	return { canAfford, missing };
}

// Helper function to format resource costs for display
export function formatBuildingCosts(type: BuildingType, quantity: number = 1): string {
	const template = BUILDING_TEMPLATES[type];
	const costs: string[] = [];

	for (const [resource, amount] of Object.entries(template.costs)) {
		const totalAmount = amount * quantity;
		if (resource === "currency") {
			costs.push(`${totalAmount.toLocaleString()} 💰`);
		} else {
			const icon = getResourceIcon(resource);
			costs.push(`${totalAmount} ${icon} ${resource}`);
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

// Helper function to get building description
export function getBuildingDescription(type: BuildingType): string {
	const descriptions: Record<BuildingType, string> = {
		hospital: "Improves public health and increases population growth",
		school: "Increases education level and worker productivity",
		power_plant: "Generates electricity for industrial development",
		infrastructure: "Roads, bridges, and railways that boost economic activity",
		fortifications: "Military defenses that strengthen regional security"
	};
	return descriptions[type];
}

// Helper function to get building benefits
export function getBuildingBenefits(type: BuildingType): string[] {
	const benefits: Record<BuildingType, string[]> = {
		hospital: ["+1 Hospital capacity", "+5% Population growth", "Reduces casualties in war"],
		school: ["+10 Education stat", "+3% Worker productivity", "Unlocks advanced technologies"],
		power_plant: ["+1 Power plant capacity", "Generates electricity", "Required for industrial buildings"],
		infrastructure: [
			"+10 Infrastructure stat",
			"Faster troop movement",
			"Increased trade efficiency",
			"Reduced construction time"
		],
		fortifications: [
			"+1 Fortification level",
			"Increases defensive strength",
			"Reduces attacker advantage",
			"Protects regional assets"
		]
	};
	return benefits[type];
}

// Check if a border control action can be afforded
export function canAffordBorderMaintenance(
	availableResources: Record<string, number>,
	days: number = 1
): { canAfford: boolean; missing: Record<string, number> } {
	const missing: Record<string, number> = {};
	let canAfford = true;

	// Check currency
	const currencyNeeded = BORDER_MAINTENANCE.dailyCost * days;
	const currencyAvailable = availableResources.currency || 0;
	if (currencyAvailable < currencyNeeded) {
		canAfford = false;
		missing.currency = currencyNeeded - currencyAvailable;
	}

	// Check resources
	for (const [resource, amountPerDay] of Object.entries(BORDER_MAINTENANCE.resourceCosts)) {
		const totalNeeded = amountPerDay * days;
		const available = availableResources[resource] || 0;
		if (available < totalNeeded) {
			canAfford = false;
			missing[resource] = totalNeeded - available;
		}
	}

	return { canAfford, missing };
}

// Format border maintenance costs
export function formatBorderMaintenanceCosts(days: number = 1): string {
	const costs: string[] = [];

	// Currency
	const currencyTotal = BORDER_MAINTENANCE.dailyCost * days;
	costs.push(`${currencyTotal.toLocaleString()} 💰`);

	// Resources
	for (const [resource, amount] of Object.entries(BORDER_MAINTENANCE.resourceCosts)) {
		const total = amount * days;
		const icon = getResourceIcon(resource);
		costs.push(`${total} ${icon} ${resource}`);
	}

	if (days > 1) {
		return `${costs.join(", ")} (for ${days} day${days > 1 ? "s" : ""})`;
	}

	return `${costs.join(", ")} per day`;
}

// Export all building types for validation
export const VALID_BUILDING_TYPES: BuildingType[] = [
	"hospital",
	"school",
	"power_plant",
	"infrastructure",
	"fortifications"
];

// Ministry permissions for auto-execution
export const MINISTRY_PERMISSIONS: Record<string, string[]> = {
	economy: ["tax"],
	foreign_affairs: ["border_control"],
	defense: ["fortifications"],
	infrastructure: ["infrastructure"],
	education: ["school"],
	health: ["hospital"]
};

// Presidential auto-execute permissions
export const PRESIDENTIAL_PERMISSIONS: string[] = ["tax", "border_control", "fortifications"];

// Helper to check if a user can auto-execute a proposal type
export function canAutoExecuteProposal(
	proposalType: string,
	userMinistry: string | null,
	isPresident: boolean
): boolean {
	if (isPresident && PRESIDENTIAL_PERMISSIONS.includes(proposalType)) {
		return true;
	}

	if (userMinistry && MINISTRY_PERMISSIONS[userMinistry]?.includes(proposalType)) {
		return true;
	}

	return false;
}
