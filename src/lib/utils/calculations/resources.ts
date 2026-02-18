// Resource and economy calculations
import { ECONOMY_CONFIG } from '$lib/config';

export function calculateTax(amount: number, taxRate: number): number {
    return Math.floor(amount * (taxRate / 100));
}

export function calculateMarketTransactionFee(totalPrice: number): number {
    return Math.floor(totalPrice * (ECONOMY_CONFIG.MARKET_TRANSACTION_FEE_PERCENT / 100));
}

export function calculateVisaCost(baseCost: number, taxRate: number): number {
    const tax = calculateTax(baseCost, taxRate);
    return baseCost + tax;
}

export function calculateFactoryOutput(
    productionRate: number,
    workerCount: number,
    infrastructureBonus: number = 0
): number {
    const baseOutput = productionRate * workerCount;
    const bonus = infrastructureBonus * 0.01; // 1% per infrastructure point
    return Math.floor(baseOutput * (1 + bonus));
}

export function calculateResourceValue(resource: string, quantity: number): number {
    // Base values for resources (in currency)
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
        explosives: 200
    };

    return (baseValues[resource] || 0) * quantity;
}
