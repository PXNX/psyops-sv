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
	accounts,
	userProfiles,
	ministers
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	const form = await superValidate(valibot(createProposalSchema));

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id)
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
			avatar: userProfiles.avatar
		})
		.from(parliamentMembers)
		.leftJoin(accounts, eq(parliamentMembers.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(parliamentMembers.stateId, params.id))
		.orderBy(desc(parliamentMembers.electedAt));

	// Process avatars
	const processedMembers = await Promise.all(
		members.map(async (member) => {
			let avatarUrl = member.avatar;
			if (avatarUrl && !avatarUrl.startsWith("http")) {
				try {
					avatarUrl = await getSignedDownloadUrl(avatarUrl);
				} catch {
					avatarUrl = null;
				}
			}
			return { ...member, avatar: avatarUrl };
		})
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
		where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, params.id))
	});

	// Check if user is a minister (specifically finance minister for economic laws)
	const userMinistry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, params.id))
	});

	// Get active proposals with vote counts and user's votes
	const now = new Date();
	const activeProposals = await db
		.select()
		.from(parliamentaryProposals)
		.where(
			and(
				eq(parliamentaryProposals.stateId, params.id),
				eq(parliamentaryProposals.status, "active"),
				gte(parliamentaryProposals.votingEndsAt, now)
			)
		)
		.orderBy(desc(parliamentaryProposals.createdAt));

	// Get vote counts and user votes for each proposal
	const proposalsWithVotes = await Promise.all(
		activeProposals.map(async (proposal) => {
			// Get all votes for this proposal
			const votes = await db.select().from(parliamentaryVotes).where(eq(parliamentaryVotes.proposalId, proposal.id));

			const voteCounts = {
				for: votes.filter((v) => v.voteType === "for").length,
				against: votes.filter((v) => v.voteType === "against").length,
				abstain: votes.filter((v) => v.voteType === "abstain").length
			};

			const totalVotes = votes.length;
			const percentageFor = totalVotes > 0 ? (voteCounts.for / totalVotes) * 100 : 0;

			// Get user's vote if they voted
			const userVote = votes.find((v) => v.voterId === account.id);

			// Get proposer info
			const proposer = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, proposal.proposedBy)
			});

			let proposerAvatar = proposer?.avatar;
			if (proposerAvatar && !proposerAvatar.startsWith("http")) {
				try {
					proposerAvatar = await getSignedDownloadUrl(proposerAvatar);
				} catch {
					proposerAvatar = null;
				}
			}

			return {
				...proposal,
				voteCounts,
				totalVotes,
				percentageFor,
				userVote: userVote?.voteType || null,
				proposedBy: {
					id: proposal.proposedBy,
					name: proposer?.name || "Unknown",
					avatar: proposerAvatar
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
		form
	};
};

export const actions: Actions = {
	vote: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const proposalId = formData.get("proposalId") as string;
		const voteType = formData.get("voteType") as "for" | "against" | "abstain";

		if (!proposalId || !voteType) {
			return fail(400, { error: "Invalid vote data" });
		}

		// Check if user is a parliament member
		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, params.id))
		});

		if (!membership) {
			return fail(403, { error: "You must be a parliament member to vote" });
		}

		// Check if proposal exists and is active
		const proposal = await db.query.parliamentaryProposals.findFirst({
			where: eq(parliamentaryProposals.id, proposalId)
		});

		if (!proposal || proposal.status !== "active") {
			return fail(404, { error: "Proposal not found or not active" });
		}

		// Check if voting period is still active
		if (new Date() > new Date(proposal.votingEndsAt)) {
			return fail(400, { error: "Voting period has ended" });
		}

		// Check if user already voted
		const existingVote = await db.query.parliamentaryVotes.findFirst({
			where: and(eq(parliamentaryVotes.proposalId, proposalId), eq(parliamentaryVotes.voterId, account.id))
		});

		if (existingVote) {
			// Update existing vote
			await db
				.update(parliamentaryVotes)
				.set({
					voteType,
					votedAt: new Date()
				})
				.where(eq(parliamentaryVotes.id, existingVote.id));
		} else {
			// Create new vote
			await db.insert(parliamentaryVotes).values({
				proposalId,
				voterId: account.id,
				voteType
			});
		}

		return { success: true, message: "Vote recorded successfully" };
	},

	createProposal: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const form = await superValidate(request, valibot(createProposalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if user is a parliament member
		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, params.id))
		});

		if (!membership) {
			return fail(403, { error: "You must be a parliament member to create proposals" });
		}

		const { title, description, proposalType, votingDays, requiredMajority } = form.data;

		const votingStartsAt = new Date();
		const votingEndsAt = new Date();
		votingEndsAt.setDate(votingEndsAt.getDate() + votingDays);

		await db.insert(parliamentaryProposals).values({
			stateId: params.id,
			title,
			description,
			proposalType,
			proposedBy: account.id,
			votingStartsAt,
			votingEndsAt,
			requiredMajority,
			status: "active"
		});

		return { form, success: true, message: "Proposal created successfully" };
	},

	executeMinisterialAction: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const form = await superValidate(request, valibot(createProposalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if user is a minister
		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, params.id))
		});

		if (!ministry) {
			return fail(403, { error: "You must be a minister to execute direct actions" });
		}

		const { proposalType } = form.data;

		// Define which ministries can execute which types directly
		const ministryPermissions: Record<string, string[]> = {
			finance: ["tax", "budget"],
			infrastructure: ["infrastructure"],
			education: ["education"],
			defense: ["defense"],
			health: ["healthcare"],
			environment: ["environment"],
			justice: ["justice"]
		};

		const allowedTypes = ministryPermissions[ministry.ministry] || [];

		if (!allowedTypes.includes(proposalType)) {
			return fail(403, {
				error: `Your ministry (${ministry.ministry}) cannot execute ${proposalType} actions directly`
			});
		}

		const { title, description, votingDays, requiredMajority } = form.data;

		// Create proposal but mark as passed immediately
		const votingStartsAt = new Date();
		const votingEndsAt = new Date();

		await db.insert(parliamentaryProposals).values({
			stateId: params.id,
			title,
			description,
			proposalType,
			proposedBy: account.id,
			votingStartsAt,
			votingEndsAt,
			requiredMajority,
			status: "passed" // Immediately passed
		});

		return { form, success: true, message: "Ministerial action executed successfully" };
	}
};
