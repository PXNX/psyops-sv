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
	/** Infrastructure level (public): how built-up the ground looks. */
	infrastructure?: number | null;
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
	| "build"
	| "ship"
	| "sub"
	| "mine";

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

/** Where a sprite was put (world coordinates): its footprint and whether it belongs on land or water. */
export interface Placement {
	what: string;
	on: "land" | "water";
	foot: [number, number][];
}

/** Ship size classes: hull length and beam in frame units. */
export type ShipClass = "dinghy" | "fishing" | "patrol" | "frigate" | "freighter";
export const SHIP: Record<ShipClass, { len: number; beam: number }> = {
	dinghy: { len: 6, beam: 2.2 },
	fishing: { len: 11, beam: 3.4 },
	patrol: { len: 16, beam: 3.6 },
	frigate: { len: 28, beam: 4.8 },
	freighter: { len: 36, beam: 6.6 }
};

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
		/** Low-sun colour cast (dawn, dusk), multiplied over the frame. */
		tint: { color: string; op: number } | null;
		/** Snow on the ground (0-1). */
		snow: number;
	};
	/** Share of the frame not hidden by cloud or haze (0-1). */
	visibility: number;
	/** Rough mean brightness of the frame as shown (0-1). */
	brightness: number;
	/** Scale bar: `meters` spans `px` frame units. */
	scale: { meters: number; px: number };
	/** Sprites drawn for units (bounded). */
	sprites: number;
	/** Every sprite's footprint, for checking land and water placement. */
	placements?: Placement[];
	/** Sun azimuth and elevation (degrees) for the HUD; absent on night or radar frames. */
	sun?: { az: number; el: number } | null;
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

/** Points on the Catmull-Rom curve through pts: what smoothPath draws, as a polyline. */
function densify(pts: Pt[], per = 6): Pt[] {
	if (pts.length < 3) return pts;
	const out: Pt[] = [];
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
		for (let k = 0; k < per; k++) {
			const t = k / per;
			const t2 = t * t;
			const t3 = t2 * t;
			const f = (a: number, b: number, c: number, d: number) =>
				0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
			out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
		}
	}
	out.push(pts[pts.length - 1]!);
	return out;
}

/** Circle sub-paths: many round blobs in one path node. */
const blobs = (cs: [number, number, number][]) =>
	cs
		.map(
			([x, y, r]) =>
				`M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`
		)
		.join("");

const pathOfClosed = (pts: Pt[]) => pathOf(pts, true);

/** The outline scaled towards its centroid by f. */
function shrink(pts: Pt[], f: number): Pt[] {
	const [cx, cy] = centroid(pts);
	return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
}

/** Eight points on a circle of radius r around p (footprint checks). */
const ring = (p: Pt, r: number, n = 8): Pt[] =>
	Array.from({ length: n }, (_, k) => [
		p[0] + Math.cos((k / n) * Math.PI * 2) * r,
		p[1] + Math.sin((k / n) * Math.PI * 2) * r
	]);

/** A closed outline as the dense polygon of the smooth curve through pts. */
function densifyClosed(pts: Pt[], per = 4): Pt[] {
	const n = pts.length;
	const loop = [pts[n - 1]!, ...pts, pts[0]!, pts[1]!];
	// Catmull-Rom over the wrapped list, keeping only the segments of the loop proper.
	return densify(loop, per).slice(per, per * (n + 1));
}

const centroid = (pts: Pt[]): Pt => [
	pts.reduce((n, p) => n + p[0], 0) / pts.length,
	pts.reduce((n, p) => n + p[1], 0) / pts.length
];

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

type Season = "winter" | "spring" | "summer" | "autumn";

/** Meteorological season at a latitude (flipped south of the equator). */
function seasonAt(lat: number | null, at: Date): Season {
	const m = (at.getUTCMonth() + ((lat ?? 45) < 0 ? 6 : 0)) % 12;
	return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
}

/**
 * Snow on the ground (0-1): deep winter at high latitudes and in the
 * mountains, the shoulder months only far north or high up. Fixed per region
 * and week so passes agree; rain washes it to slush.
 */
function snowCover(lat: number | null, terrain: string, at: Date, weather: string): number {
	if (lat == null) return 0;
	const a = Math.abs(lat);
	const m = (at.getUTCMonth() + (lat < 0 ? 6 : 0)) % 12;
	const high = terrain === "mountain" ? 12 : terrain === "hills" ? 5 : 0;
	const deep = m === 11 || m <= 1;
	const shoulder = m === 10 || m === 2;
	const reach = a + high;
	const cover = deep ? clamp((reach - 44) / 8) : shoulder ? clamp((reach - 54) / 8) : 0;
	return weather === "rain" ? cover * 0.4 : cover;
}

/** How much snow settles on a material (0-1). */
const SNOW_HOLD: Partial<Record<Material, number>> = {
	grass: 0.9,
	field: 0.92,
	dirt: 0.85,
	sand: 0.7,
	rock: 0.6,
	roof: 0.7,
	urban: 0.4,
	berm: 0.8,
	track: 0.35
};

