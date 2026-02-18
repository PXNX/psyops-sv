// Proposal service
import type { Database } from '../../db';
import { parliamentaryProposals, parliamentaryVotes } from '../../schema';
import { eq } from 'drizzle-orm';

export class ProposalService {
    constructor(private db: typeof import('../../db').db) { }

    async getProposalById(proposalId: number) {
        const result = await this.db
            .select()
            .from(parliamentaryProposals)
            .where(eq(parliamentaryProposals.id, proposalId));
        return result[0] || null;
    }

    async createProposal(data: typeof parliamentaryProposals.$inferInsert) {
        const [proposal] = await this.db.insert(parliamentaryProposals).values(data).returning();
        return proposal;
    }

    async voteOnProposal(proposalId: number, voterId: string, voteType: 'for' | 'against' | 'abstain') {
        const [vote] = await this.db
            .insert(parliamentaryVotes)
            .values({
                proposalId,
                voterId,
                voteType: voteType as any
            })
            .returning();
        return vote;
    }
}
