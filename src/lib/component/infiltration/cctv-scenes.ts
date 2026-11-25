// The pictures behind the camera feeds. Each scene is a small perspective set
// (a turbine hall, an apron, a server aisle…) drawn on a 320×180 canvas, with a
// few moving extras on top: people, vehicles, blinking lights. Layout details
// come from the site's seed, so a given camera always shows the same room.
//
// Scenes paint twice: once in colour and once on a "heat" layer that the
// thermal mode reads (people, engines and transformers glow).

import type { CamScene } from "#lib/config/index.js";

export type CamMode = "auto" | "day" | "ir" | "thermal";
export type CamLens = "wide" | "fisheye";
export const CAM_MODES: { id: CamMode; label: string }[] = [
	{ id: "auto", label: "Auto" },
	{ id: "day", label: "Day" },
	{ id: "ir", label: "IR" },
	{ id: "thermal", label: "Thermal" }
];

export const SW = 320;
export const SH = 180;

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface Paint {
	c: Ctx;
	/** Heat layer for thermal; null when nobody is looking in thermal. */
	h: Ctx | null;
}
export interface Actor {
	/** Rough depth, for painting far things first. */
	z: number;
	draw(p: Paint, t: number): void;
}
export interface Scene {
	base(p: Paint): void;
	actors: Actor[];
}

type Rng = () => number;
type Pt = readonly [number, number];
/** World (x right, y up, z away) to screen, for a camera at height camH. */
type Proj = (x: number, y: number, z: number) => Pt;

function camera(vx: number, vy: number, camH: number, f = 150): Proj {
	return (x, y, z) => {
		const d = Math.max(0.35, z);
		return [vx + (x * f) / d, vy + ((camH - y) * f) / d];
	};
}

const rgb = (v: number, tint: readonly [number, number, number] = [1, 1.03, 1]) =>
	`rgb(${Math.round(Math.min(255, v * tint[0]))},${Math.round(Math.min(255, v * tint[1]))},${Math.round(Math.min(255, v * tint[2]))})`;

function poly(c: Ctx, pts: Pt[], fill: string | null, stroke?: string, lw = 1) {
	c.beginPath();
	pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.closePath();
	if (fill) {
		c.fillStyle = fill;
		c.fill();
	}
	if (stroke) {
		c.strokeStyle = stroke;
		c.lineWidth = lw;
		c.stroke();
	}
}
function seg(c: Ctx, a: Pt, b: Pt, stroke: string, lw = 1) {
	c.beginPath();
	c.moveTo(a[0], a[1]);
	c.lineTo(b[0], b[1]);
	c.strokeStyle = stroke;
	c.lineWidth = lw;
	c.stroke();
}
function dot(c: Ctx, [x, y]: Pt, r: number, fill: string) {
	c.beginPath();
	c.arc(x, y, Math.max(0.4, r), 0, Math.PI * 2);
	c.fillStyle = fill;
	c.fill();
}

/** An axis-aligned box standing on the floor; draws the faces the camera can see. */
function box(
	p: Paint,
	P: Proj,
	camH: number,
	x0: number,
	x1: number,
	z0: number,
	z1: number,
	y0: number,
	y1: number,
	v: number,
	heat = 0
) {
	const faces: [Pt[], number][] = [];
	if (camH > y1) faces.push([[P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], 1.18]);
	if (x1 < 0) faces.push([[P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)], 0.72]);
	if (x0 > 0) faces.push([[P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], 0.72]);
	faces.push([[P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], 1]);
	for (const [pts, k] of faces) {
		poly(p.c, pts, rgb(v * k), rgb(v * k * 1.25), 0.5);
		if (p.h) poly(p.h, pts, rgb(heat * 255 * (k > 1 ? 0.9 : 1), [1, 1, 1]));
	}
}

/** Floor, walls, ceiling and back wall of a room seen from one end. */
function room(
	p: Paint,
	P: Proj,
	w: number,
	h: number,
	depth: number,
	tone: { floor: number; wall: number; ceil: number; back?: number },
	grid = 2
) {
	const c = p.c;
	const near = 0.4;
	poly(c, [P(-w / 2, h, near), P(w / 2, h, near), P(w / 2, h, depth), P(-w / 2, h, depth)], rgb(tone.ceil));
	poly(c, [P(-w / 2, 0, near), P(-w / 2, h, near), P(-w / 2, h, depth), P(-w / 2, 0, depth)], rgb(tone.wall * 0.85));
	poly(c, [P(w / 2, 0, near), P(w / 2, h, near), P(w / 2, h, depth), P(w / 2, 0, depth)], rgb(tone.wall * 0.8));
	poly(c, [P(-w / 2, 0, near), P(w / 2, 0, near), P(w / 2, 0, depth), P(-w / 2, 0, depth)], rgb(tone.floor));
	poly(
		c,
		[P(-w / 2, 0, depth), P(w / 2, 0, depth), P(w / 2, h, depth), P(-w / 2, h, depth)],
		rgb(tone.back ?? tone.wall)
	);
	if (p.h) {
		p.h.fillStyle = rgb(18, [1, 1, 1]);
		p.h.fillRect(0, 0, SW, SH);
	}
	const line = rgb(tone.floor * 1.25);
	for (let x = -w / 2; x <= w / 2 + 0.01; x += grid) seg(c, P(x, 0, near), P(x, 0, depth), line, 0.5);
	for (let z = 1; z < depth; z += grid) seg(c, P(-w / 2, 0, z), P(w / 2, 0, z), line, 0.5);
}

