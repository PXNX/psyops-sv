// Factory service - handles factory operations
import type { Database } from '../../db';
import { factories, factoryWorkers } from '../../schema';
import { eq } from 'drizzle-orm';

export class FactoryService {
    constructor(private db: typeof import('../../db').db) { }

    async getFactoryById(factoryId: number) {
        const result = await this.db.select().from(factories).where(eq(factories.id, factoryId));
        return result[0] || null;
    }

    async getFactoriesByCompany(companyId: number) {
        return await this.db.select().from(factories).where(eq(factories.companyId, companyId));
    }

    async createFactory(data: typeof factories.$inferInsert) {
        const [factory] = await this.db.insert(factories).values(data).returning();
        return factory;
    }

    async getFactoryWorkers(factoryId: number) {
        return await this.db.select().from(factoryWorkers).where(eq(factoryWorkers.factoryId, factoryId));
    }

    async hireWorker(factoryId: number, userId: string, jobType: string) {
        const [worker] = await this.db
            .insert(factoryWorkers)
            .values({
                factoryId,
                userId,
                jobType: jobType as any
            })
            .returning();
        return worker;
    }

    async fireWorker(userId: string) {
        await this.db.delete(factoryWorkers).where(eq(factoryWorkers.userId, userId));
    }
}
