// src/routes/state/[id]/parliament/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, gte, desc } from "drizzle-orm";
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
	ministers
} from "$lib/server/schema";
import { getLogoUrl, getSignedDownloadUrl } from "$lib/server/backblaze";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);
	const form = await superValidate(valibot(createProposalSchema));

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, stateId)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Get all parliament members with their profiles and party info
	const members = await db
		.select({
			userId: parliamentMembers.userId,
			partyAffiliation: parliamentMembers.partyAffiliation,
			electedAt: parliamentMembers.electedAt,
			term: parliamentMembers.term,
			name: userProfiles.name,
			logo: userProfiles.logo
		})
		.from(parliamentMembers)
		.leftJoin(accounts, eq(parliamentMembers.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(parliamentMembers.stateId, stateId))
		.orderBy(desc(parliamentMembers.electedAt));

	// Process logos
	const processedMembers = await Promise.all(
		members.map(async (member) => ({
			...member,
			logo: await getLogoUrl(member.logo)
		}))
	);

	// Calculate party distribution
	const partyDistribution: Record<string, number> = {};
	processedMembers.forEach((member) => {
		const party = member.partyAffiliation || "Independent";
		partyDistribution[party] = (partyDistribution[party] || 0) + 1;
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

	// Get next or active election
	const now = new Date();
	const nextElection = await db.query.parliamentaryElections.findFirst({
		where: and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)),
		orderBy: parliamentaryElections.startDate
	});

	// Get active proposals with vote counts and user's votes
	const activeProposals = await db
		.select()
		.from(parliamentaryProposals)
		.where(
			and(
				eq(parliamentaryProposals.stateId, stateId),
				eq(parliamentaryProposals.status, "active"),
				gte(parliamentaryProposals.votingEndsAt, now)
			)
		)
		.orderBy(desc(parliamentaryProposals.createdAt));

	// Get vote counts and user votes for each proposal
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

			return {
				...proposal,
				voteCounts,
				totalVotes,
				percentageFor,
				userVote: userVote?.voteType || null,
				proposedBy: {
					id: proposal.proposedBy,
					name: proposer?.name || "Unknown",
					logo: await getLogoUrl(proposer?.logo)
				}
			};
		})
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
		form
	};
};

export const actions: Actions = {
	vote: async ({ request, locals, params }) => {
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
	}
};
