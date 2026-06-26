import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { regions, residences, states } from "$lib/server/schema";
import { eq, sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";

async function getLocationFromIP(
	ip: string
): Promise<{ country: string; city: string; latitude: number; longitude: number } | null> {
	try {
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
	} catch (e) {
		console.error("Failed to get location:", e);
	}
	return null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export const GET: RequestHandler = async ({ locals, getClientAddress }) => {
	if (!locals.account) {
		throw error(401, "Unauthorized");
	}

	const clientIP = getClientAddress();
	const userLocation = await getLocationFromIP(clientIP);

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

	const stateIds = [...new Set(allRegions.map((r) => r.stateId).filter(Boolean))] as number[];
	const statesData =
		stateIds.length > 0
			? await db
					.select({ id: states.id, name: states.name })
					.from(states)
					.where(
						sql`${states.id} IN (${sql.join(
							stateIds.map((id) => sql`${id}`),
							sql`, `
						)})`
					)
			: [];

	const stateMap = new Map(statesData.map((s) => [s.id, s]));

	const regionsWithStates = allRegions.map((region) => ({
		id: region.id,
		stateId: region.stateId,
		latitude: region.latitude,
		longitude: region.longitude,
		populationCount: region.populationCount,
		state: region.stateId ? stateMap.get(region.stateId) || null : null
	}));

	let nearbyRegions;

	if (userLocation && userLocation.latitude && userLocation.longitude) {
		const regionsWithDistance = regionsWithStates.map((region) => ({
			...region,
			distanceKm: Math.round(
				calculateDistance(
					userLocation.latitude,
					userLocation.longitude,
					parseFloat(region.latitude),
					parseFloat(region.longitude)
				)
			)
		}));
		nearbyRegions = regionsWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0)).slice(0, 5);
	} else {
		nearbyRegions = regionsWithStates
			.sort((a, b) => a.populationCount - b.populationCount)
			.slice(0, 5)
			.map((r) => ({ ...r, distanceKm: null }));
	}

	return json({ regions: nearbyRegions, userLocation });
};
