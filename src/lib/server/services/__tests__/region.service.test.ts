import { describe, it, expect } from "@rstest/core";

// Pure logic from RegionService (no database required)

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function calculateDirectDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateTravelCost(distanceKm: number): number {
    const baseCostPer100km = 100;
    return Math.ceil((distanceKm / 100) * baseCostPer100km);
}

function calculateTravelTime(distanceKm: number): number {
    const hoursPerKm = 1 / 100; // 1 hour per 100km
    return Math.ceil(distanceKm * hoursPerKm);
}

describe("RegionService - Distance Calculation (Haversine)", () => {
    it("should calculate distance between Paris and Berlin", () => {
        // Paris: 48.8566, 2.3522
        // Berlin: 52.5200, 13.4050
        const distance = calculateDirectDistance(
            48.8566,
            2.3522,
            52.52,
            13.405,
        );
        // Expected: ~878 km
        expect(distance).toBeGreaterThan(870);
        expect(distance).toBeLessThan(890);
    });

    it("should calculate distance between Moscow and Prague", () => {
        // Moscow: 55.7558, 37.6173
        // Prague: 50.0755, 14.4378
        const distance = calculateDirectDistance(
            55.7558,
            37.6173,
            50.0755,
            14.4378,
        );
        // Expected: ~1664 km
        expect(distance).toBeGreaterThan(1650);
        expect(distance).toBeLessThan(1680);
    });

    it("should return 0 for same location", () => {
        const distance = calculateDirectDistance(
            48.8566,
            2.3522,
            48.8566,
            2.3522,
        );
        expect(distance).toBeCloseTo(0, 5);
    });

    it("should handle antipodal points", () => {
        // North Pole to South Pole
        const distance = calculateDirectDistance(90, 0, -90, 0);
        // Expected: ~20015 km (half earth circumference)
        expect(distance).toBeGreaterThan(20000);
        expect(distance).toBeLessThan(20100);
    });

    it("should handle crossing the equator", () => {
        const distance = calculateDirectDistance(10, 0, -10, 0);
        // Expected: ~2224 km
        expect(distance).toBeGreaterThan(2200);
        expect(distance).toBeLessThan(2250);
    });

    it("should handle crossing the date line", () => {
        const distance = calculateDirectDistance(0, 179, 0, -179);
        // Expected: ~222 km
        expect(distance).toBeGreaterThan(200);
        expect(distance).toBeLessThan(240);
    });
});

describe("RegionService - Travel Cost", () => {
    it("should calculate cost for 100km", () => {
        expect(calculateTravelCost(100)).toBe(100);
    });

    it("should calculate cost for 500km", () => {
        expect(calculateTravelCost(500)).toBe(500);
    });

    it("should ceil fractional costs", () => {
        expect(calculateTravelCost(150)).toBe(150);
        expect(calculateTravelCost(33)).toBe(33);
        expect(calculateTravelCost(1)).toBe(1);
    });

    it("should return 0 for 0 distance", () => {
        expect(calculateTravelCost(0)).toBe(0);
    });

    it("should handle large distances", () => {
        expect(calculateTravelCost(10000)).toBe(10000);
    });
});

describe("RegionService - Travel Time", () => {
    it("should calculate 1 hour per 100km", () => {
        expect(calculateTravelTime(100)).toBe(1);
    });

    it("should calculate time for 500km", () => {
        expect(calculateTravelTime(500)).toBe(5);
    });

    it("should ceil fractional hours", () => {
        expect(calculateTravelTime(50)).toBe(1); // 0.5 -> 1
        expect(calculateTravelTime(150)).toBe(2); // 1.5 -> 2
    });

    it("should return 0 for 0 distance", () => {
        expect(calculateTravelTime(0)).toBe(0);
    });
});
