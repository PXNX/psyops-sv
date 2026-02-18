// Travel service
import type { Database } from '../../db';
import { userTravels } from '../../schema';
import { eq } from 'drizzle-orm';

export class TravelService {
    constructor(private db: typeof import('../../db').db) { }

    async getUserTravel(userId: string) {
        const result = await this.db.select().from(userTravels).where(eq(userTravels.userId, userId));
        return result[0] || null;
    }

    async createTravel(data: typeof userTravels.$inferInsert) {
        const [travel] = await this.db.insert(userTravels).values(data).returning();
        return travel;
    }

    async completeTravel(userId: string) {
        await this.db
            .update(userTravels)
            .set({ status: 'completed' })
            .where(eq(userTravels.userId, userId));
    }
}
