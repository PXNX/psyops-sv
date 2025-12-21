// src/routes/state/[id]/parliament/election/[electionId]/+page.server.ts

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and } from "drizzle-orm";
import {
	states,
	parliamentaryElections,
	politicalParties,
	electionVotes,
	residences,
	accounts,
	userProfiles,
	partyMembers,
	files
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get state with logo
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Fetch state logo
	let stateLogo = `/static/state/${state.id}`;
	if (state.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, state.logo)
		});
		if (logoFile) {
			try {
				stateLogo = await getSignedDownloadUrl(logoFile.key);
			} catch {
				// Keep default static logo
			}
		}
	}

	// Get election
	const election = await db.query.parliamentaryElections.findFirst({
		where: eq(parliamentaryElections.id, params.electionId)
	});

	if (!election || election.stateId !== params.id) {
		throw error(404, "Election not found");
	}

	// Check if election is active
	const now = new Date();
	const isActive = now >= new Date(election.startDate) && now <= new Date(election.endDate);
	const hasEnded = now > new Date(election.endDate);
	const hasStarted = now >= new Date(election.startDate);

	// Check if user lives in this state
	const userResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)),
		with: {
			region: true
		}
	});

	const canVote = userResidence?.region?.stateId === params.id && isActive;

	// Get all parties in this state with member counts
	const parties = await db.query.politicalParties.findMany({
		where: eq(politicalParties.stateId, params.id)
	});

	// Process party logos and leader info
	const processedParties = await Promise.all(
		parties.map(async (party) => {
			// Fetch party logo from files table
			let logoUrl = null;
			if (party.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, party.logo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {
						logoUrl = null;
					}
				}
			}

			// Get member count with leader info
			const members = await db
				.select({
					userId: partyMembers.userId,
					role: partyMembers.role
				})
				.from(partyMembers)
				.where(eq(partyMembers.partyId, party.id));

			const leader = members.find((m) => m.role === "leader");
			let leaderProfile = null;

			if (leader) {
				leaderProfile = await db.query.userProfiles.findFirst({
					where: eq(userProfiles.accountId, leader.userId)
				});

				// Fetch leader avatar from files table
				if (leaderProfile?.avatar) {
					const avatarFile = await db.query.files.findFirst({
						where: eq(files.id, leaderProfile.avatar)
					});
					if (avatarFile) {
						try {
							leaderProfile.avatar = await getSignedDownloadUrl(avatarFile.key);
						} catch {
							leaderProfile.avatar = null;
						}
					}
				}
			}

			return {
				...party,
				logo: logoUrl,
				memberCount: members.length,
				leader: leaderProfile
			};
		})
	);

	// Get vote counts
	const allVotes = await db.select().from(electionVotes).where(eq(electionVotes.electionId, params.electionId));

	const votesByParty: Record<string, number> = {};
	processedParties.forEach((party) => {
		votesByParty[party.id] = allVotes.filter((v) => v.partyId === party.id).length;
	});

	const totalVotes = allVotes.length;

	// Check if user has voted
	const userVote = await db.query.electionVotes.findFirst({
		where: and(eq(electionVotes.electionId, params.electionId), eq(electionVotes.voterId, account.id))
	});

	return {
		state: {
			...state,
			logo: stateLogo
		},
		election,
		parties: processedParties,
		canVote,
		isActive,
		hasEnded,
		hasStarted,
		userResidence: userResidence?.region?.stateId === params.id,
		userVote: userVote?.partyId || null,
		votesByParty,
		totalVotes
	};
};

export const actions: Actions = {
	vote: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const partyId = formData.get("partyId") as string;

		if (!partyId) {
			return fail(400, { error: "Invalid party selection" });
		}

		// Get election
		const election = await db.query.parliamentaryElections.findFirst({
			where: eq(parliamentaryElections.id, params.electionId)
		});

		if (!election) {
			return fail(404, { error: "Election not found" });
		}

		// Check if election is active - STRICT validation
		const now = new Date();
		const startDate = new Date(election.startDate);
		const endDate = new Date(election.endDate);

		// Check if voting hasn't started yet
		if (now < startDate) {
			return fail(400, { error: "Voting has not started yet. Please wait until the election opens." });
		}

		// Check if voting has ended
		if (now > endDate) {
			return fail(400, { error: "Voting has ended. This election is now closed." });
		}

		// Double-check election is currently active
		const isActive = now >= startDate && now <= endDate;
		if (!isActive) {
			return fail(400, { error: "Election is not currently active" });
		}

		// Check if user lives in this state
		const userResidence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)),
			with: {
				region: true
			}
		});

		if (userResidence?.region?.stateId !== params.id) {
			return fail(403, { error: "You must live in this state to vote" });
		}

		// Check if party exists in this state and has at least 3 members
		const party = await db.query.politicalParties.findFirst({
			where: and(eq(politicalParties.id, partyId), eq(politicalParties.stateId, params.id))
		});

		if (!party) {
			return fail(404, { error: "Party not found" });
		}

		// Verify party has at least 3 members
		const partyMemberCount = await db.select().from(partyMembers).where(eq(partyMembers.partyId, partyId));

		if (partyMemberCount.length < 3) {
			return fail(400, {
				error: "This party does not have enough members to participate in elections (minimum 3 required)"
			});
		}

		// Check if user already voted
		const existingVote = await db.query.electionVotes.findFirst({
			where: and(eq(electionVotes.electionId, params.electionId), eq(electionVotes.voterId, account.id))
		});

		if (existingVote) {
			// Update existing vote
			await db
				.update(electionVotes)
				.set({
					partyId,
					votedAt: new Date()
				})
				.where(eq(electionVotes.id, existingVote.id));
		} else {
			// Create new vote
			await db.insert(electionVotes).values({
				electionId: params.electionId,
				voterId: account.id,
				partyId
			});
		}

		return { success: true, message: "Vote recorded successfully" };
	}
};
