// src/lib/utils/travel.ts

export interface RegionCenter {
	x: number;
	y: number;
}

// Hardcoded region centers (you'll need to populate these with actual coordinates)
const REGION_CENTERS: Record<number, RegionCenter> = {
	1: { x: 1000, y: 500 },
	2: { x: 1200, y: 600 }
	// Add all your region coordinates here
	// You can extract these from your SVG map
};

/**
 * Get the center coordinates of a region
 */
export function getRegionCenter(regionId: number): RegionCenter | null {
	return REGION_CENTERS[regionId] || null;
}

/**
 * Calculate distance between two points in kilometers
 * Using Euclidean distance scaled to approximate real-world distance
 */
export function calculateDistance(from: RegionCenter, to: RegionCenter): number {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const pixels = Math.sqrt(dx * dx + dy * dy);

	// Scale factor: adjust based on your map (approximate)
	// Assuming ~5632px = ~40,000km (Earth's circumference)
	const kmPerPixel = 40000 / 5632;
	return pixels * kmPerPixel;
}

/**
 * Calculate travel duration in minutes based on distance
 * Base speed: ~800 km/h (commercial flight speed)
 */
export function calculateTravelDuration(distanceKm: number): number {
	const speedKmPerHour = 800;
	const hours = distanceKm / speedKmPerHour;
	return Math.ceil(hours * 60); // Return minutes, minimum 1 minute
}

/**
 * Calculate current travel progress (0-1)
 */
export function calculateTravelProgress(departureTime: Date, arrivalTime: Date): number {
	const now = Date.now();
	const departure = departureTime.getTime();
	const arrival = arrivalTime.getTime();

	if (now >= arrival) return 1;
	if (now <= departure) return 0;

	const progress = (now - departure) / (arrival - departure);
	return Math.max(0, Math.min(1, progress));
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;

	if (mins === 0) {
		return `${hours}h`;
	}

	return `${hours}h ${mins}m`;
}

/**
 * Get time remaining in minutes
 */
export function getTimeRemaining(arrivalTime: Date): number {
	const now = Date.now();
	const arrival = arrivalTime.getTime();
	const remaining = arrival - now;

	if (remaining <= 0) return 0;
	return Math.ceil(remaining / 60000); // Convert to minutes
}