class Painter {
	constructor(
		readonly mode: ImageMode,
		readonly night: boolean,
		/** Snow on the ground, 0-1. */
		readonly snow = 0,
		/** Rain-darkened ground, 0-1. */
		readonly wet = 0
	) {}
	/** Colour of a material, with a small variation v in [-1, 1]. */
	c(m: Material, v = 0, hex?: string): string {
		const hold = (SNOW_HOLD[m] ?? 0) * this.snow;
		// Snow reads cold in IR and smooths the radar return a little.
		if (this.mode === "ir") return grey(irTemp(m, this.night) - hold * 0.1 + v * 0.04);
		if (this.mode === "sar") return grey(SAR[m] - hold * 0.06 + v * 0.07);
		const [r, g, b] = hexRgb(hex ?? EO[m]);
		const f = (1 + v * 0.12) * (1 - this.wet * (m === "water" ? 0 : 0.18));
		const snow = [232 + v * 10, 236 + v * 10, 240 + v * 8];
		return rgb(lerp(r * f, snow[0]!, hold), lerp(g * f, snow[1]!, hold), lerp(b * f, snow[2]!, hold));
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
	use: "field" | "forest" | "urban" | "park" | "bare" | "rock" | "water" | "sand";
	tone: number;
	furrow: number;
}
interface Road {
	pts: Pt[];
	width: number;
	paved: boolean;
}
interface Terrain {
	kind: "plains" | "desert" | "forest" | "urban" | "hills" | "mountain" | "lake" | "shore" | "city" | "town" | "fields";
	cells: Cell[];
	roads: Road[];
	river: { pts: Pt[]; width: number } | null;
	bridge: Pt | null;
	buildings: { x: number; y: number; w: number; h: number; rot: number; tone: number }[];
	dunes: Pt[][];
	/** A lake or the sea off one edge: a smooth shoreline over the cell patchwork. */
	waterbody: Pt[] | null;
	/** Coastal regions: the shoreline and which edge of the frame the sea is on. */
	coast: { pts: Pt[]; side: Side } | null;
	/** Contour lines on ridges and surf lines along a shore. */
	contours: Pt[][];
	/** Ponds in the patchwork, as closed outlines. */
	ponds: Pt[][];
	/** Where a road crosses the river: centre, heading (radians), span and deck width. */
	bridges: { p: Pt; a: number; len: number; w: number }[];
	/** Where two roads meet. */
	junctions: { p: Pt; r: number }[];
	/** Hedgerow trees and copses: [x, y, r]. */
	trees: [number, number, number][];
	/** Piers: root on the shore, tip over the water. */
	piers: { a: Pt; b: Pt; w: number }[];
	/** True where the ground is water (sea, lake, pond, river). */
	water: (p: Pt) => boolean;
}

type Side = "left" | "right" | "top" | "bottom";

/** Move a point `n` units towards the sea off `side`. */
const seaward = (p: Pt, side: Side, n: number): Pt =>
	side === "left"
		? [p[0] - n, p[1]]
		: side === "right"
			? [p[0] + n, p[1]]
			: side === "top"
				? [p[0], p[1] - n]
				: [p[0], p[1] + n];

/** The two outer corners that close a sea polygon off `side`, in order after the coast. */
function seaCorners(side: Side): Pt[] {
	const L = -MARGIN;
	const R = FRAME_W + MARGIN;
	const T = -MARGIN;
	const B = FRAME_H + MARGIN;
	return side === "left"
		? [
				[L, B],
				[L, T]
			]
		: side === "right"
			? [
					[R, B],
					[R, T]
				]
			: side === "top"
				? [
						[R, T],
						[L, T]
					]
				: [
						[R, B],
						[L, B]
					];
}

const TERRAIN_KIND: Record<string, Terrain["kind"]> = {
	plains: "plains",
	desert: "desert",
	forest: "forest",
	jungle: "forest",
	urban: "urban",
	hills: "hills",
	mountain: "mountain",
	lake: "lake",
	shore: "shore",
	city: "city",
	town: "town",
	fields: "fields"
};

// Finer patchwork than the first version: more detail in the frame without
// storing an image. Every scene is still drawn procedurally from a seed, so
// imagery costs a few SVG nodes and zero database bytes.
const COLS = 12;
const ROWS = 7;
const MARGIN = 120;

/**
 * A region's ground, the same on every pass. `infrastructure` (0-5, null when
 * unknown) thins or fills the settlements.
 */
function makeTerrain(regionId: number, terrainName: string, infrastructure: number | null = null): Terrain {
	const rng = seededRandom(hash32(regionId, 0x7e11a1));
	const kind = TERRAIN_KIND[terrainName] ?? "plains";
	const built = infrastructure == null ? 1 : clamp(0.35 + infrastructure * 0.25, 0.35, 1.6);
	const harbour = (infrastructure ?? 1) >= 2;

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
		],
		// The lake itself is a basin over the patchwork; "water" cells are ponds.
		lake: [
			["field", 0.46],
			["forest", 0.26],
			["water", 0.14],
			["bare", 0.14]
		],
		// The sea itself is drawn over the patchwork (see the coast below).
		shore: [
			["field", 0.42],
			["sand", 0.16],
			["forest", 0.18],
			["urban", 0.12],
			["bare", 0.12]
		],
		city: [
			["urban", 0.86],
			["park", 0.08],
			["field", 0.06]
		],
		town: [
			["urban", 0.5],
			["field", 0.32],
			["park", 0.1],
			["forest", 0.08]
		],
		fields: [
			["field", 0.88],
			["forest", 0.06],
			["bare", 0.06]
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

	// The coast: the sea off one edge (seeded per region), a wavy shoreline
	// with a headland or a bay. Roads and buildings keep to the land.
	let coast: Terrain["coast"] = null;
	let sea: Pt[] | null = null;
	if (kind === "shore") {
		const side = (["left", "right", "top", "bottom"] as const)[Math.floor(rng() * 4)]!;
		const vertical = side === "left" || side === "right";
		const span = vertical ? FRAME_H : FRAME_W;
		const depth = vertical ? range(rng, 180, 250) : range(rng, 120, 165);
		const bumpAt = range(rng, 0.25, 0.75);
		const bump = (rng() < 0.5 ? -1 : 1) * range(rng, 40, vertical ? 90 : 60);
		const ph = rng() * 6;
		const pts: Pt[] = [];
		for (let k = 0; k <= 28; k++) {
			const t = k / 28;
			const a = -MARGIN + t * (span + 2 * MARGIN);
			const d =
				depth +
				Math.sin(t * 7 + ph) * 14 +
				Math.sin(t * 19 + ph * 2) * 5 +
				bump * Math.exp(-((t - bumpAt) ** 2) / 0.008);
			pts.push(
				side === "left" ? [d, a] : side === "right" ? [FRAME_W - d, a] : side === "top" ? [a, d] : [a, FRAME_H - d]
			);
		}
		coast = { pts, side };
		sea = [...pts, ...seaCorners(side)];
	}

	// A lake is a closed basin in the middle of the frame.
	let lake: Pt[] | null = null;
	if (kind === "lake") {
		const cx = range(rng, FRAME_W * 0.35, FRAME_W * 0.65);
		const cy = range(rng, FRAME_H * 0.35, FRAME_H * 0.65);
		const rx = range(rng, 130, 190);
		const ry = range(rng, 80, 125);
		lake = [];
		for (let k = 0; k < 24; k++) {
			const a = (k / 24) * Math.PI * 2;
			const wobble = range(rng, 0.88, 1.12);
			lake.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]);
		}
		lake = densifyClosed(lake);
	}
	const basin = sea ?? lake;
	const inBasin = (p: Pt) => !!basin && inPolygon(p, basin);
	/** A road's stretches on land; each keeps one point under the water so it reaches the shore. */
	const landRuns = (pts: Pt[]): Pt[][] => {
		if (!basin) return [pts];
		const runs: Pt[][] = [];
		let cur: Pt[] = [];
		for (let i = 0; i < pts.length; i++) {
			if (!inBasin(pts[i]!)) {
				if (!cur.length && i > 0) cur.push(pts[i - 1]!);
				cur.push(pts[i]!);
			} else if (cur.length) {
				cur.push(pts[i]!);
				runs.push(cur);
				cur = [];
			}
		}
		if (cur.length) runs.push(cur);
		return runs.filter((r) => r.length >= 2);
	};

	// Roads: a main road edge to edge, maybe a crossing road and dirt tracks.
	// On a coast the main road runs along the shore, inland of the beach.
	const landSpan = (horizontal: boolean): [number, number] => {
		if (!coast) return horizontal ? [90, 310] : [120, 520];
		const s = coast.side;
		if (horizontal) return s === "top" ? [215, 330] : s === "bottom" ? [70, 185] : [90, 310];
		return s === "left" ? [310, 560] : s === "right" ? [80, 330] : [120, 520];
	};
	const road = (horizontal: boolean, width: number, paved: boolean, wobble: number): Road => {
		const n = 6;
		const pts: Pt[] = [];
		const [lo, hi] = landSpan(horizontal);
		const start = range(rng, lo, hi);
		const end = range(rng, lo, hi);
		for (let k = 0; k <= n; k++) {
			const t = k / n;
			const off = lerp(start, end, t) + (k > 0 && k < n ? range(rng, -wobble, wobble) : 0);
			pts.push(horizontal ? [-60 + t * (FRAME_W + 120), off] : [off, -60 + t * (FRAME_H + 120)]);
		}
		return { pts, width, paved };
	};
	const dense = kind === "urban" || kind === "city" || kind === "town";
	const firstHorizontal = rng() < 0.6;
	const raw: Road[] = [
		road(
			coast ? coast.side === "top" || coast.side === "bottom" : firstHorizontal,
			dense ? 6 : 4,
			true,
			coast ? 25 : 40
		)
	];
	if (rng() < (dense || coast ? 0.95 : 0.55)) raw.push(road(!(raw[0]!.pts[0]![0] < 0), 3.5, true, 50));
	if ((dense && rng() < 0.7) || (coast && built > 1.1)) raw.push(road(rng() < 0.5, 3, true, 60));
	const tracks = dense ? 0 : 1 + Math.floor(rng() * 2);
	for (let k = 0; k < tracks; k++) raw.push(road(rng() < 0.5, 2, false, 80));
	// Roads are kept as the dense polyline of the curve that is drawn, so a
	// convoy placed along one sits on the drawn road. The main road stays first.
	const roads: Road[] = [];
	for (const r of raw) {
		const runs = landRuns(densify(r.pts, 5)).sort((a, b) => polylineLength(b) - polylineLength(a));
		for (const run of runs) if (polylineLength(run) > 25) roads.push({ ...r, pts: run });
	}
	if (!roads.length) roads.push({ ...raw[0]!, pts: densify(raw[0]!.pts, 5) });

	// A river in about a third of the regions (never in the mountains' rock,
	// and lakes and shores already have a waterbody).
	let river: Terrain["river"] = null;
	if (kind !== "mountain" && kind !== "lake" && kind !== "shore" && rng() < 0.4) {
		const pts: Pt[] = [];
		const x0 = range(rng, 140, 500);
		for (let k = 0; k <= 9; k++) {
			pts.push([x0 + Math.sin(k * 0.9 + rng()) * 60 + range(rng, -20, 20), -60 + (k / 9) * (FRAME_H + 120)]);
		}
		river = { pts: densify(pts, 6), width: range(rng, 9, 15) };
	}
	const inRiver = (p: Pt, pad = 0) => !!river && distToPolyline(p, river.pts) < river.width / 2 + pad;

	// Ponds: a "water" cell holds a rounded pond in wet meadow. Roads and the
	// river never run through one.
	const ponds: Pt[][] = [];
	for (const c of cells) {
		if (c.use !== "water") continue;
		const [cx, cy] = centroid(c.pts);
		const r = Math.min(cw, ch) * range(rng, 0.26, 0.38);
		const ph = rng() * 6;
		if (roads.some((rd) => distToPolyline([cx, cy], rd.pts) < r * 1.35 + rd.width) || inRiver([cx, cy], r * 1.4))
			continue;
		const blob: Pt[] = [];
		for (let k = 0; k < 16; k++) {
			const a = (k / 16) * Math.PI * 2;
			const w = 1 + Math.sin(a * 3 + ph) * 0.14;
			blob.push([cx + Math.cos(a) * r * w * 1.25, cy + Math.sin(a) * r * w]);
		}
		ponds.push(densifyClosed(blob, 3));
	}

	/** True where the ground is water. The drawn shapes and every placement use it. */
	const water = (p: Pt) => inBasin(p) || inRiver(p) || ponds.some((q) => inPolygon(p, q));

	// Bridges wherever a road crosses the river.
	const bridges: Terrain["bridges"] = [];
	if (river) {
		for (const r of roads) {
			let wet: number | null = null;
			for (let i = 0; i < r.pts.length; i++) {
				const hit = inRiver(r.pts[i]!, 3);
				if (hit && wet == null) wet = Math.max(0, i - 1);
				if (!hit && wet != null) {
					const a = r.pts[wet]!;
					const b = r.pts[i]!;
					bridges.push({
						p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
						a: Math.atan2(b[1] - a[1], b[0] - a[0]),
						len: dist(a, b) + 4,
						w: r.width + 3
					});
					wet = null;
				}
			}
		}
	}
	const bridge = bridges[0]?.p ?? null;

	// Junctions: where two roads meet, a widened pad.
	const junctions: Terrain["junctions"] = [];
	for (let i = 0; i < roads.length; i++) {
		for (let j = i + 1; j < roads.length; j++) {
			const A = roads[i]!.pts;
			const B = roads[j]!.pts;
			for (let s = 0; s < A.length - 1; s++) {
				for (let t = 0; t < B.length - 1; t++) {
					const [p, q] = [A[s]!, A[s + 1]!];
					const [u, v] = [B[t]!, B[t + 1]!];
					const den = (q[0] - p[0]) * (v[1] - u[1]) - (q[1] - p[1]) * (v[0] - u[0]);
					if (!den) continue;
					const ta = ((u[0] - p[0]) * (v[1] - u[1]) - (u[1] - p[1]) * (v[0] - u[0])) / den;
					const tb = ((u[0] - p[0]) * (q[1] - p[1]) - (u[1] - p[1]) * (q[0] - p[0])) / den;
					if (ta < 0 || ta > 1 || tb < 0 || tb > 1) continue;
					const x: Pt = [lerp(p[0], q[0], ta), lerp(p[1], q[1], ta)];
					if (!water(x)) junctions.push({ p: x, r: Math.max(roads[i]!.width, roads[j]!.width) * 0.9 + 1.5 });
				}
			}
		}
	}

	// Contour ridges in the hills and mountains, surf lines along a shore.
	const contours: Pt[][] = [];
	if (kind === "hills" || kind === "mountain") {
		for (let k = 0; k < (kind === "mountain" ? 7 : 4); k++) {
			const y = range(rng, -20, FRAME_H + 20);
			const pts: Pt[] = [];
			for (let s = 0; s <= 12; s++) pts.push([-40 + (s / 12) * (FRAME_W + 80), y + Math.sin(s * 0.7 + k * 1.9) * 16]);
			contours.push(pts);
		}
	}

	const nearWater = (p: Pt, r: number) => water(p) || ring(p, r).some(water);

	// City blocks: buildings in a rotated grid, inside urban cells.
	const buildings: Terrain["buildings"] = [];
	if (dense || kind === "plains" || kind === "hills" || kind === "fields" || kind === "shore" || kind === "lake") {
		const rot = range(rng, -12, 12);
		const step = kind === "city" ? 17 : kind === "town" ? 22 : dense ? 20 : kind === "shore" ? 20 : 30;
		const cap = Math.round(
			(kind === "city" ? 220 : kind === "town" ? 110 : dense ? 160 : kind === "shore" ? 70 : 26) * built
		);
		for (let y = 10; y < FRAME_H - 5 && buildings.length < cap; y += step) {
			for (let x = 10; x < FRAME_W - 5 && buildings.length < cap; x += step) {
				const p: Pt = [x + range(rng, -3, 3), y + range(rng, -3, 3)];
				const cell = cells.find((c) => inPolygon(p, c.pts));
				const urbanCell = cell?.use === "urban";
				// Villages along the main road outside cities.
				const village = kind !== "urban" && distToPolyline(p, roads[0]!.pts) < 22 && rng() < 0.35 * built;
				if (!urbanCell && !village) continue;
				const big = rng() < 0.2;
				const w = big ? range(rng, 12, 17) : range(rng, 6, 11);
				const h = big ? range(rng, 8, 12) : range(rng, 5, 9);
				const tone = rng();
				const mid: Pt = [p[0] + w / 2, p[1] + h / 2];
				if (nearWater(mid, Math.max(w, h) * 0.7 + 3)) continue;
				// Keep the beach clear.
				if (coast && distToPolyline(mid, coast.pts) < 14 + w / 2) continue;
				if (roads.some((r) => distToPolyline(p, r.pts) < r.width + 5)) continue;
				buildings.push({ x: p[0], y: p[1], w, h, rot, tone });
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

	// Trees: hedgerows strung along field edges and copses in field corners,
	// one SVG path for all of them.
	const trees: Terrain["trees"] = [];
	const treeCap = kind === "desert" || kind === "mountain" ? 15 : dense ? 60 : 170;
	for (const c of cells) {
		if (trees.length >= treeCap) break;
		if (c.use !== "field" && c.use !== "park") continue;
		if (rng() > (c.use === "park" ? 0.95 : 0.5)) continue;
		const e = Math.floor(rng() * 4);
		const a = c.pts[e]!;
		const b = c.pts[(e + 1) % 4]!;
		const n = 4 + Math.floor(rng() * 7);
		for (let k = 0; k < n; k++) {
			const t = (k + rng() * 0.7) / n;
			trees.push([
				lerp(a[0], b[0], t) + range(rng, -1.5, 1.5),
				lerp(a[1], b[1], t) + range(rng, -1.5, 1.5),
				range(rng, 1.6, 3)
			]);
		}
		if (rng() < (c.use === "park" ? 0.8 : 0.3)) {
			const [mx, my] = centroid(c.pts);
			const corner = c.pts[Math.floor(rng() * 4)]!;
			const q: Pt = [lerp(mx, corner[0], 0.55), lerp(my, corner[1], 0.55)];
			for (let k = 0; k < 5 + Math.floor(rng() * 5); k++)
				trees.push([q[0] + range(rng, -7, 7), q[1] + range(rng, -6, 6), range(rng, 1.8, 3.4)]);
		}
	}
	const keptTrees = trees.filter(
		([x, y, r]) =>
			!nearWater([x, y], r + 1) &&
			!(coast && distToPolyline([x, y], coast.pts) < 12) &&
			!roads.some((rd) => distToPolyline([x, y], rd.pts) < rd.width / 2 + r) &&
			!buildings.some((b) => Math.abs(b.x + b.w / 2 - x) < b.w / 2 + r && Math.abs(b.y + b.h / 2 - y) < b.h / 2 + r)
	);

	// Piers off a built-up coast or lake shore, reaching out over the water.
	const piers: Terrain["piers"] = [];
	if (harbour && coast) {
		const n = 1 + Math.floor(rng() * 3);
		const t0 = range(rng, 0.3, 0.55);
		for (let k = 0; k < n; k++) {
			const base = along(coast.pts, t0 + k * 0.07).p;
			piers.push({ a: seaward(base, coast.side, -5), b: seaward(base, coast.side, range(rng, 38, 58)), w: 4.5 });
		}
	} else if (harbour && lake) {
		const base = lake[Math.floor(rng() * lake.length)]!;
		const c = centroid(lake);
		const len = range(rng, 22, 30);
		const d = dist(base, c) || 1;
		const ux = (c[0] - base[0]) / d;
		const uy = (c[1] - base[1]) / d;
		piers.push({ a: [base[0] - ux * 4, base[1] - uy * 4], b: [base[0] + ux * len, base[1] + uy * len], w: 3.5 });
	}

	return {
		kind,
		cells,
		roads,
		river,
		bridge,
		bridges,
		junctions,
		buildings,
		dunes,
		waterbody: basin,
		coast,
		contours,
		ponds,
		trees: keptTrees,
		piers,
		water
	};
}

// ── Building the frame ──────────────────────────────────────────────────────

interface View {
	cx: number;
	cy: number;
	zoom: number;
	heading: number;
}

const CATEGORY_CAP: Record<string, number> = { vehicle: 24, artillery: 10, infantry: 16, air: 8, naval: 6 };

type VehicleKind = "tank" | "apc" | "truck" | "sam" | "spg";
/** Vehicle outlines in local units, front towards +x: hull, then turret/cab/launcher on top. */
const VEHICLES: Record<
	VehicleKind,
	{ len: number; beam: number; hull: string; top: string; paint: string; topPaint: string }
> = {
	tank: {
		len: 5.6,
		beam: 3,
		hull: "M-2.8 -1.5h5.2l0.4 0.4v2.2l-0.4 0.4h-5.2z",
		top: "M-1.4 0a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0zM0.8 -0.22h3.9v0.44h-3.9z",
		paint: "#66704a",
		topPaint: "#4f573a"
	},
	apc: {
		len: 5.4,
		beam: 2.7,
		hull: "M-2.7 -1.35h4.2l1.2 0.75v1.2l-1.2 0.75h-4.2z",
		top: "M-0.9 -0.65h1.3v1.3h-1.3zM0.4 -0.12h1.7v0.24h-1.7z",
		paint: "#6b7350",
		topPaint: "#50583c"
	},
	truck: {
		len: 5.8,
		beam: 2.3,
		hull: "M-2.9 -1.15h3.9v2.3h-3.9zM1.4 -1h1.5v2h-1.5z",
		top: "M-2.7 -0.95h3.5v1.9h-3.5z",
		paint: "#5d6444",
		topPaint: "#7d7a5a"
	},
	sam: {
		len: 6,
		beam: 2.6,
		hull: "M-3 -1.3h4.2v2.6h-4.2zM1.5 -1.1h1.5v2.2h-1.5z",
		top: "M-2.6 -0.9h3.4v0.7h-3.4zM-2.6 0.2h3.4v0.7h-3.4z",
		paint: "#626a48",
		topPaint: "#8a8c78"
	},
	spg: {
		len: 6,
		beam: 3,
		hull: "M-3 -1.5h5.4l0.6 0.5v2l-0.6 0.5h-5.4z",
		top: "M-2.6 -1.1h2.8v2.2h-2.8zM0.2 -0.2h5.2v0.4h-5.2z",
		paint: "#6a6f4a",
		topPaint: "#535939"
	}
};
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
	const hour = localHour(input.lon ?? 0, at);
	const season = seasonAt(input.lat, at);
	const snow = snowCover(input.lat, input.terrain, at, weather);
	const P = new Painter(mode, night, snow, weather === "rain" ? 1 : 0);
	const terrain = makeTerrain(
		input.regionId,
		input.terrain,
		input.infrastructure ?? f.buildings?.infrastructure ?? null
	);
	const moving = !!f.battle;

	// Camera: satellites look straight down, north up; drones zoom in on a
	// part of the region with a heading.
	// A drone is flown over land: the first aim point with dry ground around it.
	let view: View = { cx: FRAME_W / 2, cy: FRAME_H / 2, zoom: 1, heading: 0 };
	if (platform === "drone") {
		const heading = Math.round(range(rng, -25, 25));
		for (let k = 0; k < 16; k++) {
			const c: Pt = [range(rng, 190, 450), range(rng, 155, 245)];
			view = { cx: c[0], cy: c[1], zoom: 2.4, heading };
			if (!terrain.water(c) && ring(c, 40).filter(terrain.water).length <= 2) break;
		}
	}
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
	const sunAz = ((hour - 6) / 12) * 180 + 90; // 90° at 06h, 180° at noon, 270° at 18h
	const elev = Math.max(0.15, Math.sin(((hour - 6) / 12) * Math.PI));
	const diffuse = weather !== "clear" || night || mode !== "eo";
	const shadowLen = diffuse ? 0 : clamp(0.6 / elev, 0.6, 2.4);
	const sdx = Math.sin(((sunAz + 180) * Math.PI) / 180) * shadowLen;
	const sdy = -Math.cos(((sunAz + 180) * Math.PI) / 180) * shadowLen;

	// ── Ground ──
	const kind = terrain.kind;
	const baseMat: Material =
		kind === "desert" ? "sand" : kind === "urban" || kind === "city" || kind === "town" ? "urban" : "grass";
	const base = P.c(baseMat, 0, kind === "mountain" ? EO.rock : undefined);
	const forestIn = (p: Pt) => terrain.cells.some((c) => c.use === "forest" && inPolygon(p, c.pts));
	for (const cell of terrain.cells) {
		const d = pathOf(cell.pts, true);
		const v = cell.tone * 2 - 1;
		switch (cell.use) {
			case "field": {
				const hex = kind === "desert" ? "#7c8450" : EO_FIELDS[Math.floor(cell.tone * EO_FIELDS.length)]!;
				// A darker boundary reads as a hedgerow in the photo while the
				// same geometry stays identical in IR and SAR.
				ground.push({
					k: "path",
					d,
					fill: P.c("field", v, hex),
					stroke: P.c(mode === "eo" && cell.tone > 0.35 ? "grass" : "dirt", -0.4),
					sw: 0.6
				});
				if (mode !== "sar" || cell.tone > 0.5) ground.push({ k: "path", d, fill: `pat:furrow${cell.furrow}` });
				break;
			}
			case "water":
				// Wet meadow round a pond (the pond itself is drawn with the water).
				ground.push({ k: "path", d, fill: P.c("grass", 0.12 + v * 0.2, "#5f7048") });
				break;
			case "sand":
				ground.push({ k: "path", d, fill: P.c("sand", v, EO_DESERT[Math.floor(cell.tone * EO_DESERT.length)]!) });
				break;
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
	for (const contour of terrain.contours) {
		ground.push({
			k: "path",
			d: smoothPath(contour),
			stroke: P.c(kind === "shore" ? "sand" : "rock", 0.4),
			sw: 1.1,
			fill: "none",
			op: kind === "shore" ? 0.5 : 0.45
		});
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
	const water = terrain.water;
	const waterSurf = mode === "sar" ? grey(0.22) : mode === "ir" ? P.c("water", 0.8) : "#e9eeec";
	for (const pond of terrain.ponds) {
		const d = pathOfClosed(pond);
		features.push({ k: "path", d, fill: P.c("water", 0.5, "#41605e"), stroke: P.c("dirt", 0.15), sw: 1.6 });
		features.push({ k: "path", d: pathOfClosed(shrink(pond, 0.62)), fill: P.c("water", -0.1, "#2f4a4f"), op: 0.85 });
	}
	if (terrain.river) {
		const d = pathOf(terrain.river.pts);
		const w = terrain.river.width;
		// Muddy banks, shallows along both edges, the deep channel down the middle.
		features.push({ k: "path", d, stroke: P.c("dirt", -0.1, "#6f6648"), sw: w + 6, fill: "none", op: 0.7 });
		features.push({ k: "path", d, stroke: P.c("water", 0.7, "#4a6a66"), sw: w, fill: "none" });
		features.push({ k: "path", d, stroke: P.c("water", -0.2, "#283d43"), sw: w * 0.5, fill: "none" });
	}
	for (const road of terrain.roads) {
		const d = pathOf(road.pts);
		if (road.paved && road.width >= 3.5)
			features.push({ k: "path", d, stroke: P.c("dirt", 0.35), sw: road.width + 2, fill: "none", op: 0.55 });
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
	if (terrain.junctions.length)
		features.push({
			k: "path",
			d: blobs(terrain.junctions.map((j) => [j.p[0], j.p[1], j.r])),
			fill: P.c("asphalt", 0.08)
		});
	for (const b of terrain.bridges) {
		const tf = `rotate(${r1(deg(b.a))} ${r1(b.p[0])} ${r1(b.p[1])})`;
		const x = r1(b.p[0] - b.len / 2);
		const y = r1(b.p[1] - b.w / 2);
		if (shadowLen)
			features.push({
				k: "rect",
				x: r1(x + sdx * 2),
				y: r1(y + sdy * 2),
				w: r1(b.len),
				h: r1(b.w),
				fill: EO.shadow,
				op: 0.5,
				tf
			});
		features.push({
			k: "rect",
			x,
			y,
			w: r1(b.len),
			h: r1(b.w),
			fill: P.c("concrete"),
			stroke: P.c("concrete", -0.35),
			sw: 0.6,
			tf
		});
		if (mode === "sar") features.push({ k: "rect", x, y, w: r1(b.len), h: 1.2, fill: grey(1), tf });
	}

	// ── Lake or sea ──
	if (terrain.coast) {
		const { pts, side } = terrain.coast;
		const poly = (n: number) => pathOf([...pts.map((p) => seaward(p, side, n)), ...seaCorners(side)], true);
		// Beach: a wide sand stroke whose landward half shows past the water.
		features.push({ k: "path", d: smoothPath(pts), stroke: P.c("sand", 0.35, "#cdb98c"), sw: 22, fill: "none" });
		features.push({ k: "path", d: smoothPath(pts), stroke: P.c("sand", -0.25, "#a8936a"), sw: 9, fill: "none" });
		// Shallows to deep water.
		features.push({ k: "path", d: poly(0), fill: P.c("water", 0.9, "#3f6b6a") });
		features.push({ k: "path", d: poly(22), fill: P.c("water", 0.4, "#33545a") });
		features.push({ k: "path", d: poly(70), fill: P.c("water", 0, "#25393f") });
		features.push({ k: "path", d: poly(150), fill: P.c("water", -0.4, "#1d2e35") });
		// Surf: broken white lines along the beach (rougher in rain).
		for (const [n, op] of [
			[3, 0.8],
			[9, 0.5],
			[17, 0.3],
			[28, 0.18]
		] as const) {
			features.push({
				k: "path",
				d: smoothPath(pts.map((p) => seaward(p, side, n))),
				stroke: waterSurf,
				sw: weather === "rain" ? 1.6 : n < 5 ? 1.6 : 1.1,
				dash: `${9 + n} ${6 + n / 2}`,
				fill: "none",
				op
			});
		}
		if (snow > 0.3 && mode === "eo") notes.push("Snow cover inland; the coast is clear");
	} else if (terrain.waterbody) {
		const lake = terrain.waterbody;
		// Shallows round the edge, deeper water towards the middle.
		features.push({ k: "path", d: pathOfClosed(lake), fill: P.c("water", 0.75, "#3d6262") });
		features.push({ k: "path", d: pathOfClosed(shrink(lake, 0.86)), fill: P.c("water", 0.25, "#304c52") });
		features.push({ k: "path", d: pathOfClosed(shrink(lake, 0.6)), fill: P.c("water", -0.25, "#22363d") });
		// A bright shoreline and a few reeds make the edge readable in every band.
		features.push({ k: "path", d: pathOfClosed(lake), stroke: P.c("dirt", 0.35), sw: 2.4, fill: "none", op: 0.75 });
		features.push({
			k: "path",
			d: pathOfClosed(shrink(lake, 0.975)),
			stroke: waterSurf,
			sw: 0.8,
			fill: "none",
			op: 0.35,
			dash: "7 5"
		});
		const reeds: string[] = [];
		for (let k = 0; k < lake.length; k += 2) {
			const [x, y] = lake[k]!;
			reeds.push(`M${r1(x - 2)} ${r1(y)}l1 -4M${r1(x + 1)} ${r1(y)}l1 -5`);
		}
		features.push({ k: "path", d: reeds.join(""), stroke: P.c("grass", -0.4), sw: 0.8, fill: "none", op: 0.5 });
	}
	// Piers: concrete fingers out over the water, with bollards.
	for (const pier of terrain.piers) {
		const a = Math.atan2(pier.b[1] - pier.a[1], pier.b[0] - pier.a[0]);
		const len = dist(pier.a, pier.b);
		const tf = `rotate(${r1(deg(a))} ${r1(pier.a[0])} ${r1(pier.a[1])})`;
		if (shadowLen)
			features.push({
				k: "rect",
				x: r1(pier.a[0] + sdx * 1.5),
				y: r1(pier.a[1] - pier.w / 2 + sdy * 1.5),
				w: r1(len),
				h: pier.w,
				fill: EO.shadow,
				op: 0.45,
				tf
			});
		features.push({
			k: "rect",
			x: r1(pier.a[0]),
			y: r1(pier.a[1] - pier.w / 2),
			w: r1(len),
			h: pier.w,
			fill: P.c("concrete", 0.2),
			stroke: P.c("concrete", -0.3),
			sw: 0.5,
			tf
		});
		if (mode === "sar")
			features.push({
				k: "rect",
				x: r1(pier.a[0]),
				y: r1(pier.a[1] - pier.w / 2 - 1),
				w: r1(len),
				h: 1.2,
				fill: grey(1),
				tf
			});
	}

	// Settlements: lit windows at night (EO), warm roofs (IR).
	const lit = mode === "eo" && night;
	const powered = clamp((f.buildings?.economy ?? input.infrastructure ?? 2) / 3, 0.2, 1);
	for (const [bi, b] of terrain.buildings.entries()) {
		const tf = `rotate(${r1(b.rot)} ${r1(b.x)} ${r1(b.y)})`;
		if (lit && (bi * 7919) % 100 < 45 * powered)
			lights.push({
				k: "circle",
				x: r1(b.x + b.w / 2),
				y: r1(b.y + b.h / 2),
				r: b.w > 10 ? 1.3 : 0.8,
				fill: b.tone > 0.7 ? "#cfe3ff" : "#ffd58a",
				op: 0.55 + b.tone * 0.4,
				fx: "glow"
			});
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
		if (mode === "eo" && b.w > 8)
			features.push({
				k: "path",
				d: `M${r1(b.x + 1)} ${r1(b.y + b.h - 1.5)}h${r1(b.w - 2)}`,
				stroke: P.c("concrete", 0.6),
				sw: 0.8,
				fill: "none",
				op: 0.5,
				tf
			});
		if (mode === "sar") {
			// Double-bounce: bright facade facing the radar (west), shadow behind.
			features.push({ k: "rect", x: r1(b.x - 1), y: r1(b.y), w: 1.6, h: r1(b.h), fill: grey(1), tf });
			features.push({ k: "rect", x: r1(b.x + b.w), y: r1(b.y), w: 3, h: r1(b.h), fill: grey(0.02), tf, op: 0.9 });
		}
	}
	// Trees: shadows, crowns and a sunlit side, three paths for the lot.
	if (terrain.trees.length) {
		const t = terrain.trees;
		if (shadowLen)
			features.push({
				k: "path",
				d: blobs(t.map(([x, y, r]) => [x + sdx * r * 0.9, y + sdy * r * 0.9, r])),
				fill: EO.shadow,
				op: 0.45
			});
		features.push({
			k: "path",
			d: blobs(t),
			fill: P.c("forest", 0.05),
			stroke: mode === "eo" ? P.c("forest", -0.5) : undefined,
			sw: 0.4
		});
		if (mode !== "sar")
			features.push({
				k: "path",
				d: blobs(t.map(([x, y, r]) => [x - sdx * r * 0.25 - 0.3, y - sdy * r * 0.25 - 0.3, r * 0.5])),
				fill: P.c("forest", 0.6),
				op: 0.5
			});
	}

	// ── Placement ──
	// Everything on the ground keeps to land, every hull to water; the
	// placements are recorded so tests can check them against the terrain.
	const placed: { p: Pt; r: number }[] = [];
	const placements: Placement[] = [];
	const record = (what: string, on: "land" | "water", foot: Pt[]) =>
		placements.push({ what, on, foot: foot.map((q) => [r1(q[0]), r1(q[1])] as [number, number]) });
	const coastDist = (p: Pt) => (terrain.coast ? distToPolyline(p, terrain.coast.pts) : Infinity);
	/** Dry ground with a margin: no water within r, and off the beach. */
	// Rings sampled every ~5 units: narrower than the narrowest river, so no water slips between samples.
	const dry = (p: Pt, r: number) => {
		if (water(p) || coastDist(p) <= Math.min(r, 10) + 6) return false;
		for (const f of [1, 0.6, 0.3]) {
			const rr = r * f;
			if (rr > 1 && ring(p, rr, Math.max(6, Math.ceil((2 * Math.PI * rr) / 5))).some(water)) return false;
		}
		return true;
	};
	const onBuilding = (p: Pt) =>
		terrain.buildings.some((b) => Math.abs(b.x + b.w / 2 - p[0]) < b.w && Math.abs(b.y + b.h / 2 - p[1]) < b.h);
	/** A clear spot of radius r on land, in view; null when the frame shows no such ground. */
	function spot(r: number, prefer?: (p: Pt) => boolean): Pt | null {
		let fallback: Pt | null = null;
		for (let k = 0; k < 60; k++) {
			const s: Pt = [range(placeRng, 60, FRAME_W - 60), range(placeRng, 60, FRAME_H - 60)];
			const p = toWorld(s);
			if (!dry(p, r) || placed.some((q) => dist(q.p, p) < q.r + r)) continue;
			if (!fallback) fallback = p;
			if (onBuilding(p) && k < 40) continue;
			if (prefer && !prefer(p) && k < 35) continue;
			placed.push({ p, r });
			return p;
		}
		// Crowded: allow overlap with other placements, never water.
		if (!fallback)
			for (let k = 0; k < 60 && !fallback; k++) {
				const p = toWorld([range(placeRng, 40, FRAME_W - 40), range(placeRng, 40, FRAME_H - 40)]);
				if (dry(p, r)) fallback = p;
			}
		if (fallback) placed.push({ p: fallback, r });
		return fallback;
	}
	/** A stretch of dry road in view, for convoys and checkpoints. */
	function roadStretch(len: number): { pts: Pt[]; t0: number; t1: number } | null {
		for (const road of terrain.roads) {
			const total = polylineLength(road.pts);
			for (let k = 0; k < 12; k++) {
				const t0 = range(placeRng, 0.1, 0.85);
				const t1 = t0 + len / total;
				if (t1 > 1) continue;
				const a = along(road.pts, t0).p;
				const b = along(road.pts, t1).p;
				if (!inView(a, 30) || !inView(b, 30) || placed.some((q) => dist(q.p, a) < q.r + 10)) continue;
				let wet = false;
				for (let s = 0; s <= 8 && !wet; s++) wet = !dry(along(road.pts, lerp(t0, t1, s / 8)).p, 5);
				if (wet) continue;
				placed.push({ p: a, r: len / 2 }, { p: b, r: 10 });
				return { pts: road.pts, t0, t1 };
			}
		}
		return null;
	}
	/** Split a line into its stretches over dry ground. */
	const dryRuns = (pts: Pt[]): Pt[][] => {
		const runs: Pt[][] = [[]];
		for (const p of pts) {
			if (!dry(p, 3)) {
				if (runs[runs.length - 1]!.length) runs.push([]);
			} else runs[runs.length - 1]!.push(p);
		}
		return runs.filter((r) => r.length >= 2);
	};

	/** Points round a hull (or vehicle) of length len and beam at p heading a, grown by margin. */
	const hull = (p: Pt, a: number, len: number, beam: number, margin = 0): Pt[] => {
		const c = Math.cos(a);
		const s = Math.sin(a);
		const h = len / 2 + margin;
		const b = beam / 2 + margin;
		const local: Pt[] = [
			[h, 0],
			[-h, 0],
			[-h, b],
			[-h, -b],
			[h * 0.55, b],
			[h * 0.55, -b],
			[0, b],
			[0, -b],
			[-h * 0.5, b],
			[-h * 0.5, -b]
		];
		return local.map(([x, y]) => [p[0] + x * c - y * s, p[1] + x * s + y * c]);
	};
	const nearPier = (q: Pt, pad: number) => terrain.piers.some((pr) => distToPolyline(q, [pr.a, pr.b]) < pr.w / 2 + pad);
	const fleet: { p: Pt; r: number }[] = [];
	/** Open water for a hull: every point round it wet, clear of piers, the shore and other ships. */
	const openWater = (p: Pt, a: number, cls: ShipClass, margin: number) => {
		const { len, beam } = SHIP[cls];
		const pts = hull(p, a, len, beam, margin);
		return (
			water(p) &&
			pts.every(water) &&
			!pts.some((q) => nearPier(q, 2)) &&
			!fleet.some((o) => dist(o.p, p) < o.r + len / 2 + 4)
		);
	};
	/** A spot on open water in view for a ship of this class, or null (no water big enough). */
	function seaSpot(cls: ShipClass, rngFn: Rng, near?: Pt): { p: Pt; a: number } | null {
		for (let k = 0; k < 80; k++) {
			const p: Pt = near
				? [near[0] + range(rngFn, -40, 40), near[1] + range(rngFn, -30, 30)]
				: toWorld([range(rngFn, 30, FRAME_W - 30), range(rngFn, 40, FRAME_H - 40)]);
			const a = range(rngFn, 0, Math.PI * 2);
			if (!inView(p, 16)) continue;
			if (openWater(p, a, cls, 4)) return { p, a };
		}
		return null;
	}
	/** Moored alongside a pier: the hull parallel to it, on the water side. */
	function berth(cls: ShipClass, pier: Terrain["piers"][number], side: 1 | -1): { p: Pt; a: number } | null {
		const { len, beam } = SHIP[cls];
		const pl = dist(pier.a, pier.b);
		if (len > pl - 6) return null;
		const a = Math.atan2(pier.b[1] - pier.a[1], pier.b[0] - pier.a[0]);
		const off = pier.w / 2 + beam / 2 + 0.8;
		const t = (pl - len / 2 - 2) / pl;
		const p: Pt = [
			lerp(pier.a[0], pier.b[0], t) - Math.sin(a) * off * side,
			lerp(pier.a[1], pier.b[1], t) + Math.cos(a) * off * side
		];
		const pts = hull(p, a, len, beam, 1);
		if (!pts.every(water) || fleet.some((o) => dist(o.p, p) < o.r + len / 2 + 2)) return null;
		return { p, a };
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

	/**
	 * A vehicle sprite at p heading a (radians): a tank, APC, truck, SAM
	 * launcher or self-propelled gun, each with its own outline and a cast
	 * shadow. Not drawn (false) if any part of it would sit on water.
	 */
	function vehicle(p: Pt, a: number, opts: { moving: boolean; hidden: boolean; type: string }): boolean {
		const kind: VehicleKind =
			opts.type === "armor"
				? "tank"
				: opts.type === "mechanized"
					? "apc"
					: opts.type === "air_defence"
						? "sam"
						: opts.type === "artillery"
							? "spg"
							: rng() < 0.45
								? "truck"
								: "apc";
		const v = VEHICLES[kind];
		const foot = hull(p, a, v.len, v.beam);
		if (foot.some(water) || water(p)) return false;
		record(kind, "land", foot);
		const tf = `translate(${r1(p[0])} ${r1(p[1])}) rotate(${r1(deg(a))})`;
		const atten = opts.hidden ? (mode === "ir" ? 0.65 : mode === "sar" ? 0.75 : 1) : 1;
		if (mode === "eo") {
			if (shadowLen)
				objects.push({
					k: "path",
					d: v.hull + v.top,
					fill: EO.shadow,
					op: 0.55,
					tf: `translate(${r1(p[0] + sdx)} ${r1(p[1] + sdy)}) rotate(${r1(deg(a))})`
				});
			objects.push({ k: "path", d: v.hull, fill: shade(v.paint, rng() * 0.3 - 0.15), stroke: "#1d2014", sw: 0.3, tf });
			objects.push({ k: "path", d: v.top, fill: v.topPaint, stroke: "#1d2014", sw: 0.2, tf });
		} else if (mode === "ir") {
			const t = (opts.moving ? 0.82 : night ? 0.58 : 0.66) * atten + (1 - atten) * 0.35;
			objects.push({ k: "path", d: v.hull, fill: grey(t), tf, fx: "soft" });
			// Engine deck at the rear: the hottest part of a running vehicle.
			if (opts.moving || rng() < 0.3)
				objects.push({
					k: "circle",
					x: r1(p[0] - Math.cos(a) * v.len * 0.32),
					y: r1(p[1] - Math.sin(a) * v.len * 0.32),
					r: 1.1,
					fill: grey(opts.moving ? 1 : 0.85 * atten),
					fx: "glow"
				});
		} else {
			const w = v.len;
			const h = v.beam;
			const o: Pt = opts.moving ? [p[0], p[1] + range(rng, 6, 12)] : p; // moving targets shift in azimuth
			const bright = grey(atten);
			objects.push({
				k: "path",
				d: v.hull,
				fill: bright,
				tf: `translate(${r1(o[0])} ${r1(o[1])}) rotate(${r1(deg(a))})`
			});
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
		return true;
	}

	/** A ship at p heading a: hull with bow and transom, deck detail by class, wake when under way. */
	function ship(p: Pt, a: number, cls: ShipClass, moving: boolean, what: string) {
		const { len, beam } = SHIP[cls];
		fleet.push({ p, r: len / 2 });
		record(what, "water", hull(p, a, len, beam));
		const h = len / 2;
		const b = beam / 2;
		const bow = h - beam * 1.3;
		const rot = `rotate(${r1(deg(a))})`;
		const tf = `translate(${r1(p[0])} ${r1(p[1])}) ${rot}`;
		const hullD = `M${r1(h)} 0Q${r1(h - beam * 0.35)} ${r1(-b)} ${r1(bow)} ${r1(-b)}L${r1(-h + 0.6)} ${r1(-b)}Q${r1(-h)} ${r1(-b)} ${r1(-h)} ${r1(-b + 0.6)}V${r1(b - 0.6)}Q${r1(-h)} ${r1(b)} ${r1(-h + 0.6)} ${r1(b)}L${r1(bow)} ${r1(b)}Q${r1(h - beam * 0.35)} ${r1(b)} ${r1(h)} 0Z`;
		if (moving) {
			// Kelvin wake arms and churned water astern, cut short before any shore.
			let W = len * 2.2;
			const back = (k: number, side: number): Pt => {
				const x = -h - W * k;
				const y = side * W * k * 0.36;
				return [p[0] + x * Math.cos(a) - y * Math.sin(a), p[1] + x * Math.sin(a) + y * Math.cos(a)];
			};
			while (W > 4 && ![back(1, 1), back(1, -1), back(1, 0), back(0.5, 1), back(0.5, -1)].every(water)) W *= 0.6;
			if (W > 4) {
				const arms = `M${r1(-h)} 0l${r1(-W)} ${r1(W * 0.36)}M${r1(-h)} 0l${r1(-W)} ${r1(-W * 0.36)}`;
				if (mode === "sar") {
					features.push({
						k: "path",
						d: `M${r1(-h)} 0h${r1(-W)}`,
						stroke: grey(0),
						sw: r1(beam * 0.8),
						op: 0.75,
						fill: "none",
						tf
					});
					features.push({ k: "path", d: arms, stroke: grey(0.55), sw: 0.6, op: 0.45, fill: "none", tf });
				} else {
					const foam = mode === "ir" ? grey(0.48) : "#e3ebe9";
					features.push({
						k: "path",
						d: arms,
						stroke: foam,
						sw: 0.8,
						op: mode === "ir" ? 0.35 : 0.55,
						fill: "none",
						tf
					});
					features.push({
						k: "ellipse",
						x: r1(-h - W * 0.33),
						y: 0,
						rx: r1(W * 0.36),
						ry: r1(beam * 0.55),
						fill: foam,
						op: mode === "ir" ? 0.45 : 0.6,
						fx: "soft",
						tf
					});
					features.push({
						k: "path",
						d: `M${r1(h - 0.5)} ${r1(-b - 0.3)}q${r1(-beam)} ${r1(-beam * 0.5)} ${r1(-beam * 2)} ${r1(-beam * 0.5)}M${r1(h - 0.5)} ${r1(b + 0.3)}q${r1(-beam)} ${r1(beam * 0.5)} ${r1(-beam * 2)} ${r1(beam * 0.5)}`,
						stroke: foam,
						sw: 0.6,
						op: 0.6,
						fill: "none",
						tf
					});
				}
			}
		}
		if (shadowLen)
			objects.push({
				k: "path",
				d: hullD,
				fill: EO.shadow,
				op: 0.4,
				tf: `translate(${r1(p[0] + sdx * 1.3)} ${r1(p[1] + sdy * 1.3)}) ${rot}`
			});
		const paint = {
			dinghy: "#e6e3da",
			fishing: "#d6d1c4",
			patrol: "#7f8789",
			frigate: "#8a9193",
			freighter: "#5b4038"
		}[cls];
		objects.push({
			k: "path",
			d: hullD,
			fill: mode === "eo" ? paint : mode === "ir" ? grey(moving ? 0.66 : 0.58) : grey(0.95),
			stroke: mode === "eo" ? "#1c2224" : undefined,
			sw: 0.35,
			tf
		});
		// Deck detail: [path, EO colour, IR temperature].
		const deck: [string, string, number][] = [];
		const box = (x: number, y: number, w: number, hh: number) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(hh)}h${r1(-w)}z`;
		if (cls === "freighter") {
			let even = "";
			let odd = "";
			for (let i = 0; i < 6; i++) {
				const d = box(-h + len * 0.2 + i * len * 0.11, -b + 0.9, len * 0.095, beam - 1.8);
				if (i % 2) odd += d;
				else even += d;
			}
			deck.push(
				[even, "#8b4a3a", 0.55],
				[odd, "#41607a", 0.55],
				[box(-h + 1, -b + 0.6, len * 0.12, beam - 1.2), "#e8e6df", 0.7]
			);
		} else if (cls === "frigate") {
			deck.push(
				[box(-h * 0.4, -b * 0.6, len * 0.4, beam * 0.6), "#b9bfc0", 0.7],
				[
					`${box(-h + 0.8, -b + 0.7, len * 0.2, beam - 1.4)}M${r1(h * 0.5 + 0.9)} 0a0.9 0.9 0 1 0 -1.8 0a0.9 0.9 0 1 0 1.8 0`,
					"#a2a8a9",
					0.6
				],
				[`M${r1(h * 0.5)} -0.15h${r1(h * 0.32)}v0.3h${r1(-h * 0.32)}z`, "#4a4f50", 0.6]
			);
		} else if (cls === "patrol") {
			deck.push(
				[box(-h * 0.45, -b * 0.6, len * 0.35, beam * 0.6), "#c7cccc", 0.7],
				[box(h * 0.35, -0.5, 1, 1), "#3e4344", 0.6]
			);
		} else if (cls === "fishing") {
			deck.push(
				[box(h * 0.05, -b * 0.65, len * 0.22, beam * 0.65), "#f0ede6", 0.68],
				[
					`M${r1(-h * 0.2)} 0l${r1(-h * 0.7)} ${r1(-b * 0.9)}M${r1(-h * 0.2)} 0l${r1(-h * 0.7)} ${r1(b * 0.9)}`,
					"#3a3a34",
					0.5
				]
			);
		} else {
			deck.push([`M0 ${r1(-b + 0.4)}v${r1(beam - 0.8)}`, "#7a6a50", 0.5]);
		}
		for (const [d, eo, ir] of deck) {
			const line = !d.includes("z");
			const c = mode === "eo" ? eo : mode === "ir" ? grey(ir) : grey(0.75);
			objects.push(line ? { k: "path", d, stroke: c, sw: 0.4, fill: "none", tf } : { k: "path", d, fill: c, tf });
		}
		if (mode === "ir" && cls !== "dinghy") {
			// The funnel: the hottest point on a ship.
			const sx = cls === "freighter" ? -h + 2 : cls === "fishing" ? h * 0.15 : -h * 0.15;
			objects.push({
				k: "circle",
				x: r1(p[0] + Math.cos(a) * sx),
				y: r1(p[1] + Math.sin(a) * sx),
				r: r1(Math.max(0.8, beam * 0.22)),
				fill: grey(moving ? 1 : 0.85),
				fx: "glow"
			});
		}
		if (mode === "sar" && len >= 16) {
			// Strong corner reflectors smear into a cross (sidelobes).
			objects.push({
				k: "path",
				d: `M${r1(p[0] - len * 0.55)} ${r1(p[1])}h${r1(len * 1.1)}M${r1(p[0])} ${r1(p[1] - len * 0.4)}v${r1(len * 0.8)}`,
				stroke: grey(0.9),
				sw: 0.5,
				op: 0.45
			});
		}
		if (mode === "eo" && night)
			lights.push({
				k: "circle",
				x: r1(p[0] + Math.cos(a) * h * 0.6),
				y: r1(p[1] + Math.sin(a) * h * 0.6),
				r: 0.9,
				fill: "#fff1c2",
				fx: "glow"
			});
		sprites++;
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
		if (!c) continue;
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
			if (vehicle(p, a, { moving: false, hidden: false, type: "air_defence" })) sprites++;
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
		if (g.cat === "naval") {
			// Warships keep to the open sea; a landlocked frame (lakes included) has nowhere to show them.
			const pts: Pt[] = [];
			const nr = seededRandom(hash32(input.regionId, window, 0x5a11));
			for (let v = 0; v < (terrain.coast ? shown : 0); v++) {
				const cls: ShipClass = v % 3 === 2 ? "patrol" : "frigate";
				const at = seaSpot(cls, nr, pts[0]) ?? (pts.length ? seaSpot(cls, nr) : null);
				if (!at) break;
				ship(at.p, at.a, cls, moving || nr() < 0.5, "warship");
				pts.push(at.p);
			}
			if (!pts.length) {
				notes.push("Naval units reported; no open sea in frame");
				continue;
			}
			detections.push({
				...box(pts, 18),
				label: mode === "sar" ? "SHIP RTN" : "WARSHIPS",
				detail: `${countText(g.count, g.estimated)} · ${pct(g.conf)}`,
				kind: "unit",
				icon: "ship",
				prio: 0
			});
			continue;
		}
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
					if (g.cat === "infantry") {
						const q: Pt = [p[0] + 3, p[1]];
						if (water(q)) continue;
						record("soldier", "land", [q]);
						objects.push({ k: "circle", x: r1(q[0]), y: r1(q[1]), r: 0.7, fill: P.hot("metal", 0.8) });
					} else {
						if (!vehicle(p, a, { moving: true, hidden: false, type: g.type })) continue;
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
					pts.push(p);
					sprites++;
				}
			} else {
				const c = spot(
					g.cat === "air" ? 44 : g.cat === "artillery" ? 28 : g.cat === "infantry" ? 18 : 24,
					g.cat === "air" ? (p) => !forestIn(p) : undefined
				);
				if (!c) {
					notes.push(`${label(g.type)}: reported, but no clear ground in frame`);
					continue;
				}
				anchors.units!.push(c);
				const hidden = forestIn(c);
				let a = range(placeRng, 0, Math.PI * 2);
				if (g.cat === "air") {
					// A dispersal strip with a taxiway and hardstands, aircraft parked on them.
					let len = 70;
					const ends = (ang: number, l: number): Pt[] => [
						[c[0] - (Math.cos(ang) * l) / 2, c[1] - (Math.sin(ang) * l) / 2],
						[c[0] + (Math.cos(ang) * l) / 2, c[1] + (Math.sin(ang) * l) / 2]
					];
					for (let t = 0; t < 8 && !ends(a, len).every((q) => dry(q, 10)); t++) {
						a += Math.PI / 8;
						if (t === 7) len = 44;
					}
					const ux = Math.cos(a);
					const uy = Math.sin(a);
					const [e0] = ends(a, len);
					features.push({
						k: "path",
						d: `M${r1(e0![0])} ${r1(e0![1])}l${r1(ux * len)} ${r1(uy * len)}`,
						stroke: P.c("concrete", -0.1),
						sw: 6,
						fill: "none"
					});
					const stands: [number, number, number][] = [];
					const fighter =
						"M0 -5.5L0.8 -2L4.8 2.2L4.8 3L0.8 2L0.6 3.8L2 4.8L2 5.4L0 5L-2 5.4L-2 4.8L-0.6 3.8L-0.8 2L-4.8 3L-4.8 2.2L-0.8 -2Z";
					const bomber =
						"M0 -7L0.9 -4.6L0.9 -1.2L7.5 1.6L7.5 2.6L0.9 1.4L0.7 5.2L2.6 6.4L2.6 7L0 6.6L-2.6 7L-2.6 6.4L-0.7 5.2L-0.9 1.4L-7.5 2.6L-7.5 1.6L-0.9 -1.2L-0.9 -4.6ZM3.4 0.9h0.9v2h-0.9zM5.4 1.6h0.9v1.6h-0.9zM-4.3 0.9h0.9v2h-0.9zM-6.3 1.6h0.9v1.6h-0.9z";
					for (let v = 0; v < n; v++) {
						const t = (v + 0.5) / n - 0.5;
						const p: Pt = [c[0] + ux * len * t * 0.9 - uy * 9, c[1] + uy * len * t * 0.9 + ux * 9];
						const big = g.type === "bomber_squadron";
						if (!dry(p, big ? 8 : 6)) continue;
						pts.push(p);
						record(big ? "bomber" : "fighter", "land", ring(p, big ? 7 : 5.5));
						stands.push([p[0], p[1], big ? 8.5 : 6.5]);
						const tf = `translate(${r1(p[0])} ${r1(p[1])}) rotate(${r1(deg(a) + 90)})`;
						const plane = big ? bomber : fighter;
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
							fill: mode === "ir" ? grey(moving ? 0.8 : 0.5) : mode === "sar" ? grey(0.92) : P.c("aircraft"),
							stroke: mode === "eo" ? shade(EO.aircraft, -0.45) : undefined,
							sw: 0.3,
							tf,
							fx: mode === "ir" ? "soft" : undefined
						});
						if (mode === "ir" && (moving || v % 2 === 0))
							objects.push({
								k: "circle",
								x: r1(p[0] - Math.cos(a + Math.PI / 2) * 4),
								y: r1(p[1] - Math.sin(a + Math.PI / 2) * 4),
								r: 1.2,
								fill: grey(0.95),
								fx: "glow"
							});
						sprites++;
					}
					if (stands.length) features.push({ k: "path", d: blobs(stands), fill: P.c("concrete", 0.1), op: 0.8 });
				} else if (g.cat === "artillery") {
					const firing = (f.firingPositions?.count ?? 0) > 0 || moving;
					for (let v = 0; v < n; v++) {
						const off = (v - (n - 1) / 2) * 11;
						const p: Pt = [c[0] - Math.sin(a) * off, c[1] + Math.cos(a) * off + (v % 2) * 3];
						if (!dry(p, 6)) continue;
						pts.push(p);
						record("gun", "land", ring(p, 4.2));
						const tf = `translate(${r1(p[0])} ${r1(p[1])}) rotate(${r1(deg(a))})`;
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
						// A towed howitzer: split trails behind, shield and a long barrel.
						const gun = "M-3.6 -1.8L-0.6 -0.5L-0.6 0.5L-3.6 1.8L-3.2 2.1L0 0.8L0 -0.8L-3.2 -2.1Z";
						const top = "M-0.4 -1.4h1.4v2.8h-1.4zM0.6 -0.22h6v0.44h-6z";
						if (mode === "eo" && shadowLen)
							objects.push({
								k: "path",
								d: gun + top,
								fill: EO.shadow,
								op: 0.5,
								tf: `translate(${r1(p[0] + sdx)} ${r1(p[1] + sdy)}) rotate(${r1(deg(a))})`
							});
						objects.push({ k: "path", d: gun, fill: P.hot("metal", hidden ? 0.55 : 0.62), tf });
						objects.push({ k: "path", d: top, fill: P.hot("metal", firing ? 0.98 : 0.7, 0.2), tf });
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
					if (!moving)
						for (const run of dryRuns(line))
							features.push({ k: "path", d: pathOf(run), stroke: P.c("trench"), sw: 1.2, fill: "none" });
					for (let v = 0; v < n; v++) {
						const { p } = along(line, (v + 0.5) / n);
						const q: Pt = [p[0] + range(rng, -1.5, 1.5), p[1] + range(rng, -1.5, 1.5)];
						if (!dry(q, 2)) continue;
						pts.push(q);
						record("soldier", "land", [q]);
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
						if (!dry(p, 4)) continue;
						if (!moving) {
							const tf = `rotate(${r1(deg(a))} ${r1(p[0])} ${r1(p[1])})`;
							features.push({
								k: "path",
								d: `M${r1(p[0] - 3.5)} ${r1(p[1] - 3)}h6a1 1 0 0 1 0 6h-6`,
								stroke: P.c("berm", 0.15),
								sw: 1.3,
								fill: "none",
								tf
							});
						}
						if (!vehicle(p, a, { moving: false, hidden, type: g.type })) continue;
						pts.push(p);
						if (mode === "eo" && !moving && v % 3 === 1)
							objects.push({ k: "circle", x: r1(p[0]), y: r1(p[1]), r: 3.4, fill: "#4c5536", op: 0.75 });
						sprites++;
					}
					if (moving) {
						// Fresh tracks across the fields from where they moved in.
						const tail: Pt = [
							c[0] - Math.cos(a) * 60 + range(rng, -20, 20),
							c[1] - Math.sin(a) * 60 + range(rng, -20, 20)
						];
						const mid: Pt = [(c[0] + tail[0]) / 2 + 15, (c[1] + tail[1]) / 2 - 10];
						if (!water(tail) && !water(mid))
							features.push({
								k: "path",
								d: `M${r1(c[0])} ${r1(c[1])}Q${r1(mid[0])} ${r1(mid[1])} ${r1(tail[0])} ${r1(tail[1])}`,
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

	// ── Shipping: boats at the piers and under way, only where there is water ──
	if (terrain.waterbody) {
		const sr = seededRandom(hash32(input.regionId, window, 0xb0a7));
		const sea = !!terrain.coast;
		for (const pier of terrain.piers) {
			for (const side of [1, -1] as const) {
				if (sr() > 0.65) continue;
				let cls: ShipClass = sea ? (sr() < 0.45 ? "freighter" : "fishing") : "dinghy";
				let at = berth(cls, pier, side);
				if (!at && cls === "freighter") at = berth((cls = "fishing"), pier, side);
				if (at) ship(at.p, at.a, cls, false, "moored");
			}
		}
		const under = sea ? 1 + Math.floor(sr() * 3) : Math.floor(sr() * 3);
		for (let k = 0; k < under; k++) {
			const cls: ShipClass = sea ? (k === 0 && sr() < 0.5 ? "freighter" : sr() < 0.6 ? "fishing" : "dinghy") : "dinghy";
			const at = seaSpot(cls, sr);
			if (at) ship(at.p, at.a, cls, sr() < 0.7, "boat");
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
			if (inView(s.p, 60) && dry(s.p, 8)) {
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
			// Trenches stop at the water's edge.
			for (const run of dryRuns(pts)) {
				const d = pathOf(run);
				features.push({
					k: "path",
					d,
					stroke: P.c("berm", 0.25),
					sw: 3.2,
					fill: "none",
					op: mode === "sar" ? 0.9 : 0.7
				});
				features.push({ k: "path", d, stroke: P.c("trench"), sw: 1.6, fill: "none" });
				allPts.push(...run);
			}
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
			if (!dry(p, 4)) continue;
			bpts.push(p);
			record("bunker", "land", ring(p, 3));
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
		if (bpts.length >= 4)
			detections.push({
				...box(bpts, 4),
				label: "BUNKERS",
				detail: `×${bpts.length}`,
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
					if (dry(p, 2)) tpts.push(p);
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
			// Anti-tank ditch, cut where it would run into water.
			const ditch: Pt[] = [];
			for (let k = 0; k <= 32; k++) {
				const u = k / 32 - 0.5;
				ditch.push([centre[0] + nx * 320 * u + Math.cos(ang) * 44, centre[1] + ny * 320 * u + Math.sin(ang) * 44]);
			}
			for (const run of dryRuns(ditch)) {
				const d = pathOf(run);
				features.push({ k: "path", d, stroke: P.c("berm", 0.3), sw: 5, fill: "none", op: 0.7 });
				features.push({ k: "path", d, stroke: P.c("trench", -0.2), sw: 2.6, fill: "none" });
			}
		}
	}
	const industrySite = bld && bld.economy > 0 ? spot(40, (p) => !forestIn(p)) : null;
	if (bld && industrySite) {
		// Industry and a power plant: big roofs, cooling towers (hot in IR).
		const c = industrySite;
		anchors.industry!.push(c);
		record("industry", "land", ring(c, 30));
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
	const hospitalSite = bld && bld.hospitals > 0 ? spot(16, (p) => !forestIn(p)) : null;
	if (bld && hospitalSite) {
		const c = hospitalSite;
		anchors.hospital!.push(c);
		record("hospital", "land", ring(c, 10));
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
			if (!c) continue;
			anchors.radar!.push(c);
			record("radar", "land", ring(c, 17));
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
		if (pts.length)
			detections.push({
				...box(pts, 12),
				label: stations > 1 ? `AIR DEFENCE RADAR ×${stations}` : "AIR DEFENCE RADAR",
				detail: `RADAR L${bld.radar}`,
				kind: "structure",
				icon: "radar",
				prio: 1
			});
	}
	const buildSite = bld && bld.underConstruction > 0 ? spot(26) : null;
	if (bld && buildSite) {
		const c = buildSite;
		record("construction", "land", ring([c[0], c[1] + 4], 18));
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
			const r = big ? range(rng, 3.5, 5.5) : range(rng, 1.4, 2.8);
			// A shell into water leaves no crater.
			if (water(p)) continue;
			pts.push(p);
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
	function fire(c: Pt | undefined, size: number) {
		if (!c || water(c)) return;
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
				...box(pts.length ? pts : [c], 6),
				label: burning ? "STRIKE · FIRES" : "IMPACT CRATERS",
				detail: `${n} crater${n === 1 ? "" : "s"} · ${Math.round(s.hoursBefore)}h ago`,
				kind: "damage",
				icon: burning ? "fire" : "crater",
				prio: 2
			});
		}
		if (moving && f.outcome === "ok") {
			// The contact area: shell holes and a burning wreck or two.
			const c = spot(36);
			const pts = c ? craterField(c, 10, 28, 3, false) : [];
			if (f.battle?.phase === "active") for (let k = 0; k < 2; k++) fire(pts[k * 3], 1.6);
			if (pts.length)
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
	// Golden hour: a warm cast in the two hours after dawn and before dusk.
	const fromDawn = hour - 6;
	const toDusk = 20 - hour;
	const low = !night && mode === "eo" && weather !== "fog" ? Math.min(fromDawn, toDusk) : Infinity;
	const tint =
		low < 2
			? {
					color: fromDawn < toDusk ? "#f2b48a" : "#f0a060",
					op: r1((1 - low / 2) * (weather === "clear" ? 0.5 : 0.25) * 100) / 100
				}
			: null;
	if (tint) notes.push(fromDawn < toDusk ? "Dawn: low sun, long shadows" : "Dusk: low sun, long shadows");
	if (snow > 0.3)
		notes.push(
			mode === "ir" ? "Snow: cold ground, warm targets stand out" : "Snow cover: tracks and vehicles stand out"
		);
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
	const leaf = season === "autumn" ? "#4f4526" : season === "spring" ? "#3a4a2c" : EO.forest;
	const canopy =
		mode === "eo"
			? snow > 0.3
				? { base: "#3b4236", light: "#dfe5e6", dark: "#1f251d" }
				: {
						base: leaf,
						light: season === "autumn" ? "#9a6b2c" : shade(leaf, 0.35),
						dark: shade(leaf, -0.45)
					}
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
			static: f.outcome === "intercepted" ? 0.8 : 0,
			tint,
			snow: r1(snow * 100) / 100
		},
		visibility,
		brightness: Math.round(brightness * 1000) / 1000,
		scale: { meters, px: meters / metersPerPx },
		sprites,
		placements,
		sun: mode === "eo" && !night ? { az: Math.round(sunAz) % 360, el: Math.round(deg(Math.asin(clamp(elev)))) } : null,
		notes
	};
}

/**
 * The region's water mask, as its frames draw it: true over sea, lake,
 * pond or river. Placement uses the same function, so tests can check
 * every sprite against it.
 */
export function waterAt(regionId: number, terrain: string, infrastructure: number | null = null): (p: Pt) => boolean {
	return makeTerrain(regionId, terrain, infrastructure).water;
}
