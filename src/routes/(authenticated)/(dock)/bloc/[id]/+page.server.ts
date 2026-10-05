// src/routes/bloc/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
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
	blocApplications,
	blocApplicationVotes,
	wars,
	battles
} from "#lib/server/schema.js";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, or, ne, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	applyToBloc,
	resolveBlocApplication,
	resolveExpiredBlocApplications
} from "#lib/server/service/blocApplication.js";

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

	// Close applications whose voting window ran out before listing them
	await resolveExpiredBlocApplications(blocId);

	// Everything below only depends on the bloc id, so fetch it in parallel.
	const [memberStates, leaderRow, diplomatRows, currentElection, [presidency], applicationRows, applicationVoteRows] =
		await Promise.all([
			// Get member states with their presidents
			db
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
				.orderBy(states.name),
			// Bloc leader (persisted appointment, up to 2 diplomats)
			db.query.blocLeaders.findFirst({
				where: eq(blocLeaders.blocId, blocId),
				with: { user: { with: { profile: true } } }
			}),
			db.query.blocDiplomats.findMany({
				where: eq(blocDiplomats.blocId, blocId),
				with: { user: { with: { profile: true } } },
				orderBy: (t, { asc }) => asc(t.appointedAt)
			}),
			// Current bloc leader election cycle (scheduled or with its voting window active)
			db.query.blocLeaderElections.findFirst({
				where: and(eq(blocLeaderElections.blocId, blocId), ne(blocLeaderElections.status, "completed")),
				orderBy: (t, { asc }) => asc(t.votingEndsAt)
			}),
			// Check if user is a president and get their state
			locals.account
				? db
						.select({
							stateId: presidents.stateId,
							stateName: states.name,
							stateLogo: states.logo,
							currentBlocId: states.blocId
						})
						.from(presidents)
						.innerJoin(states, eq(presidents.stateId, states.id))
						.where(eq(presidents.userId, locals.account.id))
						.limit(1)
				: [],
			// Pending membership applications
			db
				.select({
					id: blocApplications.id,
					stateId: blocApplications.stateId,
					stateName: states.name,
					stateLogo: states.logo,
					createdAt: blocApplications.createdAt,
					expiresAt: blocApplications.expiresAt
				})
				.from(blocApplications)
				.innerJoin(states, eq(blocApplications.stateId, states.id))
				.where(and(eq(blocApplications.blocId, blocId), eq(blocApplications.status, "pending")))
				.orderBy(blocApplications.createdAt),
			// Votes on those applications (only member-state votes count, filtered below)
			db
				.select({
					applicationId: blocApplicationVotes.applicationId,
					voterStateId: blocApplicationVotes.voterStateId,
					inFavor: blocApplicationVotes.inFavor
				})
				.from(blocApplicationVotes)
				.innerJoin(blocApplications, eq(blocApplicationVotes.applicationId, blocApplications.id))
				.where(and(eq(blocApplications.blocId, blocId), eq(blocApplications.status, "pending")))
		]);

	// Get member state IDs for war queries
	const memberStateIds = memberStates.map((s) => s.id);

	const isLeader = locals.account?.id === leaderRow?.userId;

	let candidates: Array<{ userId: string; name: string; logo: string | null; nominatedAt: Date; votes: number }> = [];
	let myBlocLeaderVote: string | null = null;

	// Wars (needs member state ids) and election details (needs the election) are independent
	const [activeWars] = await Promise.all([
		(async () => {
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
			return activeWars;
		})(),
		(async () => {
			if (!currentElection) return;

			const [candidateRows, voteCountRows, [voteRow]] = await Promise.all([
				db.query.blocLeaderCandidates.findMany({
					where: eq(blocLeaderCandidates.electionId, currentElection.id),
					with: { candidate: { with: { profile: true } } },
					orderBy: (t, { asc }) => asc(t.nominatedAt)
				}),
				db
					.select({ candidateUserId: blocLeaderVotes.candidateUserId, count: sql<number>`count(*)::int` })
					.from(blocLeaderVotes)
					.where(eq(blocLeaderVotes.electionId, currentElection.id))
					.groupBy(blocLeaderVotes.candidateUserId),
				locals.account
					? db
							.select({ candidateUserId: blocLeaderVotes.candidateUserId })
							.from(blocLeaderVotes)
							.where(
								and(eq(blocLeaderVotes.electionId, currentElection.id), eq(blocLeaderVotes.voterId, locals.account.id))
							)
							.limit(1)
					: []
			]);
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
				myBlocLeaderVote = voteRow?.candidateUserId ?? null;
			}
		})()
	]);

	let userState = null;
	let isMember = false;
	let canJoin = false;

	if (presidency) {
		userState = {
			id: presidency.stateId,
			name: presidency.stateName,
			logo: presidency.stateLogo ? await getLogoUrl(presidency.stateLogo) : null
		};

		// User's state is a member if it's in this bloc
		isMember = presidency.currentBlocId === blocId;

		// Can apply if not in any bloc
		canJoin = !presidency.currentBlocId;
	}

	const memberStateIdSet = new Set(memberStateIds);
	const memberVotes = applicationVoteRows.filter((v) => memberStateIdSet.has(v.voterStateId));
	const applications = await Promise.all(
		applicationRows.map(async (a) => {
			const votes = memberVotes.filter((v) => v.applicationId === a.id);
			const myVote = presidency ? votes.find((v) => v.voterStateId === presidency.stateId) : undefined;
			return {
				id: a.id,
				state: { id: a.stateId, name: a.stateName, logo: await getLogoUrl(a.stateLogo) },
				createdAt: a.createdAt,
				expiresAt: a.expiresAt,
				pro: votes.filter((v) => v.inFavor).length,
				contra: votes.filter((v) => !v.inFavor).length,
				myVote: myVote ? (myVote.inFavor ? "pro" : "contra") : null
			};
		})
	);

	const myApplication = presidency ? (applications.find((a) => a.state.id === presidency.stateId) ?? null) : null;

	// A state may only have one open application at a time
	if (canJoin && presidency && !myApplication) {
		const [otherPending] = await db
			.select({ blocId: blocApplications.blocId })
			.from(blocApplications)
			.where(and(eq(blocApplications.stateId, presidency.stateId), eq(blocApplications.status, "pending")))
			.limit(1);
		if (otherPending) canJoin = false;
	}
	if (myApplication) canJoin = false;

	// Resolve all logo URLs in parallel
	const [blocLogo, memberStatesWithLogos, leaderLogo, diplomats, activeWarsWithLogos] = await Promise.all([
		getLogoUrl(bloc.logo),
		Promise.all(
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
		leaderRow ? getLogoUrl(leaderRow.user.profile?.logo) : null,
		Promise.all(
			diplomatRows.map(async (d) => ({
				id: d.id,
				userId: d.userId,
				name: d.user.profile?.name || "Anonymous",
				logo: await getLogoUrl(d.user.profile?.logo),
				appointedAt: d.appointedAt
			}))
		),
		Promise.all(
			activeWars.map(async (war) => {
				const [attackerLogo, defenderLogo] = await Promise.all([
					getLogoUrl(war.attacker.logo),
					getLogoUrl(war.defender.logo)
				]);
				return {
					...war,
					attacker: {
						...war.attacker,
						logo: attackerLogo
					},
					defender: {
						...war.defender,
						logo: defenderLogo
					}
				};
			})
		)
	]);

	return {
		bloc: {
			id: bloc.id,
			name: bloc.name,
			logo: blocLogo,
			color: bloc.color,
			description: bloc.description,
			createdAt: bloc.createdAt
		},
		memberStates: memberStatesWithLogos,

		leader: leaderRow
			? {
					userId: leaderRow.userId,
					name: leaderRow.user.profile?.name || "Anonymous",
					logo: leaderLogo,
					appointedAt: leaderRow.appointedAt
				}
			: null,
		diplomats,
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
		applications,
		myApplication,
		memberCount: memberStates.length,
		activeWars: activeWarsWithLogos
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);

		// Member states vote on the application; empty blocs admit immediately
		const result = await applyToBloc(account.id, blocId);
		if ("error" in result) {
			return fail(result.status, { error: result.error });
		}

		return {
			success: true,
			message:
				result.outcome === "accepted"
					? "Your state joined the bloc"
					: "Application submitted — the member states will now vote on it"
		};
	},

	withdrawApplication: async ({ params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);

		const [presidency] = await db
			.select({ stateId: presidents.stateId })
			.from(presidents)
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { error: "Only state presidents can withdraw bloc applications" });
		}

		const [withdrawn] = await db
			.update(blocApplications)
			.set({ status: "withdrawn", resolvedAt: new Date() })
			.where(
				and(
					eq(blocApplications.blocId, blocId),
					eq(blocApplications.stateId, presidency.stateId),
					eq(blocApplications.status, "pending")
				)
			)
			.returning({ id: blocApplications.id });

		if (!withdrawn) {
			return fail(400, { error: "Your state has no pending application to this bloc" });
		}

		return { success: true, message: "Application withdrawn" };
	},

	voteApplication: async ({ params, request, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);
		const formData = await request.formData();
		const applicationId = parseInt(formData.get("applicationId") as string);
		const vote = formData.get("vote");

		if (!applicationId || (vote !== "pro" && vote !== "contra")) {
			return fail(400, { error: "Invalid vote" });
		}

		const [presidency] = await db
			.select({ stateId: presidents.stateId, currentBlocId: states.blocId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency || presidency.currentBlocId !== blocId) {
			return fail(403, { error: "Only presidents of this bloc's member states can vote on applications" });
		}

		const [application] = await db
			.select()
			.from(blocApplications)
			.where(and(eq(blocApplications.id, applicationId), eq(blocApplications.blocId, blocId)))
			.limit(1);

		if (!application || application.status !== "pending") {
			return fail(400, { error: "This application is no longer open for voting" });
		}

		if (application.expiresAt <= new Date()) {
			await resolveBlocApplication(application.id);
			return fail(400, { error: "Voting on this application has closed" });
		}

		// One vote per member state; presidents may change their state's vote while it is open
		const inFavor = vote === "pro";
		await db
			.insert(blocApplicationVotes)
			.values({ applicationId, voterStateId: presidency.stateId, voterId: account.id, inFavor })
			.onConflictDoUpdate({
				target: [blocApplicationVotes.applicationId, blocApplicationVotes.voterStateId],
				set: { inFavor, voterId: account.id, votedAt: new Date() }
			});

		const outcome = await resolveBlocApplication(application.id, account.id);

		return {
			success: true,
			message:
				outcome === "accepted"
					? "Vote recorded — the application passed and the state has joined"
					: outcome === "rejected"
						? "Vote recorded — the application was rejected"
						: "Vote recorded"
		};
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
