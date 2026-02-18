// Company service - handles company operations
import type { Database } from '../../db';
import { companies, companyBudgets } from '../../schema';
import { eq } from 'drizzle-orm';

export class CompanyService {
    constructor(private db: typeof import('../../db').db) { }

    async getCompanyById(companyId: number) {
        const result = await this.db.select().from(companies).where(eq(companies.id, companyId));
        return result[0] || null;
    }

    async getCompaniesByOwner(ownerId: string) {
        return await this.db.select().from(companies).where(eq(companies.ownerId, ownerId));
    }

    async createCompany(data: { name: string; ownerId: string; description?: string; logo?: number }) {
        const [company] = await this.db.insert(companies).values(data).returning();

        // Create budget
        await this.db.insert(companyBudgets).values({
            companyId: company!.id
        });

        return company;
    }

    async updateCompany(companyId: number, data: Partial<typeof companies.$inferInsert>) {
        await this.db.update(companies).set(data).where(eq(companies.id, companyId));
    }

    async deleteCompany(companyId: number) {
        await this.db.delete(companies).where(eq(companies.id, companyId));
    }
}
