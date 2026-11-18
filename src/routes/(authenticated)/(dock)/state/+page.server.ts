// src/routes/(authenticated)/(dock)/state/+page.server.ts
import { db } from "#lib/server/db.js";
import { states, residences, regions, blocs, presidents, userProfiles } from "#lib/server/schema.js";
import { sql, eq } from "drizzle-orm";
import { getLogoUrl } from "#lib/server/backblaze.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "rating";

	// States, population counts and the user's residence are independent, so fetch them in parallel
	const [allStates, populationCounts, userResidence] = await Promise.all([
		// Get all states
		db
			.select({
				id: states.id,
				name: states.name,
				logo: states.logo,
				background: states.background,
				description: states.description,
				population: states.population,
				rating: states.rating,
				blocId: states.blocId,
				createdAt: states.createdAt
			})
			.from(states),
		// Get population counts for all states (count residences in regions belonging to each state)
		db
			.select({
				stateId: regions.stateId,
				count: sql<number>`count(*)::int`
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(sql`${regions.stateId} IS NOT NULL`)
			.groupBy(regions.stateId),
		// Get user's residence to determine which state they're in
		db
			.select({
				regionId: residences.regionId,
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1)
	]);

	// Atlas details: regions per state, bloc colours and heads of state.
	const [regionCounts, blocRows, presidentRows] = await Promise.all([
		db
			.select({ stateId: regions.stateId, count: sql<number>`count(*)::int` })
			.from(regions)
			.where(sql`${regions.stateId} IS NOT NULL`)
			.groupBy(regions.stateId),
		db.select({ id: blocs.id, name: blocs.name, color: blocs.color }).from(blocs),
		db
			.select({
				stateId: presidents.stateId,
				userId: presidents.userId,
				name: userProfiles.name,
				logo: userProfiles.logo
			})
			.from(presidents)
			.leftJoin(userProfiles, eq(userProfiles.accountId, presidents.userId))
	]);
	const regionCountMap = new Map(regionCounts.map((r) => [r.stateId, r.count]));
	const blocMap = new Map(blocRows.map((b) => [b.id, b]));
	const presidentMap = new Map(presidentRows.map((p) => [p.stateId, p]));

	const populationMap = new Map(populationCounts.map((p) => [p.stateId, p.count]));

	// Combine data and apply search filter
	let statesWithStats = await Promise.all(
		allStates.map(async (s) => ({
			...s,
			logo: await getLogoUrl(s.logo),
			population: populationMap.get(s.id) || 0,
			stateColor: s.background, // Map background to stateColor for the frontend
			regionCount: regionCountMap.get(s.id) || 0,
			bloc: s.blocId ? (blocMap.get(s.blocId) ?? null) : null,
			president: await (async () => {
				const p = presidentMap.get(s.id);
				return p ? { id: p.userId, name: p.name ?? "Unknown", avatar: await getLogoUrl(p.logo) } : null;
			})()
		}))
	);

	// Apply search filter if provided
	if (search) {
		const searchLower = search.toLowerCase();
		statesWithStats = statesWithStats.filter((s) => s.name.toLowerCase().includes(searchLower));
	}

	// Sort states
	statesWithStats.sort((a, b) => {
		let aVal: number, bVal: number;

		switch (sortBy) {
			case "population":
				aVal = a.population;
				bVal = b.population;
				break;
			case "rating":
			default:
				aVal = a.rating || 0;
				bVal = b.rating || 0;
		}

		return bVal - aVal;
	});

	const userStateId = userResidence[0]?.stateId;

	return {
		regions: statesWithStats, // Keep the name 'regions' for frontend compatibility
		userRegionIds: userStateId ? [userStateId] : [],
		search,
		sortBy
	};
};
