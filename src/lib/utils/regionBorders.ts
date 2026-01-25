// src/lib/utils/regionBorders.ts
import { db } from "$lib/server/db";
import { regionBorders, regions } from "$lib/server/schema";
import { eq, or, and, sql, inArray } from "drizzle-orm";
import { getRegionName } from "$lib/utils/formatting";

/**
 * Get all regions that border a given region
 */
export async function getBorderingRegions(regionId: number): Promise<Array<{ id: number; distanceKm: number }>> {
	// Since we store borders in both directions (region_id < neighbor_id),
	// we need to query both ways
	const borders = await db
		.select({
			neighborId: sql<number>`CASE 
        WHEN ${regionBorders.regionId} = ${regionId} THEN ${regionBorders.neighborId}
        ELSE ${regionBorders.regionId}
      END`.as("neighbor_id"),
			distanceKm: regionBorders.distanceKm
		})
		.from(regionBorders)
		.where(or(eq(regionBorders.regionId, regionId), eq(regionBorders.neighborId, regionId)));

	return borders.map((b) => ({
		id: b.neighborId,
		distanceKm: Number(b.distanceKm)
	}));
}

/**
 * Check if two regions share a border
 */
export async function areRegionsAdjacent(regionId1: number, regionId2: number): Promise<boolean> {
	const [smaller, larger] = regionId1 < regionId2 ? [regionId1, regionId2] : [regionId2, regionId1];

	const border = await db.query.regionBorders.findFirst({
		where: and(eq(regionBorders.regionId, smaller), eq(regionBorders.neighborId, larger))
	});

	return !!border;
}

/**
 * Get distance between two regions if they share a border
 */
export async function getBorderDistance(regionId1: number, regionId2: number): Promise<number | null> {
	const [smaller, larger] = regionId1 < regionId2 ? [regionId1, regionId2] : [regionId2, regionId1];

	const border = await db.query.regionBorders.findFirst({
		where: and(eq(regionBorders.regionId, smaller), eq(regionBorders.neighborId, larger))
	});

	return border ? Number(border.distanceKm) : null;
}

/**
 * Get all regions belonging to a state that border a target region
 */
export async function getStateBorderingRegions(
	stateId: number,
	targetRegionId: number
): Promise<Array<{ id: number; name: string; distanceKm: number }>> {
	// Get all regions of the state
	const stateRegions = await db.query.regions.findMany({
		where: eq(regions.stateId, stateId)
	});

	if (stateRegions.length === 0) {
		return [];
	}

	const stateRegionIds = stateRegions.map((r) => r.id);

	// Get borders where one side is the target and the other is in the state
	// We need to check both directions since borders are stored with smaller ID first
	const borders = await db
		.select({
			regionId: regionBorders.regionId,
			neighborId: regionBorders.neighborId,
			distanceKm: regionBorders.distanceKm
		})
		.from(regionBorders)
		.where(
			or(
				// Target region is on the left side, state region is on the right
				and(eq(regionBorders.regionId, targetRegionId), inArray(regionBorders.neighborId, stateRegionIds)),
				// Target region is on the right side, state region is on the left
				and(eq(regionBorders.neighborId, targetRegionId), inArray(regionBorders.regionId, stateRegionIds))
			)
		);

	// Map to region details
	const result: Array<{ id: number; name: string; distanceKm: number }> = [];

	for (const border of borders) {
		// Determine which region ID is the state's region
		const stateRegionId = border.regionId === targetRegionId ? border.neighborId : border.regionId;

		// Find the region details
		const region = stateRegions.find((r) => r.id === stateRegionId);

		if (region) {
			result.push({
				id: region.id,
				name: getRegionName(region.id),
				distanceKm: Number(border.distanceKm)
			});
		}
	}

	return result;
}

/**
 * Calculate distance between any two regions (not just adjacent)
 * Uses Haversine formula for great-circle distance
 */
export function calculateDirectDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/**
 * Get distance between any two regions
 * First checks if they share a border for exact distance,
 * otherwise calculates direct distance
 */
export async function getDistanceBetweenRegions(regionId1: number, regionId2: number): Promise<number | null> {
	// First try to get border distance if they're adjacent
	const borderDistance = await getBorderDistance(regionId1, regionId2);
	if (borderDistance) {
		return borderDistance;
	}

	// Otherwise calculate direct distance
	const region1 = await db.query.regions.findFirst({
		where: eq(regions.id, regionId1)
	});
	const region2 = await db.query.regions.findFirst({
		where: eq(regions.id, regionId2)
	});

	if (!region1?.latitude || !region1?.longitude || !region2?.latitude || !region2?.longitude) {
		return null;
	}

	return calculateDirectDistance(
		Number(region1.latitude),
		Number(region1.longitude),
		Number(region2.latitude),
		Number(region2.longitude)
	);
}

/**
 * Calculate travel cost based on distance
 * Base cost: $100 per 100km
 */
export function calculateTravelCost(distanceKm: number): number {
	const baseCostPer100km = 100;
	return Math.ceil((distanceKm / 100) * baseCostPer100km);
}

/**
 * Calculate travel time based on distance
 * Base time: 1 hour per 100km
 */
export function calculateTravelTime(distanceKm: number): number {
	const hoursPerKm = 1 / 100; // 1 hour per 100km
	return Math.ceil(distanceKm * hoursPerKm);
}
