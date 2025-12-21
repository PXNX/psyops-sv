// src/routes/(authenticated)/regions/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, states, userProfiles } from "$lib/server/schema";
import { eq, sql, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

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

// Map countries to nearby regions (you'll need to customize this based on your regions)
const COUNTRY_TO_REGION_MAP: Record<string, string[]> = {
	Germany: ["Baden-Württemberg", "Bavaria", "Berlin", "Hamburg"],
	"United States": ["California", "New York", "Texas", "Florida"],
	"United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
	France: ["Île-de-France", "Provence", "Brittany", "Normandy"],
	Spain: ["Catalonia", "Andalusia", "Madrid", "Valencia"],
	Italy: ["Lombardy", "Lazio", "Sicily", "Tuscany"]
	// Add more mappings as needed
};

interface RegionWithPopulation {
	id: number;
	name: string;
	avatar: string | null;
	background: string | null;
	description: string | null;
	stateId: string | null;
	autoApproveResidency: number;
	populationCount: number;
	state: {
		id: string;
		name: string;
		avatar: string | null;
	} | null;
}

export const load: PageServerLoad = async ({ locals, getClientAddress }) => {
	const account = locals.account!;

	// Check if user already has a profile set up
	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	//todo: check if user has a residence set already. if yes, redirect to /

	const clientIP = getClientAddress();

	// Get user location based on IP
	const userLocation = await getLocationFromIP(clientIP);

	// Check if user has a primary residence
	const primaryResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id), eq(residences.isPrimary, 1))
	});

	// Get all regions with their population count (calculated from actual residences)
	const allRegions = await db
		.select({
			id: regions.id,
			name: regions.name,
			avatar: regions.avatar,
			background: regions.background,
			description: regions.description,
			stateId: regions.stateId,
			autoApproveResidency: regions.autoApproveResidency,
			populationCount: sql<number>`CAST(COUNT(DISTINCT ${residences.userId}) AS INTEGER)`.as("populationCount")
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.groupBy(regions.id)
		.orderBy(sql`populationCount ASC`); // Sort by population (low to high)

	// Get state information for regions
	const stateIds = [...new Set(allRegions.map((r) => r.stateId).filter(Boolean))] as string[];
	const statesData =
		stateIds.length > 0
			? await db
					.select({
						id: states.id,
						name: states.name,
						avatar: states.avatar
					})
					.from(states)
					.where(sql`${states.id} IN ${sql.raw(`(${stateIds.map((id) => `'${id}'`).join(",")})`)}`)
			: [];

	const stateMap = new Map(statesData.map((s) => [s.id, s]));

	// Attach state data to regions
	const regionsWithStates: RegionWithPopulation[] = allRegions.map((region) => ({
		...region,
		state: region.stateId ? stateMap.get(region.stateId) || null : null
	}));

	// Determine nearby regions based on user location
	let nearbyRegionNames: string[] = [];
	if (userLocation?.country) {
		nearbyRegionNames = COUNTRY_TO_REGION_MAP[userLocation.country] || [];
	}

	// Filter nearby regions and prioritize them
	const nearbyRegions = regionsWithStates
		.filter((r) =>
			nearbyRegionNames.some(
				(name) => r.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(r.name.toLowerCase())
			)
		)
		.sort((a, b) => a.populationCount - b.populationCount) // Prioritize low population
		.slice(0, 6); // Limit to 6 nearby regions

	return {
		regions: regionsWithStates,
		nearbyRegions,
		userLocation,
		hasPrimaryResidence: !!primaryResidence
	};
};
