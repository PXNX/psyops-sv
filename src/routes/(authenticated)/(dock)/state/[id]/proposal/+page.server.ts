// src/routes/state/[id]/proposal/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, or, desc } from "drizzle-orm";
import {
	states,
	parliamentaryProposals,
	parliamentaryVotes,
	accounts,
	userProfiles,
	stateTaxes
} from "$lib/server/schema";
import { getLogoUrl } from "$lib/server/backblaze";

export const load = async ({ params, locals }: Parameters<PageServerLoad>[0]) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, stateId)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Get all proposals (both active and historical)
	const allProposals = await db
		.select()
		.from(parliamentaryProposals)
		.where(eq(parliamentaryProposals.stateId, stateId))
		.orderBy(desc(parliamentaryProposals.createdAt));

	// Helper function to get proposal change description
	const getProposalDescription = async (proposal: any) => {
		let title = "";
		let description = "";

		switch (proposal.proposalType) {
			case "tax": {
				// Get current tax for this type (if exists)
				const currentTax = await db.query.stateTaxes.findFirst({
					where: and(
						eq(stateTaxes.stateId, stateId),
						eq(stateTaxes.taxType, proposal.taxType || "income"),
						eq(stateTaxes.isActive, true)
					)
				});

				const oldRate = currentTax?.taxRate || 0;
				const newRate = proposal.taxRate || 0;
				const taxTypeName = (proposal.taxType || "income").replace("_", " ");

				title = `${taxTypeName.charAt(0).toUpperCase() + taxTypeName.slice(1)} Tax Change`;
				description = `${oldRate}% → ${newRate}%`;
				break;
			}
			case "budget": {
				title = `State Budget Allocation`;
				description = `Allocate ${proposal.amount ? `$${proposal.amount.toLocaleString()}` : "funds"} to ${proposal.budgetCategory || "general fund"}`;
				break;
			}
			case "infrastructure": {
				title = `Build Infrastructure`;
				description = `Construct infrastructure in region`;
				break;
			}
			case "hospital": {
				title = `Build Hospital`;
				description = `Construct hospital in region`;
				break;
			}
			case "school": {
				title = `Build School`;
				description = `Construct school in region`;
				break;
			}
			case "power_plant": {
				const plantType = proposal.plantType || "coal";
				title = `Build ${plantType.charAt(0).toUpperCase() + plantType.slice(1)} Power Plant`;
				description = `Construct ${plantType} power plant`;
				break;
			}
		}

		return { title, description };
	};

	// Get vote counts and user votes for each proposal
	const proposalsWithVotes = await Promise.all(
		allProposals.map(async (proposal) => {
			const votes = await db.select().from(parliamentaryVotes).where(eq(parliamentaryVotes.proposalId, proposal.id));

			const voteCounts = {
				for: votes.filter((v) => v.voteType === "for").length,
				against: votes.filter((v) => v.voteType === "against").length,
				abstain: votes.filter((v) => v.voteType === "abstain").length
			};

			const totalVotes = votes.length;
			const percentageFor = totalVotes > 0 ? (voteCounts.for / totalVotes) * 100 : 0;
			const percentageAgainst = totalVotes > 0 ? (voteCounts.against / totalVotes) * 100 : 0;

			// Check if proposal passed based on required majority
			const didPass = percentageFor >= (proposal.requiredMajority || 50);

			// Find user's vote
			const userVote = votes.find((v) => v.voterId === account.id);

			const proposer = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, proposal.proposedBy)
			});

			const { title, description } = await getProposalDescription(proposal);

			// Determine if voting is still active
			const now = new Date();
			const votingEnded = new Date(proposal.votingEndsAt) < now;
			const isActive = proposal.status === "active" && !votingEnded;

			return {
				...proposal,
				voteCounts,
				totalVotes,
				percentageFor,
				percentageAgainst,
				didPass,
				votingEnded,
				isActive,
				userVote: userVote?.voteType || null,
				proposedBy: {
					id: proposal.proposedBy,
					name: proposer?.name,
					logo: await getLogoUrl(proposer?.logo)
				},
				changeTitle: title,
				changeDescription: description
			};
		})
	);

	// Separate into categories - only show completed proposals
	const passedProposals = proposalsWithVotes.filter((p) => p.status === "passed");
	const rejectedProposals = proposalsWithVotes.filter((p) => p.status === "rejected");
	const expiredProposals = proposalsWithVotes.filter((p) => p.status === "active" && p.votingEnded);

	// Only include non-active proposals in the history
	const historicalProposals = proposalsWithVotes.filter((p) => !p.isActive);

	return {
		state,
		passedProposals,
		rejectedProposals,
		expiredProposals,
		allProposals: historicalProposals
	};
};
