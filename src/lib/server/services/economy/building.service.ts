// Building service - handles building operations and calculations
import type { Database } from '../../db';
import { stateBuildings } from '../../schema';
import { eq } from 'drizzle-orm';
import { BUILDING_TEMPLATES, BORDER_MAINTENANCE, type BuildingType } from '$lib/config';

export class BuildingService {
    constructor(private db: typeof import('../../db').db) { }

    // ============ Building Calculations ============

    getBuildingTemplate(type: BuildingType) {
        return BUILDING_TEMPLATES[type];
    }

    canAffordBuilding(
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

    formatBuildingCosts(type: BuildingType, quantity: number = 1): string {
        const template = BUILDING_TEMPLATES[type];
        const costs: string[] = [];

        for (const [resource, amount] of Object.entries(template.costs)) {
            const totalAmount = amount * quantity;
            if (resource === 'currency') {
                costs.push(`${totalAmount.toLocaleString()} 💰`);
            } else {
                const icon = this.getResourceIcon(resource);
                costs.push(`${totalAmount} ${icon} ${resource}`);
            }
        }

        return costs.join(', ');
    }

    private getResourceIcon(resource: string): string {
        const icons: Record<string, string> = {
            iron: '⚙️',
            copper: '🔶',
            steel: '🔩',
            gunpowder: '💥',
            wood: '🪵',
            coal: '⚫'
        };
        return icons[resource] || '📦';
    }

    calculateConstructionTime(
        type: BuildingType,
        infrastructureBonus: number = 0
    ): number {
        const baseTime = BUILDING_TEMPLATES[type].constructionTime;
        // Each 10 points of infrastructure reduces construction time by 10%, max 50% reduction
        const reduction = Math.min(infrastructureBonus / 10, 5) * 0.1;
        return Math.ceil(baseTime * (1 - reduction));
    }

    canAffordBorderMaintenance(
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

    formatBorderMaintenanceCosts(days: number = 1): string {
        const costs: string[] = [];

        // Currency
        const currencyTotal = BORDER_MAINTENANCE.dailyCost * days;
        costs.push(`${currencyTotal.toLocaleString()} 💰`);

        // Resources
        for (const [resource, amount] of Object.entries(BORDER_MAINTENANCE.resourceCosts)) {
            const total = amount * days;
            const icon = this.getResourceIcon(resource);
            costs.push(`${total} ${icon} ${resource}`);
        }

        if (days > 1) {
            return `${costs.join(', ')} (for ${days} day${days > 1 ? 's' : ''})`;
        }

        return `${costs.join(', ')} per day`;
    }

    // ============ Building Operations ============

    async getBuildingById(buildingId: number) {
        const result = await this.db.select().from(stateBuildings).where(eq(stateBuildings.id, buildingId));
        return result[0] || null;
    }

    async getBuildingsByRegion(regionId: number) {
        return await this.db.select().from(stateBuildings).where(eq(stateBuildings.regionId, regionId));
    }

    async createBuilding(data: typeof stateBuildings.$inferInsert) {
        const [building] = await this.db.insert(stateBuildings).values(data).returning();
        return building;
    }

    async updateBuilding(buildingId: number, data: Partial<typeof stateBuildings.$inferInsert>) {
        const [building] = await this.db
            .update(stateBuildings)
            .set(data)
            .where(eq(stateBuildings.id, buildingId))
            .returning();
        return building;
    }

    async deleteBuilding(buildingId: number) {
        await this.db.delete(stateBuildings).where(eq(stateBuildings.id, buildingId));
    }
}
