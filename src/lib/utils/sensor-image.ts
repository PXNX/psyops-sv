// src/lib/utils/sensor-image.ts
// Procedural recon imagery: turns one intel report into a "sensor frame", a
// list of SVG primitives plus the boxes the analyst drew around what the pass
// found. Pure and seeded: the same report always gives the same picture.
//
// What drives the picture:
// - terrain (per region, so every pass over a region shows the same roads,
//   fields, forest and river) and the report's cover/weather/night;
// - the sensor: EO is a muted colour photo, IR a white-hot temperature map,
//   SAR a speckled radar backscatter map;
// - what the report says, decoys and estimation errors included (never the
//   ground truth): unit counts by category, exact types for visual passes,
//   firing positions, fortifications and other installations, air defence;
// - an ongoing battle (units move: convoys on roads, dust, tracks, impacts)
//   and strikes on the region shortly before the pass (craters, fires, smoke).
//
// Element counts are bounded: large forces render as clusters with a count
// label, not one sprite per unit.
import { SENSORS, hash32, localHour, seededRandom, type SensorId } from "#lib/config/index.js";

export const FRAME_W = 640;
export const FRAME_H = 400;

export type ImageMode = "eo" | "ir" | "sar";
export type ImageStatus = "ok" | "obscured" | "intercepted";

/** A strike on the region before the pass. */
export interface ImageryStrike {
	id: number;
	target: string;
	weapon: string;
	outcome: string;
	/** Hours between the strike and the pass. */
	hoursBefore: number;
}

export interface ImageryFindings {
	outcome: ImageStatus;
	conditions: { weather: string; night: boolean; cover: string };
	airDefence: { units: number; radar?: number; interceptChance?: number } | null;
	coverage: Record<string, number>;
	categories: { category: string; count: number; estimated: boolean; confidence: number }[];
	unitTypes: { unitType: string; count: number; estimated: boolean }[] | null;
	firingPositions: { count: number; confidence: number } | null;
	buildings: {
		infrastructure: number;
		economy: number;
		education?: number;
		hospitals: number;
		fortifications: number;
		/** Air-defence radar coverage levels (drawn as radar stations). */
		radar?: number;
		underConstruction: number;
	} | null;
	battle: { id?: number; phase: string } | null;
}

/** Region data the report doesn't carry (all public: map position, terrain, strike log). */
export interface ImageryContext {
	lat: number | null;
	lon: number | null;
	terrain: string;
	strikes: ImageryStrike[];
}

export interface ImageryInput extends ImageryContext {
	reportId: number;
	regionId: number;
	sensor: string;
	observedAt: string;
	findings: ImageryFindings;
}

export function toImageryInput(
	r: { id: number; regionId: number; sensor: string; findings: ImageryFindings; observedAt: Date | string },
	ctx: ImageryContext
): ImageryInput {
	return {
		reportId: r.id,
		regionId: r.regionId,
		sensor: r.sensor,
		observedAt: new Date(r.observedAt).toISOString(),
		findings: r.findings,
		...ctx
	};
}

// ── Scene ───────────────────────────────────────────────────────────────────

/** Filter tokens the renderer resolves to its own <filter> defs. */
export type FilterToken = "soft" | "blur" | "cloud" | "glow";
/** Fill tokens "pat:<name>" resolve to the renderer's <pattern> defs. */
interface Style {
	fill?: string;
	stroke?: string;
	sw?: number;
	op?: number;
	tf?: string;
	fx?: FilterToken;
	dash?: string;
	cap?: "round" | "butt" | "square";
}
export type Prim =
	| (Style & { k: "rect"; x: number; y: number; w: number; h: number; rx?: number })
	| (Style & { k: "circle"; x: number; y: number; r: number })
	| (Style & { k: "ellipse"; x: number; y: number; rx: number; ry: number })
	| (Style & { k: "path"; d: string });

export type DetectionIcon =
	| "armor"
	| "artillery"
	| "infantry"
	| "air"
	| "sam"
	| "radar"
	| "fort"
	| "fire"
	| "crater"
	| "industry"
	| "hospital"
	| "track"
	| "build";

/** An analyst's box, in frame (screen) coordinates. */
export interface Detection {
	x: number;
	y: number;
	w: number;
	h: number;
	label: string;
	detail: string | null;
	kind: "unit" | "site" | "damage" | "structure" | "track";
	icon: DetectionIcon;
}

export interface Scene {
	mode: ImageMode;
	status: ImageStatus;
	platform: "drone" | "satellite";
	w: number;
	h: number;
	/** Seed for the renderer's noise filters. */
	seed: number;
	/** World → frame transform (SVG transform attribute). */
	view: string;
	heading: number;
	base: string;
	/** Hillshade strength (0 = flat) and light direction. */
	relief: number;
	reliefAzimuth: number;
	reliefElevation: number;
	canopy: { base: string; light: string; dark: string };
	furrow: string;
	ground: Prim[];
	features: Prim[];
	objects: Prim[];
	effects: Prim[];
	/** Frame coordinates (clouds, rain). */
	atmosphere: Prim[];
	/** World coordinates, drawn above the darkness (headlights, fire glow at night). */
	lights: Prim[];
	detections: Detection[];
	tone: {
		darkness: number;
		haze: number;
		hazeColor: string;
		grain: number;
		blur: number;
		vignette: number;
		speckle: number;
		static: number;
	};
	/** Share of the frame not hidden by cloud or haze (0-1). */
	visibility: number;
	/** Rough mean brightness of the frame as shown (0-1). */
	brightness: number;
	/** Scale bar: `meters` spans `px` frame units. */
	scale: { meters: number; px: number };
	/** Sprites drawn for units (bounded). */
	sprites: number;
	/** Short analyst notes for the side panel. */
	notes: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type Pt = [number, number];
type Rng = () => number;

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const r1 = (n: number) => Math.round(n * 10) / 10;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const range = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]!;

function hexRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = (r: number, g: number, b: number) =>
	`rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;
/** Lighten (v > 0) or darken (v < 0) a hex colour. */
function shade(hex: string, v: number) {
	const [r, g, b] = hexRgb(hex);
	const f = 1 + v;
	return rgb(r * f, g * f, b * f);
}
const grey = (v: number) => {
	const c = Math.round(clamp(v) * 255);
	return `rgb(${c},${c},${c})`;
};
const lum = (hex: string) => {
	const [r, g, b] = hexRgb(hex);
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const pathOf = (pts: Pt[], close = false) =>
	pts.map((p, i) => `${i ? "L" : "M"}${r1(p[0])} ${r1(p[1])}`).join("") + (close ? "Z" : "");

/** A smooth path through points (Catmull-Rom → cubic Bézier). */
function smoothPath(pts: Pt[]) {
	if (pts.length < 3) return pathOf(pts);
	let d = `M${r1(pts[0]![0])} ${r1(pts[0]![1])}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
		d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
	}
	return d;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distToPolyline(p: Pt, pts: Pt[]) {
	let best = Infinity;
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i]!;
		const b = pts[i + 1]!;
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1));
		best = Math.min(best, Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t)));
	}
	return best;
}

function inPolygon(p: Pt, poly: Pt[]) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i]!;
		const [xj, yj] = poly[j]!;
		if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/** Point and heading (radians) at fraction t along a polyline. */
function along(pts: Pt[], t: number): { p: Pt; a: number } {
	const lens: number[] = [];
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const l = dist(pts[i]!, pts[i + 1]!);
		lens.push(l);
		total += l;
	}
	let target = clamp(t) * total;
	for (let i = 0; i < lens.length; i++) {
		if (target <= lens[i]! || i === lens.length - 1) {
			const a = pts[i]!;
			const b = pts[i + 1]!;
			const f = lens[i]! ? clamp(target / lens[i]!) : 0;
			return { p: [lerp(a[0], b[0], f), lerp(a[1], b[1], f)], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
		}
		target -= lens[i]!;
	}
	return { p: pts[0]!, a: 0 };
}

