#!/usr/bin/env bun
// tools/map/build.ts: rebuilds everything derived from the map.
//
// Inputs (committed, edit these):
//   tools/map/worldmap.svg    source artwork, shapes named after places
//   tools/map/regions.json    registry: region id ↔ shape ↔ name
//   tools/map/projection.json map → lat/lon calibration (fit-projection.ts)
//
// Outputs:
//   src/lib/assets/worldmap3.svg  map the app renders, shapes renamed to region ids
//   tools/map/data/regions.json   id, name, latitude, longitude per region
//   tools/map/data/borders.json   neighbouring regions with distance in km
//   tools/map/data/deposits.json  initial natural resource deposits per region
//   messages/en.json              region_<id> names (new ones added, existing kept)
//
//   bun tools/map/build.ts
// then load the data into a database with apply-db.ts.
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { densify, parsePath, readShapes, shapeCentroid, type Point } from "./geometry";
import { haversineKm, project, type Projection } from "./projection";
import { generateDeposits } from "./deposits";

const dir = import.meta.dir;
const root = `${dir}/../..`;

interface RegionEntry {
	id: number;
	shape: string;
	name: string;
}
const registry = JSON.parse(readFileSync(`${dir}/regions.json`, "utf8")) as {
	regions: RegionEntry[];
	impassable: string[];
};
const projection = JSON.parse(readFileSync(`${dir}/projection.json`, "utf8")) as Projection;
const sourceSvg = readFileSync(`${dir}/worldmap.svg`, "utf8");
const shapes = readShapes(sourceSvg);

// ── Validate the registry ────────────────────────────────────────────────
const problems: string[] = [];
const seenShapes = new Map<string, number>();
for (const r of registry.regions) {
	if (!shapes.has(r.shape)) problems.push(`region ${r.id}: shape "${r.shape}" is not in worldmap.svg`);
	if (seenShapes.has(r.shape)) problems.push(`shape "${r.shape}" used by ${seenShapes.get(r.shape)} and ${r.id}`);
	seenShapes.set(r.shape, r.id);
	if (!r.name?.trim()) problems.push(`region ${r.id}: missing name`);
}
const ids = registry.regions.map((r) => r.id);
if (new Set(ids).size !== ids.length) problems.push("duplicate region ids");
const unassigned = [...shapes.keys()].filter((s) => !seenShapes.has(s) && !registry.impassable.includes(s));
if (unassigned.length)
	problems.push(`shapes without a region (add them or list as impassable): ${unassigned.join(", ")}`);
if (problems.length) {
	console.error("Registry problems:\n  " + problems.join("\n  "));
	process.exit(1);
}

// ── Geometry: centre and lat/lon per region ──────────────────────────────
const geo = registry.regions.map((r) => {
	const polys = parsePath(shapes.get(r.shape)!);
	const c = shapeCentroid(polys);
	const { lat, lon } = project(projection, c.x, c.y);
	return { ...r, polys, cx: c.x, cy: c.y, lat: +lat.toFixed(4), lon: +lon.toFixed(4) };
});

// ── Borders ───────────────────────────────────────────────────────────────
// Land border: outlines run alongside each other (many outline samples
// within LAND_GAP map units). Sea link: outlines come within SEA_GAP (a
// strait), so islands and coasts across narrow water stay connected.
// Island groups that are still cut off get joined to their nearest region.
const SAMPLE_STEP = 0.4; // map units between outline samples
const LAND_GAP = 0.5; // ≈ 15 km at the equator
const LAND_MIN_SAMPLES = 3;
const SEA_GAP = 2.5; // ≈ 70 km
const CELL = SEA_GAP;

const samples = geo.map((g) => densify(g.polys, SAMPLE_STEP));
const grid = new Map<string, { region: number; p: Point }[]>();
samples.forEach((pts, i) => {
	for (const p of pts) {
		const key = `${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)}`;
		let bucket = grid.get(key);
		if (!bucket) grid.set(key, (bucket = []));
		bucket.push({ region: i, p });
	}
});

const close = new Map<string, { land: number; minGap: number; p: Point; q: Point }>();
samples.forEach((pts, i) => {
	for (const p of pts) {
		const gx = Math.floor(p[0] / CELL);
		const gy = Math.floor(p[1] / CELL);
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const q of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
					if (q.region <= i) continue;
					const gap = Math.hypot(q.p[0] - p[0], q.p[1] - p[1]);
					if (gap > SEA_GAP) continue;
					const key = `${i}:${q.region}`;
					const e = close.get(key) ?? { land: 0, minGap: Infinity, p, q: q.p };
					if (gap <= LAND_GAP) e.land++;
					if (gap < e.minGap) Object.assign(e, { minGap: gap, p, q: q.p });
					close.set(key, e);
				}
			}
		}
	}
});

// Is a point on land? (inside any region or impassable shape; even-odd rule)
const landShapes = [...geo.map((g) => g.polys), ...registry.impassable.map((id) => parsePath(shapes.get(id)!))].map(
	(polys) => {
		const pts = polys.flat();
		const xs = pts.map((p) => p[0]);
		const ys = pts.map((p) => p[1]);
		return { polys, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
	}
);
function onLand([x, y]: Point): boolean {
	for (const s of landShapes) {
		if (x < s.minX || x > s.maxX || y < s.minY || y > s.maxY) continue;
		let inside = false;
		for (const poly of s.polys) {
			for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
				const [xi, yi] = poly[i]!;
				const [xj, yj] = poly[j]!;
				if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
			}
		}
		if (inside) return true;
	}
	return false;
}
/** A sea link must cross water: no point along the gap may be on land. */
function acrossWater(p: Point, q: Point): boolean {
	for (const t of [0.25, 0.5, 0.75]) {
		if (onLand([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])) return false;
	}
	return true;
}

