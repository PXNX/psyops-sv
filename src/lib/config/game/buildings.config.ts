// Buildings and infrastructure configuration
export type BuildingType =
    | "hospital"
    | "school"
    | "power_plant"
    | "infrastructure"
    | "fortifications";

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
    description: string;
    benefits: string[];
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
        powerConsumption: 20,
        description: "Improves public health and increases population growth",
        benefits: ["+1 Hospital capacity", "+5% Population growth", "Reduces casualties in war"]
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
        powerConsumption: 15,
        description: "Increases education level and worker productivity",
        benefits: ["+10 Education stat", "+3% Worker productivity", "Unlocks advanced technologies"]
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
        powerConsumption: 0,
        description: "Generates electricity for industrial development",
        benefits: ["+1 Power plant capacity", "Generates electricity", "Required for industrial buildings"]
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
        powerConsumption: 0,
        description: "Roads, bridges, and railways that boost economic activity",
        benefits: [
            "+10 Infrastructure stat",
            "Faster troop movement",
            "Increased trade efficiency",
            "Reduced construction time"
        ]
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
        powerConsumption: 5,
        description: "Military defenses that strengthen regional security",
        benefits: [
            "+1 Fortification level",
            "Increases defensive strength",
            "Reduces attacker advantage",
            "Protects regional assets"
        ]
    }
};

export const VALID_BUILDING_TYPES: BuildingType[] = [
    "hospital",
    "school",
    "power_plant",
    "infrastructure",
    "fortifications"
];

// Border maintenance costs (for closed borders)
export const BORDER_MAINTENANCE = {
    dailyCost: 50000,
    resourceCosts: {
        steel: 10,
        gunpowder: 20
    }
} as const;