function polylineLength(pts: Pt[]) {
	let total = 0;
	for (let i = 0; i < pts.length - 1; i++) total += dist(pts[i]!, pts[i + 1]!);
	return total;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

// ── Materials per sensor ────────────────────────────────────────────────────

type Material =
	| "grass"
	| "field"
	| "forest"
	| "urban"
	| "roof"
	| "asphalt"
	| "dirt"
	| "water"
	| "sand"
	| "rock"
	| "concrete"
	| "trench"
	| "berm"
	| "crater"
	| "scorch"
	| "metal"
	| "aircraft"
	| "shadow"
	| "track";

const EO: Record<Material, string> = {
	grass: "#6d7650",
	field: "#8a8458",
	forest: "#33402a",
	urban: "#77736b",
	roof: "#8f8a82",
	asphalt: "#4a4a47",
	dirt: "#8d7c5e",
	water: "#2c3d43",
	sand: "#bba57a",
	rock: "#857d6e",
	concrete: "#aaa69c",
	trench: "#3a3124",
	berm: "#9b8c6c",
	crater: "#2b251d",
	scorch: "#241f1a",
	metal: "#4b4f3b",
	aircraft: "#8a8e8f",
	shadow: "#141410",
	track: "#a39573"
};
const EO_FIELDS = ["#8a8458", "#7c7a4c", "#9a8d62", "#6f7b47", "#a09468", "#7d6e4f", "#86905a", "#94875c"];
const EO_DESERT = ["#bba57a", "#c4ae84", "#b09b70", "#c9b48b"];

/** Thermal: apparent temperature 0 (cold, black) to 1 (hot, white). */
function irTemp(m: Material, night: boolean): number {
	const day: Record<Material, number> = {
		grass: 0.42,
		field: 0.47,
		forest: 0.36,
		urban: 0.55,
		roof: 0.6,
		asphalt: 0.6,
		dirt: 0.52,
		water: 0.28,
		sand: 0.58,
		rock: 0.5,
		concrete: 0.55,
		trench: 0.4,
		berm: 0.5,
		crater: 0.45,
		scorch: 0.55,
		metal: 0.6,
		aircraft: 0.55,
		shadow: 0.3,
		track: 0.5
	};
	const nightT: Record<Material, number> = {
		grass: 0.3,
		field: 0.28,
		forest: 0.38,
		urban: 0.5,
		roof: 0.42,
		asphalt: 0.45,
		dirt: 0.3,
		water: 0.44,
		sand: 0.26,
		rock: 0.36,
		concrete: 0.46,
		trench: 0.34,
		berm: 0.32,
		crater: 0.33,
		scorch: 0.4,
		metal: 0.45,
		aircraft: 0.4,
		shadow: 0.28,
		track: 0.33
	};
	return (night ? nightT : day)[m];
}

/** Radar backscatter 0 (smooth, black) to 1 (metal/corner reflector, white). */
const SAR: Record<Material, number> = {
	grass: 0.3,
	field: 0.36,
	forest: 0.52,
	urban: 0.7,
	roof: 0.8,
	asphalt: 0.1,
	dirt: 0.24,
	water: 0.03,
	sand: 0.2,
	rock: 0.45,
	concrete: 0.55,
	trench: 0.14,
	berm: 0.55,
	crater: 0.18,
	scorch: 0.28,
	metal: 1,
	aircraft: 0.95,
	shadow: 0.02,
	track: 0.3
};

class Painter {
	constructor(
		readonly mode: ImageMode,
		readonly night: boolean
	) {}
	/** Colour of a material, with a small variation v in [-1, 1]. */
	c(m: Material, v = 0, hex?: string): string {
		if (this.mode === "ir") return grey(irTemp(m, this.night) + v * 0.04);
		if (this.mode === "sar") return grey(SAR[m] + v * 0.07);
		return shade(hex ?? EO[m], v * 0.12);
	}
	/** Explicit temperature (IR) or reflectance (SAR); EO uses the material. */
	hot(m: Material, value: number, v = 0): string {
		if (this.mode === "eo") return this.c(m, v);
		return grey(value + v * 0.03);
	}
}

// ── Terrain ─────────────────────────────────────────────────────────────────

interface Cell {
	pts: Pt[];
	use: "field" | "forest" | "urban" | "park" | "bare" | "rock";
	tone: number;
	furrow: number;
}
interface Road {
	pts: Pt[];
	width: number;
	paved: boolean;
}
interface Terrain {
	kind: "plains" | "desert" | "forest" | "urban" | "hills" | "mountain";
	cells: Cell[];
	roads: Road[];
	river: { pts: Pt[]; width: number } | null;
	bridge: Pt | null;
	buildings: { x: number; y: number; w: number; h: number; rot: number; tone: number }[];
	dunes: Pt[][];
}

const TERRAIN_KIND: Record<string, Terrain["kind"]> = {
	plains: "plains",
	desert: "desert",
	forest: "forest",
	jungle: "forest",
	urban: "urban",
	hills: "hills",
	mountain: "mountain"
};

const COLS = 8;
const ROWS = 5;
const MARGIN = 120;

function makeTerrain(regionId: number, terrainName: string): Terrain {
	const rng = seededRandom(hash32(regionId, 0x7e11a1));
	const kind = TERRAIN_KIND[terrainName] ?? "plains";

	// A jittered lattice whose quads share corners: a field patchwork.
	const cw = (FRAME_W + 2 * MARGIN) / COLS;
	const ch = (FRAME_H + 2 * MARGIN) / ROWS;
	const lattice: Pt[][] = [];
	for (let j = 0; j <= ROWS; j++) {
		const row: Pt[] = [];
		for (let i = 0; i <= COLS; i++) {
			const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
			row.push([
				-MARGIN + i * cw + (edge ? 0 : range(rng, -0.3, 0.3) * cw),
				-MARGIN + j * ch + (edge ? 0 : range(rng, -0.3, 0.3) * ch)
			]);
		}
		lattice.push(row);
	}
	const useOdds: Record<Terrain["kind"], [Cell["use"], number][]> = {
		plains: [
			["field", 0.82],
			["forest", 0.12],
			["bare", 0.06]
		],
		desert: [
			["bare", 0.88],
			["field", 0.08],
			["rock", 0.04]
		],
		forest: [
			["forest", 0.68],
			["field", 0.26],
			["bare", 0.06]
		],
		urban: [
			["urban", 0.7],
			["park", 0.14],
			["field", 0.16]
		],
		hills: [
			["field", 0.48],
			["forest", 0.42],
			["bare", 0.1]
		],
		mountain: [
			["rock", 0.45],
			["forest", 0.4],
			["field", 0.15]
		]
	};
	const cells: Cell[] = [];
	for (let j = 0; j < ROWS; j++) {
		for (let i = 0; i < COLS; i++) {
			let roll = rng();
			let use: Cell["use"] = "field";
			for (const [u, p] of useOdds[kind]) {
				if (roll < p) {
					use = u;
					break;
				}
				roll -= p;
			}
			cells.push({
				pts: [lattice[j]![i]!, lattice[j]![i + 1]!, lattice[j + 1]![i + 1]!, lattice[j + 1]![i]!],
				use,
				tone: rng(),
				furrow: Math.floor(rng() * 3)
			});
		}
	}

	// Roads: a main road edge to edge, maybe a crossing road and dirt tracks.
	const road = (horizontal: boolean, width: number, paved: boolean, wobble: number): Road => {
		const n = 6;
		const pts: Pt[] = [];
		const start = horizontal ? range(rng, 90, 310) : range(rng, 120, 520);
		const end = horizontal ? range(rng, 90, 310) : range(rng, 120, 520);
		for (let k = 0; k <= n; k++) {
			const t = k / n;
			const off = lerp(start, end, t) + (k > 0 && k < n ? range(rng, -wobble, wobble) : 0);
			pts.push(horizontal ? [-60 + t * (FRAME_W + 120), off] : [off, -60 + t * (FRAME_H + 120)]);
		}
		return { pts, width, paved };
	};
	const roads: Road[] = [road(rng() < 0.6, kind === "urban" ? 6 : 4, true, 40)];
	if (rng() < (kind === "urban" ? 0.9 : 0.55)) roads.push(road(!(roads[0]!.pts[0]![0] < 0), 3.5, true, 50));
	const tracks = kind === "urban" ? 0 : 1 + Math.floor(rng() * 2);
	for (let k = 0; k < tracks; k++) roads.push(road(rng() < 0.5, 2, false, 80));

	// A river in about a third of the regions (never in the mountains' rock).
	let river: Terrain["river"] = null;
	let bridge: Pt | null = null;
	if (kind !== "mountain" && rng() < 0.4) {
		const pts: Pt[] = [];
		const x0 = range(rng, 140, 500);
		for (let k = 0; k <= 9; k++) {
			pts.push([x0 + Math.sin(k * 0.9 + rng()) * 60 + range(rng, -20, 20), -60 + (k / 9) * (FRAME_H + 120)]);
		}
		river = { pts, width: range(rng, 9, 15) };
		let best = Infinity;
		for (let k = 0; k <= 40; k++) {
			const { p } = along(roads[0]!.pts, k / 40);
			const d = distToPolyline(p, pts);
			if (d < best) {
				best = d;
				bridge = p;
			}
		}
	}

	// City blocks: buildings in a rotated grid, inside urban cells.
	const buildings: Terrain["buildings"] = [];
	if (kind === "urban" || kind === "plains" || kind === "hills") {
		const rot = range(rng, -12, 12);
		const step = kind === "urban" ? 22 : 30;
		const cap = kind === "urban" ? 140 : 26;
		for (let y = 10; y < FRAME_H - 5 && buildings.length < cap; y += step) {
			for (let x = 10; x < FRAME_W - 5 && buildings.length < cap; x += step) {
				const p: Pt = [x + range(rng, -3, 3), y + range(rng, -3, 3)];
				const cell = cells.find((c) => inPolygon(p, c.pts));
				const urbanCell = cell?.use === "urban";
				// Villages along the main road outside cities.
				const village = kind !== "urban" && distToPolyline(p, roads[0]!.pts) < 22 && rng() < 0.35;
				if (!urbanCell && !village) continue;
				if (river && distToPolyline(p, river.pts) < river.width) continue;
				if (roads.some((r) => distToPolyline(p, r.pts) < r.width + 5)) continue;
				const big = rng() < 0.2;
				buildings.push({
					x: p[0],
					y: p[1],
					w: big ? range(rng, 12, 17) : range(rng, 6, 11),
					h: big ? range(rng, 8, 12) : range(rng, 5, 9),
					rot,
					tone: rng()
				});
			}
		}
	}

	const dunes: Pt[][] = [];
	if (kind === "desert") {
		for (let k = 0; k < 14; k++) {
			const y = range(rng, -20, FRAME_H + 20);
			const x = range(rng, -40, FRAME_W - 100);
			const len = range(rng, 120, 260);
			const pts: Pt[] = [];
			for (let s = 0; s <= 6; s++) pts.push([x + (len * s) / 6, y + Math.sin(s * 1.3 + k) * 10]);
			dunes.push(pts);
		}
	}

	return { kind, cells, roads, river, bridge, buildings, dunes };
}

// ── Building the frame ──────────────────────────────────────────────────────

interface View {
	cx: number;
	cy: number;
	zoom: number;
	heading: number;
}

const CATEGORY_CAP: Record<string, number> = { vehicle: 24, artillery: 10, infantry: 16, air: 8 };
const MAX_DETECTIONS = 12;

const TYPE_LABEL: Record<string, string> = {
	armor: "ARMOR",
	mechanized: "MECH INF",
	air_defence: "SAM SITE",
	artillery: "ARTY BTY",
	infantry: "INF POSN",
	fighter_squadron: "FIGHTERS",
	bomber_squadron: "BOMBERS",
	vehicle: "VEHICLES",
	air: "AIRCRAFT"
};

export function imageMode(sensor: string): ImageMode {
	// Reports filed before ground radar was retired render as SAR frames.
	if (sensor === "ground_radar") return "sar";
	const kind = SENSORS[sensor as SensorId]?.kind;
	return kind === "thermal" ? "ir" : kind === "radar" ? "sar" : "eo";
}

export function buildScene(input: ImageryInput): Scene {
	return buildImage(input, imageMode(input.sensor));
}

function buildImage(input: ImageryInput, mode: ImageMode): Scene {
	const f = input.findings;
	const platform = SENSORS[input.sensor as SensorId]?.platform === "drone" ? "drone" : "satellite";
	const weather = f.conditions.weather;
	const night = f.conditions.night;
	const at = new Date(input.observedAt);
	const window = Math.floor(at.getTime() / (3 * 3600_000));
	const rng = seededRandom(hash32(input.reportId, 0x1aa6e));
	// Unit positions are stable within a 3-hour window, so EO, IR and SAR
	// passes flown close together show the same convoy.
	const placeRng = seededRandom(hash32(input.regionId, window, 0x91ace));
	const P = new Painter(mode, night);
	const terrain = makeTerrain(input.regionId, input.terrain);
	const moving = !!f.battle;

	// Camera: satellites look straight down, north up; drones zoom in on a
	// part of the region with a heading.
	const view: View =
		platform === "drone"
			? {
					cx: range(rng, 190, 450),
					cy: range(rng, 155, 245),
					zoom: 2.4,
					heading: Math.round(range(rng, -25, 25))
				}
			: { cx: FRAME_W / 2, cy: FRAME_H / 2, zoom: 1, heading: 0 };
	const halfW = FRAME_W / 2 / view.zoom;
	const halfH = FRAME_H / 2 / view.zoom;
	const cosH = Math.cos((-view.heading * Math.PI) / 180);
	const sinH = Math.sin((-view.heading * Math.PI) / 180);
	const toScreen = (p: Pt): Pt => {
		const dx = p[0] - view.cx;
		const dy = p[1] - view.cy;
		return [FRAME_W / 2 + (dx * cosH - dy * sinH) * view.zoom, FRAME_H / 2 + (dx * sinH + dy * cosH) * view.zoom];
	};
	const toWorld = (s: Pt): Pt => {
		const dx = (s[0] - FRAME_W / 2) / view.zoom;
		const dy = (s[1] - FRAME_H / 2) / view.zoom;
		return [view.cx + dx * cosH + dy * sinH, view.cy - dx * sinH + dy * cosH];
	};
	const inView = (p: Pt, pad = 12) => {
		const s = toScreen(p);
		return s[0] > pad && s[0] < FRAME_W - pad && s[1] > pad + 14 && s[1] < FRAME_H - pad - 14;
	};
	/** Vehicles and sites are drawn a bit larger than true scale so they read. */
	const S = 1.6;

	const ground: Prim[] = [];
	const features: Prim[] = [];
	const objects: Prim[] = [];
	const effects: Prim[] = [];
	const lights: Prim[] = [];
	const detections: (Detection & { prio: number })[] = [];
	const notes: string[] = [];

	// Sun: shadow direction and length from the local hour.
	const hour = localHour(input.lon ?? 0, at);
	const sunAz = ((hour - 6) / 12) * 180 + 90; // 90° at 06h, 180° at noon, 270° at 18h
	const elev = Math.max(0.15, Math.sin(((hour - 6) / 12) * Math.PI));
	const diffuse = weather !== "clear" || night || mode !== "eo";
	const shadowLen = diffuse ? 0 : clamp(0.6 / elev, 0.6, 2.4);
	const sdx = Math.sin(((sunAz + 180) * Math.PI) / 180) * shadowLen;
	const sdy = -Math.cos(((sunAz + 180) * Math.PI) / 180) * shadowLen;

	// ── Ground ──
	const kind = terrain.kind;
	const baseMat: Material = kind === "desert" ? "sand" : kind === "urban" ? "urban" : "grass";
	const base = P.c(baseMat, 0, kind === "mountain" ? EO.rock : undefined);
	const forestIn = (p: Pt) => terrain.cells.some((c) => c.use === "forest" && inPolygon(p, c.pts));
	for (const cell of terrain.cells) {
		const d = pathOf(cell.pts, true);
		const v = cell.tone * 2 - 1;
		switch (cell.use) {
			case "field": {
				const hex = kind === "desert" ? "#7c8450" : EO_FIELDS[Math.floor(cell.tone * EO_FIELDS.length)]!;
				ground.push({ k: "path", d, fill: P.c("field", v, hex), stroke: P.c("dirt", -0.3), sw: 0.6 });
				if (mode !== "sar" || cell.tone > 0.5) ground.push({ k: "path", d, fill: `pat:furrow${cell.furrow}` });
				break;
			}
			case "forest":
				ground.push({ k: "path", d, fill: "pat:canopy" });
				break;
			case "urban":
				ground.push({ k: "path", d, fill: P.c("urban", v * 0.5) });
				break;
			case "park":
				ground.push({ k: "path", d, fill: P.c("grass", v * 0.5 + 0.1) });
				break;
			case "rock":
				ground.push({ k: "path", d, fill: P.c("rock", v), op: 0.85 });
				break;
			case "bare":
				ground.push({
					k: "path",
					d,
					fill: P.c(kind === "desert" ? "sand" : "dirt", v, kind === "desert" ? pick(rng, EO_DESERT) : undefined),
					op: 0.8
				});
				break;
		}
	}
	for (const dune of terrain.dunes) {
		ground.push({ k: "path", d: smoothPath(dune), stroke: P.c("sand", 0.6), sw: 2, op: 0.5, fill: "none" });
		ground.push({
			k: "path",
			d: smoothPath(dune.map(([x, y]) => [x + 1.5, y + 2] as Pt)),
			stroke: P.c("sand", -0.6),
			sw: 1.5,
			op: 0.45,
			fill: "none"
		});
	}

	// ── Water, roads, buildings ──
	if (terrain.river) {
		const d = smoothPath(terrain.river.pts);
		features.push({ k: "path", d, stroke: P.c("grass", -0.4), sw: terrain.river.width + 5, fill: "none", op: 0.6 });
		features.push({ k: "path", d, stroke: P.c("water"), sw: terrain.river.width, fill: "none", cap: "round" });
	}
	for (const road of terrain.roads) {
		const d = smoothPath(road.pts);
		features.push({
			k: "path",
			d,
			stroke: P.c(road.paved ? "asphalt" : "dirt", road.paved ? 0 : 0.2),
			sw: road.width,
			fill: "none",
			op: road.paved ? 1 : 0.75
		});
		if (road.paved && mode === "eo" && road.width >= 4)
			features.push({ k: "path", d, stroke: "#c9c4b4", sw: 0.4, dash: "4 6", fill: "none", op: 0.5 });
	}
	if (terrain.bridge && terrain.river) {
		const b = terrain.bridge;
		features.push({
			k: "rect",
			x: b[0] - 4,
			y: b[1] - terrain.river.width / 2 - 4,
			w: 8,
			h: terrain.river.width + 8,
			fill: P.c("concrete"),
			tf: `rotate(${r1(deg(along(terrain.roads[0]!.pts, 0.5).a) + 90)} ${r1(b[0])} ${r1(b[1])})`
		});
	}
	for (const b of terrain.buildings) {
		const tf = `rotate(${r1(b.rot)} ${r1(b.x)} ${r1(b.y)})`;
		if (shadowLen) {
			features.push({
				k: "rect",
				x: r1(b.x + sdx * 2.4),
				y: r1(b.y + sdy * 2.4),
				w: r1(b.w),
				h: r1(b.h),
				fill: EO.shadow,
				op: 0.45,
				tf
			});
		}
		features.push({ k: "rect", x: r1(b.x), y: r1(b.y), w: r1(b.w), h: r1(b.h), fill: P.c("roof", b.tone * 2 - 1), tf });
		if (mode === "sar") {
			// Double-bounce: bright facade facing the radar (west), shadow behind.
			features.push({ k: "rect", x: r1(b.x - 1), y: r1(b.y), w: 1.6, h: r1(b.h), fill: grey(1), tf });
			features.push({ k: "rect", x: r1(b.x + b.w), y: r1(b.y), w: 3, h: r1(b.h), fill: grey(0.02), tf, op: 0.9 });
		}
	}

	// ── Placement ──
	const placed: { p: Pt; r: number }[] = [];
	const onWater = (p: Pt) => !!terrain.river && distToPolyline(p, terrain.river.pts) < terrain.river.width / 2 + 6;
	const onBuilding = (p: Pt) =>
		terrain.buildings.some((b) => Math.abs(b.x + b.w / 2 - p[0]) < b.w && Math.abs(b.y + b.h / 2 - p[1]) < b.h);
	function spot(r: number, prefer?: (p: Pt) => boolean): Pt {
		let fallback: Pt | null = null;
		for (let k = 0; k < 40; k++) {
			const s: Pt = [range(placeRng, 60, FRAME_W - 60), range(placeRng, 60, FRAME_H - 60)];
			const p = toWorld(s);
			if (onWater(p) || placed.some((q) => dist(q.p, p) < q.r + r)) continue;
			if (!fallback) fallback = p;
			if (onBuilding(p) && k < 30) continue;
			if (prefer && !prefer(p) && k < 25) continue;
			placed.push({ p, r });
			return p;
		}
		const p = fallback ?? toWorld([range(placeRng, 80, FRAME_W - 80), range(placeRng, 80, FRAME_H - 80)]);
		placed.push({ p, r });
		return p;
	}
	/** A stretch of road in view, for convoys and checkpoints. */
	function roadStretch(len: number): { pts: Pt[]; t0: number; t1: number } | null {
		for (const road of terrain.roads) {
			const total = polylineLength(road.pts);
			for (let k = 0; k < 12; k++) {
				const t0 = range(placeRng, 0.1, 0.85);
				const t1 = t0 + len / total;
				if (t1 > 1) continue;
				const a = along(road.pts, t0).p;
				const b = along(road.pts, t1).p;
				if (inView(a, 30) && inView(b, 30) && !placed.some((q) => dist(q.p, a) < q.r + 10)) {
					placed.push({ p: a, r: len / 2 }, { p: b, r: 10 });
					return { pts: road.pts, t0, t1 };
				}
			}
		}
		return null;
	}

	const box = (pts: Pt[], pad: number) => {
		const ss = pts.map(toScreen);
		const xs = ss.map((s) => s[0]);
		const ys = ss.map((s) => s[1]);
		const x = clamp(Math.min(...xs) - pad, 2, FRAME_W - 12);
		const y = clamp(Math.min(...ys) - pad, 16, FRAME_H - 12);
		return {
			x: r1(x),
			y: r1(y),
			w: r1(Math.max(10, Math.min(FRAME_W - 2, Math.max(...xs) + pad) - x)),
			h: r1(Math.max(10, Math.min(FRAME_H - 14, Math.max(...ys) + pad) - y))
		};
	};
	const pct = (n: number) => `${Math.round(n * 100)}%`;

	const shadow = (x: number, y: number, w: number, h: number, tf: string) => {
		if (shadowLen) objects.push({ k: "rect", x: r1(x + sdx), y: r1(y + sdy), w, h, fill: EO.shadow, op: 0.55, tf });
	};

	/** A vehicle sprite at p heading a (radians). */
	function vehicle(p: Pt, a: number, opts: { moving: boolean; hidden: boolean; type: string }) {
		const w = 4.6 * (opts.type === "armor" ? 1 : 1.1);
		const h = 2.3;
		const tf = `rotate(${r1(deg(a))} ${r1(p[0])} ${r1(p[1])})`;
		const x = r1(p[0] - w / 2);
		const y = r1(p[1] - h / 2);
		const atten = opts.hidden ? (mode === "ir" ? 0.65 : mode === "sar" ? 0.75 : 1) : 1;
		if (mode === "eo") {
			shadow(x, y, r1(w), h, tf);
			objects.push({
				k: "rect",
				x,
				y,
				w: r1(w),
				h,
				rx: 0.4,
				fill: shade("#66704a", rng() * 0.3 - 0.15),
				stroke: "#1d2014",
				sw: 0.35,
				tf
			});
			if (opts.type === "armor")
				objects.push({ k: "circle", x: r1(p[0]), y: r1(p[1]), r: 0.85, fill: shade(EO.metal, -0.25) });
			if (opts.type === "air_defence")
				objects.push({ k: "rect", x: r1(p[0] - 1.6), y: r1(p[1] - 0.7), w: 3.4, h: 1.4, fill: "#6d705c", tf });
		} else if (mode === "ir") {
			const t = (opts.moving ? 0.82 : night ? 0.58 : 0.66) * atten + (1 - atten) * 0.35;
			objects.push({ k: "rect", x, y, w: r1(w), h, rx: 0.6, fill: grey(t), tf, fx: "soft" });
			// Engine deck at the rear: the hottest part of a running vehicle.
			if (opts.moving || rng() < 0.3)
				objects.push({
					k: "circle",
					x: r1(p[0] - Math.cos(a) * w * 0.32),
					y: r1(p[1] - Math.sin(a) * w * 0.32),
					r: 1.1,
					fill: grey(opts.moving ? 1 : 0.85 * atten),
					fx: "glow"
				});
		} else {
			const o: Pt = opts.moving ? [p[0], p[1] + range(rng, 6, 12)] : p; // moving targets shift in azimuth
			const bright = grey(atten);
			objects.push({ k: "rect", x: r1(o[0] - w / 2), y: r1(o[1] - h / 2), w: r1(w), h, fill: bright, tf });
			objects.push({ k: "rect", x: r1(o[0] + w / 2), y: r1(o[1] - h / 2), w: 3, h, fill: grey(0.02), op: 0.8 });
			objects.push({
				k: "path",
				d: `M${r1(o[0] - 5)} ${r1(o[1])}H${r1(o[0] + 5)}M${r1(o[0])} ${r1(o[1] - 4)}V${r1(o[1] + 4)}`,
				stroke: grey(0.95),
				sw: 0.5,
				op: 0.7 * atten
			});
			if (opts.moving)
				objects.push({
					k: "rect",
					x: r1(o[0] - 1),
					y: r1(o[1] - 7),
					w: 2,
					h: 14,
					fill: grey(0.85),
					op: 0.35,
					fx: "soft"
				});
		}
	}

	let sprites = 0;
	const unitCount = (cat: string) => f.categories.find((c) => c.category === cat);
	const typesIn = (cat: string) => {
		const map: Record<string, string[]> = {
			vehicle: ["armor", "mechanized", "air_defence"],
			air: ["fighter_squadron", "bomber_squadron"],
			artillery: ["artillery"],
			infantry: ["infantry"]
		};
		return (f.unitTypes ?? []).filter((t) => map[cat]?.includes(t.unitType) && t.count > 0);
	};
	const label = (type: string) => {
		if (mode === "ir") {
			return (
				{ vehicle: "HOT VEH", artillery: "ARTY", infantry: "PERSONNEL", air: "AIRCRAFT" }[type] ?? TYPE_LABEL[type]!
			);
		}
		if (mode === "sar") {
			return (
				{ vehicle: "VEH RTN", artillery: "ARTY RTN", infantry: "PERS", air: "AIRCRAFT" }[type] ?? TYPE_LABEL[type]!
			);
		}
		return TYPE_LABEL[type] ?? type.toUpperCase();
	};
	const countText = (n: number, estimated: boolean) => `×${estimated ? "~" : ""}${n}`;

	/** Split n units over k clusters (sums back to n). */
	const split = (n: number, k: number) => {
		const out: number[] = [];
		let left = n;
		for (let i = 0; i < k; i++) {
			const share = i === k - 1 ? left : Math.max(1, Math.round(n / k));
			out.push(Math.min(left, share));
			left -= out[i]!;
		}
		return out.filter((x) => x > 0);
	};

	// Groups to draw: for visual passes by exact type, else by category.
	type Group = { cat: string; type: string; count: number; estimated: boolean; conf: number };
	const groups: Group[] = [];
	if (f.outcome === "ok") {
		for (const c of f.categories) {
			if (!c.count) continue;
			const types = typesIn(c.category);
			if (mode === "eo" && types.length) {
				for (const t of types)
					groups.push({
						cat: c.category,
						type: t.unitType,
						count: t.count,
						estimated: t.estimated,
						conf: c.confidence
					});
			} else {
				groups.push({ cat: c.category, type: c.category, count: c.count, estimated: c.estimated, conf: c.confidence });
			}
		}
	}
	// SAM sites: from visual types, or the air defence a drone flew into.
	let samSites = 0;
	const samGroup = groups.find((g) => g.type === "air_defence");
	if (samGroup) samSites = Math.min(3, Math.ceil(samGroup.count / 2));
	else if (f.airDefence?.units && f.outcome !== "obscured") samSites = Math.min(3, Math.ceil(f.airDefence.units / 2));

	const anchors: Record<string, Pt[]> = {
		units: [],
		sam: [],
		fort: [],
		industry: [],
		hospital: [],
		radar: []
	};

	// ── SAM sites: hexagonal revetments with launchers and a radar ──
	for (let s = 0; s < samSites; s++) {
		const c = spot(26, (p) => !forestIn(p));
		anchors.sam!.push(c);
		const R = 9 * S * 0.8;
		const hex: Pt[] = [];
		for (let k = 0; k < 6; k++)
			hex.push([c[0] + Math.cos((k * Math.PI) / 3) * R, c[1] + Math.sin((k * Math.PI) / 3) * R]);
		features.push({ k: "path", d: pathOf(hex, true), fill: P.c("dirt", -0.1), stroke: P.c("berm", 0.2), sw: 2.2 });
		const launchers = 4 + (s % 2) * 2;
		const pts: Pt[] = [c];
		for (let k = 0; k < launchers; k++) {
			const a = (k / launchers) * Math.PI * 2 + 0.3;
			const p: Pt = [c[0] + Math.cos(a) * R * 0.62, c[1] + Math.sin(a) * R * 0.62];
			pts.push(p);
			vehicle(p, a, { moving: false, hidden: false, type: "air_defence" });
			sprites++;
		}
		objects.push({
			k: "circle",
			x: r1(c[0]),
			y: r1(c[1]),
			r: 1.6,
			fill: P.hot("metal", mode === "ir" ? 0.95 : 1),
			fx: mode === "ir" ? "glow" : undefined
		});
		if (mode === "eo")
			objects.push({ k: "circle", x: r1(c[0]), y: r1(c[1]), r: 2.4, fill: "none", stroke: "#c8c6bc", sw: 0.5 });
		if (f.outcome === "intercepted" && s === 0) {
			// The missile that got the drone: a smoke trail climbing to the camera.
			const end = toWorld([FRAME_W / 2 + 10, FRAME_H / 2 + 6]);
			effects.push({
				k: "path",
				d: `M${r1(c[0])} ${r1(c[1])}Q${r1(c[0] + 30)} ${r1(c[1] - 30)} ${r1(end[0])} ${r1(end[1])}`,
				stroke: mode === "ir" ? grey(0.95) : "#e8e4dc",
				sw: 2.2,
				fill: "none",
				op: 0.8,
				fx: "soft"
			});
		}
		detections.push({
			...box(hex, 4),
			label: "SAM SITE",
			detail: samGroup
				? `${countText(samGroup.count, samGroup.estimated)} · ${pct(samGroup.conf)}`
				: `${f.airDefence?.units ?? "?"} AD engaged`,
			kind: "site",
			icon: "sam",
			prio: 1
		});
	}

	// ── Units ──
	for (const g of groups) {
		if (g.type === "air_defence") continue;
		const cap = Math.max(
			1,
			Math.round((CATEGORY_CAP[g.cat] ?? 8) / (groups.filter((x) => x.cat === g.cat).length || 1))
		);
		const shown = Math.min(g.count, cap);
		const clusterSize = g.cat === "artillery" ? 4 : g.cat === "air" ? 4 : g.cat === "infantry" ? 6 : 5;
		const k = Math.min(4, Math.max(1, Math.ceil(shown / clusterSize)));
		const shownPer = split(shown, k);
		const countPer = split(g.count, k);
		for (let ci = 0; ci < shownPer.length; ci++) {
			const n = shownPer[ci]!;
			const pts: Pt[] = [];
			const roadMove = moving && (g.cat === "vehicle" || g.cat === "infantry") && ci % 2 === 0;
			const stretch = roadMove ? roadStretch(n * (g.cat === "infantry" ? 4 : 10) + 10) : null;
			if (stretch) {
				// A convoy on the road, dust and exhaust trailing behind.
				for (let v = 0; v < n; v++) {
					const { p, a } = along(stretch.pts, lerp(stretch.t0, stretch.t1, n === 1 ? 0.5 : v / (n - 1)));
					pts.push(p);
					if (g.cat === "infantry") {
						objects.push({ k: "circle", x: r1(p[0] + 3), y: r1(p[1]), r: 0.7, fill: P.hot("metal", 0.8) });
					} else {
						vehicle(p, a, { moving: true, hidden: false, type: g.type });
						if (mode === "eo" && weather !== "rain" && !night)
							effects.push({
								k: "ellipse",
								x: r1(p[0] - Math.cos(a) * 6),
								y: r1(p[1] - Math.sin(a) * 6),
								rx: 8,
								ry: 3,
								fill: "#d6c8a4",
								op: 0.55,
								tf: `rotate(${r1(deg(a))} ${r1(p[0] - Math.cos(a) * 6)} ${r1(p[1] - Math.sin(a) * 6)})`,
								fx: "soft"
							});
						if (mode === "ir")
							effects.push({
								k: "path",
								d: `M${r1(p[0])} ${r1(p[1])}l${r1(-Math.cos(a) * 9)} ${r1(-Math.sin(a) * 9)}`,
								stroke: grey(0.75),
								sw: 1.6,
								op: 0.35,
								fx: "soft"
							});
						if (mode === "eo" && night)
							lights.push({
								k: "circle",
								x: r1(p[0] + Math.cos(a) * 3),
								y: r1(p[1] + Math.sin(a) * 3),
								r: 0.9,
								fill: "#ffe9a8",
								fx: "glow"
							});
					}
					sprites++;
				}
			} else {
				const c = spot(g.cat === "air" ? 34 : 18, g.cat === "air" ? (p) => !forestIn(p) : undefined);
				anchors.units!.push(c);
				const hidden = forestIn(c);
				const a = range(placeRng, 0, Math.PI * 2);
				if (g.cat === "air") {
					// A dispersal strip with aircraft parked along it.
					const len = 70;
					const ux = Math.cos(a);
					const uy = Math.sin(a);
					features.push({
						k: "path",
						d: `M${r1(c[0] - (ux * len) / 2)} ${r1(c[1] - (uy * len) / 2)}l${r1(ux * len)} ${r1(uy * len)}`,
						stroke: P.c("concrete", -0.1),
						sw: 6,
						fill: "none"
					});
					for (let v = 0; v < n; v++) {
						const t = (v + 0.5) / n - 0.5;
						const p: Pt = [c[0] + ux * len * t * 0.9 - uy * 7, c[1] + uy * len * t * 0.9 + ux * 7];
						pts.push(p);
						const tf = `translate(${r1(p[0])} ${r1(p[1])}) rotate(${r1(deg(a) - 90)}) scale(${g.type === "bomber_squadron" ? 1.4 : 1})`;
						const plane =
							"M0 -5L0.9 -1.5L5 1L5 2L0.9 1.2L0.7 3.6L2 4.6L2 5.2L0 4.6L-2 5.2L-2 4.6L-0.7 3.6L-0.9 1.2L-5 2L-5 1L-0.9 -1.5Z";
						if (shadowLen)
							objects.push({
								k: "path",
								d: plane,
								fill: EO.shadow,
								op: 0.5,
								tf: `translate(${r1(sdx * 1.5)} ${r1(sdy * 1.5)}) ${tf}`
							});
						objects.push({
							k: "path",
							d: plane,
							fill: mode === "ir" ? grey(moving ? 0.8 : 0.5) : P.c("aircraft"),
							tf,
							fx: mode === "ir" ? "soft" : undefined
						});
						sprites++;
					}
				} else if (g.cat === "artillery") {
					const firing = (f.firingPositions?.count ?? 0) > 0 || moving;
					for (let v = 0; v < n; v++) {
						const off = (v - (n - 1) / 2) * 11;
						const p: Pt = [c[0] - Math.sin(a) * off, c[1] + Math.cos(a) * off + (v % 2) * 3];
						pts.push(p);
						const tf = `rotate(${r1(deg(a))} ${r1(p[0])} ${r1(p[1])})`;
						features.push({
							k: "circle",
							x: r1(p[0]),
							y: r1(p[1]),
							r: 4.2,
							fill: "none",
							stroke: P.c("berm"),
							sw: 1.4,
							op: 0.85
						});
						if (mode === "eo") shadow(r1(p[0] - 2), r1(p[1] - 1.3), 4, 2.6, tf);
						objects.push({
							k: "rect",
							x: r1(p[0] - 2),
							y: r1(p[1] - 1.3),
							w: 4,
							h: 2.6,
							fill: P.hot("metal", hidden ? 0.6 : 0.68),
							tf
						});
						objects.push({
							k: "path",
							d: `M${r1(p[0] + 1.5)} ${r1(p[1])}h6`,
							stroke: P.hot("metal", firing ? 0.98 : 0.7),
							sw: 0.7,
							tf
						});
						if (firing) {
							// Muzzle blast: scorched fan in front of the gun, hot in IR.
							const m: Pt = [p[0] + Math.cos(a) * 9, p[1] + Math.sin(a) * 9];
							effects.push({
								k: "ellipse",
								x: r1(m[0]),
								y: r1(m[1]),
								rx: 4.5,
								ry: 3,
								fill: mode === "ir" ? grey(1) : mode === "sar" ? grey(0.15) : EO.scorch,
								op: mode === "ir" ? 0.85 : 0.45,
								tf: `rotate(${r1(deg(a))} ${r1(m[0])} ${r1(m[1])})`,
								fx: mode === "ir" ? "glow" : "soft"
							});
						}
						sprites++;
					}
				} else if (g.cat === "infantry") {
					// Fighting positions along a short zigzag trench, or a file of men.
					const len = n * 4 + 8;
					const line: Pt[] = [];
					for (let v = 0; v <= 4; v++) {
						const t = v / 4 - 0.5;
						line.push([
							c[0] + Math.cos(a) * len * t + (v % 2 ? 2 : -2) * Math.sin(a),
							c[1] + Math.sin(a) * len * t - (v % 2 ? 2 : -2) * Math.cos(a)
						]);
					}
					if (!moving) features.push({ k: "path", d: pathOf(line), stroke: P.c("trench"), sw: 1.2, fill: "none" });
					for (let v = 0; v < n; v++) {
						const { p } = along(line, (v + 0.5) / n);
						const q: Pt = [p[0] + range(rng, -1.5, 1.5), p[1] + range(rng, -1.5, 1.5)];
						pts.push(q);
						objects.push({
							k: "circle",
							x: r1(q[0]),
							y: r1(q[1]),
							r: mode === "ir" ? 0.9 : 0.75,
							fill: mode === "ir" ? grey(hidden ? 0.6 : 0.82) : mode === "sar" ? grey(0.5) : "#2a2a1e",
							fx: mode === "ir" ? "glow" : undefined
						});
						sprites++;
					}
				} else {
					// Vehicles dug in: rows in U-shaped revetments, some under nets.
					const cols = Math.ceil(Math.sqrt(n * 1.5));
					for (let v = 0; v < n; v++) {
						const col = v % cols;
						const row = Math.floor(v / cols);
						const ox = (col - (cols - 1) / 2) * 9;
						const oy = row * 8;
						const p: Pt = [c[0] + Math.cos(a) * oy - Math.sin(a) * ox, c[1] + Math.sin(a) * oy + Math.cos(a) * ox];
						pts.push(p);
						if (!moving) {
							const tf = `rotate(${r1(deg(a))} ${r1(p[0])} ${r1(p[1])})`;
							features.push({
								k: "path",
								d: `M${r1(p[0] - 3)} ${r1(p[1] - 3)}h5.5a1 1 0 0 1 0 6h-5.5`,
								stroke: P.c("berm", 0.15),
								sw: 1.3,
								fill: "none",
								tf
							});
						}
						vehicle(p, a, { moving: false, hidden, type: g.type });
						if (mode === "eo" && !moving && v % 3 === 1)
							objects.push({ k: "circle", x: r1(p[0]), y: r1(p[1]), r: 3.2, fill: "#4c5536", op: 0.75 });
						sprites++;
					}
					if (moving) {
						// Fresh tracks across the fields from where they moved in.
						const tail: Pt = [
							c[0] - Math.cos(a) * 60 + range(rng, -20, 20),
							c[1] - Math.sin(a) * 60 + range(rng, -20, 20)
						];
						features.push({
							k: "path",
							d: `M${r1(c[0])} ${r1(c[1])}Q${r1((c[0] + tail[0]) / 2 + 15)} ${r1((c[1] + tail[1]) / 2 - 10)} ${r1(tail[0])} ${r1(tail[1])}`,
							stroke: P.c("track"),
							sw: 2.2,
							fill: "none",
							op: mode === "sar" ? 0.4 : 0.45,
							dash: mode === "eo" ? "1 1.4" : undefined
						});
					}
				}
				// Forest canopy hides part of what's underneath (EO only).
				if (hidden && mode === "eo") {
					for (let v = 0; v < Math.min(8, pts.length * 2); v++) {
						const q = pts[v % pts.length]!;
						objects.push({
							k: "circle",
							x: r1(q[0] + range(rng, -3, 3)),
							y: r1(q[1] + range(rng, -3, 3)),
							r: range(rng, 2.5, 4),
							fill: shade(EO.forest, range(rng, -0.15, 0.25)),
							op: 0.9
						});
					}
				}
			}
			const cnt = countPer[ci] ?? n;
			const fire = g.cat === "artillery" && (f.firingPositions?.count ?? 0) > 0 && mode === "ir";
			detections.push({
				...box(pts.length ? pts : [toWorld([FRAME_W / 2, FRAME_H / 2])], g.cat === "air" ? 7 : 5),
				label: fire ? "ARTY · FIRING" : label(g.type),
				detail: `${countText(cnt, g.estimated)} · ${pct(g.conf)}`,
				kind: "unit",
				icon:
					g.cat === "air" ? "air" : g.cat === "artillery" ? "artillery" : g.cat === "infantry" ? "infantry" : "armor",
				prio: 0
			});
		}
	}

	// ── Installations (passes that see buildings) ──
	const bld = f.outcome === "ok" ? f.buildings : null;
	const mainRoad = terrain.roads[0]!;
	if (bld && bld.fortifications > 0) {
		const L = bld.fortifications;
		// Defensive belt across the main road, facing the enemy.
		let centre: Pt = toWorld([FRAME_W / 2, FRAME_H / 2]);
		let ang = 0;
		for (let k = 0; k < 20; k++) {
			const s = along(mainRoad.pts, range(placeRng, 0.2, 0.8));
			if (inView(s.p, 60)) {
				centre = s.p;
				ang = s.a;
				break;
			}
		}
		anchors.fort!.push(centre);
		placed.push({ p: centre, r: 30 });
		const nx = -Math.sin(ang);
		const ny = Math.cos(ang);
		const lines = Math.min(5, 1 + Math.floor(L / 3));
		const allPts: Pt[] = [];
		for (let li = 0; li < lines; li++) {
			const back = li * 16 - 8;
			const len = 110 + L * 6 + range(rng, -20, 20);
			const pts: Pt[] = [];
			const segs = Math.round(len / 7);
			for (let s = 0; s <= segs; s++) {
				const t = s / segs - 0.5 + range(rng, -0.02, 0.02);
				const zig = s % 2 ? 2.4 : -2.4;
				pts.push([
					centre[0] + nx * len * t + Math.cos(ang) * (back + zig),
					centre[1] + ny * len * t + Math.sin(ang) * (back + zig)
				]);
			}
			const d = pathOf(pts);
			features.push({ k: "path", d, stroke: P.c("berm", 0.25), sw: 3.2, fill: "none", op: mode === "sar" ? 0.9 : 0.7 });
			features.push({ k: "path", d, stroke: P.c("trench"), sw: 1.6, fill: "none" });
			allPts.push(...pts);
		}
		detections.push({
			...box(allPts, 3),
			label: lines > 1 ? `TRENCH SYSTEM ×${lines}` : "TRENCH LINE",
			detail: `FORT L${L}`,
			kind: "structure",
			icon: "fort",
			prio: 3
		});
		// Bunkers behind the lines.
		const bunkers = Math.min(10, L * 2);
		const bpts: Pt[] = [];
		for (let b = 0; b < bunkers; b++) {
			const t = (b + 0.5) / bunkers - 0.5;
			const p: Pt = [centre[0] + nx * 120 * t - Math.cos(ang) * 22, centre[1] + ny * 120 * t - Math.sin(ang) * 22];
			bpts.push(p);
			features.push({
				k: "rect",
				x: r1(p[0] - 2.2),
				y: r1(p[1] - 2.2),
				w: 4.4,
				h: 4.4,
				fill: P.c("concrete"),
				stroke: P.c("berm"),
				sw: 1
			});
		}
		if (bunkers >= 4)
			detections.push({
				...box(bpts, 4),
				label: "BUNKERS",
				detail: `×${bunkers}`,
				kind: "structure",
				icon: "fort",
				prio: 4
			});
		if (L >= 6) {
			// Dragon's teeth: staggered rows of concrete blocks.
			const tpts: Pt[] = [];
			for (let r = 0; r < 3; r++) {
				for (let t = 0; t < 18; t++) {
					const u = t / 17 - 0.5;
					const p: Pt = [
						centre[0] + nx * 130 * u + Math.cos(ang) * (30 + r * 3) + (r % 2) * nx * 3,
						centre[1] + ny * 130 * u + Math.sin(ang) * (30 + r * 3) + (r % 2) * ny * 3
					];
					tpts.push(p);
				}
			}
			features.push({
				k: "path",
				d: tpts.map((p) => `M${r1(p[0])} ${r1(p[1])}h1.2v1.2h-1.2z`).join(""),
				fill: P.c("concrete", 0.3)
			});
			detections.push({
				...box(tpts, 3),
				label: "DRAGON'S TEETH",
				detail: null,
				kind: "structure",
				icon: "fort",
				prio: 5
			});
		}
		if (L >= 10) {
			const d = `M${r1(centre[0] - nx * 160 + Math.cos(ang) * 44)} ${r1(centre[1] - ny * 160 + Math.sin(ang) * 44)}l${r1(nx * 320)} ${r1(ny * 320)}`;
			features.push({ k: "path", d, stroke: P.c("berm", 0.3), sw: 5, fill: "none", op: 0.7 });
			features.push({ k: "path", d, stroke: P.c("trench", -0.2), sw: 2.6, fill: "none" });
		}
	}
	if (bld && bld.economy > 0) {
		// Industry and a power plant: big roofs, cooling towers (hot in IR).
		const c = spot(40, (p) => !forestIn(p));
		anchors.industry!.push(c);
		const pts: Pt[] = [];
		const halls = Math.min(6, 1 + Math.ceil(bld.economy / 2));
		for (let k = 0; k < halls; k++) {
			const p: Pt = [c[0] + (k % 3) * 16 - 16, c[1] + Math.floor(k / 3) * 13 - 6];
			pts.push(p, [p[0] + 13, p[1] + 9]);
			if (shadowLen)
				features.push({
					k: "rect",
					x: r1(p[0] + sdx * 3),
					y: r1(p[1] + sdy * 3),
					w: 13,
					h: 9,
					fill: EO.shadow,
					op: 0.45
				});
			features.push({
				k: "rect",
				x: r1(p[0]),
				y: r1(p[1]),
				w: 13,
				h: 9,
				fill: P.hot("roof", 0.66, k % 2 ? 0.3 : -0.3)
			});
			if (mode === "sar") features.push({ k: "rect", x: r1(p[0] - 1), y: r1(p[1]), w: 1.6, h: 9, fill: grey(1) });
		}
		if (bld.economy >= 3) {
			for (let k = 0; k < 2; k++) {
				const t: Pt = [c[0] + 34, c[1] - 4 + k * 13];
				pts.push(t);
				features.push({
					k: "circle",
					x: r1(t[0]),
					y: r1(t[1]),
					r: 5,
					fill: P.hot("concrete", 0.7),
					stroke: P.c("concrete", -0.3),
					sw: 1
				});
				features.push({
					k: "circle",
					x: r1(t[0]),
					y: r1(t[1]),
					r: 3,
					fill: mode === "ir" ? grey(0.92) : P.c("shadow"),
					op: 0.8,
					fx: mode === "ir" ? "glow" : undefined
				});
				if (mode === "eo" && !night)
					effects.push({
						k: "ellipse",
						x: r1(t[0] + 10),
						y: r1(t[1] - 4),
						rx: 12,
						ry: 5,
						fill: "#f2f2ef",
						op: 0.55,
						fx: "cloud"
					});
			}
		}
		detections.push({
			...box(pts, 4),
			label: bld.economy >= 3 ? "POWER / INDUSTRY" : "INDUSTRY",
			detail: `PWR L${bld.economy}`,
			kind: "structure",
			icon: "industry",
			prio: 6
		});
	}
	if (bld && bld.hospitals > 0) {
		const c = spot(16, (p) => !forestIn(p));
		anchors.hospital!.push(c);
		features.push({ k: "rect", x: r1(c[0] - 8), y: r1(c[1] - 6), w: 16, h: 12, fill: P.c("roof", 0.5) });
		if (mode === "eo")
			features.push({
				k: "path",
				d: `M${r1(c[0] - 1.2)} ${r1(c[1] - 4)}h2.4v2.8h2.8v2.4h-2.8v2.8h-2.4v-2.8h-2.8v-2.4h2.8z`,
				fill: "#c0392b"
			});
		detections.push({
			...box(
				[
					[c[0] - 8, c[1] - 6],
					[c[0] + 8, c[1] + 6]
				],
				3
			),
			label: "HOSPITAL",
			detail: "PROTECTED",
			kind: "structure",
			icon: "hospital",
			prio: 2
		});
	}
	if (bld && bld.radar && bld.radar > 0) {
		// Air-defence radars: a dish on a pad with its shelter beside it, one
		// station per coverage level. They are what SEAD comes for.
		const stations = Math.min(3, bld.radar);
		const pts: Pt[] = [];
		for (let k = 0; k < stations; k++) {
			const c = spot(34, (p) => !forestIn(p));
			anchors.radar!.push(c);
			pts.push(c);
			features.push({ k: "circle", x: r1(c[0]), y: r1(c[1]), r: 10, fill: P.c("dirt", 0.3) });
			features.push({ k: "rect", x: r1(c[0] + 8), y: r1(c[1] - 4), w: 9, h: 8, fill: P.c("roof", 0.55) });
			features.push({
				k: "circle",
				x: r1(c[0]),
				y: r1(c[1]),
				r: 6.5,
				fill: mode === "ir" ? grey(0.82) : mode === "sar" ? grey(0.9) : P.c("concrete", -0.1),
				stroke: P.c("concrete"),
				sw: 1
			});
			features.push({
				k: "path",
				d: `M${r1(c[0] - 6.5)} ${r1(c[1])}a6.5 6.5 0 0 1 13 0`,
				stroke: mode === "ir" ? grey(1) : "#e8e4dc",
				sw: 1.4,
				fill: "none"
			});
			features.push({ k: "circle", x: r1(c[0]), y: r1(c[1] + 2), r: 1.4, fill: P.c("metal", 0.4) });
		}
		detections.push({
			...box(pts, 12),
			label: stations > 1 ? `AIR DEFENCE RADAR ×${stations}` : "AIR DEFENCE RADAR",
			detail: `RADAR L${bld.radar}`,
			kind: "structure",
			icon: "radar",
			prio: 1
		});
	}
	if (bld && bld.underConstruction > 0) {
		const c = spot(16);
		const pts: Pt[] = [];
		for (let k = 0; k < Math.min(3, bld.underConstruction); k++) {
			const p: Pt = [c[0] + k * 13 - 13, c[1] + (k % 2) * 6];
			pts.push(p, [p[0] + 10, p[1] + 8]);
			features.push({
				k: "rect",
				x: r1(p[0]),
				y: r1(p[1]),
				w: 10,
				h: 8,
				fill: P.c("dirt", 0.35),
				stroke: P.c("concrete"),
				sw: 0.6,
				dash: "1.5 1"
			});
			features.push({ k: "rect", x: r1(p[0] + 2), y: r1(p[1] + 2), w: 2, h: 2, fill: P.c("concrete") });
		}
		detections.push({
			...box(pts, 3),
			label: "CONSTRUCTION",
			detail: `×${bld.underConstruction}`,
			kind: "structure",
			icon: "build",
			prio: 7
		});
	}

	// ── Strike damage and battle impacts ──
	const smokeAng = (hash32(input.regionId, window, 0x31d) % 360) * (Math.PI / 180);
	function craterField(c: Pt, n: number, spread: number, ageH: number, big: boolean) {
		const pts: Pt[] = [];
		for (let k = 0; k < n; k++) {
			const p: Pt = [c[0] + range(rng, -spread, spread), c[1] + range(rng, -spread, spread)];
			pts.push(p);
			const r = big ? range(rng, 3.5, 5.5) : range(rng, 1.4, 2.8);
			const fresh = clamp(1 - ageH / 48);
			if (mode === "eo") {
				objects.push({
					k: "circle",
					x: r1(p[0]),
					y: r1(p[1]),
					r: r1(r * 1.6),
					fill: "#a99d82",
					op: 0.2 + 0.2 * fresh,
					fx: "soft"
				});
				objects.push({ k: "circle", x: r1(p[0]), y: r1(p[1]), r: r1(r), fill: EO.crater, op: 0.85, fx: "soft" });
			} else if (mode === "ir") {
				objects.push({
					k: "circle",
					x: r1(p[0]),
					y: r1(p[1]),
					r: r1(r * 1.4),
					fill: grey(0.4 + 0.45 * clamp(1 - ageH / 8)),
					fx: "soft"
				});
			} else {
				objects.push({ k: "circle", x: r1(p[0]), y: r1(p[1]), r: r1(r), fill: grey(0.06), stroke: grey(0.8), sw: 1 });
			}
		}
		return pts;
	}
	function fire(c: Pt, size: number) {
		const r = size;
		if (mode === "ir") {
			lights.push({ k: "circle", x: r1(c[0]), y: r1(c[1]), r: r1(r * 1.6), fill: grey(1), fx: "glow" });
		} else if (mode === "eo") {
			effects.push({ k: "circle", x: r1(c[0]), y: r1(c[1]), r: r1(r * 2.4), fill: EO.scorch, op: 0.6, fx: "soft" });
			const fireDot: Prim = { k: "circle", x: r1(c[0]), y: r1(c[1]), r: r1(r), fill: "#ff8f2e", fx: "glow" };
			(night ? lights : effects).push(fireDot);
			if (!night) {
				// Smoke drifting downwind.
				for (let k = 1; k <= 4; k++) {
					const p: Pt = [c[0] + Math.cos(smokeAng) * k * 7 * r * 0.4, c[1] + Math.sin(smokeAng) * k * 7 * r * 0.4];
					effects.push({
						k: "ellipse",
						x: r1(p[0]),
						y: r1(p[1]),
						rx: r1(r * (1 + k * 0.7)),
						ry: r1(r * (0.7 + k * 0.4)),
						fill: k < 2 ? "#3a3632" : "#8d8a85",
						op: 0.55 - k * 0.08,
						fx: "cloud",
						tf: `rotate(${r1(deg(smokeAng))} ${r1(p[0])} ${r1(p[1])})`
					});
				}
			}
		} else {
			objects.push({ k: "circle", x: r1(c[0]), y: r1(c[1]), r: r1(r), fill: grey(0.6) });
		}
	}
	const strikes = (input.strikes ?? [])
		.filter((s) => s.hoursBefore >= 0 && s.hoursBefore <= 48 && s.outcome !== "intercepted")
		.slice(0, 4);
	if (f.outcome === "ok") {
		for (const s of strikes) {
			const sr = seededRandom(hash32(s.id, 0xc2a7));
			const anchorList =
				s.target === "fortifications"
					? anchors.fort
					: s.target === "air_defence"
						? anchors.sam
						: s.target === "radar"
							? anchors.radar
							: s.target === "power_grid" || s.target === "industry"
								? anchors.industry
								: s.target === "hospital"
									? anchors.hospital
									: s.target === "units"
										? anchors.units
										: undefined;
			let c: Pt | undefined = anchorList?.length ? anchorList[Math.floor(sr() * anchorList.length)] : undefined;
			if (!c && s.target === "bridges" && terrain.bridge && inView(terrain.bridge)) c = terrain.bridge;
			if (!c && (s.target === "logistics" || s.target === "bridges")) {
				for (let k = 0; k < 20 && !c; k++) {
					const q = along(mainRoad.pts, 0.15 + sr() * 0.7).p;
					if (inView(q, 40)) c = q;
				}
			}
			if (!c) c = toWorld([lerp(120, FRAME_W - 120, sr()), lerp(110, FRAME_H - 110, sr())]);
			if (s.outcome === "miss")
				c = [c[0] + (sr() < 0.5 ? -1 : 1) * range(sr, 30, 50), c[1] + (sr() < 0.5 ? -1 : 1) * range(sr, 20, 40)];
			const big = s.weapon.includes("missile");
			const n = s.outcome === "hit" ? (big ? 2 : 5) : s.outcome === "partial" ? (big ? 1 : 3) : 2;
			const pts = craterField(c, n, big ? 8 : 12, s.hoursBefore, big);
			const burning = s.hoursBefore < 6 && s.outcome !== "miss";
			if (burning)
				for (let k = 0; k < (s.outcome === "hit" ? 2 : 1); k++)
					fire([c[0] + range(rng, -6, 6), c[1] + range(rng, -6, 6)], range(rng, 1.8, 3));
			detections.push({
				...box(pts, 6),
				label: burning ? "STRIKE · FIRES" : "IMPACT CRATERS",
				detail: `${n} crater${n === 1 ? "" : "s"} · ${Math.round(s.hoursBefore)}h ago`,
				kind: "damage",
				icon: burning ? "fire" : "crater",
				prio: 2
			});
		}
		if (moving && f.outcome === "ok") {
			// The contact area: shell holes and a burning wreck or two.
			const c = spot(30);
			const pts = craterField(c, 10, 28, 3, false);
			if (f.battle?.phase === "active") for (let k = 0; k < 2; k++) fire(pts[k * 3]!, 1.6);
			detections.push({
				...box(pts, 4),
				label: "CONTACT AREA",
				detail: "SHELLING",
				kind: "damage",
				icon: "crater",
				prio: 3
			});
		}
	}

	// ── Atmosphere: clouds, rain, haze, darkness ──
	const atmosphere: Prim[] = [];
	const cloudCover =
		mode === "sar"
			? 0
			: platform === "satellite"
				? ({ clear: 0.06, cloudy: 0.9, rain: 0.96, fog: 0 }[weather as "clear"] ?? 0)
				: ({ clear: 0, cloudy: 0.12, rain: 0.28, fog: 0 }[weather as "clear"] ?? 0);
	const effectiveCover =
		f.outcome === "obscured" && !night && mode === "eo" && weather !== "fog" ? Math.max(cloudCover, 0.92) : cloudCover;
	// Fair-weather cumulus is thin; overcast is a solid deck.
	const cloudOpacity = weather === "clear" ? 0.5 : mode === "eo" ? 0.93 : 0.55;
	let clouded = 0;
	if (effectiveCover > 0) {
		const cr = seededRandom(hash32(input.regionId, window, 0xc10d));
		const gx = 8;
		const gy = 5;
		// Smooth noise on a coarse lattice, then the top share of cells is cloud.
		const lat: number[][] = [];
		for (let j = 0; j <= 3; j++) lat.push([0, 0, 0, 0, 0].map(() => cr()));
		const val = (i: number, j: number) => {
			const u = (i / gx) * 4;
			const v = (j / gy) * 3;
			const i0 = Math.min(3, Math.floor(u));
			const j0 = Math.min(2, Math.floor(v));
			const fu = u - i0;
			const fv = v - j0;
			const a = lerp(lat[j0]![i0]!, lat[j0]![i0 + 1]!, fu);
			const b = lerp(lat[j0 + 1]![i0]!, lat[j0 + 1]![i0 + 1]!, fu);
			return lerp(a, b, fv) + cr() * 0.15;
		};
		const cells: { i: number; j: number; v: number }[] = [];
		for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) cells.push({ i, j, v: val(i, j) });
		cells.sort((a, b) => b.v - a.v);
		const chosen = cells.slice(0, Math.round(effectiveCover * cells.length));
		clouded = chosen.length / cells.length;
		const cw = FRAME_W / gx;
		const ch = FRAME_H / gy;
		const cloudFill = mode === "ir" ? grey(0.18) : "#f4f4f2";
		const shadows: Prim[] = [];
		for (const c of chosen) {
			for (let k = 0; k < 2; k++) {
				const x = (c.i + 0.5) * cw + range(cr, -18, 18);
				const y = (c.j + 0.5) * ch + range(cr, -14, 14);
				const small = weather === "clear" ? 0.45 : 1;
				const rx = range(cr, 50, 72) * small;
				const ry = range(cr, 40, 58) * small;
				atmosphere.push({
					k: "ellipse",
					x: r1(x),
					y: r1(y),
					rx: r1(rx),
					ry: r1(ry),
					fill: cloudFill,
					op: cloudOpacity,
					fx: "cloud"
				});
				if (mode === "eo" && effectiveCover < 0.8)
					shadows.push({
						k: "ellipse",
						x: r1(x + 26),
						y: r1(y + 18),
						rx: r1(rx * 0.9),
						ry: r1(ry * 0.9),
						fill: "#0a0c0a",
						op: 0.35,
						fx: "cloud"
					});
			}
		}
		atmosphere.unshift(...shadows);
		notes.push(`Cloud ${Math.round(clouded * 100)}% of frame`);
	}
	if (weather === "rain" && mode !== "sar" && platform === "drone") {
		const rr = seededRandom(hash32(input.reportId, 0x7a1));
		const d: string[] = [];
		for (let k = 0; k < 70; k++) {
			const x = range(rr, 0, FRAME_W);
			const y = range(rr, 0, FRAME_H);
			d.push(`M${r1(x)} ${r1(y)}l-3 9`);
		}
		atmosphere.push({ k: "path", d: d.join(""), stroke: mode === "ir" ? grey(0.6) : "#d8dde0", sw: 0.6, op: 0.45 });
	}
	const haze =
		mode === "sar"
			? 0
			: weather === "fog"
				? mode === "eo"
					? platform === "satellite"
						? 0.68
						: 0.5
					: 0.22
				: weather === "rain"
					? mode === "eo"
						? 0.3
						: 0.18
					: weather === "cloudy" && mode === "eo"
						? 0.1
						: mode === "ir" && platform === "satellite"
							? 0.06
							: 0.03;
	const darkness = mode === "eo" && night ? (platform === "satellite" ? 0.96 : 0.84) : 0;
	if (night && mode === "eo") notes.push("Night: low-light imagery");
	if (night && mode === "ir") notes.push("Night: cold background, strong thermal contrast");
	if (weather === "fog") notes.push(mode === "sar" ? "Fog: no effect on radar" : "Fog: contrast reduced");
	if (moving) notes.push("Battle in progress: units on the move");
	const visibility = r1((1 - clouded * cloudOpacity) * (1 - haze) * 100) / 100;

	const baseLum =
		mode === "eo"
			? lum(kind === "desert" ? EO.sand : kind === "mountain" ? EO.rock : kind === "urban" ? EO.urban : EO.grass)
			: mode === "ir"
				? irTemp(baseMat, night)
				: SAR[baseMat];
	const cloudLum = mode === "ir" ? 0.18 : 0.95;
	let brightness = lerp(baseLum, cloudLum, clouded * cloudOpacity);
	brightness = lerp(brightness, mode === "ir" ? 0.5 : 0.8, haze);
	brightness *= 1 - darkness;

	const viewTf =
		view.zoom === 1 && view.heading === 0
			? ""
			: `translate(${FRAME_W / 2} ${FRAME_H / 2}) scale(${view.zoom}) rotate(${-view.heading}) translate(${r1(-view.cx)} ${r1(-view.cy)})`;
	const metersPerPx = platform === "drone" ? 2.5 / view.zoom : 2.5;
	const meters = platform === "drone" ? 100 : 200;

	const relief = kind === "mountain" ? 1 : kind === "hills" ? 0.6 : kind === "desert" ? 0.25 : 0.12;
	const canopy =
		mode === "eo"
			? { base: EO.forest, light: shade(EO.forest, 0.35), dark: shade(EO.forest, -0.45) }
			: mode === "ir"
				? {
						base: grey(irTemp("forest", night)),
						light: grey(irTemp("forest", night) + 0.035),
						dark: grey(irTemp("forest", night) - 0.035)
					}
				: { base: grey(0.5), light: grey(0.6), dark: grey(0.4) };

	detections.sort((a, b) => a.prio - b.prio);
	return {
		mode,
		status: f.outcome,
		platform,
		w: FRAME_W,
		h: FRAME_H,
		seed: hash32(input.regionId, 0x5eed) % 1000,
		view: viewTf,
		heading: view.heading,
		base,
		relief: mode === "sar" ? Math.min(1, relief * 1.4) : relief,
		reliefAzimuth: mode === "sar" ? 180 : sunAz - 90,
		reliefElevation: mode === "sar" ? 22 : 40,
		canopy,
		furrow: mode === "eo" ? "#2a2a1a" : mode === "ir" ? grey(0.2) : grey(0.8),
		ground,
		features,
		objects,
		effects,
		atmosphere,
		lights,
		detections: (f.outcome === "ok" ? detections : detections.filter((d) => d.kind === "site"))
			.slice(0, MAX_DETECTIONS)
			.map(({ prio: _p, ...d }) => d),
		tone: {
			darkness,
			haze,
			hazeColor: mode === "ir" ? grey(0.45) : "#c9ccce",
			grain: mode === "eo" ? (night ? 0.55 : 0.12) : mode === "ir" ? 0.22 : 0,
			blur: mode === "ir" ? (platform === "satellite" ? 0.9 : 0.4) : 0,
			vignette: platform === "drone" ? 0.45 : 0.15,
			speckle: mode === "sar" ? 1 : 0,
			static: f.outcome === "intercepted" ? 0.8 : 0
		},
		visibility,
		brightness: Math.round(brightness * 1000) / 1000,
		scale: { meters, px: meters / metersPerPx },
		sprites,
		notes
	};
}