const borders = new Map<string, { a: number; b: number; kind: "land" | "sea" }>();
const link = (i: number, j: number, kind: "land" | "sea") => {
	const [a, b] = geo[i]!.id < geo[j]!.id ? [i, j] : [j, i];
	const key = `${geo[a]!.id}-${geo[b]!.id}`;
	if (!borders.has(key) || kind === "land") borders.set(key, { a, b, kind });
};
for (const [key, e] of close) {
	const [i, j] = key.split(":").map(Number) as [number, number];
	if (e.land >= LAND_MIN_SAMPLES) link(i, j, "land");
	else if (acrossWater(e.p, e.q)) link(i, j, "sea");
}

// Join every disconnected group (islands, archipelagos) to the nearest
// region outside it, until the whole world is one connected graph, so every
// region can be reached by travel and every state can, in principle, be
// fought.
const parent = geo.map((_, i) => i);
const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
for (const { a, b } of borders.values()) parent[find(a)] = find(b);
let groupsJoined = 0;
for (;;) {
	const groups = new Map<number, number[]>();
	geo.forEach((_, i) => {
		const r = find(i);
		if (!groups.has(r)) groups.set(r, []);
		groups.get(r)!.push(i);
	});
	if (groups.size <= 1) break;
	// Take the smallest group and link it to its closest outside region.
	const smallest = [...groups.values()].sort((p, q) => p.length - q.length)[0]!;
	const inGroup = new Set(smallest);
	let best = { i: -1, j: -1, km: Infinity };
	for (const i of smallest) {
		geo.forEach((o, j) => {
			if (inGroup.has(j)) return;
			const km = haversineKm(geo[i]!.lat, geo[i]!.lon, o.lat, o.lon);
			if (km < best.km) best = { i, j, km };
		});
	}
	link(best.i, best.j, "sea");
	parent[find(best.i)] = find(best.j);
	groupsJoined++;
}

const borderList = [...borders.values()]
	.map(({ a, b, kind }) => ({
		regionId: geo[a]!.id,
		neighborId: geo[b]!.id,
		kind,
		distanceKm: Math.round(haversineKm(geo[a]!.lat, geo[a]!.lon, geo[b]!.lat, geo[b]!.lon) * 100) / 100
	}))
	.sort((p, q) => p.regionId - q.regionId || p.neighborId - q.neighborId);

// ── Write outputs ─────────────────────────────────────────────────────────
mkdirSync(`${dir}/data`, { recursive: true });
writeFileSync(
	`${dir}/data/regions.json`,
	JSON.stringify(
		geo.map(({ id, name, lat, lon }) => ({ id, name, latitude: lat, longitude: lon })),
		null,
		"\t"
	) + "\n"
);
writeFileSync(`${dir}/data/borders.json`, JSON.stringify(borderList, null, "\t") + "\n");
const deposits = generateDeposits(geo.map(({ id, lat, lon }) => ({ id, latitude: lat, longitude: lon })));
writeFileSync(`${dir}/data/deposits.json`, JSON.stringify(deposits, null, "\t") + "\n");

// The app map: same artwork, shapes renamed to their region id.
const idOf = new Map(registry.regions.map((r) => [r.shape, String(r.id)]));
const body = sourceSvg.replace(/<path\b[^>]*>/g, (tag) =>
	tag.replace(/\bid="([^"]+)"/, (m, id: string) => (idOf.has(id) ? `id="${idOf.get(id)}"` : m))
);
writeFileSync(`${root}/src/lib/assets/worldmap3.svg`, body);

// Region names: add missing region_<id> keys right after the last existing
// one, as text, so the file's hand-made grouping and other keys stay as-is.
const enPath = `${root}/messages/en.json`;
const enText = readFileSync(enPath, "utf8");
const en = JSON.parse(enText) as Record<string, string>;
const missing = registry.regions.filter((r) => !en[`region_${r.id}`]);
if (missing.length) {
	const lines = enText.split("\n");
	let last = -1;
	lines.forEach((l, i) => {
		if (/^\t"region_\d+":/.test(l)) last = i;
	});
	if (last < 0) throw new Error("messages/en.json has no region_<id> keys to append after");
	const add = missing.map((r) => `\t${JSON.stringify(`region_${r.id}`)}: ${JSON.stringify(r.name)}`);
	if (!lines[last]!.trimEnd().endsWith(",")) lines[last] = lines[last]!.trimEnd() + ",";
	const isLastEntry = !lines.slice(last + 1).some((l) => /^\t"/.test(l));
	lines.splice(last + 1, 0, ...add.map((l, i) => (i < add.length - 1 || !isLastEntry ? l + "," : l)));
	writeFileSync(enPath, lines.join("\n"));
	JSON.parse(readFileSync(enPath, "utf8")); // fail loudly if we broke the JSON
}
const namesAdded = missing.length;

const land = borderList.filter((b) => b.kind === "land").length;
const longest = borderList.reduce((m, b) => Math.max(m, b.distanceKm), 0);
console.log(
	`${geo.length} regions, ${borderList.length} borders (${land} land, ${borderList.length - land} sea), ` +
		`${groupsJoined} island groups joined to the mainland, longest link ${Math.round(longest)} km, ` +
		`${namesAdded} names added, ${deposits.length} resource deposits`
);
