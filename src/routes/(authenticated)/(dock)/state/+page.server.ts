// src/routes/(authenticated)/(dock)/state/[id]/region/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, factories, powerPlants, states } from "$lib/server/schema";
import { sql, eq, ilike, or, desc, asc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
	const account = locals.account!;

	// Get query parameters
	const search = url.searchParams.get("search") || "";
	const sortBy = url.searchParams.get("sort") || "rating";

	// Build base query
	let query = db
		.select({
			id: regions.id,
			rating: regions.rating,
			infrastructure: regions.infrastructure,
			economy: regions.economy,
			education: regions.education,
			hospitals: regions.hospitals,
			fortifications: regions.fortifications,
			oil: regions.oil,
			aluminium: regions.aluminium,
			rubber: regions.rubber,
			tungsten: regions.tungsten,
			steel: regions.steel,
			chromium: regions.chromium,
			stateId: regions.stateId,
			stateName: states.name,
			stateColor: states.avatar,
			createdAt: regions.createdAt
		})
		.from(regions)
		.leftJoin(states, eq(regions.stateId, states.id));

	// Apply sorting
	const sortColumn =
		{
			rating: regions.rating,
			population: sql<number>`(SELECT COUNT(*)::int FROM ${residences} WHERE ${residences.regionId} = ${regions.id})`,
			infrastructure: regions.infrastructure,
			economy: regions.economy,
			education: regions.education,
			hospitals: regions.hospitals,
			fortifications: regions.fortifications,
			oil: regions.oil,
			aluminium: regions.aluminium,
			rubber: regions.rubber,
			tungsten: regions.tungsten,
			steel: regions.steel,
			chromium: regions.chromium
		}[sortBy] || regions.rating;

	// Get all regions with stats
	const allRegions = await query;

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
	let regionsWithStats = allRegions.map((r) => ({
		...r,
		population: populationMap.get(r.id) || 0,
		factoryCount: factoryMap.get(r.id) || 0
	}));

	// Apply search filter if provided
	if (search) {
		const searchLower = search.toLowerCase();
		regionsWithStats = regionsWithStats.filter((r) => `region_${r.id}`.toLowerCase().includes(searchLower));
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
			case "oil":
				aVal = a.oil || 0;
				bVal = b.oil || 0;
				break;
			case "aluminium":
				aVal = a.aluminium || 0;
				bVal = b.aluminium || 0;
				break;
			case "rubber":
				aVal = a.rubber || 0;
				bVal = b.rubber || 0;
				break;
			case "tungsten":
				aVal = a.tungsten || 0;
				bVal = b.tungsten || 0;
				break;
			case "steel":
				aVal = a.steel || 0;
				bVal = b.steel || 0;
				break;
			case "chromium":
				aVal = a.chromium || 0;
				bVal = b.chromium || 0;
				break;
			default:
				aVal = a.rating || 0;
				bVal = b.rating || 0;
		}

		return bVal - aVal;
	});

	// Get user's residences
	const userResidences = await db.query.residences.findMany({
		where: eq(residences.userId, account.id)
	});

	const userRegionIds = new Set(userResidences.map((r) => r.regionId));

	return {
		regions: regionsWithStats,
		userRegionIds: Array.from(userRegionIds),
		search,
		sortBy
	};
};
