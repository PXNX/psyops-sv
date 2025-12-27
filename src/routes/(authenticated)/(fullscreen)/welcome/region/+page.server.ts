// src/routes/(authenticated)/welcome/region/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, states, userProfiles, files } from "$lib/server/schema";
import { eq, sql, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

// Simple IP geolocation (you can replace with a proper service)
async function getLocationFromIP(ip: string): Promise<{ country: string; city: string } | null> {
	try {
		// Using ip-api.com (free, no auth required)
		const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
		const data = await response.json();

		if (data.status === "success") {
			return {
				country: data.country || "Unknown",
				city: data.city || "Unknown"
			};
		}
	} catch (error) {
		console.error("Failed to get location:", error);
	}
	return null;
}

// Map countries to nearby region IDs (you'll need to customize this based on your actual region IDs)
const COUNTRY_TO_REGION_IDS: Record<string, number[]> = {
	Germany: [1, 2, 3, 4], // Example region IDs
	"United States": [5, 6, 7, 8],
	"United Kingdom": [9, 10, 11, 12],
	France: [13, 14, 15, 16],
	Spain: [17, 18, 19, 20],
	Italy: [21, 22, 23, 24]
	// Add more mappings as needed
};

interface RegionWithPopulation {
	id: number;
	stateId: number | null;
	populationCount: number;
	state: {
		id: number;
		name: string;
		logo: string | null;
	} | null;
}

export const load: PageServerLoad = async ({ locals, getClientAddress }) => {
	const account = locals.account!;

	// Check if user already has a profile set up
	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	const clientIP = getClientAddress();

	// Get user location based on IP
	const userLocation = await getLocationFromIP(clientIP);

	// Check if user has a primary residence
	const primaryResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	// Get all regions with their population count (calculated from actual residences)
	const allRegions = await db
		.select({
			id: regions.id,
			stateId: regions.stateId,
			populationCount: sql<number>`CAST(COUNT(DISTINCT ${residences.userId}) AS INTEGER)`.as("populationCount")
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.groupBy(regions.id)
		.orderBy(sql`populationCount ASC`); // Sort by population (low to high)

	// Get state information for regions
	const stateIds = [...new Set(allRegions.map((r) => r.stateId).filter(Boolean))] as number[];
	const statesData =
		stateIds.length > 0
			? await db
					.select({
						id: states.id,
						name: states.name,
						logo: states.logo
					})
					.from(states)
					.where(
						sql`${states.id} IN (${sql.join(
							stateIds.map((id) => sql`${id}`),
							sql`, `
						)})`
					)
			: [];

	// Process state logos
	const statesWithLogos = await Promise.all(
		statesData.map(async (state) => {
			let logoUrl: string | null = null;
			if (state.logo) {
				try {
					const logoFile = await db.query.files.findFirst({
						where: eq(files.id, state.logo)
					});
					if (logoFile) {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					}
				} catch (error) {
					console.error("Failed to get logo URL:", error);
				}
			}
			return {
				id: state.id,
				name: state.name,
				logo: logoUrl
			};
		})
	);

	const stateMap = new Map(statesWithLogos.map((s) => [s.id, s]));

	// Attach state data to regions
	const regionsWithStates: RegionWithPopulation[] = allRegions.map((region) => ({
		...region,
		state: region.stateId ? stateMap.get(region.stateId) || null : null
	}));

	// Determine nearby regions based on user location
	let nearbyRegionIds: number[] = [];
	if (userLocation?.country) {
		nearbyRegionIds = COUNTRY_TO_REGION_IDS[userLocation.country] || [];
	}

	// Filter nearby regions and prioritize them
	const nearbyRegions =
		nearbyRegionIds.length > 0
			? regionsWithStates
					.filter((r) => nearbyRegionIds.includes(r.id))
					.sort((a, b) => a.populationCount - b.populationCount) // Prioritize low population
					.slice(0, 6) // Limit to 6 nearby regions
			: regionsWithStates.sort((a, b) => a.populationCount - b.populationCount).slice(0, 6);

	return {
		regions: regionsWithStates,
		nearbyRegions,
		userLocation,
		hasPrimaryResidence: !!primaryResidence
	};
};
