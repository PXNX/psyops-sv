// src/routes/(authenticated)/(dock)/state/[id]/region/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, factories, states } from "$lib/server/schema";
import { sql, eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getRegionName } from "$lib/utils/formatting";

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);

	// Get state info
	const state = await db.query.states.findFirst({
		where: eq(states.id, stateId)
	});

	if (!state) {
		error(404, "State not found");
	}

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "rating";

	// Get all regions for this state
	const stateRegions = await db.query.regions.findMany({
		where: eq(regions.stateId, stateId),
		orderBy: (regions, { desc }) => [desc(regions.rating)]
	});

	// Get population counts for all regions
	const populationCounts = await db
		.select({
			regionId: residences.regionId,
			count: sql<number>`count(*)::int`
		})
		.from(residences)
		.groupBy(residences.regionId);

	const populationMap = new Map(populationCounts.map((p) => [p.regionId, p.count]));

	// Get factory counts
	const factoryCounts = await db
		.select({
			regionId: factories.regionId,
			count: sql<number>`count(*)::int`
		})
		.from(factories)
		.groupBy(factories.regionId);

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

	// Get user's residence
	const userResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
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
