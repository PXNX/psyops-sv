import { describe, expect, it } from "@rstest/core";
import { existsSync, readFileSync } from "fs";
import { parsePath, polygonArea, readShapes, shapeCentroid } from "./geometry";
import { fitProjection, haversineKm, project } from "./projection";

const dir = `${process.cwd()}/tools/map`;

describe("parsePath", () => {
	it("reads absolute and relative lines into a closed square", () => {
		const [square] = parsePath("M0 0 L10 0 l0 10 h-10 z");
		expect(Math.abs(polygonArea(square!))).toBe(100);
		expect(shapeCentroid([square!])).toMatchObject({ x: 5, y: 5, area: 100 });
	});

	it("reads arc flags written without separators", () => {
		// Half circle of radius 5 from (0,0) to (10,0), flags packed as "01".
		const [half] = parsePath("M0 0a5 5 0 0110 0z", 32);
		expect(Math.abs(polygonArea(half!))).toBeCloseTo((Math.PI * 25) / 2, 0);
	});

	it("keeps separate subpaths apart", () => {
		expect(parsePath("M0 0h1v1h-1z M5 5h1v1h-1z")).toHaveLength(2);
	});
});

describe("projection", () => {
	it("recovers a known linear map and ignores bad reference points", () => {
		const truth = (x: number, y: number) => ({ lat: 80 - y * 0.25, lon: -180 + x * 0.25 });
		const refs = [];
		for (let x = 50; x < 1400; x += 90) for (let y = 40; y < 600; y += 70) refs.push({ x, y, ...truth(x, y) });
		refs.push({ x: 700, y: 300, lat: -60, lon: 120 }); // a wrongly geocoded region
		const p = fitProjection(refs);
		const got = project(p, 733, 180);
		const want = truth(733, 180);
		expect(haversineKm(got.lat, got.lon, want.lat, want.lon)).toBeLessThan(1);
	});
});

describe("map data stays consistent", () => {
	const registry = JSON.parse(readFileSync(`${dir}/regions.json`, "utf8")) as {
		regions: { id: number; shape: string; name: string }[];
		impassable: string[];
	};
	const source = readShapes(readFileSync(`${dir}/worldmap.svg`, "utf8"));
	const app = readShapes(readFileSync(`${process.cwd()}/src/lib/assets/worldmap3.svg`, "utf8"));

	it("gives every shape a region (or marks it impassable), and every region a shape", () => {
		const assigned = new Set(registry.regions.map((r) => r.shape));
		const orphanShapes = [...source.keys()].filter((s) => !assigned.has(s) && !registry.impassable.includes(s));
		expect(orphanShapes).toEqual([]);
		expect(registry.regions.filter((r) => !source.has(r.shape))).toEqual([]);
		expect(new Set(registry.regions.map((r) => r.id)).size).toBe(registry.regions.length);
	});

	it("renders the app map with one shape per region id", () => {
		for (const r of registry.regions) expect(app.has(String(r.id)), `region ${r.id} missing on app map`).toBe(true);
	});

	it("has a name and a coat of arms for every region", () => {
		const en = JSON.parse(readFileSync(`${process.cwd()}/messages/en.json`, "utf8"));
		expect(registry.regions.filter((r) => !en[`region_${r.id}`]).map((r) => r.id)).toEqual([]);
		expect(
			registry.regions.filter((r) => !existsSync(`${process.cwd()}/static/coats/${r.id}.webp`)).map((r) => r.id)
		).toEqual([]);
	});

	it("connects every region (no region unreachable by border)", () => {
		const borders = JSON.parse(readFileSync(`${dir}/data/borders.json`, "utf8")) as {
			regionId: number;
			neighborId: number;
		}[];
		const adj = new Map<number, number[]>();
		for (const b of borders) {
			adj.set(b.regionId, [...(adj.get(b.regionId) ?? []), b.neighborId]);
			adj.set(b.neighborId, [...(adj.get(b.neighborId) ?? []), b.regionId]);
		}
		const seen = new Set([registry.regions[0]!.id]);
		const queue = [registry.regions[0]!.id];
		while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!seen.has(n) && seen.add(n)) queue.push(n);
		expect(seen.size).toBe(registry.regions.length);
	});
});
