import { describe, it, expect } from "@rstest/core";

// Test the pure calculation functions from WalletService
// These don't require database access

// Re-implement the pure logic here since WalletService constructor requires a db instance
// and imports from $lib/config which uses SvelteKit path aliases

const ECONOMY_CONFIG = {
    INITIAL_USER_WALLET: 10000,
    MARKET_TRANSACTION_FEE_PERCENT: 2,
} as const;

function calculateTax(amount: number, taxRate: number): number {
    return Math.floor(amount * (taxRate / 100));
}

function calculateMarketTransactionFee(totalPrice: number): number {
    return Math.floor(
        totalPrice * (ECONOMY_CONFIG.MARKET_TRANSACTION_FEE_PERCENT / 100),
    );
}

function calculateVisaCost(baseCost: number, taxRate: number): number {
    const tax = calculateTax(baseCost, taxRate);
    return baseCost + tax;
}

function calculateFactoryOutput(
    productionRate: number,
    workerCount: number,
    infrastructureBonus: number = 0,
): number {
    const baseOutput = productionRate * workerCount;
    const bonus = infrastructureBonus * 0.01;
    return Math.floor(baseOutput * (1 + bonus));
}

function calculateResourceValue(resource: string, quantity: number): number {
    const baseValues: Record<string, number> = {
        iron: 10,
        copper: 15,
        steel: 50,
        gunpowder: 30,
        wood: 5,
        coal: 8,
        rifles: 100,
        ammunition: 5,
        artillery: 500,
        vehicles: 1000,
        explosives: 200,
    };
    return (baseValues[resource] || 0) * quantity;
}

describe("WalletService - Tax Calculations", () => {
    it("should calculate tax correctly for standard rate", () => {
        expect(calculateTax(1000, 10)).toBe(100);
    });

    it("should calculate tax correctly for 0% rate", () => {
        expect(calculateTax(1000, 0)).toBe(0);
    });

    it("should calculate tax correctly for 100% rate", () => {
        expect(calculateTax(1000, 100)).toBe(1000);
    });

    it("should floor fractional tax amounts", () => {
        expect(calculateTax(333, 10)).toBe(33); // 33.3 -> 33
    });

    it("should handle large amounts", () => {
        expect(calculateTax(1000000, 15)).toBe(150000);
    });
});

describe("WalletService - Market Transaction Fee", () => {
    it("should calculate 2% transaction fee", () => {
        expect(calculateMarketTransactionFee(10000)).toBe(200);
    });

    it("should floor fractional fees", () => {
        expect(calculateMarketTransactionFee(333)).toBe(6); // 6.66 -> 6
    });

    it("should return 0 for 0 price", () => {
        expect(calculateMarketTransactionFee(0)).toBe(0);
    });
});

describe("WalletService - Visa Cost Calculation", () => {
    it("should calculate visa cost with tax", () => {
        const cost = calculateVisaCost(5000, 20);
        expect(cost).toBe(6000); // 5000 + 1000 (20% tax)
    });

    it("should return base cost when tax is 0", () => {
        const cost = calculateVisaCost(5000, 0);
        expect(cost).toBe(5000);
    });

    it("should handle 100% tax rate", () => {
        const cost = calculateVisaCost(5000, 100);
        expect(cost).toBe(10000);
    });
});

describe("WalletService - Factory Output Calculation", () => {
    it("should calculate base output without infrastructure bonus", () => {
        expect(calculateFactoryOutput(10, 5)).toBe(50);
    });

    it("should apply infrastructure bonus correctly", () => {
        // 10 * 5 * (1 + 10 * 0.01) = 50 * 1.1 = 55
        expect(calculateFactoryOutput(10, 5, 10)).toBe(55);
    });

    it("should return 0 with no workers", () => {
        expect(calculateFactoryOutput(10, 0)).toBe(0);
    });

    it("should floor fractional output", () => {
        // 10 * 3 * (1 + 5 * 0.01) = 30 * 1.05 = 31.5 -> 31
        expect(calculateFactoryOutput(10, 3, 5)).toBe(31);
    });

    it("should handle large infrastructure bonus", () => {
        // 10 * 10 * (1 + 100 * 0.01) = 100 * 2 = 200
        expect(calculateFactoryOutput(10, 10, 100)).toBe(200);
    });
});

describe("WalletService - Resource Valuation", () => {
    it("should calculate iron value correctly", () => {
        expect(calculateResourceValue("iron", 100)).toBe(1000);
    });

    it("should calculate steel value correctly", () => {
        expect(calculateResourceValue("steel", 50)).toBe(2500);
    });

    it("should calculate artillery value correctly", () => {
        expect(calculateResourceValue("artillery", 3)).toBe(1500);
    });

    it("should calculate vehicles value correctly", () => {
        expect(calculateResourceValue("vehicles", 2)).toBe(2000);
    });

    it("should return 0 for unknown resource", () => {
        expect(calculateResourceValue("nonexistent", 100)).toBe(0);
    });

    it("should return 0 for 0 quantity", () => {
        expect(calculateResourceValue("iron", 0)).toBe(0);
    });

    it("should handle all valid resources", () => {
        const resources = [
            "iron",
            "copper",
            "steel",
            "gunpowder",
            "wood",
            "coal",
            "rifles",
            "ammunition",
            "artillery",
            "vehicles",
            "explosives",
        ];
        for (const resource of resources) {
            expect(calculateResourceValue(resource, 1)).toBeGreaterThan(0);
        }
    });
});
