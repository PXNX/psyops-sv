// src/routes/(authenticated)/(dock)/bloc/+page.server.ts
import { db } from "#lib/server/db.js";
import { blocs, states, regions, residences, presidents, blocApplications } from "#lib/server/schema.js";
import { sql, eq, and } from "drizzle-orm";
import { applyToBloc } from "#lib/server/service/blocApplication.js";
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "members";

	// All queries are independent, so run them in parallel
	const [allBlocs, memberCounts, blocPopulations, [userPresidency]] = await Promise.all([
		// Get all blocs
		db
			.select({
				id: blocs.id,
				name: blocs.name,
				color: blocs.color,
				description: blocs.description,
				createdAt: blocs.createdAt
			})
			.from(blocs),
		// Get member counts for each bloc
		db
			.select({
				blocId: states.blocId,
				count: sql<number>`count(*)::int`
			})
			.from(states)
			.where(sql`${states.blocId} IS NOT NULL`)
			.groupBy(states.blocId),
		// Get total population for each bloc
		db
			.select({
				blocId: states.blocId,
				totalPopulation: sql<number>`count(${residences.id})::int`
			})
			.from(states)
			.innerJoin(regions, eq(regions.stateId, states.id))
			.innerJoin(residences, eq(residences.regionId, regions.id))
			.where(sql`${states.blocId} IS NOT NULL`)
			.groupBy(states.blocId),
		// Check if user is a president
		db
			.select({
				stateId: presidents.stateId,
				stateName: states.name,
				blocId: states.blocId
			})
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1)
	]);

	// Open application of the user's state, if any
	const [pendingApplication] =
		userPresidency && !userPresidency.blocId
			? await db
					.select({ blocId: blocApplications.blocId })
					.from(blocApplications)
					.where(and(eq(blocApplications.stateId, userPresidency.stateId), eq(blocApplications.status, "pending")))
					.limit(1)
			: [];

	const memberCountMap = new Map(memberCounts.map((m) => [m.blocId, m.count]));
	const populationMap = new Map(blocPopulations.map((p) => [p.blocId, p.totalPopulation]));

	// Combine data
	let blocsWithStats = allBlocs.map((b) => ({
		...b,
		memberCount: memberCountMap.get(b.id) || 0,
		totalPopulation: populationMap.get(b.id) || 0,
		isUserMember: userPresidency?.blocId === b.id,
		isPendingApplication: pendingApplication?.blocId === b.id
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
		pendingApplicationBlocId: pendingApplication?.blocId ?? null,
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

		// Member states vote on the application; empty blocs admit immediately
		const result = await applyToBloc(account.id, blocId);
		if ("error" in result) {
			return fail(result.status, { error: result.error });
		}

		// Redirect to the bloc page
		redirect(303, `/bloc/${blocId}`);
	}
};
