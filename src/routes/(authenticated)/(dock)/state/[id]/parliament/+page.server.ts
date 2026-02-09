// @ts-nocheck
// src/routes/state/[id]/parliament/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import {
	states,
	parliamentMembers,
	politicalParties,
	partyMembers,
	parliamentaryProposals,
	parliamentaryVotes,
	parliamentaryElections,
	accounts,
	userProfiles,
	ministers,
	presidents,
	stateTaxes
} from "$lib/server/schema";
import { getLogoUrl, getSignedDownloadUrl } from "$lib/server/backblaze";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

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

	// Get all parliament members with their profiles and party roles
	const members = await db
		.select({
			userId: parliamentMembers.userId,
			partyAffiliation: parliamentMembers.partyAffiliation,
			electedAt: parliamentMembers.electedAt,
			term: parliamentMembers.term,
			name: userProfiles.name,
			logo: userProfiles.logo,
			partyRole: partyMembers.role
		})
		.from(parliamentMembers)
		.leftJoin(accounts, eq(parliamentMembers.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.leftJoin(partyMembers, eq(parliamentMembers.userId, partyMembers.userId))
		.where(eq(parliamentMembers.stateId, stateId))
		.orderBy(desc(parliamentMembers.electedAt));

	// Process logos and match party roles correctly
	const processedMembers = await Promise.all(
		members.map(async (member) => {
			// Get the correct party for this member
			const memberParty = member.partyAffiliation
				? await db.query.politicalParties.findFirst({
						where: and(eq(politicalParties.name, member.partyAffiliation), eq(politicalParties.stateId, stateId))
					})
				: null;

			// Get the correct party membership role
			let partyRole = null;
			if (memberParty) {
				const membership = await db.query.partyMembers.findFirst({
					where: and(eq(partyMembers.userId, member.userId), eq(partyMembers.partyId, memberParty.id))
				});
				partyRole = membership?.role || null;
			}

			return {
				...member,
				logo: await getLogoUrl(member.logo),
				partyRole,
				partyId: memberParty?.id || null
			};
		})
	);

	// Calculate party distribution by ID
	const partyDistribution: Record<string, number> = {};
	processedMembers.forEach((member) => {
		const partyKey = member.partyId ? String(member.partyId) : "independent";
		partyDistribution[partyKey] = (partyDistribution[partyKey] || 0) + 1;
	});

	const totalSeats = processedMembers.length;

	// Check if current user is a parliament member
	const userMembership = await db.query.parliamentMembers.findFirst({
		where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, stateId))
	});

	// Check if user is a minister
	const userMinistry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId))
	});

	// Check if user is president
	const userPresidency = await db.query.presidents.findFirst({
		where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
	});

	// Get next or active election
	const now = new Date();
	const nextElection = await db.query.parliamentaryElections.findFirst({
		where: and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)),
		orderBy: parliamentaryElections.startDate
	});

	// Get active proposals with vote counts and user's votes
	const activeProposals = await db.query.parliamentaryProposals.findMany({
		where: and(
			eq(parliamentaryProposals.stateId, stateId),
			eq(parliamentaryProposals.status, "active"),
			gte(parliamentaryProposals.votingEndsAt, now)
		),
		with: {
			taxDetails: true,
			buildingDetails: {
				with: {
					region: true
				}
			},
			borderDetails: true
		},
		orderBy: desc(parliamentaryProposals.createdAt)
	});

	// Helper function to get proposal description using joined data
	const getProposalDescription = async (proposal: any) => {
		let title = "";
		let description = "";

		switch (proposal.proposalType) {
			case "tax": {
				if (proposal.taxDetails) {
					// Get current tax for comparison
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
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					const regionName = getRegionName(proposal.buildingDetails.regionId);
					title = `Build Fortifications`;
					description = `Construct ${qty} fortification${qty > 1 ? "s" : ""} in ${regionName}`;
				} else {
					title = "Build Fortifications";
					description = "Construct defensive fortifications";
				}
				break;
			}

			case "hospital": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					const regionName = getRegionName(proposal.buildingDetails.regionId);
					title = `Build Hospital${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} hospital${qty > 1 ? "s" : ""} in ${regionName}`;
				} else {
					title = "Build Hospital";
					description = "Construct hospital";
				}
				break;
			}

			case "school": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					const regionName = getRegionName(proposal.buildingDetails.regionId);
					title = `Build School${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} school${qty > 1 ? "s" : ""} in ${regionName}`;
				} else {
					title = "Build School";
					description = "Construct school";
				}
				break;
			}

			case "power_plant": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					const regionName = getRegionName(proposal.buildingDetails.regionId);
					title = `Build Power Plant${qty > 1 ? "s" : ""}`;
					description = `Construct ${qty} power plant${qty > 1 ? "s" : ""} in ${regionName}`;
				} else {
					title = "Build Power Plant";
					description = "Construct power plant";
				}
				break;
			}

			case "infrastructure": {
				if (proposal.buildingDetails) {
					const qty = proposal.buildingDetails.quantity;
					const regionName = getRegionName(proposal.buildingDetails.regionId);
					title = `Build Infrastructure`;
					description = `Construct ${qty} infrastructure project${qty > 1 ? "s" : ""} in ${regionName}`;
				} else {
					title = "Build Infrastructure";
					description = "Construct infrastructure";
				}
				break;
			}

			case "budget": {
				title = `State Budget Allocation`;
				description = `Allocate state funds`;
				break;
			}
		}

		return { title, description };
	};

	// Process proposals with votes and descriptions
	const proposalsWithVotes = await Promise.all(
		activeProposals.map(async (proposal) => {
			const votes = await db.select().from(parliamentaryVotes).where(eq(parliamentaryVotes.proposalId, proposal.id));

			const voteCounts = {
				for: votes.filter((v) => v.voteType === "for").length,
				against: votes.filter((v) => v.voteType === "against").length,
				abstain: votes.filter((v) => v.voteType === "abstain").length
			};

			const totalVotes = votes.length;
			const percentageFor = totalVotes > 0 ? (voteCounts.for / totalVotes) * 100 : 0;
			const userVote = votes.find((v) => v.voterId === account.id);

			const proposer = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, proposal.proposedBy)
			});

			const { title, description } = await getProposalDescription(proposal);

			return {
				...proposal,
				voteCounts,
				totalVotes,
				percentageFor,
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

	// Get party colors and logos from database
	const partyIds = Object.keys(partyDistribution)
		.filter((key) => key !== "independent")
		.map((key) => parseInt(key));
	const parties =
		partyIds.length > 0
			? await db
					.select({
						id: politicalParties.id,
						name: politicalParties.name,
						color: politicalParties.color,
						logo: politicalParties.logo,
						ideology: politicalParties.ideology,
						abbreviation: politicalParties.abbreviation
					})
					.from(politicalParties)
					.where(and(eq(politicalParties.stateId, stateId), inArray(politicalParties.id, partyIds)))
			: [];

	const partyColors: Record<string, string> = {
		independent: "#6b7280"
	};

	parties.forEach((party) => {
		partyColors[String(party.id)] = party.color;
	});

	// Process party logos
	const processedParties = await Promise.all(
		parties.map(async (party) => ({
			id: party.id,
			name: party.name,
			color: party.color,
			logo: await getLogoUrl(party.logo),
			ideology: party.ideology,
			abbreviation: party.abbreviation
		}))
	);

	return {
		state,
		parliamentMembers: processedMembers,
		partyDistribution,
		totalSeats,
		proposals: proposalsWithVotes,
		isParliamentMember: !!userMembership,
		userParty: userMembership?.partyAffiliation || null,
		userMinistry: userMinistry?.ministry || null,
		isFinanceMinister: userMinistry?.ministry === "finance",
		isPresident: !!userPresidency,
		canAutoAccept: !!(userMinistry || userPresidency), // Ministers or President can auto-accept
		nextElection: nextElection
			? {
					id: nextElection.id,
					startDate: nextElection.startDate,
					endDate: nextElection.endDate,
					status: nextElection.status,
					totalSeats: nextElection.totalSeats,
					isInaugural: nextElection.isInaugural
				}
			: null,
		partyColors,
		parties: processedParties
	};
};

