// Proposal service
import type { Database } from '../../db';
import { parliamentaryProposals, parliamentaryVotes, stateTaxes } from '../../schema';
import { eq, and } from 'drizzle-orm';

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
        const existingVote = await this.db.query.parliamentaryVotes.findFirst({
            where: and(eq(parliamentaryVotes.proposalId, proposalId), eq(parliamentaryVotes.voterId, voterId))
        });

        if (existingVote) {
            const [vote] = await this.db
                .update(parliamentaryVotes)
                .set({
                    voteType: voteType as any,
                    votedAt: new Date()
                })
                .where(eq(parliamentaryVotes.id, existingVote.id))
                .returning();
            return vote;
        } else {
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

    async implementProposal(proposal: any) {
        console.log(`Implementing proposal ${proposal.id} of type ${proposal.proposalType}`);

        // Parse the description to extract metadata
        const description = proposal.description || "";

        if (proposal.proposalType === "tax") {
            // Extract tax configuration from description
            const taxTypeMatch = description.match(/Tax Type: (.+)/);
            const taxRateMatch = description.match(/Tax Rate: (\d+)%/);

            if (taxTypeMatch && taxRateMatch) {
                const taxType = taxTypeMatch[1];
                const taxRate = parseInt(taxRateMatch[1]);

                // Check if tax already exists (avoid duplicates)
                const existingTax = await this.db.select().from(stateTaxes).where(eq(stateTaxes.proposalId, proposal.id)).limit(1);

                if (existingTax.length === 0) {
                    // Deactivate existing taxes of the same type
                    await this.db
                        .update(stateTaxes)
                        .set({ isActive: false })
                        .where(and(eq(stateTaxes.stateId, proposal.stateId), eq(stateTaxes.taxType, taxType as any), eq(stateTaxes.isActive, true)));

                    await this.db.insert(stateTaxes).values({
                        stateId: proposal.stateId,
                        taxType: taxType as any,
                        taxRate,
                        proposalId: proposal.id,
                        isActive: true
                    });

                    console.log(`✅ Tax (${taxRate}% ${taxType}) created for state ${proposal.stateId}`);
                } else {
                    console.log(`ℹ️ Tax for proposal ${proposal.id} already exists, skipping`);
                }
            } else {
                console.error(`❌ Failed to extract tax configuration from proposal ${proposal.id}`);
            }
        } else if (["hospital", "school", "power_plant", "road", "bridge"].includes(proposal.proposalType)) {
            // Extract construction details
            const buildingNameMatch = description.match(/Building Name: (.+)/);
            const regionIdMatch = description.match(/Region: (.+)/);
            const costMatch = description.match(/Estimated Cost: (\d+) currency/);

            if (buildingNameMatch && regionIdMatch && costMatch) {
                const buildingName = buildingNameMatch[1];
                const regionId = regionIdMatch[1];
                const cost = parseInt(costMatch[1]);

                // TODO: Insert into buildings/infrastructure table
                console.log(
                    `✅ Construction project "${buildingName}" (${proposal.proposalType}) approved for region ${regionId} at ${cost} currency`
                );
            } else {
                console.error(`❌ Failed to extract construction details from proposal ${proposal.id}`);
            }
        }
    }
}
