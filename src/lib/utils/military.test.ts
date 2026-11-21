// The world-map projection must round-trip: hex centres and ports are placed
// by lat/lon, so the inverse fit has to land back on the same map pixel.
import { describe, expect, it } from "@rstest/core";
import { latLonToMap, mapToLatLon } from "./military.js";
import { hexFromLatLon, hexToLatLon, hexPolygonLatLon, inBounds } from "#lib/config/index.js";

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