/** Sky, ground and a horizon for the outdoor cameras. */
function outdoors(p: Paint, horizon: number, sky: number, ground: number) {
	const c = p.c;
	const g = c.createLinearGradient(0, 0, 0, horizon);
	g.addColorStop(0, rgb(sky * 0.7));
	g.addColorStop(1, rgb(sky));
	c.fillStyle = g;
	c.fillRect(0, 0, SW, horizon);
	c.fillStyle = rgb(ground);
	c.fillRect(0, horizon, SW, SH - horizon);
	if (p.h) {
		p.h.fillStyle = rgb(8, [1, 1, 1]);
		p.h.fillRect(0, 0, SW, SH);
		p.h.fillStyle = rgb(34, [1, 1, 1]);
		p.h.fillRect(0, horizon, SW, SH - horizon);
	}
}

/** Ceiling strip lights. */
function lights(p: Paint, P: Proj, h: number, xs: number[], depth: number, step = 4) {
	for (let z = 2; z < depth; z += step)
		for (const x of xs)
			poly(
				p.c,
				[
					P(x - 0.4, h - 0.02, z),
					P(x + 0.4, h - 0.02, z),
					P(x + 0.4, h - 0.02, z + 1.2),
					P(x - 0.4, h - 0.02, z + 1.2)
				],
				rgb(235)
			);
}

// ── Extras ──────────────────────────────────────────────────────────────────

const ease = (u: number) => u * u * (3 - 2 * u);
const loop = (t: number, period: number, phase = 0) => ((((t + phase * period) / period) % 1) + 1) % 1;
/** 0→1→0 with rests at both ends. */
const shuttle = (t: number, period: number, phase = 0) => {
	const u = loop(t, period, phase);
	return u < 0.1 ? 0 : u < 0.5 ? ease((u - 0.1) / 0.4) : u < 0.6 ? 1 : 1 - ease((u - 0.6) / 0.4);
};

function drawPerson(p: Paint, P: Proj, x: number, z: number, coat: number, walk: number, seated = false) {
	const [fx, fy] = P(x, 0, z);
	const [, hy] = P(x, seated ? 1.25 : 1.75, z);
	const h = fy - hy;
	const w = h * 0.26;
	const c = p.c;
	const swing = Math.sin(walk * Math.PI * 2) * w * 0.35;
	const legs = h * 0.45;
	const paint = (ctx: Ctx, body: string, skin: string, leg: string) => {
		if (!seated) {
			ctx.fillStyle = leg;
			ctx.fillRect(fx - w * 0.45 + swing, fy - legs, w * 0.38, legs);
			ctx.fillRect(fx + w * 0.07 - swing, fy - legs, w * 0.38, legs);
		}
		ctx.fillStyle = body;
		ctx.fillRect(fx - w / 2, hy + h * 0.18, w, h * (seated ? 0.5 : 0.4));
		ctx.beginPath();
		ctx.arc(fx, hy + h * 0.09, h * 0.09, 0, Math.PI * 2);
		ctx.fillStyle = skin;
		ctx.fill();
	};
	paint(c, rgb(coat), rgb(168, [1.08, 0.98, 0.9]), rgb(coat * 0.6));
	if (p.h) paint(p.h, rgb(190, [1, 1, 1]), rgb(250, [1, 1, 1]), rgb(150, [1, 1, 1]));
	// A soft contact shadow so they sit on the floor.
	c.fillStyle = "rgba(0,0,0,0.25)";
	c.fillRect(fx - w * 0.7, fy - 1, w * 1.4, 2);
}

function walker(P: Proj, from: Pt, to: Pt, period: number, phase: number, coat: number): Actor {
	return {
		z: (from[1] + to[1]) / 2,
		draw(p, t) {
			const u = shuttle(t, period, phase);
			const x = from[0] + (to[0] - from[0]) * u;
			const z = from[1] + (to[1] - from[1]) * u;
			const moving = u > 0 && u < 1;
			drawPerson(p, P, x, z, coat, moving ? t * 1.6 : 0);
		}
	};
}

function sitter(P: Proj, x: number, z: number, coat: number, phase: number): Actor {
	return {
		z,
		draw(p, t) {
			drawPerson(p, P, x + Math.sin(t * 0.7 + phase) * 0.04, z, coat, 0, true);
		}
	};
}

function blinker(
	P: Proj,
	x: number,
	y: number,
	z: number,
	period: number,
	phase: number,
	tone = 255,
	red = false
): Actor {
	return {
		z,
		draw(p, t) {
			if (loop(t, period, phase) > 0.35) return;
			const pt = P(x, y, z);
			const r = Math.max(0.8, 6 / Math.max(1, z));
			dot(p.c, pt, r * 2.2, red ? "rgba(255,90,70,0.25)" : "rgba(255,240,200,0.25)");
			dot(p.c, pt, r, red ? rgb(tone, [1, 0.45, 0.4]) : rgb(tone));
			if (p.h) dot(p.h, pt, r * 1.4, rgb(240, [1, 1, 1]));
		}
	};
}

