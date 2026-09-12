// src/routes/state/[id]/proposal/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, desc } from "drizzle-orm";
import { states, parliamentaryProposals, parliamentaryVotes, userProfiles, stateTaxes, partyMembers, politicalParties } from "$lib/server/schema";
import { getLogoUrl } from "$lib/server/backblaze";
import { getRegionName } from "$lib/utils/formatting";

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

	// Get all proposals (both active and historical) with their type-specific details
	const allProposals = await db.query.parliamentaryProposals.findMany({
		where: eq(parliamentaryProposals.stateId, stateId),
		with: {
			taxDetails: true,
			buildingDetails: true,
			borderDetails: true
		},
		orderBy: desc(parliamentaryProposals.createdAt)
	});

	// Helper function to get proposal change description and affected region
	const getProposalDescription = async (proposal: (typeof allProposals)[number]) => {
		let title = "";
		let description = "";
		let region: { id: number; name: string } | null = null;

		switch (proposal.proposalType) {
			case "tax": {
				if (proposal.taxDetails) {
					const currentTax = await db.query.stateTaxes.findFirst({
						where: and(
							eq(stateTaxes.stateId, stateId),
							eq(stateTaxes.taxType, proposal.taxDetails.taxType),
							eq(stateTaxes.isActive, true)
						)
					});

					const oldRate = currentTax?.taxRate || 0;
					const newRate = proposal.taxDetails.taxRate;
					const taxTypeName = proposal.taxDetails.taxType.replace("_", " ");

					title = `${taxTypeName.charAt(0).toUpperCase() + taxTypeName.slice(1)} Tax`;
					description = `Change from ${oldRate}% to ${newRate}%`;
				} else {
					title = "Tax Policy Change";
					description = "Modify state taxation";
				}
				break;
			}

			case "border_control": {
				if (proposal.borderDetails) {
					const isOpening = proposal.borderDetails.borderStatus === "open";
					title = `${isOpening ? "Open" : "Close"} Borders`;
					description = isOpening ? "Enable automatic visa approval" : "Require manual visa approval";
				} else {
					title = "Border Control Policy";
					description = "Modify border access";
				}
				break;
			}

			case "fortifications": {
				title = "Build Fortifications";
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					description = `Construct ${qty} fortification${qty > 1 ? "s" : ""}`;
					region = { id: proposal.buildingDetails.regionId, name: getRegionName(proposal.buildingDetails.regionId) };
				} else {
					description = "Construct defensive fortifications";
				}
				break;
			}

			case "hospital": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					title = `Build Hospital${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} hospital${qty > 1 ? "s" : ""}`;
					region = { id: proposal.buildingDetails.regionId, name: getRegionName(proposal.buildingDetails.regionId) };
				} else {
					title = "Build Hospital";
					description = "Construct hospital";
				}
				break;
			}

			case "school": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					title = `Build School${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} school${qty > 1 ? "s" : ""}`;
					region = { id: proposal.buildingDetails.regionId, name: getRegionName(proposal.buildingDetails.regionId) };
				} else {
					title = "Build School";
					description = "Construct school";
				}
				break;
			}

			case "power_plant": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					title = `Build Power Plant${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} power plant${qty > 1 ? "s" : ""}`;
					region = { id: proposal.buildingDetails.regionId, name: getRegionName(proposal.buildingDetails.regionId) };
				} else {
					title = "Build Power Plant";
					description = "Construct power plant";
				}
				break;
			}

			case "infrastructure": {
				title = "Build Infrastructure";
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					description = `Construct ${qty} infrastructure project${qty > 1 ? "s" : ""}`;
					region = { id: proposal.buildingDetails.regionId, name: getRegionName(proposal.buildingDetails.regionId) };
				} else {
					description = "Construct infrastructure";
				}
				break;
			}

			case "budget": {
				title = "State Budget Allocation";
				description = "Allocate state funds";
				break;
			}
		}

		return { title, description, region };
	};

	// Get vote counts and user votes for each proposal
	const proposalsWithVotes = await Promise.all(
		allProposals.map(async (proposal) => {
			const votes = await db.select().from(parliamentaryVotes).where(eq(parliamentaryVotes.proposalId, proposal.id));

			const voteCounts = {
				for: votes.filter((v) => v.voteType === "for").length,
				against: votes.filter((v) => v.voteType === "against").length
			};

			const totalVotes = voteCounts.for + voteCounts.against;
			const percentageFor = totalVotes > 0 ? (voteCounts.for / totalVotes) * 100 : 0;
			const percentageAgainst = totalVotes > 0 ? (voteCounts.against / totalVotes) * 100 : 0;

			// Check if proposal passed based on required majority
			const didPass = percentageFor >= (proposal.requiredMajority || 50);

			// Find user's vote
			const userVote = votes.find((v) => v.voterId === account.id);

			const proposer = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, proposal.proposedBy)
			});

			const proposerPartyRows = await db
				.select({ abbreviation: politicalParties.abbreviation, name: politicalParties.name, color: politicalParties.color })
				.from(partyMembers)
				.innerJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
				.where(and(eq(partyMembers.userId, proposal.proposedBy), eq(politicalParties.stateId, stateId)))
				.limit(1);

			const { title, description, region } = await getProposalDescription(proposal);

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
					logo: await getLogoUrl(proposer?.logo),
					party: proposerPartyRows[0] || null
				},
				changeTitle: title,
				changeDescription: description,
				region
			};
		})
	);

	// Separate into categories - only show completed proposals. Proposals
	// whose voting window closed without reaching the required majority are
	// rejected (there's no separate "expired" state — the cron job just
	// hasn't flipped the status yet).
	const passedProposals = proposalsWithVotes.filter((p) => p.status === "passed");
	const rejectedProposals = proposalsWithVotes.filter(
		(p) => p.status === "rejected" || (p.status === "active" && p.votingEnded)
	);

	// Only include non-active proposals in the history
	const historicalProposals = proposalsWithVotes.filter((p) => !p.isActive);

	return {
		state,
		passedProposals,
		rejectedProposals,
		allProposals: historicalProposals
	};
};
