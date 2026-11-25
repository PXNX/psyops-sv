// Fleet-at-sea: a hex sea grid, movable ships, ports and docks, and the
// weapons that make sea control more than a number on a spreadsheet.
//
// This file is intentionally pure data + pure functions. The client imports it
// to draw the hex map and plan moves; the server imports it to resolve those
// moves (services/military/fleet.ts). Nothing here touches the database or
// SvelteKit virtual modules.
//
// Catches up with the older abstraction in naval.config.ts: that file still
// resolves state-level "naval operations" (blockades, bombardments). Here the
// same ideas are spatial — a minefield sits on a hex, a carrier's air wing
// reaches three hexes, a blockade is a ring of mines around a port.

import { latLonToMap, mapToLatLon } from "../../utils/military.js";

// ── Hex grid ────────────────────────────────────────────────────────────────

/** An axial hex coordinate (pointy-top orientation). */
export interface Hex {
	q: number;
	r: number;
}

/**
 * The whole theatre is a bounded axial grid. Hexes outside do not exist.
 *
 * The grid is calibrated to the world map: 50 columns × 25 rows gives cells
 * of about 7° × 7° — clearly readable hexes on the 1400×600 map, while an EEZ
 * of two rings still reaches out from a coastline.
 */
export const HEX_BOUNDS = { minQ: 0, maxQ: 49, minR: 0, maxR: 24 } as const;

/** Radius of one hex in the standalone console-view helpers, in pixels. */
export const HEX_SIZE = 54;

/** The six axial neighbour directions, clockwise from east. */
const HEX_DIRECTIONS: readonly Hex[] = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 }
];

export function hexKey(h: Hex): string {
	return `${h.q},${h.r}`;
}

/** Centre of a hex in real coordinates, the exact inverse of `hexFromLatLon`. */
export function hexToLatLon(h: Hex): { lat: number; lon: number } {
	const p = hexToMap(h);
	const ll = mapToLatLon(p.x, p.y);
	// The map projection wraps longitude at ±180°. Hexes on the right-hand
	// seam would otherwise come back as -179° and round-trip to the far left
	// of the grid. Report them as 179.9°E instead.
	if (p.x > WORLD_MAP_SIZE.width - 30 && ll.lon < -170) ll.lon = 179.9;
	return ll;
}

/** The six corners of a hex as lat/lon, for tools that think geographically. */
export function hexPolygonLatLon(h: Hex): { lat: number; lon: number }[] {
	return hexPolygonMap(h).map((p) => mapToLatLon(p.x, p.y));
}

/** The world map's viewBox, in SVG units. */
export const WORLD_MAP_SIZE = { width: 1400, height: 600 } as const;

/** In-plane offsets of the grid: pointy-top columns √3r apart, rows 1.5r. */
function gridMetrics() {
	const spanQ = HEX_BOUNDS.maxQ - HEX_BOUNDS.minQ;
	const spanR = HEX_BOUNDS.maxR - HEX_BOUNDS.minR;
	const rows = spanR + 1;
	// Axial rows skew to the right by r/2 columns. The widest row spans
	// spanQ + spanR/2 hexes, so size the grid against that, not just `cols`.
	const size = Math.min(
		WORLD_MAP_SIZE.width / (spanQ + spanR / 2 + 1) / Math.sqrt(3),
		WORLD_MAP_SIZE.height / rows / 1.5
	);
	return {
		size,
		colStep: Math.sqrt(3) * size,
		rowStep: 1.5 * size,
		x0: 0,
		y0: (WORLD_MAP_SIZE.height - rows * 1.5 * size) / 2
	};
}

/** Hex radius in world-map SVG units. */
export function mapHexSize(): number {
	return gridMetrics().size;
}

/** A hex centre in world-map SVG units. The grid lives on the map, so it
 *  tiles evenly even though the world-map projection distorts lat/lon. */
export function hexToMap(h: Hex): { x: number; y: number } {
	const { colStep, rowStep, x0, y0 } = gridMetrics();
	return {
		x: x0 + colStep * (h.q - HEX_BOUNDS.minQ + (h.r - HEX_BOUNDS.minR) / 2),
		y: y0 + rowStep * (h.r - HEX_BOUNDS.minR)
	};
}

