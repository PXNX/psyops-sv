// src/routes/(authenticated)/api/cron/proposals/+server.ts

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { parliamentaryProposals, parliamentaryVotes, stateTaxes, parliamentMembers } from "#lib/server/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { executeProposal } from "#lib/server/services/politics/execute-proposal.js";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let passed = 0;
		let failed = 0; // rejected by parliament (a normal outcome, not an error)
		let errors = 0; // proposals that could not be processed or implemented

		// Find all active proposals that have reached their end time
		const finishedProposals = await db
			.select()
			.from(parliamentaryProposals)
			.where(and(eq(parliamentaryProposals.status, "active"), lte(parliamentaryProposals.votingEndsAt, now)));

		for (const proposal of finishedProposals) {
			try {
				const outcome = await processProposal(proposal);
				if (outcome === "implementation_failed") errors++;
			} catch (error) {
				// One broken proposal must not block the rest of the queue.
				errors++;
				console.error(`❌ Failed to process proposal ${proposal.id}:`, error);
				continue;
			}
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

		return cronResponse(
			"proposals",
			{ proposalsProcessed: processed, proposalsPassed: passed, proposalsRejected: failed },
			errors
		);
	} catch (error) {
		return cronCrash("proposals", error);
	}
};

async function processProposal(proposal: any): Promise<"passed" | "rejected" | "implementation_failed"> {
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
		return "rejected";
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
		try {
			await executeProposal(proposal.stateId, proposal.proposalType, proposal.proposedBy, proposal.id);
			console.log(`✅ Proposal ${proposal.id} PASSED and implemented`);
		} catch (err) {
			console.error(`❌ Proposal ${proposal.id} passed but failed to implement:`, err);
			return "implementation_failed";
		}
		return "passed";
	} else {
		// Mark as rejected
		await db
			.update(parliamentaryProposals)
			.set({ status: "rejected" })
			.where(eq(parliamentaryProposals.id, proposal.id));

		console.log(`❌ Proposal ${proposal.id} REJECTED`);
		return "rejected";
	}
}
