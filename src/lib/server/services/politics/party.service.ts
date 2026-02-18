// Party service
import type { Database } from '../../db';
import { politicalParties, partyMembers } from '../../schema';
import { eq } from 'drizzle-orm';

export class PartyService {
    constructor(private db: typeof import('../../db').db) { }

    async getPartyById(partyId: number) {
        const result = await this.db.select().from(politicalParties).where(eq(politicalParties.id, partyId));
        return result[0] || null;
    }

    async createParty(data: typeof politicalParties.$inferInsert) {
        const [party] = await this.db.insert(politicalParties).values(data).returning();
        return party;
    }

    async getPartyMembers(partyId: number) {
        return await this.db.select().from(partyMembers).where(eq(partyMembers.partyId, partyId));
    }
}
