// src/routes/(authenticated)/welcome/region/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, states, userProfiles, files } from "$lib/server/schema";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { fail, redirect } from "@sveltejs/kit";

// Enhanced IP geolocation with coordinates
async function getLocationFromIP(ip: string): Promise<{
	country: string;
	city: string;
	latitude: number;
	longitude: number;
} | null> {
	try {
		// Using ip-api.com with extended fields including coordinates
		const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`);
		const data = await response.json();

		if (data.status === "success") {
			return {
				country: data.country || "Unknown",
				city: data.city || "Unknown",
				latitude: data.lat || 0,
				longitude: data.lon || 0
			};
		}
	} catch (error) {
		console.error("Failed to get location:", error);
	}
	return null;
}

// Haversine formula to calculate distance between two points on Earth
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;

	return distance;
}

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

interface RegionWithPopulation {
	id: number;
	stateId: number | null;
	latitude: string;
	longitude: string;
	populationCount: number;
	distanceKm?: number;
	state: {
		id: number;
		name: string;
		logo: string | null;
	} | null;
}

export const load: PageServerLoad = async ({ locals, getClientAddress }) => {
	const account = locals.account!;

	// Check if user already has a residence - redirect if they do
	const existingResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	if (existingResidence) {
		throw redirect(303, `/region/${existingResidence.regionId}`);
	}

	const clientIP = getClientAddress();

	// Get user location based on IP
	const userLocation = await getLocationFromIP(clientIP);

	// Get all regions with their population count and coordinates
	const allRegions = await db
		.select({
			id: regions.id,
			stateId: regions.stateId,
			latitude: regions.latitude,
			longitude: regions.longitude,
			populationCount: sql<number>`CAST(COUNT(DISTINCT ${residences.userId}) AS INTEGER)`.as("populationCount")
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.groupBy(regions.id, regions.latitude, regions.longitude);

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

	// Calculate distances and find nearest regions if user location is available
	let nearbyRegions: RegionWithPopulation[] = [];

	if (userLocation && userLocation.latitude && userLocation.longitude) {
		// Calculate distance for each region
		const regionsWithDistance = regionsWithStates.map((region) => {
			const regionLat = parseFloat(region.latitude);
			const regionLon = parseFloat(region.longitude);

			const distance = calculateDistance(userLocation.latitude, userLocation.longitude, regionLat, regionLon);

			return {
				...region,
				distanceKm: Math.round(distance)
			};
		});

		// Sort by distance and get the 5 closest regions
		nearbyRegions = regionsWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)).slice(0, 5);
	} else {
		// Fallback: just show regions with lowest population
		nearbyRegions = regionsWithStates.sort((a, b) => a.populationCount - b.populationCount).slice(0, 5);
	}

	return {
		regions: regionsWithStates,
		nearbyRegions,
		userLocation
	};
};

export const actions: Actions = {
	selectRegion: async ({ locals, request, url }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const regionId = parseInt(formData.get("regionId") as string);

		if (!regionId || isNaN(regionId)) {
			return fail(400, { error: "Invalid region selected" });
		}

		// Verify the region exists
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, regionId)
		});

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		// Check if user already has a residence - they shouldn't be here if they do
		const existingResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		});

		if (existingResidence) {
			throw redirect(303, `/region/${existingResidence.regionId}`);
		}

		// Create new residence
		await db.insert(residences).values({
			userId: account.id,
			regionId: regionId,
			movedInAt: new Date()
		});

		// Always redirect to dashboard after setting residence
		throw redirect(303, "/");
	}
};