/** The hex containing a point in world-map SVG units. */
export function mapToHex(x: number, y: number): Hex {
	const { colStep, rowStep, x0, y0 } = gridMetrics();
	const rf = (y - y0) / rowStep;
	const qf = (x - x0) / colStep - rf / 2;
	// Cube rounding keeps the result on a proper axial lattice.
	let rx = Math.round(qf);
	let ry = Math.round(rf);
	let rz = Math.round(-qf - rf);
	const dx = Math.abs(rx - qf);
	const dy = Math.abs(ry - rf);
	const dz = Math.abs(rz + qf + rf);
	if (dx > dy && dx > dz) rx = -ry - rz;
	else if (dy > dz) ry = -rx - rz;
	else rz = -rx - ry;
	return {
		q: Math.max(HEX_BOUNDS.minQ, Math.min(HEX_BOUNDS.maxQ, rx)),
		r: Math.max(HEX_BOUNDS.minR, Math.min(HEX_BOUNDS.maxR, ry))
	};
}

/** The six corners of a hex in world-map SVG units, for drawing. */
export function hexPolygonMap(h: Hex): { x: number; y: number }[] {
	const centre = hexToMap(h);
	const size = mapHexSize();
	const corners: { x: number; y: number }[] = [];
	for (let i = 0; i < 6; i++) {
		const angle = ((60 * i - 30) * Math.PI) / 180;
		corners.push({ x: centre.x + size * Math.cos(angle), y: centre.y + size * Math.sin(angle) });
	}
	return corners;
}

/**
 * Outline of a group of hexes as SVG path data in world-map units.
 *
 * Every hex edge shared by two members is internal and is dropped; the
 * remaining edges are chained into loops. The result is one region-shaped
 * outline that follows the hex grid, which is how both EEZs and airspace
 * sectors are drawn. Returns an empty string for an empty group.
 */
export function hexUnionPath(hexes: Hex[]): string {
	type Pt = { x: number; y: number };
	const key = (p: Pt) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
	const edges = new Map<string, { from: Pt; to: Pt; used: boolean }>();
	for (const h of hexes) {
		const corners = hexPolygonMap(h);
		for (let i = 0; i < 6; i++) {
			const from = corners[i]!;
			const to = corners[(i + 1) % 6]!;
			const a = key(from);
			const b = key(to);
			const id = a < b ? `${a}|${b}` : `${b}|${a}`;
			const existing = edges.get(id);
			if (existing) existing.used = true;
			else edges.set(id, { from, to, used: false });
		}
	}
	const boundary = [...edges.values()].filter((e) => !e.used);
	if (!boundary.length) return "";
	const byStart = new Map<string, number[]>();
	boundary.forEach((e, i) => {
		const k = key(e.from);
		const list = byStart.get(k) ?? [];
		list.push(i);
		byStart.set(k, list);
	});
	const used = new Set<number>();
	const loops: Pt[][] = [];
	for (let i = 0; i < boundary.length; i++) {
		if (used.has(i)) continue;
		const loop: Pt[] = [];
		let cursor = i;
		let guard = 0;
		while (!used.has(cursor) && guard++ <= boundary.length) {
			used.add(cursor);
			const edge = boundary[cursor]!;
			loop.push(edge.from);
			const next = byStart.get(key(edge.to))?.find((n) => !used.has(n));
			if (next == null) break;
			cursor = next;
		}
		if (loop.length >= 3) loops.push(loop);
	}
	return loops.map((loop) => `M${loop.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}Z`).join("");
}

/** Map a geographic position onto the sea grid (for shore-based effects). */
export function hexFromLatLon(latitude: number, longitude: number): Hex {
	const p = latLonToMap(latitude, longitude);
	return mapToHex(p.x, p.y);
}

export function parseHexKey(key: string): Hex {
	const [q, r] = key.split(",").map(Number);
	return { q: q ?? 0, r: r ?? 0 };
}

export function inBounds(h: Hex): boolean {
	return (
		Number.isInteger(h.q) &&
		Number.isInteger(h.r) &&
		h.q >= HEX_BOUNDS.minQ &&
		h.q <= HEX_BOUNDS.maxQ &&
		h.r >= HEX_BOUNDS.minR &&
		h.r <= HEX_BOUNDS.maxR
	);
}

/** Distance in hex steps. */
export function hexDistance(a: Hex, b: Hex): number {
	const dq = a.q - b.q;
	const dr = a.r - b.r;
	return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/** In-bounds hexes one step from `h`. */
export function hexNeighbors(h: Hex): Hex[] {
	return HEX_DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r })).filter(inBounds);
}

/** Every in-bounds hex within `radius` steps of `h` (including `h`). */
export function hexesInRange(h: Hex, radius: number): Hex[] {
	const out: Hex[] = [];
	for (let q = HEX_BOUNDS.minQ; q <= HEX_BOUNDS.maxQ; q++) {
		for (let r = HEX_BOUNDS.minR; r <= HEX_BOUNDS.maxR; r++) {
			const candidate = { q, r };
			if (hexDistance(h, candidate) <= radius) out.push(candidate);
		}
	}
	return out;
}

