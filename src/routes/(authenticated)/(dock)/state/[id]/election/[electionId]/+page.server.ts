// src/routes/state/[id]/election/[electionId]/+page.server.ts

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "#lib/server/db.js";
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
	regions
} from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get state with logo - manual query; fail fast if it doesn't exist
	const statePromise = db
		.select()
		.from(states)
		.where(eq(states.id, parseInt(params.id)))
		.limit(1)
		.then(([state]) => state ?? error(404, "State not found"));

	// State and election lookups are independent reads, so fetch them together
	const [state, election] = await Promise.all([
		statePromise,
		// Get election - manual query (state 404 wins over election 404)
		db
			.select()
			.from(parliamentaryElections)
			.where(eq(parliamentaryElections.id, parseInt(params.electionId)))
			.limit(1)
			.then(async ([election]) => {
				await statePromise;
				if (!election || election.stateId !== parseInt(params.id)) {
					error(404, "Election not found");
				}
				return election;
			})
	]);

	// Check if election is active
	const now = new Date();
	const isActive = now >= new Date(election.startDate) && now <= new Date(election.endDate);
	const hasEnded = now > new Date(election.endDate);
	const hasStarted = now >= new Date(election.startDate);

	// Process party logos and leader info
	const processedPartiesPromise = (async () => {
		// Get all parties in this state
		const parties = await db
			.select()
			.from(politicalParties)
			.where(eq(politicalParties.stateId, parseInt(params.id)));

		return Promise.all(
			parties.map(async (party) => {
				const [logoUrl, { members, leaderProfile, leaderLogoUrl }] = await Promise.all([
					getLogoUrl(party.logo),
					(async () => {
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
						let leaderLogoUrl = null;

						if (leader) {
							const [profile] = await db
								.select()
								.from(userProfiles)
								.where(eq(userProfiles.accountId, leader.userId))
								.limit(1);

							if (profile) {
								leaderProfile = profile;
								leaderLogoUrl = await getLogoUrl(profile.logo);
							}
						}

						return { members, leaderProfile, leaderLogoUrl };
					})()
				]);

				return {
					...party,
					logo: logoUrl,
					memberCount: members.length,
					leader: {
						...leaderProfile,
						logo: leaderLogoUrl
					}
				};
			})
		);
	})();

	const [stateLogo, [userResidence], processedParties, allVotes, [userVote]] = await Promise.all([
		// Fetch state logo
		getLogoUrl(state.logo),
		// Check if user lives in this state - manual join
		db
			.select({
				userId: residences.userId,
				regionId: residences.regionId,
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1),
		processedPartiesPromise,
		// Get vote counts
		db
			.select()
			.from(electionVotes)
			.where(eq(electionVotes.electionId, parseInt(params.electionId))),
		// Check if user has voted
		db
			.select()
			.from(electionVotes)
			.where(and(eq(electionVotes.electionId, parseInt(params.electionId)), eq(electionVotes.voterId, account.id)))
			.limit(1)
	]);

	const canVote = userResidence?.stateId === parseInt(params.id) && isActive;

	const votesByParty: Record<number, number> = {};
	processedParties.forEach((party) => {
		votesByParty[party.id] = allVotes.filter((v) => v.partyId === party.id).length;
	});

	const totalVotes = allVotes.length;

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
		userResidence: userResidence?.stateId === parseInt(params.id),
		userVote: userVote?.partyId || null,
		votesByParty,
		totalVotes
	};
};

export const actions: Actions = {
	vote: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const partyId = parseInt(formData.get("partyId") as string);

		if (!partyId) {
			return fail(400, { error: "Invalid party selection" });
		}

		// Get election - manual query
		const [election] = await db
			.select()
			.from(parliamentaryElections)
			.where(eq(parliamentaryElections.id, parseInt(params.electionId)))
			.limit(1);

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

		// Check if user lives in this state - manual join
		const [userResidence] = await db
			.select({
				userId: residences.userId,
				regionId: residences.regionId,
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1);

		if (userResidence?.stateId !== parseInt(params.id)) {
			return fail(403, { error: "You must live in this state to vote" });
		}

		// Check if party exists in this state and has at least 3 members
		const [party] = await db
			.select()
			.from(politicalParties)
			.where(and(eq(politicalParties.id, partyId), eq(politicalParties.stateId, parseInt(params.id))))
			.limit(1);

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
		const [existingVote] = await db
			.select()
			.from(electionVotes)
			.where(and(eq(electionVotes.electionId, parseInt(params.electionId)), eq(electionVotes.voterId, account.id)))
			.limit(1);

		if (existingVote) {
			// Votes are final once cast — no re-voting, no changing your mind.
			return fail(400, { error: "You have already voted in this election. Votes cannot be changed." });
		}

		await db.insert(electionVotes).values({
			electionId: parseInt(params.electionId),
			voterId: account.id,
			partyId
		});

		return { success: true, message: "Vote recorded successfully" };
	}
};
