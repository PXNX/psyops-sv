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
	blocExpulsions,
	blocExpulsionVotes,
	wars,
	battles,
	files,
	userProfiles,
	governmentBudgetTransactions,
	blocEmbargoes
} from "#lib/server/schema.js";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, or, ne, sql, inArray, gte, notInArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl, uploadFileFromForm } from "#lib/server/backblaze.js";
import {
	applyToBloc,
	resolveBlocApplication,
	resolveExpiredBlocApplications
} from "#lib/server/service/blocApplication.js";
import {
	ExpulsionError,
	expulsionTally,
	proposeExpulsion,
	resolveExpiredExpulsions,
	voteOnExpulsion
} from "#lib/server/service/blocExpulsion.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters/valibot";
import { editBlocSchema } from "./schema.js";
import { warsOfBloc } from "#lib/server/services/military/history.js";
import { statePowerReport } from "#lib/server/services/economy/state-metrics.js";
import { stateStabilities } from "#lib/server/services/stability.js";

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
			visaFreeForMembers: blocs.visaFreeForMembers,
			defenceSpendingGuideline: blocs.defenceSpendingGuideline,
			createdAt: blocs.createdAt
		})
		.from(blocs)
		.where(eq(blocs.id, blocId))
		.limit(1);

	if (!bloc) {
		error(404, "Bloc not found");
	}

	// Close applications and expulsion votes whose window ran out before listing them
	await Promise.all([resolveExpiredBlocApplications(blocId), resolveExpiredExpulsions(db, blocId)]);

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

	// Defence-spending guideline compliance over the last 30 days. The ledger
	// sign convention is inconsistent, so expenses use the absolute amount.
	const INCOME_TYPES = new Set([
		"tax_collection",
		"trade_revenue",
		"tax_payment",
		"visa_purchase",
		"gift_code_redemption"
	]);
	const DEFENCE_TYPES = new Set([
		"military",
		"naval_operation",
		"airstrike",
		"covert_operation",
		"cyber_defence",
		"satellite_launch",
		"space_operation",
		"ai_research"
	]);
	const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const compliance = new Map<number, { income: number; defence: number; percent: number }>();
	if (memberStateIds.length) {
		const ledger = await db
			.select({
				stateId: governmentBudgetTransactions.stateId,
				transactionType: governmentBudgetTransactions.transactionType,
				amount: governmentBudgetTransactions.amount
			})
			.from(governmentBudgetTransactions)
			.where(
				and(
					inArray(governmentBudgetTransactions.stateId, memberStateIds),
					gte(governmentBudgetTransactions.createdAt, since)
				)
			);
		for (const row of ledger) {
			const entry = compliance.get(row.stateId) ?? { income: 0, defence: 0, percent: 0 };
			if (INCOME_TYPES.has(row.transactionType) && row.amount > 0) entry.income += row.amount;
			if (DEFENCE_TYPES.has(row.transactionType)) entry.defence += Math.abs(row.amount);
			compliance.set(row.stateId, entry);
		}
		for (const entry of compliance.values())
			entry.percent = entry.income > 0 ? Math.round((entry.defence / entry.income) * 100) : 0;
	}

	const [embargoRows, availableStates] = await Promise.all([
		db
			.select({
				id: blocEmbargoes.id,
				targetStateId: blocEmbargoes.targetStateId,
				targetName: states.name,
				reason: blocEmbargoes.reason,
				createdAt: blocEmbargoes.createdAt
			})
			.from(blocEmbargoes)
			.innerJoin(states, eq(blocEmbargoes.targetStateId, states.id))
			.where(eq(blocEmbargoes.blocId, blocId))
			.orderBy(states.name),
		memberStateIds.length
			? db
					.select({ id: states.id, name: states.name })
					.from(states)
					.where(notInArray(states.id, memberStateIds))
					.orderBy(states.name)
			: db.select({ id: states.id, name: states.name }).from(states).orderBy(states.name)
	]);

	const isLeader = locals.account?.id === leaderRow?.userId;

	// No vote counts here: this page only shows an election that is still
	// running, and results stay secret until it is over.
	let candidates: Array<{ userId: string; name: string; logo: string | null; nominatedAt: Date }> = [];
	let myBlocLeaderVote: string | null = null;
	let blocLeaderVotesCast = 0;

	// Data for the "Edit Bloc" bottom sheet — only needed when the edit trigger is shown (bloc leader).
	const editFormPromise = isLeader
		? superValidate(
				{
					name: bloc.name,
					color: bloc.color,
					description: bloc.description || "",
					visaFreeForMembers: bloc.visaFreeForMembers,
					defenceSpendingGuideline: bloc.defenceSpendingGuideline == null ? "" : String(bloc.defenceSpendingGuideline)
				},
				valibot(editBlocSchema)
			)
		: Promise.resolve(null);

	// Wars (needs member state ids) and election details (needs the election) are independent
	const [activeWars, , editForm] = await Promise.all([
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

			const [candidateRows, [{ total }], [voteRow]] = await Promise.all([
				db.query.blocLeaderCandidates.findMany({
					where: eq(blocLeaderCandidates.electionId, currentElection.id),
					with: { candidate: { with: { profile: true } } },
					orderBy: (t, { asc }) => asc(t.nominatedAt)
				}),
				// Turnout only; who got how many stays secret until voting closes.
				db
					.select({ total: sql<number>`count(*)::int` })
					.from(blocLeaderVotes)
					.where(eq(blocLeaderVotes.electionId, currentElection.id)),
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

			candidates = await Promise.all(
				candidateRows.map(async (c) => ({
					userId: c.candidateUserId,
					name: c.candidate.profile?.name || "Anonymous",
					logo: await getLogoUrl(c.candidate.profile?.logo),
					nominatedAt: c.nominatedAt
				}))
			);

			blocLeaderVotesCast = total;

			if (locals.account) {
				myBlocLeaderVote = voteRow?.candidateUserId ?? null;
			}
		})(),
		editFormPromise
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

	// Open expulsion votes. The targeted state can't vote on its own.
	const expulsionRows = await db
		.select({
			id: blocExpulsions.id,
			stateId: blocExpulsions.stateId,
			reason: blocExpulsions.reason,
			expiresAt: blocExpulsions.expiresAt
		})
		.from(blocExpulsions)
		.where(and(eq(blocExpulsions.blocId, blocId), eq(blocExpulsions.status, "pending")));
	const myStateInBloc = presidency && presidency.currentBlocId === blocId ? presidency.stateId : null;
	const expulsions = await Promise.all(
		expulsionRows.map(async (e) => {
			const [tally, [mine]] = await Promise.all([
				expulsionTally(db, e.id, blocId, e.stateId),
				myStateInBloc
					? db
							.select({ inFavor: blocExpulsionVotes.inFavor })
							.from(blocExpulsionVotes)
							.where(and(eq(blocExpulsionVotes.expulsionId, e.id), eq(blocExpulsionVotes.voterStateId, myStateInBloc)))
					: Promise.resolve([])
			]);
			const target = memberStates.find((m) => m.id === e.stateId);
			return {
				id: e.id,
				state: {
					id: e.stateId,
					name: target?.name ?? "Unknown",
					logo: target?.logo ? await getLogoUrl(target.logo) : null
				},
				reason: e.reason,
				expiresAt: e.expiresAt,
				...tally,
				myVote: mine ? (mine.inFavor ? "pro" : "contra") : null,
				isTarget: myStateInBloc === e.stateId,
				canVote: !!myStateInBloc && myStateInBloc !== e.stateId
			};
		})
	);
	const pendingExpulsionStateIds = new Set(expulsionRows.map((e) => e.stateId));

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

	// Avatars of the member states' presidents, for the signatory list.
	const presidentProfiles = memberStates.some((s) => s.presidentUserId)
		? await db
				.select({ accountId: userProfiles.accountId, logo: userProfiles.logo })
				.from(userProfiles)
				.where(
					inArray(
						userProfiles.accountId,
						memberStates.flatMap((s) => (s.presidentUserId ? [s.presidentUserId] : []))
					)
				)
		: [];
	const presidentAvatar = (userId: string) => getLogoUrl(presidentProfiles.find((p) => p.accountId === userId)?.logo);

	// Resolve all logo URLs in parallel
	const [blocLogo, memberStatesWithLogos, leaderLogo, diplomats, activeWarsWithLogos, warHistory] = await Promise.all([
		getLogoUrl(bloc.logo),
		Promise.all(
			memberStates.map(async (state) => ({
				presidentAvatar: state.presidentUserId ? await presidentAvatar(state.presidentUserId) : null,
				id: state.id,
				name: state.name,
				logo: await getLogoUrl(state.logo),
				population: state.population || 0,
				rating: state.rating || 0,
				defence: compliance.get(state.id) ?? { income: 0, defence: 0, percent: 0 },
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
		),
		warsOfBloc(db, blocId)
	]);

	// A bloc's combined weight: the same power model the state pages use,
	// aggregated over its members, plus their average regime stability.
	const [powerReport, stabilities] = await Promise.all([
		statePowerReport(db, memberStateIds[0] ?? 0),
		stateStabilities(db, memberStateIds)
	]);
	const powerById = new Map(powerReport.ranking.map((row) => [row.id, row]));
	const memberPower = memberStatesWithLogos
		.map((state) => {
			const row = powerById.get(state.id);
			return {
				id: state.id,
				name: state.name,
				logo: state.logo,
				score: row?.score ?? 0,
				population: row?.population ?? state.population,
				stability: Math.round(stabilities.get(state.id)?.score ?? 0)
			};
		})
		.sort((a, b) => b.score - a.score);
	const strength = {
		power: memberPower.reduce((sum, s) => sum + s.score, 0),
		population: memberPower.reduce((sum, s) => sum + s.population, 0),
		stability: memberPower.length
			? Math.round(memberPower.reduce((sum, s) => sum + s.stability, 0) / memberPower.length)
			: 0,
		topMember: memberPower[0] ?? null,
		members: memberPower
	};

	return {
		bloc: {
			id: bloc.id,
			name: bloc.name,
			logo: blocLogo,
			color: bloc.color,
			description: bloc.description,
			visaFreeForMembers: bloc.visaFreeForMembers,
			defenceSpendingGuideline: bloc.defenceSpendingGuideline,
			createdAt: bloc.createdAt
		},
		memberStates: memberStatesWithLogos,
		embargoes: embargoRows,
		embargoTargets: availableStates,

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
		editForm,
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
		blocLeaderVotesCast,
		canVoteForBlocLeader: isMember && currentElection?.status === "active",
		isMemberPresident: isMember,
		userState,
		canJoin,
		applications,
		myApplication,
		expulsions,
		// States a member president or the leader may put up for expulsion
		expellableStateIds:
			myStateInBloc || isLeader
				? memberStates.map((m) => m.id).filter((id) => id !== myStateInBloc && !pendingExpulsionStateIds.has(id))
				: [],
		memberCount: memberStates.length,
		strength,
		activeWars: activeWarsWithLogos,
		warHistory
	};
};

export const actions: Actions = {
	proposeExpulsion: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			const outcome = await proposeExpulsion(db, {
				blocId: Number(params.id),
				targetStateId: Number(form.get("stateId")),
				userId: locals.account!.id,
				reason: String(form.get("reason") ?? "")
			});
			return {
				success: true,
				message: outcome === "expelled" ? "The state was expelled." : "Expulsion vote opened."
			};
		} catch (err) {
			if (err instanceof ExpulsionError) return fail(400, { error: err.message });
			throw err;
		}
	},

	voteExpulsion: async ({ params, request, locals }) => {
		const form = await request.formData();
		const vote = form.get("vote");
		if (vote !== "pro" && vote !== "contra") return fail(400, { error: "Invalid vote" });
		try {
			const outcome = await voteOnExpulsion(db, {
				blocId: Number(params.id),
				expulsionId: Number(form.get("expulsionId")),
				userId: locals.account!.id,
				inFavor: vote === "pro"
			});
			return {
				success: true,
				message:
					outcome === "expelled"
						? "Vote recorded — the state was expelled."
						: outcome === "rejected"
							? "Vote recorded — the expulsion failed."
							: "Vote recorded."
			};
		} catch (err) {
			if (err instanceof ExpulsionError) return fail(400, { error: err.message });
			throw err;
		}
	},

	updateBloc: async ({ request, params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);
		const form = await superValidate(request, valibot(editBlocSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		// Get current bloc
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, blocId)).limit(1);

		if (!bloc) {
			return message(form, "Bloc not found", { status: 404 });
		}

		// Verify user is president of a member state
		const memberStates = await db
			.select({
				stateId: states.id,
				presidentUserId: presidents.userId
			})
			.from(states)
			.leftJoin(presidents, eq(states.id, presidents.stateId))
			.where(eq(states.blocId, blocId));

		const isPresidentOfMemberState = memberStates.some((s) => s.presidentUserId === account.id);

		if (!isPresidentOfMemberState) {
			return message(form, "Only presidents of member states can edit the bloc", { status: 403 });
		}

		const { name, color, description, logo, visaFreeForMembers, defenceSpendingGuideline } = form.data;
		const guidelineRaw = String(defenceSpendingGuideline ?? "").trim();
		const guideline = guidelineRaw === "" ? null : Number(guidelineRaw);

		// Check if name is already taken by another bloc
		const existingBloc = await db.select().from(blocs).where(eq(blocs.name, name)).limit(1);

		if (existingBloc.length > 0 && existingBloc[0].id !== blocId) {
			return message(form, "A bloc with this name already exists", { status: 400 });
		}

		try {
			let logoFileId: number | null = bloc.logo;

			// Upload new logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

				// Create file record in database
				const [fileRecord] = await db
					.insert(files)
					.values({
						key: logoUploadResult.key,
						fileName: logo.name,
						contentType: "image/webp",
						sizeBytes: logo.size,
						uploadedBy: account.id
					})
					.returning();
				logoFileId = fileRecord.id;
			}

			// Update bloc
			await db
				.update(blocs)
				.set({
					name,
					color,
					description: description || null,
					logo: logoFileId,
					visaFreeForMembers: visaFreeForMembers ?? false,
					defenceSpendingGuideline: guideline
				})
				.where(eq(blocs.id, blocId));

			return message(form, "Bloc updated successfully");
		} catch (e) {
			console.error("Error updating bloc:", e);
			return message(form, "Failed to update bloc", { status: 500 });
		}
	},

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
	},
	declareEmbargo: async ({ request, params, locals }) => {
		const account = locals.account!;
		const blocId = Number(params.id);
		const form = await request.formData();
		const targetStateId = Number(form.get("targetStateId"));
		const reason = String(form.get("reason") ?? "").trim();
		if (!Number.isInteger(targetStateId) || targetStateId <= 0)
			return fail(400, { error: "Choose a state to embargo" });
		if (!reason) return fail(400, { error: "Give a reason for the embargo" });

		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, blocId));
		if (!bloc) return fail(404, { error: "Bloc not found" });
		const [leader] = await db.select().from(blocLeaders).where(eq(blocLeaders.blocId, blocId));
		const [memberPresident] = await db
			.select({ id: presidents.id })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(and(eq(states.blocId, blocId), eq(presidents.userId, account.id)))
			.limit(1);
		if (leader?.userId !== account.id && !memberPresident)
			return fail(403, { error: "Only bloc leaders can declare embargoes" });
		const [target] = await db
			.select({ id: states.id, blocId: states.blocId })
			.from(states)
			.where(eq(states.id, targetStateId));
		if (!target || target.blocId === blocId) return fail(400, { error: "You cannot embargo a member state" });

		await db
			.insert(blocEmbargoes)
			.values({ blocId, targetStateId, declaredBy: account.id, reason: reason.slice(0, 500) })
			.onConflictDoUpdate({
				target: [blocEmbargoes.blocId, blocEmbargoes.targetStateId],
				set: { reason: reason.slice(0, 500), declaredBy: account.id, createdAt: new Date() }
			});
		return { success: true, message: "Embargo declared" };
	},
	liftEmbargo: async ({ request, params, locals }) => {
		const account = locals.account!;
		const blocId = Number(params.id);
		const form = await request.formData();
		const embargoId = Number(form.get("embargoId"));
		const [leader] = await db.select().from(blocLeaders).where(eq(blocLeaders.blocId, blocId));
		if (leader?.userId !== account.id) return fail(403, { error: "Only the bloc leader can lift embargoes" });
		await db.delete(blocEmbargoes).where(and(eq(blocEmbargoes.id, embargoId), eq(blocEmbargoes.blocId, blocId)));
		return { success: true, message: "Embargo lifted" };
	}
};
