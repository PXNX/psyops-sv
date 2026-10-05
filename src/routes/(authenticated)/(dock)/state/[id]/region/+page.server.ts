// src/routes/(authenticated)/(dock)/state/[id]/region/+page.server.ts
import { db } from "#lib/server/db.js";
import { regions, residences, factories, states } from "#lib/server/schema.js";
import { sql, eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getRegionName } from "#lib/utils/formatting.js";

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);

	// All lookups are independent reads, so fetch them in parallel
	const [state, stateRegions, populationCounts, factoryCounts, userResidence] = await Promise.all([
		// Get state info; fail fast if it doesn't exist
		db.query.states
			.findFirst({
				where: eq(states.id, stateId)
			})
			.then((state) => state ?? error(404, "State not found")),
		// Get all regions for this state
		db.query.regions.findMany({
			where: eq(regions.stateId, stateId),
			orderBy: (regions, { desc }) => [desc(regions.rating)]
		}),
		// Get population counts for all regions
		db
			.select({
				regionId: residences.regionId,
				count: sql<number>`count(*)::int`
			})
			.from(residences)
			.groupBy(residences.regionId),
		// Get factory counts
		db
			.select({
				regionId: factories.regionId,
				count: sql<number>`count(*)::int`
			})
			.from(factories)
			.groupBy(factories.regionId),
		// Get user's residence
		db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		})
	]);

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "rating";

	const populationMap = new Map(populationCounts.map((p) => [p.regionId, p.count]));

	const factoryMap = new Map(factoryCounts.map((f) => [f.regionId, f.count]));

	// Combine data and apply search filter
	let regionsWithStats = stateRegions.map((r) => ({
		id: r.id,
		name: getRegionName(r.id),
		rating: r.rating,
		infrastructure: r.infrastructure,
		economy: r.economy,
		education: r.education,
		hospitals: r.hospitals,
		fortifications: r.fortifications,
		oil: r.oil,
		aluminium: r.aluminium,
		rubber: r.rubber,
		tungsten: r.tungsten,
		steel: r.steel,
		chromium: r.chromium,
		population: populationMap.get(r.id) || 0,
		factoryCount: factoryMap.get(r.id) || 0
	}));

	// Apply search filter if provided
	if (search) {
		const searchLower = search.toLowerCase();
		regionsWithStats = regionsWithStats.filter((r) => r.name.toLowerCase().includes(searchLower));
	}

	// Sort regions
	regionsWithStats.sort((a, b) => {
		let aVal: number, bVal: number;

		switch (sortBy) {
			case "population":
				aVal = a.population;
				bVal = b.population;
				break;
			case "infrastructure":
				aVal = a.infrastructure || 0;
				bVal = b.infrastructure || 0;
				break;
			case "economy":
				aVal = a.economy || 0;
				bVal = b.economy || 0;
				break;
			case "education":
				aVal = a.education || 0;
				bVal = b.education || 0;
				break;
			case "hospitals":
				aVal = a.hospitals || 0;
				bVal = b.hospitals || 0;
				break;
			case "fortifications":
				aVal = a.fortifications || 0;
				bVal = b.fortifications || 0;
				break;
			default:
				aVal = a.rating || 0;
				bVal = b.rating || 0;
		}

		return bVal - aVal;
	});

	const userRegionIds = userResidence ? [userResidence.regionId] : [];

	return {
		state: {
			id: state.id,
			name: state.name,
			logo: state.logo
		},
		regions: regionsWithStats,
		userRegionIds,
		search,
		sortBy
	};
};