function vehicle(
	P: Proj,
	camH: number,
	path: { x0: number; z0: number; x1: number; z1: number },
	size: { w: number; l: number; h: number },
	period: number,
	phase: number,
	tone: number,
	once = false
): Actor {
	return {
		z: (path.z0 + path.z1) / 2,
		draw(p, t) {
			const u = once ? ease(loop(t, period, phase)) : shuttle(t, period, phase);
			const x = path.x0 + (path.x1 - path.x0) * u;
			const z = path.z0 + (path.z1 - path.z0) * u;
			const alongZ = Math.abs(path.z1 - path.z0) > Math.abs(path.x1 - path.x0);
			const hw = (alongZ ? size.w : size.l) / 2;
			const hl = (alongZ ? size.l : size.w) / 2;
			box(p, P, camH, x - hw, x + hw, z - hl, z + hl, 0.3, size.h * 0.55, tone, 0.75);
			box(
				p,
				P,
				camH,
				x - hw * 0.85,
				x + hw * 0.85,
				z - hl * 0.5,
				z + hl * 0.4,
				size.h * 0.55,
				size.h,
				tone * 0.75,
				0.5
			);
			// Headlights facing the camera.
			const l = P(x - hw * 0.7, 0.6, z - hl);
			const r = P(x + hw * 0.7, 0.6, z - hl);
			dot(p.c, l, 8 / z, rgb(250));
			dot(p.c, r, 8 / z, rgb(250));
			// Wheels.
			for (const wx of [x - hw * 0.8, x + hw * 0.8]) dot(p.c, P(wx, 0.3, z - hl), 6 / z, rgb(20));
		}
	};
}

/** A few cardboard boxes riding a conveyor. */
function conveyor(P: Proj, camH: number, x: number, z0: number, z1: number, period: number, count: number): Actor {
	return {
		z: (z0 + z1) / 2,
		draw(p, t) {
			for (let i = 0; i < count; i++) {
				const u = loop(t, period, i / count);
				const z = z1 - (z1 - z0) * u;
				box(p, P, camH, x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0.9, 1.4, 120, 0.2);
			}
		}
	};
}

/** A plane seen from above and behind, as a flat silhouette on the tarmac. */
function plane(p: Paint, P: Proj, x: number, z: number, s: number, v: number) {
	const body: Pt[] = [
		P(x - 0.8 * s, 0.4, z - 6 * s),
		P(x + 0.8 * s, 0.4, z - 6 * s),
		P(x + 0.6 * s, 0.4, z + 6 * s),
		P(x - 0.6 * s, 0.4, z + 6 * s)
	];
	const wings: Pt[] = [
		P(x - 7 * s, 0.5, z + 0.5 * s),
		P(x + 7 * s, 0.5, z + 0.5 * s),
		P(x + 1, 0.5, z - 2 * s),
		P(x - 1, 0.5, z - 2 * s)
	];
	const tail: Pt[] = [
		P(x - 2.5 * s, 0.6, z + 5 * s),
		P(x + 2.5 * s, 0.6, z + 5 * s),
		P(x + 0.5, 0.6, z + 4 * s),
		P(x - 0.5, 0.6, z + 4 * s)
	];
	for (const pts of [wings, body, tail]) {
		poly(p.c, pts, rgb(v), rgb(v * 1.3), 0.5);
		if (p.h) poly(p.h, pts, rgb(70, [1, 1, 1]));
	}
}

function screen(p: Paint, P: Proj, x0: number, x1: number, y0: number, y1: number, z: number, rng: Rng) {
	const a = P(x0, y1, z);
	const b = P(x1, y0, z);
	const c = p.c;
	c.fillStyle = rgb(70, [0.8, 1, 1.15]);
	c.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
	c.strokeStyle = rgb(150, [0.8, 1.1, 1.2]);
	c.lineWidth = 0.6;
	c.beginPath();
	// A mimic diagram: pipes and boxes.
	for (let i = 0; i < 4; i++) {
		const y = a[1] + (b[1] - a[1]) * (0.2 + rng() * 0.6);
		c.moveTo(a[0] + 2, y);
		c.lineTo(b[0] - 2, y);
	}
	c.stroke();
	if (p.h) {
		p.h.fillStyle = rgb(90, [1, 1, 1]);
		p.h.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
	}
}

// ── The scenes ──────────────────────────────────────────────────────────────