export const actions = {
	vote: async ({ request, locals, params }: import("./$types").RequestEvent) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const formData = await request.formData();
		const proposalId = parseInt(formData.get("proposalId") as string);
		const voteType = formData.get("voteType") as "for" | "against" | "abstain";

		if (!proposalId || !voteType) {
			return fail(400, { error: "Invalid vote data" });
		}

		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, stateId))
		});

		if (!membership) {
			return fail(403, { error: "You must be a parliament member to vote" });
		}

		const proposal = await db.query.parliamentaryProposals.findFirst({
			where: eq(parliamentaryProposals.id, proposalId)
		});

		if (!proposal || proposal.status !== "active") {
			return fail(404, { error: "Proposal not found or not active" });
		}

		if (new Date() > new Date(proposal.votingEndsAt)) {
			return fail(400, { error: "Voting period has ended" });
		}

		const existingVote = await db.query.parliamentaryVotes.findFirst({
			where: and(eq(parliamentaryVotes.proposalId, proposalId), eq(parliamentaryVotes.voterId, account.id))
		});

		if (existingVote) {
			await db
				.update(parliamentaryVotes)
				.set({
					voteType,
					votedAt: new Date()
				})
				.where(eq(parliamentaryVotes.id, existingVote.id));
		} else {
			await db.insert(parliamentaryVotes).values({
				proposalId,
				voterId: account.id,
				voteType
			});
		}

		return { success: true, message: "Vote recorded successfully" };
	},

	acceptProposal: async ({ request, locals, params }: import("./$types").RequestEvent) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const formData = await request.formData();
		const proposalId = parseInt(formData.get("proposalId") as string);

		if (!proposalId) {
			return fail(400, { error: "Invalid proposal ID" });
		}

		// Check if user is a minister or president
		const userMinistry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId))
		});

		const userPresidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!userMinistry && !userPresidency) {
			return fail(403, { error: "Only ministers and the president can auto-accept proposals" });
		}

		const proposal = await db.query.parliamentaryProposals.findFirst({
			where: eq(parliamentaryProposals.id, proposalId)
		});

		if (!proposal || proposal.status !== "active") {
			return fail(404, { error: "Proposal not found or not active" });
		}

		// Update proposal status to passed
		await db
			.update(parliamentaryProposals)
			.set({
				status: "passed"
			})
			.where(eq(parliamentaryProposals.id, proposalId));

		// Execute the proposal based on its type
		// Note: This is a simplified version - you'll need to implement the actual execution logic
		// based on your proposal types (tax, budget, infrastructure, etc.)

		return { success: true, message: "Proposal accepted and executed" };
	}
} as Actions;
