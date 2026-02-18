// Election service
import type { Database } from '../../db';
import { parliamentaryElections, electionVotes } from '../../schema';
import { eq } from 'drizzle-orm';

export class ElectionService {
    constructor(private db: typeof import('../../db').db) { }

    async getElectionById(electionId: number) {
        const result = await this.db
            .select()
            .from(parliamentaryElections)
            .where(eq(parliamentaryElections.id, electionId));
        return result[0] || null;
    }

    async createElection(data: typeof parliamentaryElections.$inferInsert) {
        const [election] = await this.db.insert(parliamentaryElections).values(data).returning();
        return election;
    }

    async vote(electionId: number, voterId: string, partyId: number) {
        const [vote] = await this.db
            .insert(electionVotes)
            .values({
                electionId,
                voterId,
                partyId
            })
            .returning();
        return vote;
    }
}
