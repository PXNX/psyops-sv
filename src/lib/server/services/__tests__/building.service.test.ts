import { describe, it, expect } from "@rstest/core";

// Building configuration (mirrored to avoid $lib alias)
const BUILDING_TEMPLATES = {
    hospital: {
        type: "hospital",
        costs: { currency: 50000, steel: 100, copper: 50, wood: 200 },
        constructionTime: 7,
        infrastructureRequired: 10,
        powerConsumption: 20,
    },
    school: {
        type: "school",
        costs: { currency: 40000, steel: 80, wood: 300 },
        constructionTime: 5,
        infrastructureRequired: 5,
        powerConsumption: 15,
    },
    power_plant: {
        type: "power_plant",
        costs: { currency: 100000, steel: 300, copper: 200, coal: 500 },
        constructionTime: 14,
        infrastructureRequired: 15,
        powerConsumption: 0,
    },
    infrastructure: {
        type: "infrastructure",
        costs: { currency: 30000, steel: 50, wood: 100, coal: 200 },
        constructionTime: 3,
        infrastructureRequired: 0,
        powerConsumption: 0,
    },
    fortifications: {
        type: "fortifications",
        costs: { currency: 150000, steel: 500, iron: 300, coal: 200 },
        constructionTime: 7,
        infrastructureRequired: 15,
        powerConsumption: 5,
    },
} as const;

const BORDER_MAINTENANCE = {
    dailyCost: 50000,
    resourceCosts: { steel: 10, gunpowder: 20 },
} as const;

type BuildingType = keyof typeof BUILDING_TEMPLATES;

function canAffordBuilding(
    type: BuildingType,
    availableResources: Record<string, number>,
    quantity: number = 1,
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

function calculateConstructionTime(
    type: BuildingType,
    infrastructureBonus: number = 0,
): number {
    const baseTime = BUILDING_TEMPLATES[type].constructionTime;
    const reduction = Math.min(infrastructureBonus / 10, 5) * 0.1;
    return Math.ceil(baseTime * (1 - reduction));
}

function canAffordBorderMaintenance(
    availableResources: Record<string, number>,
    days: number = 1,
): { canAfford: boolean; missing: Record<string, number> } {
    const missing: Record<string, number> = {};
    let canAfford = true;

    const currencyNeeded = BORDER_MAINTENANCE.dailyCost * days;
    const currencyAvailable = availableResources.currency || 0;
    if (currencyAvailable < currencyNeeded) {
        canAfford = false;
        missing.currency = currencyNeeded - currencyAvailable;
    }

    for (const [resource, amountPerDay] of Object.entries(
        BORDER_MAINTENANCE.resourceCosts,
    )) {
        const totalNeeded = amountPerDay * days;
        const available = availableResources[resource] || 0;
        if (available < totalNeeded) {
            canAfford = false;
            missing[resource] = totalNeeded - available;
        }
    }

    return { canAfford, missing };
}

describe("BuildingService - Affordability Check", () => {
    it("should return canAfford=true when resources are sufficient", () => {
        const resources = {
            currency: 100000,
            steel: 200,
            copper: 100,
            wood: 500,
        };
        const result = canAffordBuilding("hospital", resources);
        expect(result.canAfford).toBe(true);
        expect(Object.keys(result.missing).length).toBe(0);
    });

    it("should return canAfford=false when resources are insufficient", () => {
        const resources = { currency: 10000, steel: 10, copper: 5, wood: 50 };
        const result = canAffordBuilding("hospital", resources);
        expect(result.canAfford).toBe(false);
        expect(result.missing.currency).toBe(40000); // 50000 - 10000
        expect(result.missing.steel).toBe(90); // 100 - 10
        expect(result.missing.copper).toBe(45); // 50 - 5
        expect(result.missing.wood).toBe(150); // 200 - 50
    });

    it("should multiply costs by quantity", () => {
        const resources = {
            currency: 100000,
            steel: 200,
            copper: 100,
            wood: 400,
        };
        const result = canAffordBuilding("hospital", resources, 2);
        // Hospital costs: currency=50000*2=100000, steel=100*2=200, copper=50*2=100, wood=200*2=400
        expect(result.canAfford).toBe(true);
    });

    it("should detect partial shortages", () => {
        const resources = {
            currency: 200000,
            steel: 100,
            iron: 100,
            coal: 200,
        };
        const result = canAffordBuilding("fortifications", resources);
        // Fortifications need: currency=150000, steel=500, iron=300, coal=200
        expect(result.canAfford).toBe(false);
        expect(result.missing.steel).toBe(400); // 500 - 100
        expect(result.missing.iron).toBe(200); // 300 - 100
        expect(result.missing.currency).toBeUndefined();
    });

    it("should handle zero resources gracefully", () => {
        const result = canAffordBuilding("infrastructure", {});
        expect(result.canAfford).toBe(false);
        expect(result.missing.currency).toBe(30000);
    });
});

describe("BuildingService - Construction Time", () => {
    it("should return base time with no infrastructure bonus", () => {
        expect(calculateConstructionTime("hospital")).toBe(7);
        expect(calculateConstructionTime("school")).toBe(5);
        expect(calculateConstructionTime("infrastructure")).toBe(3);
    });

    it("should reduce time with infrastructure bonus", () => {
        // 10 infra -> 10% reduction: 7 * 0.9 = 6.3 -> ceil = 7
        expect(calculateConstructionTime("hospital", 10)).toBe(7);
        // 20 infra -> 20% reduction: 7 * 0.8 = 5.6 -> ceil = 6
        expect(calculateConstructionTime("hospital", 20)).toBe(6);
    });

    it("should cap reduction at 50%", () => {
        // 100 infra = min(100/10, 5) = 5 -> 50% reduction
        // 14 * 0.5 = 7 -> ceil = 7
        expect(calculateConstructionTime("power_plant", 100)).toBe(7);
        // 200 infra = still capped at 50%
        expect(calculateConstructionTime("power_plant", 200)).toBe(7);
    });

    it("should handle 0 infrastructure bonus", () => {
        expect(calculateConstructionTime("school", 0)).toBe(5);
    });
});

describe("BuildingService - Border Maintenance Affordability", () => {
    it("should afford maintenance with sufficient resources", () => {
        const resources = { currency: 100000, steel: 50, gunpowder: 50 };
        const result = canAffordBorderMaintenance(resources);
        expect(result.canAfford).toBe(true);
    });

    it("should not afford maintenance with insufficient currency", () => {
        const resources = { currency: 10000, steel: 50, gunpowder: 50 };
        const result = canAffordBorderMaintenance(resources);
        expect(result.canAfford).toBe(false);
        expect(result.missing.currency).toBe(40000);
    });

    it("should multiply costs for multiple days", () => {
        const resources = { currency: 200000, steel: 50, gunpowder: 100 };
        const result = canAffordBorderMaintenance(resources, 7);
        // 7 days: currency=350000, steel=70, gunpowder=140
        expect(result.canAfford).toBe(false);
        expect(result.missing.currency).toBe(150000); // 350000 - 200000
        expect(result.missing.steel).toBe(20); // 70 - 50
        expect(result.missing.gunpowder).toBe(40); // 140 - 100
    });

    it("should handle single day correctly", () => {
        const resources = { currency: 50000, steel: 10, gunpowder: 20 };
        const result = canAffordBorderMaintenance(resources, 1);
        expect(result.canAfford).toBe(true);
    });
});
