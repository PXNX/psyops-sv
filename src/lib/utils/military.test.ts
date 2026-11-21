// The world-map projection must round-trip: hex centres and ports are placed
// by lat/lon, so the inverse fit has to land back on the same map pixel.
import { describe, expect, it } from "@rstest/core";
import { EXERCISE_CONFIG, gainCombatExperience, getExperienceCombatModifier, unitFuelFactor } from "#lib/config/index.js";
import { latLonToMap, mapToLatLon } from "./military.js";
import {
	AIRSPACE,
	airspaceSectorOf,
	airspaceSectors,
	hexFromLatLon,
	hexToLatLon,
	hexPolygonLatLon,
	inBounds
} from "#lib/config/index.js";

describe("world-map projection", () => {
	it("inverts mapToLatLon to within a map pixel", () => {
		for (const [x, y] of [
			[700, 300],
			[200, 150],
			[1200, 480],
			[350, 420]
		]) {
			const { lat, lon } = mapToLatLon(x, y);
			const back = latLonToMap(lat, lon);
			expect(back.x).toBeCloseTo(x, 0);
			expect(back.y).toBeCloseTo(y, 0);
		}
	});

	it("rewards combat experience and punishes dry tanks", () => {
		expect(gainCombatExperience(0, 50)).toBe(EXERCISE_CONFIG.COMBAT_EXPERIENCE_GAIN);
		expect(gainCombatExperience(99, 10)).toBe(EXERCISE_CONFIG.MAX_COMBAT_EXPERIENCE);
		expect(getExperienceCombatModifier(80)).toBeGreaterThan(getExperienceCombatModifier(0));
		expect(unitFuelFactor(0)).toBeLessThan(unitFuelFactor(100));
	});

	it("groups hexes into Luftraum sectors", () => {
		const sectors = airspaceSectors();
		expect(sectors).toHaveLength(AIRSPACE.cols * AIRSPACE.rows);
		expect(sectors.every((s) => s.hexes.length > 0)).toBe(true);
		expect(new Set(sectors.map((s) => s.id)).size).toBe(sectors.length);
		expect(airspaceSectorOf({ q: 0, r: 0 })).toBe("LR-A1");
	});

	it("places hex centres in bounds and back on their own hex", () => {
		for (const hex of [
			{ q: 0, r: 0 },
			{ q: 15, r: 10 },
			{ q: 8, r: 3 }
		]) {
			const { lat, lon } = hexToLatLon(hex);
			expect(inBounds(hexFromLatLon(lat, lon))).toBe(true);
			expect(hexFromLatLon(lat, lon)).toEqual(hex);
			const corners = hexPolygonLatLon(hex);
			expect(corners).toHaveLength(6);
			for (const corner of corners) expect(Number.isFinite(latLonToMap(corner.lat, corner.lon).x)).toBe(true);
		}
	});
});
