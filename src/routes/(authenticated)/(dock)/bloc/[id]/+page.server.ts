// src/routes/bloc/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, presidents, blocActionCooldowns, wars, battles } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, or, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const blocId = parseInt(params.id);

	// Get bloc details
	const [bloc] = await db
		.select({
			id: blocs.id,
			name: blocs.name,
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

	// Get bloc leader (first president of member states, or you can implement specific leader logic)
	const blocLeader = memberStates.find((s) => s.presidentUserId)?.presidentUserId || null;

	// Check if current user is the bloc leader
	const isLeader = locals.account?.id === blocLeader;

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

	// Calculate total population and states
	const totalPopulation = memberStates.reduce((sum, state) => sum + (state.population || 0), 0);
	const totalStates = memberStates.length;

	return {
		bloc: {
			id: bloc.id,
			name: bloc.name,
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

		totalPopulation,
		totalStates,
		isLeader,
		blocLeaderId: blocLeader,
		userState,
		isMember,
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
	}
};