/** Pointy-top axial → pixel centre, for the SVG map. */
export function hexToPixel(h: Hex, size = HEX_SIZE): { x: number; y: number } {
	return {
		x: size * Math.sqrt(3) * (h.q + h.r / 2),
		y: size * 1.5 * h.r
	};
}

/** The `points` attribute of one hex polygon. */
export function hexPolygon(h: Hex, size = HEX_SIZE): string {
	const { x, y } = hexToPixel(h, size);
	const pts: string[] = [];
	for (let i = 0; i < 6; i++) {
		const angle = ((60 * i - 30) * Math.PI) / 180;
		pts.push(`${(x + size * Math.cos(angle)).toFixed(1)},${(y + size * Math.sin(angle)).toFixed(1)}`);
	}
	return pts.join(" ");
}

/** Bounds of the drawn map, for an SVG viewBox. */
export function hexMapViewBox(size = HEX_SIZE): { minX: number; minY: number; width: number; height: number } {
	const corners = [
		hexToPixel({ q: HEX_BOUNDS.minQ, r: HEX_BOUNDS.minR }, size),
		hexToPixel({ q: HEX_BOUNDS.maxQ, r: HEX_BOUNDS.minR }, size),
		hexToPixel({ q: HEX_BOUNDS.minQ, r: HEX_BOUNDS.maxR }, size),
		hexToPixel({ q: HEX_BOUNDS.maxQ, r: HEX_BOUNDS.maxR }, size)
	];
	const pad = size * 1.2;
	const minX = Math.min(...corners.map((c) => c.x)) - pad;
	const maxX = Math.max(...corners.map((c) => c.x)) + pad;
	const minY = Math.min(...corners.map((c) => c.y)) - pad;
	const maxY = Math.max(...corners.map((c) => c.y)) + pad;
	return {
		minX: Math.floor(minX),
		minY: Math.floor(minY),
		width: Math.ceil(maxX - minX),
		height: Math.ceil(maxY - minY)
	};
}

function cubeLerp(a: Hex, b: Hex, t: number): { x: number; y: number; z: number } {
	const ax = a.q;
	const az = a.r;
	const ay = -ax - az;
	const bx = b.q;
	const bz = b.r;
	const by = -bx - bz;
	return {
		x: ax + (bx - ax) * t,
		y: ay + (by - ay) * t,
		z: az + (bz - az) * t
	};
}

function cubeRound(c: { x: number; y: number; z: number }): Hex {
	let rx = Math.round(c.x);
	let ry = Math.round(c.y);
	let rz = Math.round(c.z);
	const dx = Math.abs(rx - c.x);
	const dy = Math.abs(ry - c.y);
	const dz = Math.abs(rz - c.z);
	if (dx > dy && dx > dz) rx = -ry - rz;
	else if (dy > dz) ry = -rx - rz;
	else rz = -rx - ry;
	return { q: rx, r: rz };
}

/** Hexes along a straight line from `a` to `b`, endpoints included. */
export function hexLine(a: Hex, b: Hex): Hex[] {
	const n = hexDistance(a, b);
	if (n === 0) return [a];
	const out: Hex[] = [];
	for (let i = 0; i <= n; i++) out.push(cubeRound(cubeLerp(a, b, i / n)));
	return out;
}

/**
 * Shortest path on the hex grid. `blocked` hexes are impassable, except the
 * destination (so a blockade stops you next to the danger, not short of it).
 * Returns `null` when no route exists.
 */
export function findPath(from: Hex, to: Hex, blocked: Set<string> = new Set()): Hex[] | null {
	if (!inBounds(from) || !inBounds(to)) return null;
	if (hexKey(from) === hexKey(to)) return [from];
	const target = hexKey(to);
	const queue: Hex[] = [from];
	const cameFrom = new Map<string, string | null>([[hexKey(from), null]]);
	while (queue.length) {
		const current = queue.shift()!;
		for (const next of hexNeighbors(current)) {
			const key = hexKey(next);
			if (cameFrom.has(key)) continue;
			if (blocked.has(key) && key !== target) continue;
			cameFrom.set(key, hexKey(current));
			if (key === target) {
				const path: Hex[] = [];
				let cursor: string | null = key;
				while (cursor) {
					path.unshift(parseHexKey(cursor));
					cursor = cameFrom.get(cursor) ?? null;
				}
				return path;
			}
			queue.push(next);
		}
	}
	return null;
}

// ── Weapons ─────────────────────────────────────────────────────────────────

