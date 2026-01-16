// src/routes/(authenticated)/(dock)/bloc/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, regions, residences, presidents, blocActionCooldowns } from "$lib/server/schema";
import { sql, eq, like, or } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "members";

	// Get all blocs
	let blocsQuery = db
		.select({
			id: blocs.id,
			name: blocs.name,
			color: blocs.color,
			description: blocs.description,
			createdAt: blocs.createdAt
		})
		.from(blocs);

	const allBlocs = await blocsQuery;

	// Get member counts for each bloc
	const memberCounts = await db
		.select({
			blocId: states.blocId,
			count: sql<number>`count(*)::int`
		})
		.from(states)
		.where(sql`${states.blocId} IS NOT NULL`)
		.groupBy(states.blocId);

	const memberCountMap = new Map(memberCounts.map((m) => [m.blocId, m.count]));

	// Get total population for each bloc
	const blocPopulations = await db
		.select({
			blocId: states.blocId,
			totalPopulation: sql<number>`count(${residences.id})::int`
		})
		.from(states)
		.innerJoin(regions, eq(regions.stateId, states.id))
		.innerJoin(residences, eq(residences.regionId, regions.id))
		.where(sql`${states.blocId} IS NOT NULL`)
		.groupBy(states.blocId);

	const populationMap = new Map(blocPopulations.map((p) => [p.blocId, p.totalPopulation]));

	// Check if user is a president
	const [userPresidency] = await db
		.select({
			stateId: presidents.stateId,
			stateName: states.name,
			blocId: states.blocId
		})
		.from(presidents)
		.innerJoin(states, eq(presidents.stateId, states.id))
		.where(eq(presidents.userId, account.id))
		.limit(1);

	// Combine data
	let blocsWithStats = allBlocs.map((b) => ({
		...b,
		memberCount: memberCountMap.get(b.id) || 0,
		totalPopulation: populationMap.get(b.id) || 0,
		isUserMember: userPresidency?.blocId === b.id
	}));

	// Apply search filter
	if (search) {
		const searchLower = search.toLowerCase();
		blocsWithStats = blocsWithStats.filter(
			(b) => b.name.toLowerCase().includes(searchLower) || b.description?.toLowerCase().includes(searchLower)
		);
	}

	// Sort blocs
	blocsWithStats.sort((a, b) => {
		switch (sortBy) {
			case "population":
				return b.totalPopulation - a.totalPopulation;
			case "name":
				return a.name.localeCompare(b.name);
			case "members":
			default:
				return b.memberCount - a.memberCount;
		}
	});

	// User can create bloc if they're a president without a bloc
	const canCreateBloc = !!userPresidency && !userPresidency.blocId;

	return {
		blocs: blocsWithStats,
		userPresidency: userPresidency || null,
		canCreateBloc,
		search,
		sortBy
	};
};

export const actions: Actions = {
	apply: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const blocId = parseInt(formData.get("blocId") as string);

		if (!blocId) {
			return fail(400, { error: "Invalid bloc ID" });
		}

		// Verify bloc exists
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, blocId)).limit(1);

		if (!bloc) {
			return fail(404, { error: "Bloc not found" });
		}

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
				return fail(429, { error: `Wait ${hoursLeft} hours before joining/leaving a bloc` });
			}
		}

		// Join the bloc
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

		// Redirect to the bloc page
		redirect(303, `/bloc/${blocId}`);
	}
};
