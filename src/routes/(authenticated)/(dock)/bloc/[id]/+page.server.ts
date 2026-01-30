// src/routes/bloc/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, presidents, blocActionCooldowns } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

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

	// Get bloc leader (first president of member states, or you can implement specific leader logic)
	const blocLeader = memberStates.find((s) => s.presidentUserId)?.presidentUserId || null;

	// Check if current user is the bloc leader
	const isLeader = locals.account?.id === blocLeader;

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
		memberStates: memberStates.map((state) => ({
			id: state.id,
			name: state.name,
			logo: state.logo,
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
		})),

		totalPopulation,
		totalStates,
		isLeader,
		blocLeaderId: blocLeader
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
			return fail(400, { error: "Your state is already in a bloc" });
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
			.select({ stateId: presidents.stateId })
			.from(presidents)
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { error: "Only state presidents can leave blocs" });
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
				return fail(429, { error: `Wait ${hoursLeft}h` });
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