export type TargetKind = "surface" | "sub" | "air";
export type WeaponId = "fighters" | "vls" | "heli_asw" | "light_guns" | "light_aa" | "torpedo" | "gnss_jam";

export interface WeaponDef {
	id: WeaponId;
	label: string;
	/** Range in hexes. */
	range: number;
	damage: number;
	targets: TargetKind[];
}

export const FLEET_WEAPONS: Record<WeaponId, WeaponDef> = {
	fighters: { id: "fighters", label: "Fighters", range: 3, damage: 16, targets: ["surface", "air"] },
	vls: { id: "vls", label: "VLS missiles", range: 3, damage: 22, targets: ["surface"] },
	heli_asw: { id: "heli_asw", label: "ASW helicopters", range: 2, damage: 18, targets: ["sub"] },
	light_guns: { id: "light_guns", label: "Light guns", range: 1, damage: 10, targets: ["surface"] },
	light_aa: { id: "light_aa", label: "Light AA", range: 2, damage: 12, targets: ["air"] },
	torpedo: { id: "torpedo", label: "Torpedoes", range: 1, damage: 34, targets: ["surface"] },
	gnss_jam: { id: "gnss_jam", label: "GNSS jammer", range: 3, damage: 0, targets: ["surface", "sub"] }
};

export const FLEET_WEAPON_IDS = Object.keys(FLEET_WEAPONS) as WeaponId[];

// ── Ship classes ────────────────────────────────────────────────────────────

export type ShipClassId =
	| "carrier"
	| "frigate"
	| "helipad"
	| "support_ship"
	| "corvette"
	| "destroyer"
	| "light_aa"
	| "gnss_jammer"
	| "torpedo_sub"
	| "vls_sub"
	| "container_ship"
	| "roro_ferry"
	| "tanker";

export type ShipCategory = "capital" | "escort" | "submarine" | "civilian";
export type CargoKind = "container" | "vehicle" | "fuel";

export interface ShipClassDef {
	id: ShipClassId;
	label: string;
	short: string;
	category: ShipCategory;
	role: string;
	blurb: string;
	/** Hit points. */
	hp: number;
	/** Hours needed to steam one hex. */
	moveHours: number;
	fuelCapacity: number;
	fuelPerHex: number;
	cargo: { kind: CargoKind | null; capacity: number };
	/** Point-defence strength: reduces incoming fighter/missile hits. */
	aa: number;
	/** Anti-submarine strength: needed to find and hit submarines. */
	asw: number;
	/** How hard the hull is to detect; surface ships see subs only with ASW. */
	stealth: number;
	/** How far this ship's sensors/spotting reach beyond one hex. */
	spotting: number;
	/** Can refuel other ships at sea (tankers, support ships). */
	fuelTransfer: boolean;
	/** Can lay mines (frigates and submarines). */
	minelayer: boolean;
	weapons: WeaponId[];
	build: { money: number; steel: number; hours: number };
	/** Treasury upkeep per day while afloat. */
	upkeep: number;
}

