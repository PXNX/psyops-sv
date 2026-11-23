// src/routes/(authenticated)/api/cron/proposals/+server.ts

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { parliamentaryProposals, parliamentaryVotes, stateTaxes, parliamentMembers } from "#lib/server/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { executeProposal } from "#lib/server/services/politics/execute-proposal.js";
import { completePendingConstructions, ConstructionError } from "#lib/server/services/politics/construction.service.js";
import { resolveCommanderTrainings } from "#lib/server/services/military/commanders.js";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let passed = 0;
		let rejected = 0; // rejected by parliament (a normal outcome, not an error)
		let unbuildable = 0; // passed, but couldn't be carried out (also a game outcome)
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
				if (outcome === "failed") unbuildable++;
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
				rejected++;
			}
		}

		// Buildings finish on their own schedule; this job runs every 15 minutes.
		const buildingsCompleted = await completePendingConstructions(db);
		let commandersGraduated = 0;
		try {
			commandersGraduated = (await resolveCommanderTrainings(db, now)).graduated;
		} catch (error) {
			errors++;
			console.error("❌ Failed to graduate officers:", error);
		}

		return cronResponse(
			"proposals",
			{
				proposalsProcessed: processed,
				proposalsPassed: passed,
				proposalsRejected: rejected,
				proposalsFailed: unbuildable,
				buildingsCompleted,
				commandersGraduated
			},
			errors
		);
	} catch (error) {
		return cronCrash("proposals", error);
	}
};

async function processProposal(proposal: any): Promise<"passed" | "rejected" | "failed" | "implementation_failed"> {
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
		// Claim it first so an overlapping run can't carry it out twice.
		const [claimed] = await db
			.update(parliamentaryProposals)
			.set({ status: "passed" })
			.where(and(eq(parliamentaryProposals.id, proposal.id), eq(parliamentaryProposals.status, "active")))
			.returning({ id: parliamentaryProposals.id });
		if (!claimed) return "passed";

		try {
			await executeProposal(proposal.stateId, proposal.proposalType, proposal.proposedBy, proposal.id);
			console.log(`✅ Proposal ${proposal.id} PASSED and implemented`);
			return "passed";
		} catch (err) {
			// Voted through but impossible now (e.g. the treasury ran dry): that's
			// a game outcome, so it's recorded on the proposal, not a job error.
			await db
				.update(parliamentaryProposals)
				.set({ status: "failed" })
				.where(eq(parliamentaryProposals.id, proposal.id));
			const reason = err instanceof ConstructionError ? err.message : "It could not be carried out.";
			if (!(err instanceof ConstructionError)) console.error(`❌ Proposal ${proposal.id} failed to implement:`, err);
			sendNotificationIfEnabled(proposal.proposedBy, "notifyNewProposals", {
				title: "📜 Proposal passed but failed",
				body: `Parliament passed your ${proposal.proposalType.replace("_", " ")} proposal, but: ${reason}`,
				icon: "/favicon.png",
				badge: "/badge.png",
				data: { url: `/state/${proposal.stateId}/parliament`, tag: `proposal-${proposal.id}` }
			}).catch(() => {});
			return err instanceof ConstructionError ? "failed" : "implementation_failed";
		}
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
