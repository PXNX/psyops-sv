// src/routes/bloc/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	blocs,
	states,
	presidents,
	blocActionCooldowns,
	blocLeaders,
	blocDiplomats,
	blocLeaderElections,
	blocLeaderCandidates,
	blocLeaderVotes,
	wars,
	battles
} from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, or, ne, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const blocId = parseInt(params.id);

	// Get bloc details
	const [bloc] = await db
		.select({
			id: blocs.id,
			name: blocs.name,
			logo: blocs.logo,
			color: blocs.color,
			description: blocs.description,
			createdAt: blocs.createdAt
		})
		.from(blocs)
		.where(eq(blocs.id, blocId))
		.limit(1);

	if (!bloc) {
		error(404, "Bloc not found");
	}

	// Get member states with their presidents
	const memberStates = await db
		.select({
			id: states.id,
			name: states.name,
			logo: states.logo,
			population: states.population,
			rating: states.rating,
			presidentId: presidents.id,
			presidentUserId: presidents.userId,
			presidentName: sql<string>`up.name`,
			presidentTerm: presidents.term,
			presidentElectedAt: presidents.electedAt
		})
		.from(states)
		.leftJoin(presidents, eq(states.id, presidents.stateId))
		.leftJoin(sql`user_profiles up`, sql`up.account_id = ${presidents.userId}`)
		.where(eq(states.blocId, blocId))
		.orderBy(states.name);

	// Get member state IDs for war queries
	const memberStateIds = memberStates.map((s) => s.id);

	// Get active wars involving bloc member states
	let activeWars: any[] = [];
	if (memberStateIds.length > 0) {
		const warResults = await db
			.select({
				id: wars.id,
				attackerId: wars.attackerId,
				defenderId: wars.defenderId,
				declaredAt: wars.declaredAt,
				attackerName: sql<string>`attacker.name`,
				attackerLogo: sql<number | null>`attacker.logo`,
				defenderName: sql<string>`defender.name`,
				defenderLogo: sql<number | null>`defender.logo`
			})
			.from(wars)
			.innerJoin(sql`states attacker`, sql`attacker.id = ${wars.attackerId}`)
			.innerJoin(sql`states defender`, sql`defender.id = ${wars.defenderId}`)
			.where(
				and(
					eq(wars.status, "active"),
					or(sql`${wars.attackerId} IN ${memberStateIds}`, sql`${wars.defenderId} IN ${memberStateIds}`)
				)
			)
			.orderBy(sql`${wars.declaredAt} DESC`);

		// Count active battles for each war
		const warIds = warResults.map((w) => w.id);
		let battleCounts: Record<number, number> = {};

		if (warIds.length > 0) {
			const battleCountResults = await db
				.select({
					warId: battles.warId,
					count: sql<number>`count(*)::int`
				})
				.from(battles)
				.where(and(sql`${battles.warId} IN ${warIds}`, eq(battles.status, "ongoing")))
				.groupBy(battles.warId);

			battleCounts = Object.fromEntries(battleCountResults.map((bc) => [bc.warId, bc.count]));
		}

		activeWars = warResults.map((war) => ({
			id: war.id,
			attacker: {
				id: war.attackerId,
				name: war.attackerName,
				logo: war.attackerLogo
			},
			defender: {
				id: war.defenderId,
				name: war.defenderName,
				logo: war.defenderLogo
			},
			declaredAt: war.declaredAt,
			activeBattles: battleCounts[war.id] || 0
		}));
	}

	// Bloc leader (persisted appointment, up to 2 diplomats)
	const leaderRow = await db.query.blocLeaders.findFirst({
		where: eq(blocLeaders.blocId, blocId),
		with: { user: { with: { profile: true } } }
	});

	const diplomatRows = await db.query.blocDiplomats.findMany({
		where: eq(blocDiplomats.blocId, blocId),
		with: { user: { with: { profile: true } } },
		orderBy: (t, { asc }) => asc(t.appointedAt)
	});

	const isLeader = locals.account?.id === leaderRow?.userId;

	// Current bloc leader election cycle (scheduled or with its voting window active)
	const currentElection = await db.query.blocLeaderElections.findFirst({
		where: and(eq(blocLeaderElections.blocId, blocId), ne(blocLeaderElections.status, "completed")),
		orderBy: (t, { asc }) => asc(t.votingEndsAt)
	});

	let candidates: Array<{ userId: string; name: string; logo: string | null; nominatedAt: Date; votes: number }> = [];
	let myBlocLeaderVote: string | null = null;

	if (currentElection) {
		const candidateRows = await db.query.blocLeaderCandidates.findMany({
			where: eq(blocLeaderCandidates.electionId, currentElection.id),
			with: { candidate: { with: { profile: true } } },
			orderBy: (t, { asc }) => asc(t.nominatedAt)
		});

		const voteCountRows = await db
			.select({ candidateUserId: blocLeaderVotes.candidateUserId, count: sql<number>`count(*)::int` })
			.from(blocLeaderVotes)
			.where(eq(blocLeaderVotes.electionId, currentElection.id))
			.groupBy(blocLeaderVotes.candidateUserId);
		const voteCounts = Object.fromEntries(voteCountRows.map((v) => [v.candidateUserId, v.count]));

		candidates = await Promise.all(
			candidateRows.map(async (c) => ({
				userId: c.candidateUserId,
				name: c.candidate.profile?.name || "Anonymous",
				logo: await getLogoUrl(c.candidate.profile?.logo),
				nominatedAt: c.nominatedAt,
				votes: voteCounts[c.candidateUserId] || 0
			}))
		);

		if (locals.account) {
			const [voteRow] = await db
				.select({ candidateUserId: blocLeaderVotes.candidateUserId })
				.from(blocLeaderVotes)
				.where(and(eq(blocLeaderVotes.electionId, currentElection.id), eq(blocLeaderVotes.voterId, locals.account.id)))
				.limit(1);
			myBlocLeaderVote = voteRow?.candidateUserId ?? null;
		}
	}

	// Check if user is a president and get their state
	let userState = null;
	let isMember = false;
	let canJoin = false;

	if (locals.account) {
		const [presidency] = await db
			.select({
				stateId: presidents.stateId,
				stateName: states.name,
				stateLogo: states.logo,
				currentBlocId: states.blocId
			})
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, locals.account.id))
			.limit(1);

		if (presidency) {
			userState = {
				id: presidency.stateId,
				name: presidency.stateName,
				logo: presidency.stateLogo ? await getLogoUrl(presidency.stateLogo) : null
			};

			// User's state is a member if it's in this bloc
			isMember = presidency.currentBlocId === blocId;

			// Can join if not in any bloc
			canJoin = !presidency.currentBlocId;
		}
	}

	return {
		bloc: {
			id: bloc.id,
			name: bloc.name,
			logo: await getLogoUrl(bloc.logo),
			color: bloc.color,
			description: bloc.description,
			createdAt: bloc.createdAt
		},
		memberStates: await Promise.all(
			memberStates.map(async (state) => ({
				id: state.id,
				name: state.name,
				logo: await getLogoUrl(state.logo),
				population: state.population || 0,
				rating: state.rating || 0,
				president: state.presidentUserId
					? {
							userId: state.presidentUserId,
							name: state.presidentName,
							term: state.presidentTerm,
							electedAt: state.presidentElectedAt
						}
					: null
			}))
		),

		leader: leaderRow
			? {
					userId: leaderRow.userId,
					name: leaderRow.user.profile?.name || "Anonymous",
					logo: await getLogoUrl(leaderRow.user.profile?.logo),
					appointedAt: leaderRow.appointedAt
				}
			: null,
		diplomats: await Promise.all(
			diplomatRows.map(async (d) => ({
				id: d.id,
				userId: d.userId,
				name: d.user.profile?.name || "Anonymous",
				logo: await getLogoUrl(d.user.profile?.logo),
				appointedAt: d.appointedAt
			}))
		),
		isLeader,
		election: currentElection
			? {
					id: currentElection.id,
					status: currentElection.status,
					votingStartsAt: currentElection.votingStartsAt,
					votingEndsAt: currentElection.votingEndsAt
				}
			: null,
		candidates,
		myBlocLeaderVote,
		canVoteForBlocLeader: isMember && currentElection?.status === "active",
		isMemberPresident: isMember,
		userState,
		canJoin,
		activeWars: await Promise.all(
			activeWars.map(async (war) => ({
				...war,
				attacker: {
					...war.attacker,
					logo: await getLogoUrl(war.attacker.logo)
				},
				defender: {
					...war.defender,
					logo: await getLogoUrl(war.defender.logo)
				}
			}))
		)
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);

		// Check if user is president
		const [presidency] = await db
			.select({ stateId: presidents.stateId, currentBlocId: states.blocId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { error: "Only state presidents can join blocs" });
		}

		if (presidency.currentBlocId) {
			return fail(400, { error: "Your state is already in a bloc. Leave your current bloc first." });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(blocActionCooldowns)
			.where(eq(blocActionCooldowns.userId, account.id))
			.limit(1);

		const now = new Date();
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastActionAt.getTime() + 24 * 60 * 60 * 1000);
			if (now < cooldownEnd) {
				const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
				return fail(429, { error: `Wait ${hoursLeft}h before joining/leaving a bloc` });
			}
		}

		await db.transaction(async (tx) => {
			await tx.update(states).set({ blocId }).where(eq(states.id, presidency.stateId));

			await tx
				.insert(blocActionCooldowns)
				.values({ userId: account.id, lastActionAt: now })
				.onConflictDoUpdate({
					target: blocActionCooldowns.userId,
					set: { lastActionAt: now }
				});
		});

		return { success: true };
	},

	leave: async ({ params, locals }) => {
		const account = locals.account!;

		const [presidency] = await db
			.select({ stateId: presidents.stateId, currentBlocId: states.blocId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { error: "Only state presidents can leave blocs" });
		}

		if (!presidency.currentBlocId) {
			return fail(400, { error: "Your state is not in a bloc" });
		}

		if (presidency.currentBlocId !== parseInt(params.id)) {
			return fail(400, { error: "Your state is not a member of this bloc" });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(blocActionCooldowns)
			.where(eq(blocActionCooldowns.userId, account.id))
			.limit(1);

		const now = new Date();
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastActionAt.getTime() + 24 * 60 * 60 * 1000);
			if (now < cooldownEnd) {
				const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
				return fail(429, { error: `Wait ${hoursLeft}h before joining/leaving a bloc` });
			}
		}

		await db.transaction(async (tx) => {
			await tx.update(states).set({ blocId: null }).where(eq(states.id, presidency.stateId));

			await tx
				.insert(blocActionCooldowns)
				.values({ userId: account.id, lastActionAt: now })
				.onConflictDoUpdate({
					target: blocActionCooldowns.userId,
					set: { lastActionAt: now }
				});
		});

		redirect(303, "/state/" + presidency.stateId);
	},

	voteBlocLeader: async ({ params, request, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);

		const [presidency] = await db
			.select({ stateId: presidents.stateId, currentBlocId: states.blocId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency || presidency.currentBlocId !== blocId) {
			return fail(403, { error: "Only presidents of this bloc's member states can vote for its leader" });
		}

		const election = await db.query.blocLeaderElections.findFirst({
			where: and(eq(blocLeaderElections.blocId, blocId), eq(blocLeaderElections.status, "active"))
		});

		if (!election) {
			return fail(400, { error: "There is no active bloc leader election right now" });
		}

		const formData = await request.formData();
		const candidateUserId = formData.get("candidateUserId") as string;

		const candidate = await db.query.blocLeaderCandidates.findFirst({
			where: and(
				eq(blocLeaderCandidates.electionId, election.id),
				eq(blocLeaderCandidates.candidateUserId, candidateUserId)
			)
		});

		if (!candidate) {
			return fail(400, { error: "Invalid candidate" });
		}

		const [existingVote] = await db
			.select()
			.from(blocLeaderVotes)
			.where(and(eq(blocLeaderVotes.electionId, election.id), eq(blocLeaderVotes.voterId, account.id)))
			.limit(1);

		if (existingVote) {
			await db
				.update(blocLeaderVotes)
				.set({ candidateUserId, votedAt: new Date() })
				.where(eq(blocLeaderVotes.id, existingVote.id));
		} else {
			await db.insert(blocLeaderVotes).values({ electionId: election.id, voterId: account.id, candidateUserId });
		}

		return { success: true, message: "Vote recorded" };
	}
};