export const SHIP_CLASSES: Record<ShipClassId, ShipClassDef> = {
	// ── Capital ships ────────────────────────────────────────────────────────
	carrier: {
		id: "carrier",
		label: "Aircraft carrier",
		short: "CV",
		category: "capital",
		role: "Air wing · extended aerial range",
		blurb:
			"Its fighters reach three hexes, scouting the sea and striking surface ships and aircraft far beyond gun range.",
		hp: 220,
		moveHours: 2,
		fuelCapacity: 240,
		fuelPerHex: 8,
		cargo: { kind: null, capacity: 0 },
		aa: 8,
		asw: 2,
		stealth: 0,
		spotting: 4,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["fighters", "light_aa"],
		build: { money: 3_500_000, steel: 3_000, hours: 48 },
		upkeep: 9_000
	},
	frigate: {
		id: "frigate",
		label: "Frigate",
		short: "FF",
		category: "capital",
		role: "VLS · surface strike · minelayer",
		blurb: "Vertical launch missiles hit ships three hexes away; the hull can also seed a minefield for blockade.",
		hp: 140,
		moveHours: 1.5,
		fuelCapacity: 160,
		fuelPerHex: 5,
		cargo: { kind: null, capacity: 0 },
		aa: 5,
		asw: 4,
		stealth: 1,
		spotting: 2,
		fuelTransfer: false,
		minelayer: true,
		weapons: ["vls", "light_aa"],
		build: { money: 1_200_000, steel: 1_100, hours: 20 },
		upkeep: 3_500
	},
	helipad: {
		id: "helipad",
		label: "Helipad cruiser",
		short: "LH",
		category: "capital",
		role: "Helicopters · anti-submarine",
		blurb:
			"A flight deck for ASW helicopters: it finds and hunts submarines two hexes out and guards the fleet's belly.",
		hp: 170,
		moveHours: 1.8,
		fuelCapacity: 190,
		fuelPerHex: 6,
		cargo: { kind: null, capacity: 0 },
		aa: 6,
		asw: 12,
		stealth: 0,
		spotting: 3,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["heli_asw", "light_guns"],
		build: { money: 1_600_000, steel: 1_500, hours: 26 },
		upkeep: 4_500
	},

	// ── Escorts ──────────────────────────────────────────────────────────────
	support_ship: {
		id: "support_ship",
		label: "Support ship",
		short: "AO",
		category: "escort",
		role: "Replenishment at sea",
		blurb: "Carries fuel and spares to keep the task group steaming far from a port.",
		hp: 110,
		moveHours: 2,
		fuelCapacity: 300,
		fuelPerHex: 6,
		cargo: { kind: "fuel", capacity: 300 },
		aa: 2,
		asw: 0,
		stealth: 0,
		spotting: 1,
		fuelTransfer: true,
		minelayer: false,
		weapons: [],
		build: { money: 650_000, steel: 700, hours: 14 },
		upkeep: 1_800
	},
	corvette: {
		id: "corvette",
		label: "Corvette",
		short: "CT",
		category: "escort",
		role: "Light fires · coastal escort",
		blurb: "Cheap, quick hull with light guns for close action and convoy work.",
		hp: 90,
		moveHours: 1,
		fuelCapacity: 100,
		fuelPerHex: 3,
		cargo: { kind: null, capacity: 0 },
		aa: 3,
		asw: 2,
		stealth: 1,
		spotting: 1,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["light_guns"],
		build: { money: 320_000, steel: 320, hours: 8 },
		upkeep: 900
	},
	destroyer: {
		id: "destroyer",
		label: "Destroyer",
		short: "DD",
		category: "escort",
		role: "VLS · fleet air defence",
		blurb: "Missile-armed escort that screens the capital ships and reaches out to three hexes.",
		hp: 130,
		moveHours: 1.2,
		fuelCapacity: 150,
		fuelPerHex: 4,
		cargo: { kind: null, capacity: 0 },
		aa: 7,
		asw: 5,
		stealth: 1,
		spotting: 2,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["vls", "light_aa"],
		build: { money: 900_000, steel: 850, hours: 16 },
		upkeep: 2_600
	},
	light_aa: {
		id: "light_aa",
		label: "Light AA ship",
		short: "AA",
		category: "escort",
		role: "Point defence against aircraft",
		blurb: "A wall of light flak: it shreds incoming fighters and missiles before they reach the task group.",
		hp: 80,
		moveHours: 1,
		fuelCapacity: 90,
		fuelPerHex: 3,
		cargo: { kind: null, capacity: 0 },
		aa: 16,
		asw: 0,
		stealth: 0,
		spotting: 1,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["light_aa"],
		build: { money: 280_000, steel: 280, hours: 7 },
		upkeep: 800
	},
	gnss_jammer: {
		id: "gnss_jammer",
		label: "GNSS jammer ship",
		short: "EW",
		category: "escort",
		role: "Electronic warfare · GNSS denial",
		blurb:
			"Blinds satellite navigation for every hostile ship within three hexes: they steam slower and their guided weapons miss more often. The same trick is flown by fighter squadrons and dug in with air-defence battalions.",
		hp: 95,
		moveHours: 1.2,
		fuelCapacity: 140,
		fuelPerHex: 4,
		cargo: { kind: null, capacity: 0 },
		aa: 5,
		asw: 0,
		stealth: 1,
		spotting: 2,
		fuelTransfer: false,
		minelayer: false,
		weapons: ["gnss_jam", "light_aa"],
		build: { money: 780_000, steel: 520, hours: 13 },
		upkeep: 1_700
	},

	// ── Submarines ───────────────────────────────────────────────────────────
	torpedo_sub: {
		id: "torpedo_sub",
		label: "Torpedo submarine",
		short: "SS",
		category: "submarine",
		role: "Torpedo · silent hunter",
		blurb: "Hard to find without ASW; a close torpedo shot can cripple a capital ship.",
		hp: 70,
		moveHours: 1.5,
		fuelCapacity: 120,
		fuelPerHex: 3,
		cargo: { kind: null, capacity: 0 },
		aa: 0,
		asw: 0,
		stealth: 10,
		spotting: 1,
		fuelTransfer: false,
		minelayer: true,
		weapons: ["torpedo"],
		build: { money: 700_000, steel: 600, hours: 15 },
		upkeep: 1_600
	},
	vls_sub: {
		id: "vls_sub",
		label: "VLS submarine",
		short: "SSV",
		category: "submarine",
		role: "Submarine-launched missiles",
		blurb: "Strikes surface ships from three hexes while staying beneath the surface.",
		hp: 80,
		moveHours: 1.6,
		fuelCapacity: 130,
		fuelPerHex: 3,
		cargo: { kind: null, capacity: 0 },
		aa: 0,
		asw: 0,
		stealth: 8,
		spotting: 2,
		fuelTransfer: false,
		minelayer: true,
		weapons: ["vls"],
		build: { money: 1_050_000, steel: 900, hours: 19 },
		upkeep: 2_200
	},

	// ── Civilian ships ───────────────────────────────────────────────────────
	container_ship: {
		id: "container_ship",
		label: "Container ship",
		short: "CV-C",
		category: "civilian",
		role: "Container freight",
		blurb: "Moves containers between ports. Slow and defenceless — it needs escorts or safe lanes.",
		hp: 80,
		moveHours: 2.5,
		fuelCapacity: 140,
		fuelPerHex: 4,
		cargo: { kind: "container", capacity: 900 },
		aa: 0,
		asw: 0,
		stealth: 0,
		spotting: 0,
		fuelTransfer: false,
		minelayer: false,
		weapons: [],
		build: { money: 420_000, steel: 450, hours: 12 },
		upkeep: 700
	},
	roro_ferry: {
		id: "roro_ferry",
		label: "Ro-Ro ferry",
		short: "FR",
		category: "civilian",
		role: "Vehicles and passengers",
		blurb: "Roll-on/roll-off deck for vehicles and people; the backbone of short sea routes.",
		hp: 90,
		moveHours: 2,
		fuelCapacity: 110,
		fuelPerHex: 3,
		cargo: { kind: "vehicle", capacity: 500 },
		aa: 0,
		asw: 0,
		stealth: 0,
		spotting: 0,
		fuelTransfer: false,
		minelayer: false,
		weapons: [],
		build: { money: 300_000, steel: 330, hours: 10 },
		upkeep: 550
	},
	tanker: {
		id: "tanker",
		label: "Tanker",
		short: "TK",
		category: "civilian",
		role: "Fuel cargo · fleet replenishment",
		blurb: "Hauls fuel between ports and can top up warships at sea through its transfer hoses.",
		hp: 85,
		moveHours: 2.2,
		fuelCapacity: 130,
		fuelPerHex: 4,
		cargo: { kind: "fuel", capacity: 1200 },
		aa: 0,
		asw: 0,
		stealth: 0,
		spotting: 0,
		fuelTransfer: true,
		minelayer: false,
		weapons: [],
		build: { money: 380_000, steel: 400, hours: 11 },
		upkeep: 650
	}
};

