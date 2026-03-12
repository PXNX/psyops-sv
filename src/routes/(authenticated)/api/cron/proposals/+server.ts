// src/routes/(authenticated)/api/cron/proposals/+server.ts

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { parliamentaryProposals, parliamentaryVotes, stateTaxes, parliamentMembers } from "$lib/server/schema";
import { eq, and, lte } from "drizzle-orm";
import { ProposalService } from "$lib/server/services/politics/proposal.service";

const proposalService = new ProposalService(db);

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let passed = 0;
		let failed = 0;

		// Find all active proposals that have reached their end time
		const finishedProposals = await db
			.select()
			.from(parliamentaryProposals)
			.where(and(eq(parliamentaryProposals.status, "active"), lte(parliamentaryProposals.votingEndsAt, now)));

		for (const proposal of finishedProposals) {
			await processProposal(proposal);
			processed++;

			// Check final status
			const updatedProposal = await db
				.select()
				.from(parliamentaryProposals)
				.where(eq(parliamentaryProposals.id, proposal.id))
				.limit(1);

			if (updatedProposal[0]?.status === "passed") {
				passed++;
			} else if (updatedProposal[0]?.status === "rejected") {
				failed++;
			}
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			proposalsProcessed: processed,
			proposalsPassed: passed,
			proposalsFailed: failed
		});
	} catch (error) {
		console.error("Proposal cron job error:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};

async function processProposal(proposal: any) {
	console.log(`Processing proposal ${proposal.id} for state ${proposal.stateId}`);

	// Get total number of parliament members
	const allMembers = await db.select().from(parliamentMembers).where(eq(parliamentMembers.stateId, proposal.stateId));

	const totalMembers = allMembers.length;

	if (totalMembers === 0) {
		console.warn(`No parliament members found for state ${proposal.stateId}`);
		await db
			.update(parliamentaryProposals)
			.set({ status: "rejected" })
			.where(eq(parliamentaryProposals.id, proposal.id));
		return;
	}

	// Get all votes for this proposal
	const votes = await db.select().from(parliamentaryVotes).where(eq(parliamentaryVotes.proposalId, proposal.id));

	// Count yes and no votes
	const yesVotes = votes.filter((v) => v.voteType === "for").length;
	const noVotes = votes.filter((v) => v.voteType === "against").length;
	const totalVotes = yesVotes + noVotes;

	// Calculate percentage of yes votes out of TOTAL MEMBERS (not just voters)
	const yesPercentage = totalMembers > 0 ? (yesVotes / totalMembers) * 100 : 0;

	// Required majority is 60%
	const requiredMajority = proposal.requiredMajority || 60;
	const hasPassed = yesPercentage >= requiredMajority;

	console.log(
		`Proposal ${proposal.id}: ${yesVotes} yes, ${noVotes} no out of ${totalMembers} members (${yesPercentage.toFixed(1)}% yes). Required: ${requiredMajority}%`
	);

		if (hasPassed) {
			// Mark as passed
			await db.update(parliamentaryProposals).set({ status: "passed" }).where(eq(parliamentaryProposals.id, proposal.id));

			// Implement the proposal based on type
			await proposalService.implementProposal(proposal);

			console.log(`✅ Proposal ${proposal.id} PASSED and implemented`);
		} else {
		// Mark as rejected
		await db
			.update(parliamentaryProposals)
			.set({ status: "rejected" })
			.where(eq(parliamentaryProposals.id, proposal.id));

		console.log(`❌ Proposal ${proposal.id} REJECTED`);
	}
}


