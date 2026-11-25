// Procedural imagery for sea and coastal regions. Reuses the frame primitives
// and renderer of utils/sensor-image.ts, so the same EO/IR/SAR "sensor look"
// applies to a sweep over water: sea state, surf, a coastline when the hex or
// region is coastal, and only the contacts the report actually found.
import { hash32, seededRandom } from "#lib/config/index.js";
import {
	FRAME_H,
	FRAME_W,
	imageMode,
	type Detection,
	type ImageryInput,
	type Placement,
	type Prim,
	type Scene
} from "./sensor-image.js";

export interface SeaImageryInput {
	/** Stable seed: hex q/r or region id. */
	seed: number;
	lat?: number;
	lon?: number;
	sensor: string;
	observedAt: string;
	night: boolean;
	weather: string;
	/** The frame includes a shoreline (coastal region or coastal hex). */
	coastal: boolean;
	/** Real coastline from the world SVG (map units). When present, the land
	 *  is drawn to this exact outline instead of a synthetic shore. */
	coastline?: { x: number; y: number }[];
	/** Where the coast sits in the frame; defaults to the outline's centre. */
	coastCentre?: { x: number; y: number };
	/** A friendly port sits on the coast in view. */
	port?: boolean;
	contacts: { surface: number; sub: number; mine: number };
	confidence: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ring = (p: [number, number], r: number, n = 8): [number, number][] =>
	Array.from({ length: n }, (_, k) => [
		p[0] + Math.cos((k / n) * Math.PI * 2) * r,
		p[1] + Math.sin((k / n) * Math.PI * 2) * r
	]);
const r1 = (n: number) => Math.round(n * 10) / 10;
const grey = (v: number) =>
	`rgb(${Math.round(clamp(v) * 255)},${Math.round(clamp(v) * 255)},${Math.round(clamp(v) * 255)})`;
const hexRgb = (h: string) => {
	const n = parseInt(h.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const shade = (h: string, v: number) => {
	const [r, g, b] = hexRgb(h);
	const f = 1 + v;
	return `rgb(${Math.round(clamp(r * f, 0, 255))},${Math.round(clamp(g * f, 0, 255))},${Math.round(clamp(b * f, 0, 255))})`;
};

const EO = {
	water: "#263b47",
	waterDeep: "#1b2f3b",
	foam: "#cedbd6",
	sand: "#b6a67e",
	land: "#5d674c",
	ship: "#9ba5a4",
	deck: "#c8cdc7",
	hullDark: "#4c5657",
	mine: "#3d4140"
} as const;

const IR = {
	water: 0.24,
	waterDeep: 0.2,
	foam: 0.45,
	sand: 0.52,
	land: 0.4,
	ship: 0.78,
	deck: 0.9,
	hullDark: 0.6,
	mine: 0.32
} as const;

const SAR = {
	water: 0.03,
	waterDeep: 0.02,
	foam: 0.34,
	sand: 0.2,
	land: 0.38,
	ship: 0.98,
	deck: 0.88,
	hullDark: 0.72,
	mine: 0.62
} as const;

type Material = keyof typeof EO;

/** Minimal ImageryInput for the shared HUD (lat/lon, sensor, conditions). */
export function seaFrameInput(input: SeaImageryInput): ImageryInput {
	return {
		reportId: input.seed,
		regionId: input.seed,
		sensor: input.sensor,
		observedAt: input.observedAt,
		lat: input.lat ?? null,
		lon: input.lon ?? null,
		terrain: input.coastal ? "shore" : "plains",
		strikes: [],
		findings: {
			outcome: "ok",
			conditions: { weather: input.weather, night: input.night, cover: "water" },
			airDefence: null,
			coverage: {},
			categories: [],
			unitTypes: null,
			firingPositions: null,
			buildings: null,
			battle: null
		}
	};
}

/** Build one sea frame. Deterministic: the same hex/sensor/seed always matches. */
export function buildSeaScene(input: SeaImageryInput): Scene {
	return buildSea(input).scene;
}

/** The frame's land mask (true on land), as the frame draws it: for checking placement. */
export function seaLandAt(input: SeaImageryInput): (p: [number, number]) => boolean {
	return buildSea(input).inLand;
}

function buildSea(input: SeaImageryInput): { scene: Scene; inLand: (p: [number, number]) => boolean } {
	const mode = imageMode(input.sensor);
	const rng = seededRandom(hash32(input.seed, 0x5ea1, input.sensor.length));
	const night = input.night;
	const colour = (m: Material, v = 0) => {
		if (mode === "eo") return shade(EO[m], night ? -0.28 + v : v);
		const base = (mode === "ir" ? IR : SAR)[m];
		return grey(base + v * 0.06);
	};
	const ground: Prim[] = [];
	const features: Prim[] = [];
	const objects: Prim[] = [];
	const effects: Prim[] = [];
	const detections: Detection[] = [];
	const notes: string[] = [];

	// Sea state: broad bands plus short wave crests, in world (frame) space.
	ground.push({ k: "rect", x: 0, y: 0, w: FRAME_W, h: FRAME_H, fill: colour("water") });
	for (let i = 0; i < 9; i++) {
		const y = (i / 9) * FRAME_H + rng() * 30;
		ground.push({
			k: "rect",
			x: -20,
			y: r1(y),
			w: FRAME_W + 40,
			h: r1(18 + rng() * 22),
			fill: colour("waterDeep", rng() * 1.2 - 0.6),
			op: 0.5
		});
	}
	for (let i = 0; i < 120; i++) {
		const x = rng() * FRAME_W;
		const y = rng() * FRAME_H;
		const len = 4 + rng() * 16;
		features.push({
			k: "path",
			d: `M${r1(x)} ${r1(y)}q${r1(len / 2)} ${r1(-2 - rng() * 3)} ${r1(len)} 0`,
			stroke: colour("foam", -0.4 + rng() * 0.3),
			sw: r1(0.5 + rng() * 0.7),
			fill: "none",
			op: 0.25 + rng() * 0.3
		});
	}

	// The shore: the real outline of the coastal region where we have it,
	// otherwise a synthetic shore. Sand, cliffs and palms are hung on that line.
	let shoreX = -1;
	let coastPath: [number, number][] = [];
	/** The land as a closed polygon (the region outline, or the synthetic shore and its edge). */
	let landPoly: [number, number][] = [];
	let portAt: [number, number] | null = null;
	if (input.coastal) {
		if (input.coastline && input.coastline.length >= 3) {
			const xs = input.coastline.map((p) => p.x);
			const ys = input.coastline.map((p) => p.y);
			const cx = input.coastCentre?.x ?? (Math.min(...xs) + Math.max(...xs)) / 2;
			const cy = input.coastCentre?.y ?? (Math.min(...ys) + Math.max(...ys)) / 2;
			const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
			const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));
			const zoom = Math.min((FRAME_W * 0.6) / spanX, (FRAME_H * 0.6) / spanY);
			coastPath = input.coastline.map((p) => [FRAME_W / 2 + (p.x - cx) * zoom, FRAME_H / 2 + (p.y - cy) * zoom]);
			landPoly = coastPath;
			const d = coastPath.map((p, i) => `${i ? "L" : "M"}${r1(p[0])} ${r1(p[1])}`).join("") + "Z";
			ground.push({ k: "path", d, fill: colour("land") });
			features.push({ k: "path", d, stroke: colour("sand", 0.2), sw: 12, fill: "none", op: 0.95 });
			features.push({ k: "path", d, stroke: colour("sand", -0.2), sw: 4, fill: "none", op: 0.7 });
			features.push({ k: "path", d, stroke: colour("foam"), sw: 2, fill: "none", op: 0.7, dash: "9 7" });
			const centrePt: [number, number] = [FRAME_W / 2, FRAME_H / 2];
			const step = Math.max(2, Math.floor(coastPath.length / 26));
			for (let i = 0; i < coastPath.length; i += step) {
				const p = coastPath[i]!;
				const q = coastPath[(i + 1) % coastPath.length]!;
				const dx = q[0] - p[0];
				const dy = q[1] - p[1];
				const len = Math.hypot(dx, dy) || 1;
				let nx = dy / len;
				let ny = -dx / len;
				if ((p[0] - centrePt[0]) * nx + (p[1] - centrePt[1]) * ny < 0) {
					nx = -nx;
					ny = -ny;
				}
				// Grains of sand along the waterline.
				for (let g = 0; g < 3; g++) {
					const t = rng() * 8 - 4;
					features.push({
						k: "circle",
						x: r1(p[0] + nx * (2 + rng() * 7) + (dx / len) * t),
						y: r1(p[1] + ny * (2 + rng() * 7) + (dy / len) * t),
						r: 1.2,
						fill: colour("sand", 0.5),
						op: 0.8
					});
				}
				const r = rng();
				if (r < 0.3) {
					// Rocky headland / cliff: a jagged wedge falling to the sea.
					const cliff = [
						[p[0] - (dx / len) * 7, p[1] - (dy / len) * 7],
						[p[0] + nx * (8 + rng() * 7), p[1] + ny * (8 + rng() * 7)],
						[p[0] + (dx / len) * 7, p[1] + (dy / len) * 7]
					];
					features.push({
						k: "path",
						d: cliff.map((v, k) => `${k ? "L" : "M"}${r1(v[0])} ${r1(v[1])}`).join("") + "Z",
						fill: colour("land", -0.28),
						stroke: colour("sand", -0.4),
						sw: 1
					});
				} else if (r < 0.62 && mode !== "sar") {
					// Palm on the landward side of the beach.
					const bx = p[0] - nx * (9 + rng() * 6);
					const by = p[1] - ny * (9 + rng() * 6);
					features.push({
						k: "path",
						d: `M${r1(bx)} ${r1(by)}q2 -8 4 -13`,
						stroke: colour("land", 0.2),
						sw: 1.4,
						fill: "none"
					});
					for (let f = 0; f < 5; f++) {
						const a = (f / 5) * Math.PI * 2 + rng() * 0.4;
						features.push({
							k: "path",
							d: `M${r1(bx + 4)} ${r1(by - 13)}q${r1(Math.cos(a) * 7)} ${r1(Math.sin(a) * 5 - 4)} ${r1(Math.cos(a) * 13)} ${r1(Math.sin(a) * 6)}`,
							stroke: colour("land", 0.35),
							sw: 1.6,
							fill: "none"
						});
					}
				}
			}
			notes.push("Coastline follows the region outline");
			notes.push("Sand beach" + (rng() < 0.5 ? ", cliffs and palms" : " and surf"));
		} else {
			const left = rng() < 0.5;
			const edge = left ? 0 : FRAME_W;
			const pts: [number, number][] = [
				[edge, 0],
				[edge, FRAME_H]
			];
			for (let k = 0; k <= 18; k++) {
				const y = (k / 18) * FRAME_H;
				const x = (left ? 120 : FRAME_W - 120) + Math.sin(k * 0.85 + rng() * 0.4) * 34 + (rng() - 0.5) * 20;
				pts.push([x, y]);
			}
			coastPath = pts;
			const land: [number, number][] = left
				? [[-200, FRAME_H + 200], ...pts.slice(2).reverse(), [-200, -200]]
				: [[FRAME_W + 200, -200], ...pts.slice(2), [FRAME_W + 200, FRAME_H + 200]];
			landPoly = land;
			ground.push({
				k: "path",
				d: land.map((p, i) => `${i ? "L" : "M"}${r1(p[0])} ${r1(p[1])}`).join("") + "Z",
				fill: colour("land")
			});
			const coast = pts.map((p, i) => `${i ? "L" : "M"}${r1(p[0])} ${r1(p[1])}`).join("");
			for (let s = 0; s < 3; s++)
				features.push({
					k: "path",
					d: coast,
					stroke: colour("sand", s === 0 ? 0.1 : -0.2),
					sw: 5 - s * 1.5,
					fill: "none",
					op: 0.7 - s * 0.18
				});
			features.push({ k: "path", d: coast, stroke: colour("foam"), sw: 1.4, fill: "none", op: 0.55 });
			shoreX = left ? 135 : FRAME_W - 135;
			notes.push("Shoreline and surf visible");
		}
		if (input.port) {
			// Quay, cranes and a moored hull on the water side of the shore.
			let px = shoreX > 0 ? shoreX : FRAME_W * 0.35;
			let py = FRAME_H * (0.35 + rng() * 0.3);
			if (input.coastline && coastPath.length) {
				const k = Math.floor(coastPath.length * (0.3 + rng() * 0.4));
				px = coastPath[k]![0];
				py = coastPath[k]![1];
			}
			features.push({ k: "rect", x: r1(px - 26), y: r1(py), w: 52, h: 9, fill: colour("sand", 0.15) });
			for (let c = 0; c < 2; c++) {
				const cx = px - 16 + c * 28;
				features.push({ k: "path", d: `M${cx} ${r1(py)}v-26h20`, stroke: colour("deck"), sw: 2.4, fill: "none" });
				features.push({ k: "path", d: `M${cx - 6} ${r1(py - 26)}h26`, stroke: colour("ship"), sw: 1.2, fill: "none" });
			}
			portAt = [px, py];
			detections.push({
				x: px - 34,
				y: py - 34,
				w: 78,
				h: 66,
				label: "PORT",
				detail: "FRIENDLY",
				kind: "site",
				icon: "build"
			});
			notes.push("Port installations identified");
		}
	}

	/** True on land: inside the region outline or the synthetic shore. */
	const inLand = (p: [number, number]) => {
		if (!landPoly.length) return false;
		let inside = false;
		for (let i = 0, j = landPoly.length - 1; i < landPoly.length; j = i++) {
			const a = landPoly[i]!;
			const b = landPoly[j]!;
			if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0])
				inside = !inside;
		}
		return inside;
	};

	const placements: Placement[] = [];
	/** Points round a hull of length len and beam at p, rotated rot degrees, grown by margin. */
	const footprint = (p: [number, number], rot: number, len: number, beam: number, margin = 0): [number, number][] => {
		const a = (rot * Math.PI) / 180;
		const c = Math.cos(a);
		const s = Math.sin(a);
		const h = len / 2 + margin;
		const b = beam / 2 + margin;
		const local: [number, number][] = [
			[h, 0],
			[-h, 0],
			[-h, b],
			[-h, -b],
			[h * 0.5, b],
			[h * 0.5, -b],
			[0, b],
			[0, -b],
			[-h * 0.5, b],
			[-h * 0.5, -b]
		];
		return local.map(([x, y]) => [p[0] + x * c - y * s, p[1] + x * s + y * c]);
	};
	const taken: { p: [number, number]; r: number }[] = [];
	const free = (p: [number, number], rot: number, len: number, beam: number, margin: number) =>
		!inLand(p) &&
		footprint(p, rot, len, beam, margin).every((q) => !inLand(q)) &&
		!taken.some((t) => Math.hypot(t.p[0] - p[0], t.p[1] - p[1]) < t.r + len / 2 + 4);
	/** A spot on open water, clear of the shore by a margin; null if the frame has none. */
	const place = (min: number, max: number, len: number, beam: number): { p: [number, number]; rot: number } | null => {
		for (let k = 0; k < 60; k++) {
			const p: [number, number] = [min + rng() * (max - min), 50 + rng() * (FRAME_H - 100)];
			const rot = rng() * 24 - 12;
			if (free(p, rot, len, beam, 8)) {
				taken.push({ p, r: len / 2 });
				return { p, rot };
			}
		}
		// Crowded or mostly land: sweep the frame for any open water.
		for (let y = 50; y <= FRAME_H - 50; y += 20)
			for (let x = 40; x <= FRAME_W - 40; x += 20)
				if (free([x, y], 0, len, beam, 6)) {
					taken.push({ p: [x, y], r: len / 2 });
					return { p: [x, y], rot: 0 };
				}
		return null;
	};
	/** A ship from above: pointed bow, square transom, superstructure aft, wake astern when under way. */
	const shipSprite = ([x, y]: [number, number], rot: number, scale: number, moving: boolean, what: string) => {
		placements.push({ what, on: "water", foot: footprint([x, y], rot, 46 * scale, 10 * scale) });
		const tf = `translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${r1(scale)})`;
		if (moving) {
			objects.push({
				k: "path",
				d: "M-23 0l-40 14M-23 0l-40 -14",
				stroke: colour("foam"),
				sw: 1.2,
				fill: "none",
				op: mode === "sar" ? 0.3 : 0.55,
				tf
			});
			objects.push({
				k: "path",
				d: "M-23 0h-34",
				stroke: mode === "sar" ? grey(0) : colour("foam", 0.2),
				sw: 4,
				fill: "none",
				op: 0.5,
				tf
			});
		}
		objects.push({
			k: "path",
			d: "M23 0Q19 -5 12 -5L-21 -5Q-23 -5 -23 -3V3Q-23 5 -21 5L12 5Q19 5 23 0Z",
			fill: colour("ship"),
			stroke: colour("hullDark"),
			sw: 1,
			tf
		});
		objects.push({ k: "path", d: "M-19 -3.4h9v6.8h-9zM-6 -3h18v6h-18z", fill: colour("deck"), tf });
		objects.push({
			k: "path",
			d: "M15 0a1.6 1.6 0 1 0 -3.2 0a1.6 1.6 0 1 0 3.2 0M-14 0h-5",
			stroke: colour("hullDark"),
			sw: 1,
			fill: "none",
			tf
		});
	};

	if (portAt) {
		// The moored hull lies off the quay, on whichever side is water.
		const [px, py] = portAt;
		for (const [dx, dy] of [
			[7, 18],
			[7, -22],
			[-30, 18],
			[44, 18],
			[7, 34],
			[7, -38]
		]) {
			const p: [number, number] = [px + dx, py + dy];
			if (!free(p, 0, 34, 8, 2)) continue;
			objects.push({
				k: "rect",
				x: r1(p[0] - 17),
				y: r1(p[1] - 4),
				w: 34,
				h: 8,
				rx: 1,
				fill: colour("ship"),
				stroke: colour("hullDark"),
				sw: 0.6
			});
			placements.push({ what: "moored", on: "water", foot: footprint(p, 0, 34, 8) });
			taken.push({ p, r: 17 });
			break;
		}
	}

	const surface = Math.min(6, Math.max(0, Math.round(input.contacts.surface)));
	const surfPts: [number, number][] = [];
	for (let i = 0; i < surface; i++) {
		const scale = 1.1 + rng() * 0.4;
		const at = place(shoreX > 0 ? 150 : 40, shoreX > 0 ? FRAME_W - 40 : FRAME_W - 150, 46 * scale, 10 * scale);
		if (!at) continue;
		shipSprite(at.p, at.rot, scale, rng() < 0.6, "surface");
		surfPts.push(at.p);
	}
	if (surfPts.length) {
		const xs = surfPts.map((p) => p[0]);
		const ys = surfPts.map((p) => p[1]);
		detections.push({
			x: r1(Math.min(...xs) - 26),
			y: r1(Math.min(...ys) - 22),
			w: r1(Math.max(...xs) - Math.min(...xs) + 52),
			h: r1(Math.max(...ys) - Math.min(...ys) + 44),
			label: "SURFACE CONTACT",
			detail: `×${input.contacts.surface} · ${Math.round(input.confidence * 100)}%`,
			kind: "unit",
			icon: "ship"
		});
		notes.push(`${input.contacts.surface} surface contact${input.contacts.surface === 1 ? "" : "s"}`);
	}

	const subs = Math.min(4, Math.max(0, Math.round(input.contacts.sub)));
	const subPts: [number, number][] = [];
	for (let i = 0; i < subs; i++) {
		const at = place(40, FRAME_W - 40, 26, 8);
		if (!at) continue;
		const p = at.p;
		placements.push({ what: "submarine", on: "water", foot: footprint(p, 0, 26, 8) });
		objects.push({
			k: "ellipse",
			x: p[0],
			y: p[1],
			rx: 13,
			ry: 4,
			fill: colour("hullDark", 0.1),
			op: mode === "ir" ? 0.65 : 0.55
		});
		objects.push({ k: "path", d: `M${r1(p[0] - 4)} ${r1(p[1])}h8`, stroke: colour("deck"), sw: 0.8, fill: "none" });
		subPts.push(p);
	}
	if (subPts.length) {
		detections.push({
			x: r1(Math.min(...subPts.map((p) => p[0])) - 22),
			y: r1(Math.min(...subPts.map((p) => p[1])) - 16),
			w: r1(Math.max(...subPts.map((p) => p[0])) - Math.min(...subPts.map((p) => p[0])) + 44),
			h: r1(Math.max(...subPts.map((p) => p[1])) - Math.min(...subPts.map((p) => p[1])) + 32),
			label: "SUBSURFACE CONTACT",
			detail: `×${input.contacts.sub}`,
			kind: "unit",
			icon: "sub"
		});
		notes.push(`${input.contacts.sub} submarine contact${input.contacts.sub === 1 ? "" : "s"}`);
	}

	const mines = Math.min(10, Math.max(0, Math.round(input.contacts.mine)));
	const minePts: [number, number][] = [];
	const field = mines ? place(60, FRAME_W - 60, 40, 40) : null;
	for (let i = 0; i < mines && field; i++) {
		const a = rng() * Math.PI * 2;
		const d = i === 0 ? 0 : 12 + rng() * 38;
		const p: [number, number] = [
			clamp(field.p[0] + Math.cos(a) * d, 30, FRAME_W - 30),
			clamp(field.p[1] + Math.sin(a) * d, 40, FRAME_H - 40)
		];
		if (ring(p, 6).some(inLand) || inLand(p)) continue;
		placements.push({ what: "mine", on: "water", foot: [p] });
		objects.push({ k: "circle", x: p[0], y: p[1], r: 3.4, fill: colour("mine"), stroke: colour("deck"), sw: 0.6 });
		for (let k = 0; k < 4; k++) {
			const a = (k / 4) * Math.PI * 2;
			objects.push({
				k: "path",
				d: `M${r1(p[0] + Math.cos(a) * 3)} ${r1(p[1] + Math.sin(a) * 3)}l${r1(Math.cos(a) * 2.6)} ${r1(Math.sin(a) * 2.6)}`,
				stroke: colour("deck"),
				sw: 0.6
			});
		}
		minePts.push(p);
	}
	if (minePts.length) {
		const xs = minePts.map((p) => p[0]);
		const ys = minePts.map((p) => p[1]);
		detections.push({
			x: r1(Math.min(...xs) - 18),
			y: r1(Math.min(...ys) - 18),
			w: r1(Math.max(...xs) - Math.min(...xs) + 36),
			h: r1(Math.max(...ys) - Math.min(...ys) + 36),
			label: "MINEFIELD",
			detail: `×${input.contacts.mine}`,
			kind: "unit",
			icon: "mine"
		});
		notes.push(`Minefield: ${input.contacts.mine} mines`);
	}
	if (!detections.length) notes.push("No contacts in the swept area");

	const cloudy = input.weather === "cloudy" || input.weather === "rain" || input.weather === "fog";
	const darkness = mode === "sar" ? 0 : night && mode === "eo" ? 0.72 : night ? 0.18 : 0;
	const scene: Scene = {
		mode,
		status: "ok",
		platform: "satellite",
		w: FRAME_W,
		h: FRAME_H,
		seed: input.seed,
		view: "translate(0 0)",
		heading: 0,
		base: colour("water"),
		relief: 0,
		reliefAzimuth: 0,
		reliefElevation: 0,
		canopy: { base: "", light: "", dark: "" },
		furrow: "",
		ground,
		features,
		objects,
		effects,
		atmosphere: [],
		lights:
			night && mode !== "sar"
				? surfPts.slice(0, 3).map((p) => ({ k: "circle", x: r1(p[0]), y: r1(p[1] - 8), r: 1.2, fill: "#ffe9a8" }))
				: [],
		detections,
		tone: {
			darkness,
			haze: cloudy && mode === "eo" ? 0.42 : 0.12,
			hazeColor: "#9fb4b8",
			grain: mode === "eo" ? 0.14 : 0.06,
			blur: cloudy && mode !== "sar" ? 0.7 : 0.25,
			vignette: 0.22,
			speckle: mode === "sar" ? 0.75 : 0.15,
			static: mode === "sar" ? 0.1 : 0.03,
			tint: null,
			snow: 0
		},
		visibility: cloudy && mode !== "sar" ? 0.58 : 0.92,
		brightness: mode === "ir" ? 0.35 : mode === "sar" ? 0.2 : 0.32,
		scale: { meters: 2000, px: 80 },
		sprites: surfPts.length + subPts.length + minePts.length,
		placements,
		notes
	};
	return { scene, inLand };
}