export const SHIP_CLASS_IDS = Object.keys(SHIP_CLASSES) as ShipClassId[];
export const SHIP_CATEGORIES: ShipCategory[] = ["capital", "escort", "submarine", "civilian"];

export const SHIP_CATEGORY_LABEL: Record<ShipCategory, string> = {
	capital: "Capital ships",
	escort: "Escorts",
	submarine: "Submarines",
	civilian: "Civilian ships"
};

export function shipClass(id: string): ShipClassDef | undefined {
	return SHIP_CLASSES[id as ShipClassId];
}

/** A ship's bare hull type for combat targeting. */
export function targetKind(id: ShipClassId): TargetKind {
	return SHIP_CLASSES[id].category === "submarine"
		? "sub"
		: SHIP_CLASSES[id].category === "civilian"
			? "surface"
			: "surface";
}

// ── Exclusive economic zones ────────────────────────────────────────────────
// Regions are not hexagons: a coastal region has an irregular outline, and its
// maritime claim is the seawater offshore. Since the world map only stores a
// region centroid, we approximate its EEZ by the ring of sea hexes around that
// centroid that do not contain another region. Ports are placed on the nearest
// free hex in that ring, so every coastal region's EEZ is at least large
// enough to hold its port and the neighbouring sea lanes.

export const EEZ = {
	/** How many hex rings the maritime claim reaches from the coastline. */
	radiusHexes: 2,
	/** The port itself sits one hex offshore (inside the EEZ). */
	portDistanceHexes: 1
} as const;

type GeoRegion = { id: number; latitude: unknown; longitude: unknown };