export function composeScene(scene: CamScene, rng: Rng): Scene {
	const j = (n: number) => (rng() - 0.5) * n;
	const coat = () => 50 + rng() * 90;
	switch (scene) {
		case "gate": {
			const camH = 4;
			const P = camera(150 + j(40), 62, camH);
			const booth = 5 + j(1);
			return {
				base(p) {
					outdoors(p, 62, 120, 62);
					poly(p.c, [P(-3, 0, 1.5), P(3, 0, 1.5), P(3, 0, 200), P(-3, 0, 200)], rgb(46));
					for (let z = 3; z < 120; z += 6)
						poly(
							p.c,
							[P(-0.08, 0, z), P(0.08, 0, z), P(0.08, 0, z + 2.5), P(-0.08, 0, z + 2.5)],
							rgb(170, [1.1, 1, 0.7])
						);
					for (const s of [-1, 1])
						for (let z = 2; z < 140; z += 2.5) seg(p.c, P(s * 8, 0, z), P(s * 8, 2.2, z), rgb(110), 0.6);
					for (const s of [-1, 1]) seg(p.c, P(s * 8, 2.2, 2), P(s * 8, 2.2, 140), rgb(110), 0.6);
					box(p, P, camH, booth, booth + 2.2, 11, 13.5, 0, 2.8, 95, 0.25);
					const [wx, wy] = P(booth, 2.1, 11);
					const [wx2, wy2] = P(booth + 2.2, 1.2, 11);
					p.c.fillStyle = rgb(215, [1.1, 1, 0.75]);
					p.c.fillRect(wx + 2, wy, wx2 - wx - 4, wy2 - wy);
					for (let x = -3; x < 3; x += 0.8)
						poly(
							p.c,
							[P(x, 1, 12), P(x + 0.4, 1, 12), P(x + 0.4, 1.12, 12), P(x, 1.12, 12)],
							rgb(220, [1.15, 0.55, 0.5])
						);
					seg(p.c, P(3.4, 0, 12), P(3.4, 1.2, 12), rgb(150), 1.2);
				},
				actors: [
					vehicle(
						P,
						camH,
						{ x0: -1.5, z0: 90, x1: -1.5, z1: 14 },
						{ w: 1.9, l: 4.4, h: 1.5 },
						26,
						rng(),
						90 + rng() * 60
					),
					vehicle(P, camH, { x0: 1.5, z0: 4, x1: 1.5, z1: 120 }, { w: 2.2, l: 6, h: 2.4 }, 34, rng(), 120, true),
					walker(P, [booth - 0.6, 9.5], [booth - 0.6, 10.5], 9, rng(), 60),
					blinker(P, booth + 1.1, 3, 12, 1.6, rng(), 255, true)
				]
			};
		}
		case "perimeter": {
			const camH = 3.5;
			const P = camera(110 + j(30), 58, camH);
			return {
				base(p) {
					outdoors(p, 58, 105, 54);
					for (let z = 1.5; z < 160; z += 3) seg(p.c, P(-2.5, 0, z), P(-2.5, 2.6, z), rgb(150), 0.7);
					for (const y of [1, 1.8, 2.6]) seg(p.c, P(-2.5, y, 1.5), P(-2.5, y, 160), rgb(130), 0.5);
					poly(p.c, [P(0, 0, 1), P(1.4, 0, 1), P(1.4, 0, 160), P(0, 0, 160)], rgb(72));
					for (const z of [8, 24, 50]) {
						seg(p.c, P(3, 0, z), P(3, 6, z), rgb(110), 1);
						const top = P(3, 6, z);
						const g = p.c.createRadialGradient(
							top[0],
							top[1] + (20 / z) * 8,
							0,
							top[0],
							top[1] + (20 / z) * 8,
							(120 / z) * 6
						);
						g.addColorStop(0, "rgba(255,250,220,0.22)");
						g.addColorStop(1, "rgba(255,250,220,0)");
						p.c.fillStyle = g;
						p.c.fillRect(0, 0, SW, SH);
						dot(p.c, top, 9 / z, rgb(250));
					}
				},
				actors: [walker(P, [0.7, 40], [0.7, 4], 30, rng(), coat()), blinker(P, 3, 6.2, 24, 2.2, rng(), 255, true)]
			};
		}
		case "apron": {
			const camH = 9;
			const P = camera(160 + j(30), 50, camH, 130);
			const planes = 2 + Math.floor(rng() * 2);
			const spots = Array.from({ length: planes }, (_, i) => [-14 + i * 13 + j(3), 28 + j(16)] as const);
			return {
				base(p) {
					outdoors(p, 50, 130, 76);
					for (const x of [-20, -7, 6, 19]) seg(p.c, P(x, 0, 6), P(x, 0, 200), rgb(190, [1.1, 1, 0.6]), 0.8);
					box(p, P, camH, -30, 30, 110, 140, 0, 16, 105, 0.15);
					poly(p.c, [P(-12, 0, 110), P(12, 0, 110), P(12, 12, 110), P(-12, 12, 110)], rgb(40));
					for (const [x, z] of [...spots].sort((a, b) => b[1] - a[1])) plane(p, P, x, z, 1.4, 150);
					seg(p.c, P(26, 0, 100), P(26, 22, 100), rgb(120), 1.4);
					box(p, P, camH, 24, 28, 98, 102, 22, 25, 120, 0.3);
				},
				actors: [
					vehicle(P, camH, { x0: -26, z0: 16, x1: 26, z1: 16 }, { w: 2, l: 3, h: 1.6 }, 40, rng(), 170),
					walker(P, [spots[0]![0] + 4, spots[0]![1] - 6], [spots[0]![0] - 4, spots[0]![1] - 6], 22, rng(), 200),
					blinker(P, 26, 25.4, 100, 1.2, rng(), 255, true),
					blinker(P, spots[1]![0], 1.8, spots[1]![1] - 6, 1.4, rng(), 255, true)
				]
			};
		}
		case "hangar": {
			const camH = 6;
			const P = camera(160 + j(20), 70, camH, 120);
			return {
				base(p) {
					room(p, P, 34, 12, 60, { floor: 80, wall: 70, ceil: 40, back: 90 }, 4);
					for (let z = 4; z < 60; z += 6) seg(p.c, P(-17, 11.5, z), P(17, 11.5, z), rgb(95), 0.8);
					lights(p, P, 12, [-8, 8], 60, 10);
					plane(p, P, j(3), 26, 1.8, 175);
					for (const x of [-12, 11]) box(p, P, camH, x, x + 1.6, 12, 13.5, 0, 1.1, 120, 0.1);
				},
				actors: [
					walker(P, [-6, 14], [6, 18], 26, rng(), coat()),
					walker(P, [9, 36], [3, 12], 34, rng(), coat()),
					blinker(P, 0, 3, 34, 1.8, rng(), 255, true)
				]
			};
		}
		case "turbine": {
			const camH = 7;
			const P = camera(150 + j(40), 66, camH, 130);
			const units = 2 + Math.floor(rng() * 2);
			return {
				base(p) {
					room(p, P, 24, 14, 70, { floor: 74, wall: 82, ceil: 44, back: 92 }, 3);
					for (const x of [-11, 11]) seg(p.c, P(x, 12, 1), P(x, 12, 70), rgb(170, [1.15, 1.05, 0.6]), 1.2);
					seg(p.c, P(-11, 12, 30), P(11, 12, 30), rgb(170, [1.15, 1.05, 0.6]), 2);
					lights(p, P, 14, [-6, 6], 70, 9);
					for (let u = units - 1; u >= 0; u--) {
						const z0 = 10 + u * 18;
						box(p, P, camH, -3.2, 2.8, z0, z0 + 14, 0, 1.2, 70, 0.4);
						box(p, P, camH, -2.6, 2.2, z0 + 1, z0 + 13, 1.2, 3.6, 135, 0.85);
						seg(p.c, P(3.6, 1, z0), P(3.6, 1, z0 + 14), rgb(200, [1.2, 1.05, 0.5]), 0.8);
					}
				},
				actors: [walker(P, [5.5, 36], [5.5, 5], 32, rng(), coat()), blinker(P, 2.2, 3.8, 10, 1.1, rng(), 255, true)]
			};
		}
		case "control": {
			const camH = 2.8;
			const P = camera(160 + j(20), 72, camH, 160);
			const seats = [-2.4, 0.2, 2.6].filter(() => rng() < 0.75);
			return {
				base(p) {
					room(p, P, 13, 3.4, 12, { floor: 58, wall: 88, ceil: 70, back: 50 }, 1.5);
					lights(p, P, 3.4, [-3, 3], 12, 3);
					for (let i = 0; i < 6; i++) screen(p, P, -6 + i * 2, -4.2 + i * 2, 1.2, 2.9, 11.9, rng);
					box(p, P, camH, -5, 5, 6.5, 7.5, 0, 0.8, 120, 0.2);
					for (let x = -4.5; x < 4.5; x += 1.6) box(p, P, camH, x, x + 1, 6.7, 6.8, 0.8, 1.4, 60, 0.6);
				},
				actors: [
					...seats.map((x) => sitter(P, x, 6.2, coat(), rng() * 6)),
					walker(P, [-5, 10], [4, 10], 24, rng(), coat()),
					blinker(P, -3.7, 2.7, 11.8, 0.9, rng(), 255, true),
					blinker(P, 1.9, 2.2, 11.8, 2.6, rng(), 230)
				]
			};
		}
		case "yard": {
			const camH = 6;
			const P = camera(160 + j(30), 56, camH, 130);
			const rows = [16, 26, 38];
			return {
				base(p) {
					outdoors(p, 56, 110, 82);
					for (let i = 0; i < 260; i++) {
						p.c.fillStyle = rgb(60 + rng() * 60);
						p.c.fillRect(rng() * SW, 56 + rng() * 124, 1, 1);
					}
					for (const z of [60, 90]) {
						const a = P(-20, 0, z);
						const b = P(-20, 18, z);
						seg(p.c, a, b, rgb(130), 1);
						seg(p.c, P(20, 0, z), P(20, 18, z), rgb(130), 1);
						seg(p.c, b, P(20, 18, z), rgb(130), 0.7);
					}
					for (const z of [...rows].reverse())
						for (const x of [-10, 0, 10]) {
							box(p, P, camH, x - 2, x + 2, z, z + 3, 0, 2.6, 100, 0.8);
							for (const k of [-1, 0, 1]) seg(p.c, P(x + k * 1.2, 2.6, z + 1), P(x + k * 1.2, 4, z + 1), rgb(180), 0.8);
						}
					for (let x = -20; x < 20; x += 1) seg(p.c, P(x, 0, 6), P(x, 2.4, 6), rgb(120), 0.4);
				},
				actors: [walker(P, [-6, 12], [8, 12], 40, rng(), 180), blinker(P, 0, 4.2, 26, 1.5, rng(), 255, true)]
			};
		}
		case "aisle":
		case "switch": {
			const camH = 2.7;
			const P = camera(160 + j(20), 74, camH, 150);
			const sw = scene === "switch";
			const leds: [number, number, number][] = [];
			for (let z = 2; z < 24; z += 0.6)
				for (const x of [-1.25, 1.25])
					for (let k = 0; k < 3; k++) leds.push([x + (x < 0 ? 0.62 : -0.62), 0.4 + rng() * 1.6, z + rng() * 0.5]);
			return {
				base(p) {
					room(p, P, sw ? 5 : 4, 3, 26, { floor: 88, wall: 60, ceil: 52, back: 70 }, 0.6);
					lights(p, P, 3, [0], 26, 3);
					for (let z = 24; z > 2; z -= 0.6) {
						box(p, P, camH, -2, -0.65, z, z + 0.58, 0, 2.2, sw ? 70 : 52, 0.35);
						box(p, P, camH, 0.65, 2, z, z + 0.58, 0, 2.2, sw ? 70 : 52, 0.35);
					}
					if (sw) for (const x of [-1.3, 1.3]) seg(p.c, P(x, 2.7, 1), P(x, 2.7, 26), rgb(170, [1.1, 1.1, 0.6]), 2);
				},
				actors: [
					walker(P, [0, 20], [0, 2.5], 28, rng(), coat()),
					{
						z: 12,
						draw(p, t) {
							for (let i = 0; i < leds.length; i++) {
								if ((i * 7919 + Math.floor(t * (2 + (i % 5)))) % 5 > 1) continue;
								const [x, y, z] = leds[i]!;
								dot(p.c, P(x, y, z), 0.7, i % 4 ? rgb(200, [0.6, 1.2, 0.6]) : rgb(230, [1.2, 0.8, 0.3]));
							}
						}
					}
				]
			};
		}
		case "badge":
		case "lobby": {
			const camH = 3.2;
			const P = camera(160 + j(30), 70, camH, 150);
			const desk = scene === "badge" ? -3 : j(2);
			return {
				base(p) {
					room(p, P, 12, 4, 14, { floor: 120, wall: 100, ceil: 80, back: 110 }, 1.2);
					lights(p, P, 4, [-3, 3], 14, 3);
					poly(p.c, [P(-1.5, 2.6, 13.9), P(1.5, 2.6, 13.9), P(1.5, 3.4, 13.9), P(-1.5, 3.4, 13.9)], rgb(70));
					box(p, P, camH, desk - 2, desk + 2, 8.5, 9.5, 0, 1.1, 150, 0.2);
					if (scene === "badge") for (const x of [1, 2.2, 3.4]) box(p, P, camH, x, x + 0.3, 6, 7, 0, 1, 170, 0.1);
					else
						for (const x of [-5.2, 5.2]) {
							box(p, P, camH, x - 0.4, x + 0.4, 10, 10.8, 0, 0.6, 90, 0.2);
							for (let l = 0; l < 7; l++)
								dot(p.c, P(x + j(1.2), 0.8 + rng() * 1, 10.4), 2.5, rgb(80, [0.8, 1.15, 0.8]));
						}
				},
				actors: [
					sitter(P, desk, 9.9, coat(), rng() * 4),
					walker(P, [1.6, 12], [1.6, 2], 18, rng(), coat()),
					walker(P, [2.8, 2.4], [2.8, 12.5], 23, rng(), coat()),
					blinker(P, desk + 1.4, 1.2, 8.5, 2.2, rng(), 230)
				]
			};
		}
		case "corridor": {
			const camH = 2.5;
			const P = camera(160 + j(20), 76, camH, 150);
			return {
				base(p) {
					room(p, P, 2.4, 2.8, 40, { floor: 96, wall: 110, ceil: 82, back: 60 }, 1.2);
					lights(p, P, 2.8, [0], 40, 4);
					for (let z = 3; z < 38; z += 5)
						for (const s of [-1, 1]) {
							const x = s * 1.2;
							poly(p.c, [P(x, 0, z), P(x, 0, z + 1), P(x, 2.1, z + 1), P(x, 2.1, z)], rgb(78));
						}
					poly(
						p.c,
						[P(-0.3, 2.3, 39.9), P(0.3, 2.3, 39.9), P(0.3, 2.55, 39.9), P(-0.3, 2.55, 39.9)],
						rgb(200, [0.4, 1.2, 0.5])
					);
				},
				actors: [walker(P, [0.3, 30], [-0.3, 3], 24, rng(), coat()), blinker(P, 0, 2.78, 14, 0.35, rng(), 240)]
			};
		}
		case "mast": {
			const camH = 3;
			const P = camera(160 + j(40), 92, camH, 130);
			return {
				base(p) {
					outdoors(p, 92, 135, 70);
					for (let x = -14; x < 14; x += 1.2) seg(p.c, P(x, 0, 20), P(x, 2.4, 20), rgb(120), 0.4);
					const legs = [-2, 2].map((x) => [P(x, 0, 30), P(x * 0.15, 40, 30)] as const);
					for (const [a, b] of legs) seg(p.c, a, b, rgb(150), 1.4);
					for (let y = 3; y < 40; y += 4) {
						const w = 2 - (y / 40) * 1.7;
						seg(p.c, P(-w, y, 30), P(w, y, 30), rgb(140), 0.7);
						seg(p.c, P(-w, y, 30), P(w * 0.9, y + 4, 30), rgb(120), 0.5);
					}
					for (const [y, x] of [
						[28, -1.5],
						[33, 1.2],
						[22, 1.6]
					] as const)
						dot(p.c, P(x, y, 30), 4, rgb(180));
					box(p, P, camH, 4, 7, 24, 26, 0, 2.2, 120, 0.3);
				},
				actors: [
					blinker(P, 0, 40.5, 30, 1.5, rng(), 255, true),
					vehicle(P, camH, { x0: -12, z0: 14, x1: -4, z1: 14 }, { w: 2, l: 5, h: 2.2 }, 50, rng(), 150),
					walker(P, [4, 22], [1, 26], 26, rng(), coat())
				]
			};
		}
		case "cleanroom": {
			const camH = 2.8;
			const P = camera(160 + j(20), 72, camH, 150);
			return {
				base(p) {
					room(p, P, 10, 3, 18, { floor: 190, wall: 205, ceil: 175, back: 200 }, 1);
					lights(p, P, 3, [-2.5, 2.5], 18, 2.5);
					for (let z = 16; z > 3; z -= 3)
						for (const x of [-4.6, 3.4]) {
							box(p, P, camH, x, x + 1.2, z, z + 2.4, 0, 0.95, 170, 0.1);
							box(p, P, camH, x, x + 1.2, z + 0.2, z + 2.2, 1.6, 2.2, 150, 0.1);
						}
				},
				actors: [
					walker(P, [-1, 15], [1, 3], 26, rng(), 225),
					sitter(P, -3, 8, 225, 1),
					blinker(P, 3.8, 1.1, 9, 1.3, rng(), 230, true)
				]
			};
		}
		case "ops": {
			const camH = 3.6;
			const P = camera(160 + j(20), 60, camH, 150);
			return {
				base(p) {
					room(p, P, 16, 4.6, 18, { floor: 46, wall: 50, ceil: 30, back: 40 }, 2);
					const a = P(-6, 4.2, 17.9);
					const b = P(6, 1.4, 17.9);
					p.c.fillStyle = rgb(55, [0.7, 1, 1.25]);
					p.c.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
					for (let i = 0; i < 9; i++) {
						p.c.strokeStyle = rgb(150, [0.7, 1.1, 1.3]);
						p.c.lineWidth = 0.6;
						p.c.beginPath();
						p.c.ellipse(
							a[0] + rng() * (b[0] - a[0]),
							a[1] + rng() * (b[1] - a[1]),
							3 + rng() * 9,
							2 + rng() * 5,
							0,
							0,
							Math.PI * 2
						);
						p.c.stroke();
					}
					if (p.h) {
						p.h.fillStyle = rgb(80, [1, 1, 1]);
						p.h.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
					}
					for (const z of [13, 10, 7])
						for (const x of [-6, -1, 4]) {
							box(p, P, camH, x, x + 3, z, z + 0.9, 0, 0.75 + (13 - z) * -0.05 + 0.3, 110, 0.15);
							box(p, P, camH, x + 0.4, x + 2.6, z + 0.2, z + 0.3, 1, 1.5, 70, 0.6);
						}
				},
				actors: [
					...[-4.5, 0.5, 5.5].map((x, i) => sitter(P, x, 6.5 + (i % 2) * 3, coat(), i)),
					walker(P, [-7, 15], [7, 15], 30, rng(), coat()),
					blinker(P, j(8), 3, 17.8, 1.1, rng(), 255, true),
					blinker(P, j(8), 2.2, 17.8, 1.7, rng(), 255, true)
				]
			};
		}
		case "office": {
			const camH = 2.9;
			const P = camera(160 + j(30), 72, camH, 150);
			const desks: [number, number][] = [];
			for (let z = 20; z > 3; z -= 3.2) for (const x of [-5, -2, 1.6, 4.6]) if (rng() < 0.85) desks.push([x, z]);
			return {
				base(p) {
					room(p, P, 14, 3, 24, { floor: 90, wall: 120, ceil: 100 }, 1.5);
					lights(p, P, 3, [-3, 3], 24, 3);
					for (let z = 2; z < 23; z += 3)
						poly(
							p.c,
							[P(-7, 0.9, z), P(-7, 0.9, z + 2.4), P(-7, 2.6, z + 2.4), P(-7, 2.6, z)],
							rgb(200, [0.95, 1, 1.05])
						);
					for (const [x, z] of desks) {
						box(p, P, camH, x, x + 1.6, z, z + 0.9, 0, 0.74, 140, 0.1);
						box(p, P, camH, x + 0.5, x + 1.1, z + 0.5, z + 0.55, 0.74, 1.15, 50, 0.5);
					}
				},
				actors: [
					...desks.filter(() => rng() < 0.35).map(([x, z]) => sitter(P, x + 0.8, z - 0.3, coat(), rng() * 5)),
					walker(P, [0, 22], [0, 3], 22, rng(), coat()),
					walker(P, [-6, 8], [6, 8], 30, rng(), coat())
				]
			};
		}
		case "boardroom": {
			const camH = 2.6;
			const P = camera(160 + j(10), 78, camH, 160);
			const seated = [-1.3, 1.3, -1.3, 1.3].map((x, i) => [x, 4 + i * 1.2] as const).filter(() => rng() < 0.4);
			return {
				base(p) {
					room(p, P, 6, 3, 10, { floor: 70, wall: 110, ceil: 90, back: 95 }, 1);
					lights(p, P, 3, [0], 10, 2.5);
					const a = P(-1.4, 2.4, 9.9);
					const b = P(1.4, 1, 9.9);
					p.c.fillStyle = rgb(120, [0.8, 1, 1.2]);
					p.c.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
					for (let z = 8; z > 3; z -= 1.2)
						for (const x of [-1.6, 1.25]) box(p, P, camH, x, x + 0.35, z, z + 0.4, 0, 1, 50, 0.1);
					box(p, P, camH, -0.9, 0.9, 3, 8.5, 0.6, 0.76, 95, 0.1);
				},
				actors: [...seated.map(([x, z]) => sitter(P, x, z, coat(), rng() * 5)), blinker(P, 0, 0.8, 9.8, 3, rng(), 220)]
			};
		}
		case "line": {
			const camH = 5;
			const P = camera(170 + j(30), 64, camH, 140);
			return {
				base(p) {
					room(p, P, 20, 8, 50, { floor: 76, wall: 70, ceil: 42, back: 86 }, 2);
					lights(p, P, 8, [-6, 6], 50, 6);
					for (const x of [-3.2, 1.2]) seg(p.c, P(x, 0.01, 1), P(x, 0.01, 50), rgb(200, [1.2, 1.1, 0.4]), 1);
					box(p, P, camH, -2.4, -0.4, 2, 48, 0, 0.9, 92, 0.3);
					for (let z = 44; z > 6; z -= 9) {
						box(p, P, camH, -4.6, -3.4, z, z + 1.2, 0, 0.8, 120, 0.5);
						seg(p.c, P(-4, 0.8, z + 0.6), P(-3, 2.2, z + 0.6), rgb(190, [1.2, 1, 0.4]), 2);
						seg(p.c, P(-3, 2.2, z + 0.6), P(-1.6, 1.6, z + 0.6), rgb(190, [1.2, 1, 0.4]), 1.6);
					}
				},
				actors: [
					conveyor(P, camH, -1.4, 2, 48, 24, 7),
					walker(P, [1.6, 30], [1.6, 6], 30, rng(), coat()),
					blinker(P, -4, 1, 26, 0.8, rng(), 255, true),
					blinker(P, -4, 1, 8, 1.3, rng(), 255, true)
				]
			};
		}
		case "dock": {
			const camH = 4.5;
			const P = camera(160 + j(30), 52, camH, 140);
			const open = [rng() < 0.6, true, rng() < 0.4];
			return {
				base(p) {
					outdoors(p, 52, 110, 58);
					poly(p.c, [P(-14, 0, 30), P(14, 0, 30), P(14, 7, 30), P(-14, 7, 30)], rgb(108));
					[-8, 0, 8].forEach((x, i) => {
						poly(
							p.c,
							[P(x - 2.4, 1.2, 29.9), P(x + 2.4, 1.2, 29.9), P(x + 2.4, 5, 29.9), P(x - 2.4, 5, 29.9)],
							open[i] ? rgb(22) : rgb(140)
						);
						if (!open[i])
							for (let y = 1.5; y < 5; y += 0.5) seg(p.c, P(x - 2.4, y, 29.9), P(x + 2.4, y, 29.9), rgb(110), 0.5);
						dot(p.c, P(x, 5.6, 29.9), 2, rgb(240, [1.1, 1, 0.7]));
					});
					box(p, P, camH, -14, 14, 28.5, 30, 0, 1.2, 90, 0.1);
					for (const x of [-10, -4, 4, 10]) seg(p.c, P(x, 0, 3), P(x, 0, 28), rgb(190, [1.1, 1.05, 0.5]), 0.8);
				},
				actors: [
					vehicle(P, camH, { x0: 0, z0: 8, x1: 0, z1: 24 }, { w: 2.5, l: 9, h: 3.6 }, 46, rng(), 150),
					vehicle(P, camH, { x0: -12, z0: 18, x1: 12, z1: 18 }, { w: 1.2, l: 2.2, h: 2 }, 20, rng(), 175),
					walker(P, [-8, 27], [-3, 26], 16, rng(), coat()),
					blinker(P, 9.5, 5.6, 29.8, 1.4, rng(), 255, true)
				]
			};
		}
		case "hall": {
			const camH = 4;
			const P = camera(160 + j(20), 62, camH, 150);
			const rows: [number, number][] = [];
			for (let z = 6; z < 16; z += 1.4) for (let x = -6; x <= 6; x += 1.2) if (Math.abs(x) > 0.5) rows.push([x, z]);
			return {
				base(p) {
					room(p, P, 16, 5, 22, { floor: 80, wall: 96, ceil: 60, back: 104 }, 2);
					box(p, P, camH, -6, 6, 18, 22, 0, 0.9, 120, 0.1);
					poly(p.c, [P(-4, 3, 21.9), P(4, 3, 21.9), P(4, 4.2, 21.9), P(-4, 4.2, 21.9)], rgb(170, [1.2, 0.6, 0.5]));
					for (const [x, z] of rows.sort((a, b) => b[1] - a[1]))
						box(p, P, camH, x - 0.25, x + 0.25, z, z + 0.45, 0, 0.9, 64, 0.05);
					box(p, P, camH, -0.4, 0.4, 19, 19.6, 0.9, 2.1, 140, 0.1);
				},
				actors: [
					walker(P, [-7, 17], [7, 17], 26, rng(), coat()),
					walker(P, [0.2, 4], [0.2, 16], 30, rng(), coat()),
					sitter(P, 2.4, 9, coat(), 2),
					blinker(P, 5.5, 4.4, 21.8, 2, rng(), 240, true)
				]
			};
		}
	}
}
