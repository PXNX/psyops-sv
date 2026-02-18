// Region service
import type { Database } from '../../db';
import { regions, residences } from '../../schema';
import { eq } from 'drizzle-orm';

export class RegionService {
    constructor(private db: typeof import('../../db').db) { }

    async getRegionById(regionId: number) {
        const result = await this.db.select().from(regions).where(eq(regions.id, regionId));
        return result[0] || null;
    }

    async getRegionsByState(stateId: number) {
        return await this.db.select().from(regions).where(eq(regions.stateId, stateId));
    }

    async getUserResidence(userId: string) {
        const result = await this.db.select().from(residences).where(eq(residences.userId, userId));
        return result[0] || null;
    }
}