/** The sea hexes claimed by a coastal region, excluding land and neighbours' claims. */
export function eezHexes(region: GeoRegion, allRegions: GeoRegion[]): Hex[] {
	const centre = hexFromLatLon(Number(region.latitude), Number(region.longitude));
	const land = new Set(allRegions.map((r) => hexKey(hexFromLatLon(Number(r.latitude), Number(r.longitude)))));
	return hexesInRange(centre, EEZ.radiusHexes).filter((h) => hexKey(h) !== hexKey(centre) && !land.has(hexKey(h)));
}

/** Pick a port hex inside the region's EEZ that no other port occupies. */
export function portHexForRegion(region: GeoRegion, allRegions: GeoRegion[], taken: Set<string>): Hex | null {
	const centre = hexFromLatLon(Number(region.latitude), Number(region.longitude));
	const candidates = eezHexes(region, allRegions).sort(
		(a, b) => hexDistance(a, centre) - hexDistance(b, centre) || a.q - b.q || a.r - b.r
	);
	return candidates.find((h) => !taken.has(hexKey(h))) ?? null;
}

// ── Airspace (Luftraum) ─────────────────────────────────────────────────────
// Aerial mode thinks in sectors, not single hexes: several sea hexes and the
// regions above them are grouped into one airspace block for planning.

export const AIRSPACE = { cols: 16, rows: 8 } as const;

export function airspaceSectorOf(h: Hex): string {
	const qSpan = HEX_BOUNDS.maxQ - HEX_BOUNDS.minQ + 1;
	const rSpan = HEX_BOUNDS.maxR - HEX_BOUNDS.minR + 1;
	const col = Math.max(0, Math.min(AIRSPACE.cols - 1, Math.floor(((h.q - HEX_BOUNDS.minQ) / qSpan) * AIRSPACE.cols)));
	const row = Math.max(0, Math.min(AIRSPACE.rows - 1, Math.floor(((h.r - HEX_BOUNDS.minR) / rSpan) * AIRSPACE.rows)));
	return `LR-${String.fromCharCode(65 + row)}${col + 1}`;
}

/** All airspace sectors with the sea hexes they contain. */
export function airspaceSectors(): { id: string; hexes: Hex[] }[] {
	const sectors = new Map<string, Hex[]>();
	for (let r = HEX_BOUNDS.minR; r <= HEX_BOUNDS.maxR; r++) {
		for (let q = HEX_BOUNDS.minQ; q <= HEX_BOUNDS.maxQ; q++) {
			const h = { q, r };
			const id = airspaceSectorOf(h);
			const list = sectors.get(id) ?? [];
			list.push(h);
			sectors.set(id, list);
		}
	}
	return [...sectors.entries()].map(([id, hexes]) => ({ id, hexes }));
}

// ── Facilities and costs ────────────────────────────────────────────────────

/** Treasury/materials costs for building facilities and laying mines. */
export const FACILITY = {
	port: { money: 800_000, steel: 600, hours: 0 },
	dock: { money: 1_000_000, steel: 900 },
	/** Per dock level: one construction slot and faster repairs. */
	maxDockLevel: 4,
	/** Ports expand by level too: each level adds fuel storage. */
	maxPortLevel: 5,
	portUpgrade: { money: 600_000, steel: 500 },
	/** Fuel units a level-1 port holds, and how much per extra level. */
	portFuelBase: 400,
	portFuelPerLevel: 250,
	/** Fuel units trickled into a port per hour from the state's reserve. */
	portFuelRegenPerHour: 12,
	mine: { money: 40_000, steel: 20 }
} as const;

/** Cost of taking a port from `level` to `level + 1`. */
export function portUpgradeCost(level: number): { money: number; steel: number } {
	const next = Math.max(1, level) + 1;
	return { money: FACILITY.portUpgrade.money * next, steel: FACILITY.portUpgrade.steel * next };
}

/** Cost of building a dock (level 1) or expanding it to the next level. */
export function dockUpgradeCost(level: number): { money: number; steel: number } {
	const next = Math.max(1, level);
	return { money: FACILITY.dock.money * next, steel: FACILITY.dock.steel * next };
}

/** Price to order one hull, including the steel taken from the state stockpile. */
export function buildCost(id: ShipClassId): { money: number; steel: number; hours: number } {
	return { ...SHIP_CLASSES[id].build };
}

/** Repair cost scales with the missing health and the hull's build price. */
export function shipRepairCost(id: ShipClassId, missingHealth: number): number {
	const missing = Math.max(1, Math.ceil(missingHealth));
	return Math.max(1_000, Math.round((SHIP_CLASSES[id].build.money / SHIP_CLASSES[id].hp) * missing * 0.6));
}

/** Hours a repair takes at a dock of the given level. */
export function repairHours(id: ShipClassId, missingHealth: number, dockLevel: number): number {
	const work = Math.max(1, Math.ceil(missingHealth));
	return Math.max(
		1,
		Math.round((work / SHIP_CLASSES[id].hp) * SHIP_CLASSES[id].build.hours * (1 / Math.max(1, dockLevel)))
	);
}

/** Hours a new hull takes at a dock of the given level. */
export function constructionHours(id: ShipClassId, dockLevel: number): number {
	return Math.max(1, Math.round(SHIP_CLASSES[id].build.hours / Math.max(1, dockLevel)));
}

// ── GNSS / navigation jamming ───────────────────────────────────────────────
// Jamming is not a naval-only trick: it can come from a ship, from an
// air-defence battalion ashore, or from fighter squadrons with EW pods. Every
// source degrades the same thing — a hostile ship's satellite navigation — so
// the effect is summed per hex by the fleet service.

export const GNSS = {
	/** Strength projected by one platform of each domain. */
	shipStrength: 12,
	landStrength: 6,
	airStrength: 8,
	/** How far each domain's emitter reaches, in hexes. */
	shipRange: 3,
	landRange: 3,
	airRange: 4,
	/** Existing land/air units that carry EW gear. */
	landUnitType: "air_defence",
	airUnitType: "fighter_squadron",
	/** Diminishing returns across several emitters. */
	maxStrength: 30,
	/** Each point of jamming shaves this much off a guided weapon's hit chance. */
	accuracyPenaltyPerPoint: 0.012,
	maxAccuracyPenalty: 0.35,
	/** Jammed navigation makes each leg take longer. */
	slowFactorPerPoint: 0.025,
	minSpeedFactor: 0.45
} as const;

export function gnssAccuracyPenalty(strength: number): number {
	return (
		Math.round(Math.min(GNSS.maxAccuracyPenalty, Math.max(0, strength) * GNSS.accuracyPenaltyPerPoint) * 1000) / 1000
	);
}

/** Multiplier on a ship's leg time: 1 = clear skies, <1 = slowed. */
export function gnssSpeedFactor(strength: number): number {
	return Math.round(Math.max(GNSS.minSpeedFactor, 1 - Math.max(0, strength) * GNSS.slowFactorPerPoint) * 1000) / 1000;
}

// ── Combat maths ────────────────────────────────────────────────────────────

/** Sum of a class's raw weapon damage, for intel/UI strength readouts. */
export function firepower(id: ShipClassId): number {
	return SHIP_CLASSES[id].weapons.reduce((sum, w) => sum + FLEET_WEAPONS[w].damage, 0);
}

export interface CombatTarget {
	shipClass: ShipClassId;
	aa: number;
	stealth: number;
	/** Whether the firing side has found this ship (ASW vs stealth). */
	detected: boolean;
}

/** Can a weapon of this type ever hit a target of that kind? */
export function weaponCanTarget(weapon: WeaponId, kind: TargetKind, detected: boolean): boolean {
	const def = FLEET_WEAPONS[weapon];
	if (!def.targets.includes(kind)) return false;
	if (kind === "sub" && !detected) return false;
	return true;
}

/**
 * Chance a weapon hits at `distance`. Long range, point defence and stealth
 * all bite; the attacker's own ASW is folded into `detected` before this call.
 */
export function hitChance(weapon: WeaponId, distance: number, target: CombatTarget, jamming = 0): number {
	const def = FLEET_WEAPONS[weapon];
	let chance = 0.82 - Math.max(0, distance - 1) * 0.13 - gnssAccuracyPenalty(jamming);
	// AA matters most against missiles and aircraft, a little against shells.
	const aaWeight = weapon === "fighters" || weapon === "vls" ? 0.035 : weapon === "light_aa" ? 0.02 : 0.012;
	chance -= target.aa * aaWeight;
	if (target.shipClass === "torpedo_sub" || target.shipClass === "vls_sub") chance -= target.stealth * 0.01;
	return Math.round(Math.max(0.05, Math.min(0.95, chance)) * 1000) / 1000;
}

/** Damage a mine detonation deals; merchant hulls fare much worse. */
export function mineDamage(strength: number, civilian: boolean): number {
	return Math.max(1, Math.round(strength * (civilian ? 1.1 : 0.7)));
}

/** A minefield blockades a hex (and, with neighbours, a port). */
export const MINEFIELD = {
	/** Mine strength lost per detonation. */
	DETONATION_COST: 35,
	/** Hours a minefield lasts. */
	LIFETIME_HOURS: 48,
	/** Damage a support ship can absorb for a neighbour per tick. */
	SUPPORT_REPAIR: 2
} as const;
