/**
 * Isometric resource & product icons — military/industrial edition.
 *
 * All icons share one projection and one light direction (bright top face,
 * mid-tone left face, shadowed right face), but each item gets its own
 * silhouette and utilitarian detailing — stencil plates, hazard stripes,
 * rivets, webbing and panel seams — so they read as serious equipment rather
 * than playful blocks. The palette is deliberately muted: olive drab,
 * gunmetal, blued steel, brass and oxidised copper, with warning red/yellow
 * reserved for hazardous goods.
 *
 * Returns raw SVG *inner* markup for a 64x64 viewBox so callers control the
 * size with CSS (Tailwind `size-*` classes).
 */

type Hex = string;
type Pt = [number, number];

/* ---------- colour helpers ---------- */

function hexToRgb(hex: Hex): [number, number, number] {
	const h = hex.replace("#", "");
	const v =
		h.length === 3
			? h
					.split("")
					.map((c) => c + c)
					.join("")
			: h;
	return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): Hex {
	return (
		"#" +
		[r, g, b]
			.map((x) =>
				Math.round(Math.max(0, Math.min(255, x)))
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

function mix(a: Hex, b: Hex, t: number): Hex {
	const [r1, g1, b1] = hexToRgb(a);
	const [r2, g2, b2] = hexToRgb(b);
	return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const light = (c: Hex, t = 0.2) => mix(c, "#ffffff", t);
const dark = (c: Hex, t = 0.2) => mix(c, "#0a0d12", t);

/**
 * Gradients are registered per base colour while an icon is being built and
 * emitted once into that icon's <defs>. Faces then reference them instead of
 * flat fills, which is what makes the art read as rendered material rather
 * than flat vector drawing.
 */
let activeDefs: Map<string, string> | null = null;

function palette(base: Hex) {
	const key = base.slice(1);
	if (activeDefs && !activeDefs.has(`grad-${key}`)) {
		activeDefs.set(
			`grad-${key}`,
			`<linearGradient id="grad-${key}" x1="0%" y1="0%" x2="55%" y2="100%">` +
				`<stop offset="0%" stop-color="${light(base, 0.52)}"/>` +
				`<stop offset="22%" stop-color="${light(base, 0.24)}"/>` +
				`<stop offset="62%" stop-color="${base}"/>` +
				`<stop offset="100%" stop-color="${dark(base, 0.12)}"/>` +
				`</linearGradient>`
		);
		activeDefs.set(
			`gradL-${key}`,
			`<linearGradient id="gradL-${key}" x1="0%" y1="0%" x2="25%" y2="100%">` +
				`<stop offset="0%" stop-color="${light(base, 0.12)}"/>` +
				`<stop offset="55%" stop-color="${base}"/>` +
				`<stop offset="100%" stop-color="${dark(base, 0.22)}"/>` +
				`</linearGradient>`
		);
		activeDefs.set(
			`gradR-${key}`,
			`<linearGradient id="gradR-${key}" x1="0%" y1="0%" x2="0%" y2="100%">` +
				`<stop offset="0%" stop-color="${dark(base, 0.1)}"/>` +
				`<stop offset="100%" stop-color="${dark(base, 0.44)}"/>` +
				`</linearGradient>`
		);
	}
	if (activeDefs) {
		return {
			top: `url(#grad-${key})`,
			left: `url(#gradL-${key})`,
			right: `url(#gradR-${key})`,
			edge: dark(base, 0.58),
			hi: light(base, 0.44)
		};
	}
	// Standalone use (outside isometricIconMarkup) still gets solid shading.
	return {
		top: light(base, 0.15),
		left: base,
		right: dark(base, 0.26),
		edge: dark(base, 0.58),
		hi: light(base, 0.34)
	};
}

/* ---------- SVG builders ---------- */

const n = (v: number) => Number(v.toFixed(1)).toString();
const pts = (...p: Pt[]) => p.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
const polygon = (p: Pt[], fill: string, extra = "") => `<polygon points="${pts(...p)}" fill="${fill}" ${extra}/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = "") =>
	`<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = "") =>
	`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}" ${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, extra = "") =>
	`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" ${extra}/>`;
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1, extra = "") =>
	`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(sw)}" stroke-linecap="round" ${extra}/>`;
const path = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const group = (inner: string, transform = "") => `<g${transform ? ` transform="${transform}"` : ""}>${inner}</g>`;
// No ink outlines: hard dark edges are what make an icon look hand-drawn.
// Faces are separated by their own gradient shading instead.
const stroke = (_color: string, _w = 0.6) => `stroke-linejoin="round"`;

/* ---------- shared primitives ---------- */

const ground = () => ellipse(32, 54, 19, 3, "#000000", 'opacity="0.28" filter="url(#iso-shadow)"');

/** Solid box with the standard three-face shading. */
function cube(cx: number, cy: number, w: number, d: number, h: number, base: Hex): string {
	const p = palette(base);
	const hw = w / 2;
	const hd = d / 2;
	return (
		polygon(
			[
				[cx - hw, cy],
				[cx, cy + hd],
				[cx, cy + hd + h],
				[cx - hw, cy + h]
			],
			p.left,
			stroke(p.edge)
		) +
		polygon(
			[
				[cx + hw, cy],
				[cx, cy + hd],
				[cx, cy + hd + h],
				[cx + hw, cy + h]
			],
			p.right,
			stroke(p.edge)
		) +
		polygon(
			[
				[cx, cy - hd],
				[cx + hw, cy],
				[cx, cy + hd],
				[cx - hw, cy]
			],
			p.top,
			stroke(p.edge)
		)
	);
}

/** Box with panel seams and rivets — crates, ammo boxes, instrument cases. */
function crate(cx: number, cy: number, w: number, d: number, h: number, base: Hex): string {
	const p = palette(base);
	let s = cube(cx, cy, w, d, h, base);
	s += line(cx, cy + d / 2, cx, cy + d / 2 + h, p.edge, 0.8, 'opacity="0.65"');
	s += line(cx - w / 2, cy + h * 0.5, cx, cy + d / 2 + h * 0.5, p.edge, 0.8, 'opacity="0.5"');
	s += line(cx + w / 2, cy + h * 0.5, cx, cy + d / 2 + h * 0.5, p.edge, 0.8, 'opacity="0.5"');
	for (const x of [cx - w / 2 + 1.4, cx + w / 2 - 1.4]) {
		s += circle(x, cy + 2, 0.85, p.edge);
		s += circle(x, cy + h - 1, 0.85, p.edge);
	}
	return s;
}

/** A small stencilled ID plate — a pale tag with two dark score lines. */
function stencil(cx: number, cy: number, w = 9, color = "#cbc4a8"): string {
	return (
		rect(cx - w / 2, cy, w, 3.4, color, 0.4, 'opacity="0.9"') +
		line(cx - w / 2 + 1.2, cy + 1.2, cx + w / 2 - 2.2, cy + 1.2, "#3d3a30", 0.6) +
		line(cx - w / 2 + 1.2, cy + 2.5, cx + w / 2 - 3.4, cy + 2.5, "#3d3a30", 0.6)
	);
}

/** Yellow/black warning band. */
function hazard(x: number, y: number, w: number, h: number): string {
	let s = rect(x, y, w, h, "#b89a35");
	for (let i = 0; i < Math.floor(w / 4); i++) {
		s += line(x + i * 4 + 1, y + h, x + i * 4 + 1 + h, y, "#2b2a22", 2);
	}
	return s;
}

/** Faceted, irregular ore lump. */
function rock(cx: number, baseY: number, w: number, h: number, base: Hex): string {
	const p = palette(base);
	const p0: Pt = [cx - w * 0.08, baseY - h];
	const p1: Pt = [cx - w / 2, baseY - h * 0.5];
	const p2: Pt = [cx - w * 0.36, baseY];
	const p3: Pt = [cx + w * 0.36, baseY];
	const p4: Pt = [cx + w / 2, baseY - h * 0.58];
	const pc: Pt = [cx, baseY - h * 0.42];
	return (
		polygon([p0, p1, pc], p.top, stroke(p.edge, 0.5)) +
		polygon([p0, pc, p4], p.right, stroke(p.edge, 0.5)) +
		polygon([p1, p2, pc], p.left, stroke(p.edge, 0.5)) +
		polygon([pc, p3, p4], dark(base, 0.34), stroke(p.edge, 0.5)) +
		polygon([p2, pc, p3], p.left, stroke(p.edge, 0.5))
	);
}

/** Tied canvas powder sack — distinct from the metal drums. */
function powderSack(cx: number, baseY: number, w: number, h: number, base: Hex): string {
	const p = palette(base);
	const topY = baseY - h;
	let s = ellipse(cx, baseY + 1, w * 0.55, 2.5, "#000000", 'opacity="0.16"');
	s += polygon(
		[
			[cx - w * 0.25, topY + 5],
			[cx + w * 0.25, topY + 5],
			[cx + w / 2, baseY],
			[cx - w / 2, baseY]
		],
		p.left,
		stroke(p.edge, 0.7)
	);
	s += polygon(
		[
			[cx, topY + 5],
			[cx + w * 0.25, topY + 5],
			[cx + w / 2, baseY],
			[cx, baseY]
		],
		p.right,
		stroke(p.edge, 0.7)
	);
	s += rect(cx - w * 0.2, topY + 2.5, w * 0.4, 3.5, dark(base, 0.25), 1);
	s += polygon(
		[
			[cx - 2.5, topY + 3],
			[cx - 0.5, topY - 2],
			[cx + 1.5, topY + 3]
		],
		p.top
	);
	s += stencil(cx, topY + 12, 8);
	s += ellipse(cx + w * 0.62, baseY, 3.2, 1.4, "#2e3034", 'opacity="0.9"');
	return s;
}

/** Upright drum with hoops and a stencil tag. */
function barrel(cx: number, topY: number, w: number, h: number, base: Hex, label = true): string {
	const p = palette(base);
	const rx = w / 2;
	const ry = w * 0.17;
	let s = ellipse(32, topY + h + 2, rx + 2, 1.6, "#000000", 'opacity="0.16"');
	s += polygon(
		[
			[cx - rx, topY],
			[cx, topY],
			[cx, topY + h],
			[cx - rx, topY + h]
		],
		p.left,
		stroke(p.edge)
	);
	s += polygon(
		[
			[cx, topY],
			[cx + rx, topY],
			[cx + rx, topY + h],
			[cx, topY + h]
		],
		p.right,
		stroke(p.edge)
	);
	s += ellipse(cx, topY + h, rx, ry, p.right);
	for (const t of [0.2, 0.8]) {
		const y = topY + h * t;
		s += path(
			`M ${n(cx - rx)} ${n(y)} Q ${n(cx)} ${n(y + ry * 1.7)} ${n(cx + rx)} ${n(y)}`,
			"none",
			`stroke="${p.edge}" stroke-width="1.6" opacity="0.55"`
		);
	}
	s += ellipse(cx, topY, rx, ry, p.top, stroke(p.edge));
	s += ellipse(cx, topY - 0.6, rx * 0.68, ry * 0.55, p.hi, 'opacity="0.4"');
	if (label) s += stencil(cx, topY + h * 0.46, Math.min(10, w * 0.55));
	return s;
}

/** Flared metal ingot. */
function ingot(cx: number, cy: number, w: number, d: number, h: number, base: Hex): string {
	const p = palette(base);
	const top = w * 0.36;
	return (
		polygon(
			[
				[cx - top, cy],
				[cx, cy + d / 2],
				[cx, cy + d / 2 + h],
				[cx - w / 2, cy + h]
			],
			p.left,
			stroke(p.edge)
		) +
		polygon(
			[
				[cx + top, cy],
				[cx, cy + d / 2],
				[cx, cy + d / 2 + h],
				[cx + w / 2, cy + h]
			],
			p.right,
			stroke(p.edge)
		) +
		polygon(
			[
				[cx, cy - d / 2],
				[cx + top, cy],
				[cx, cy + d / 2],
				[cx - top, cy]
			],
			p.top,
			stroke(p.edge)
		)
	);
}

/** I-beam cross-section with a short extruded depth. */
function ibeam(cx: number, cy: number, w: number, h: number, base: Hex): string {
	const p = palette(base);
	const dx = 3;
	const dy = -2;
	const profile = (x: number, y: number, fill: Hex) =>
		rect(x - w / 2, y - h / 2, w, h * 0.22, fill, 0.4) +
		rect(x - w * 0.15, y - h / 2 + h * 0.22, w * 0.3, h * 0.56, fill) +
		rect(x - w / 2, y + h * 0.3, w, h * 0.2, fill, 0.4);
	return profile(cx + dx, cy + dy, dark(base, 0.4)) + profile(cx, cy, p.top);
}

/** Sawn timber beam with an end-grain face. */
function timber(cx: number, cy: number, length: number, w: number, base: Hex): string {
	const p = palette(base);
	const x0 = cx - length / 2;
	let s = rect(x0, cy - w / 2, length, w, p.left);
	s += rect(x0, cy - w / 2, length, w * 0.3, p.top);
	s += rect(x0, cy + w * 0.2, length, w * 0.3, p.right);
	s += rect(x0 - 2, cy - w / 2, 4, w, p.top, 0.4, stroke(p.edge, 0.5));
	s += line(x0, cy - w * 0.22, x0, cy + w * 0.22, p.edge, 0.7);
	s += line(x0 + 1.5, cy - w * 0.1, x0 + 1.5, cy + w * 0.1, p.edge, 0.5, 'opacity="0.7"');
	return group(s, `rotate(-28 ${n(cx)} ${n(cy)})`);
}

/** Stack of silicon wafers. */
function wafers(cx: number, baseY: number, count: number, r: number, base: Hex): string {
	const p = palette(base);
	let s = "";
	for (let i = 0; i < count; i++) {
		const y = baseY - i * 3.1;
		s += ellipse(cx, y + 1.6, r, r * 0.36, p.edge);
		s += ellipse(cx, y, r, r * 0.36, i === count - 1 ? p.top : p.left, stroke(p.edge, 0.4));
	}
	const topY = baseY - (count - 1) * 3.1;
	s += path(
		`M ${n(cx - r * 0.7)} ${n(topY - r * 0.14)} Q ${n(cx)} ${n(topY - r * 0.5)} ${n(cx + r * 0.7)} ${n(topY - r * 0.14)}`,
		"none",
		`stroke="${p.hi}" stroke-width="0.9" opacity="0.75"`
	);
	return s;
}

/** Tyre with tread notches. */
function tyre(cx: number, cy: number, w: number, h: number, base: Hex): string {
	const p = palette(base);
	const rx = w / 2;
	const ry = h / 2;
	let s = ellipse(cx, cy + 3.5, rx, ry, p.right);
	s += rect(cx - rx, cy, w, 3.5, p.left);
	s += ellipse(cx, cy, rx, ry, p.left, stroke(p.edge, 0.6));
	for (let i = 0; i < 7; i++) {
		const x = cx - rx + 2.5 + i * ((w - 5) / 7);
		s += line(x, cy - ry * 0.75, x + 1.6, cy - ry * 0.3, p.edge, 1.3, 'opacity="0.75"');
	}
	s += ellipse(cx, cy, rx * 0.5, ry * 0.5, "#15191a");
	s += ellipse(cx, cy - 0.5, rx * 0.38, ry * 0.36, p.edge, 'opacity="0.6"');
	return s;
}

/** Extruded L-profile (angle iron). */
function angle(cx: number, cy: number, length: number, base: Hex): string {
	const p = palette(base);
	const x0 = cx - length / 2;
	let s = rect(x0, cy - 8.5, length, 3.5, p.top);
	s += rect(x0, cy - 5, length, 9, p.left);
	s += rect(x0, cy - 5, length, 2.2, p.right);
	s += rect(x0 - 2, cy - 8.5, 3.5, 12.5, p.top, 0.4, stroke(p.edge, 0.4));
	return group(s, `rotate(-24 ${n(cx)} ${n(cy)})`);
}

/** Radiation trefoil in dark on a light disc. */
function trefoil(cx: number, cy: number, r: number): string {
	let s = circle(cx, cy, r, "#d8cf9a", stroke("#3a372a", 0.5));
	for (let i = 0; i < 3; i++) {
		const a1 = ((i * 120 - 118) * Math.PI) / 180;
		const a2 = ((i * 120 - 62) * Math.PI) / 180;
		const x1 = cx + Math.cos(a1) * r * 0.28;
		const y1 = cy + Math.sin(a1) * r * 0.28;
		const x2 = cx + Math.cos(a1) * r * 0.78;
		const y2 = cy + Math.sin(a1) * r * 0.78;
		const x3 = cx + Math.cos(a2) * r * 0.78;
		const y3 = cy + Math.sin(a2) * r * 0.78;
		const x4 = cx + Math.cos(a2) * r * 0.28;
		const y4 = cy + Math.sin(a2) * r * 0.28;
		s += path(
			`M ${n(x1)} ${n(y1)} L ${n(x2)} ${n(y2)} A ${n(r * 0.78)} ${n(r * 0.78)} 0 0 1 ${n(x3)} ${n(y3)} L ${n(x4)} ${n(y4)} Z`,
			"#262821"
		);
	}
	s += circle(cx, cy, r * 0.18, "#262821");
	return s;
}

/* ---------- icons ---------- */

const icons: Record<string, () => string> = {
	iron: () =>
		ground() +
		cube(32, 46, 34, 14, 6, "#514c47") +
		rock(25, 40, 15, 12, "#6d747c") +
		rock(40, 41, 14, 11, "#7b838b") +
		rock(32, 33, 16, 14, "#868e97") +
		circle(29, 30, 1.2, "#a4653a") +
		circle(38, 36, 1, "#a4653a"),

	copper: () =>
		ground() +
		crate(32, 45, 30, 13, 9, "#6a5540") +
		rock(26, 37, 14, 11, "#a2663f") +
		rock(39, 38, 13, 10, "#b27447") +
		cube(32, 29, 10, 5, 5, "#d38b52") +
		circle(36, 27, 1.3, "#e5a86c"),

	steel: () =>
		ground() + ibeam(35, 28, 23, 7, "#88939d") + ibeam(27, 38, 25, 8, "#7c8893") + ibeam(36, 47, 27, 9, "#8d98a3"),

	gunpowder: () =>
		ground() +
		powderSack(32, 50, 23, 30, "#494a44") +
		line(39, 24, 44, 17, "#b7a888", 1.1) +
		circle(44.5, 16.4, 1.4, "#d98c42"),

	wood: () =>
		ground() + timber(30, 45, 27, 8, "#795936") + timber(36, 35, 27, 8, "#8a6840") + timber(29, 27, 24, 7, "#98754a"),

	coal: () =>
		ground() +
		cube(32, 46, 33, 13, 6, "#474b4f") +
		rock(24, 39, 15, 12, "#2b2e32") +
		rock(40, 40, 15, 11, "#33363b") +
		rock(32, 32, 16, 13, "#3a3d42") +
		polygon(
			[
				[30, 28],
				[33, 29],
				[31, 31]
			],
			"#666a70",
			'opacity="0.7"'
		),

	rifles: () =>
		ground() +
		group(
			rect(8, 29, 25, 8, "#5e4a32") +
				rect(8, 29, 25, 2.6, "#7d6444") +
				polygon(
					[
						[21, 37],
						[29, 37],
						[27, 48],
						[20, 48]
					],
					"#4d3c28"
				) +
				rect(32, 31, 21, 4.5, "#454c53") +
				rect(32, 31, 21, 1.8, "#79848d") +
				rect(52, 30, 3, 7, "#394048") +
				rect(27, 26, 7, 3.2, "#343b42") +
				circle(33, 27.6, 1.3, "#5b656d") +
				rect(15, 32, 8, 2.2, "#3d2f20") +
				line(54, 37, 58, 41, "#7d848b", 1.2),
			"rotate(-26 32 34)"
		),

	ammunition: () =>
		ground() +
		crate(32, 39, 28, 12, 11, "#545f43") +
		stencil(32, 43, 12) +
		[23, 30, 37, 44]
			.map((x) => ellipse(x, 35, 2.6, 1.6, "#a8893d", stroke("#6b5524", 0.4)) + ellipse(x, 34.6, 1.4, 0.8, "#d1ac55"))
			.join(""),

	artillery: () =>
		ground() +
		ellipse(32, 51, 12, 3, "#2a2d31") +
		polygon(
			[
				[25, 49],
				[39, 49],
				[39, 53],
				[25, 53]
			],
			"#4a4f43"
		) +
		polygon(
			[
				[25, 47],
				[21, 51],
				[25, 52]
			],
			"#3b4036"
		) +
		polygon(
			[
				[39, 47],
				[43, 51],
				[39, 52]
			],
			"#3b4036"
		) +
		bulletShape(32, 49, 32, 15, "#666c4d") +
		rect(24.5, 41, 15, 3.5, "#a84936") +
		line(27, 33, 37, 33, "#9aa08c", 1, 'opacity="0.8"'),

	vehicles: () =>
		ground() +
		cube(36, 29, 23, 10, 9, "#4d5a41") +
		cube(22, 32, 15, 8, 7, "#576447") +
		polygon(
			[
				[22, 33],
				[27, 36],
				[27, 40],
				[22, 37]
			],
			"#82989b"
		) +
		cube(36, 22, 11, 6, 5, "#46523b") +
		rect(35, 19, 2, 7, "#343b2e") +
		ellipse(21, 45, 4.6, 4, "#232628") +
		circle(21, 45, 1.7, "#757e7e") +
		ellipse(33, 47, 5, 4.3, "#232628") +
		circle(33, 47, 1.8, "#757e7e") +
		ellipse(43, 48, 5, 4.3, "#232628") +
		circle(43, 48, 1.8, "#757e7e") +
		stencil(37, 33, 9),

	explosives: () =>
		ground() +
		barrel(21, 30, 10, 23, "#7d3a2c", false) +
		barrel(43, 30, 10, 23, "#6d3327", false) +
		barrel(32, 25, 11, 28, "#8d4330", false) +
		rect(15, 37, 34, 3.4, "#4a3a2c") +
		rect(15, 46, 34, 3.4, "#4a3a2c") +
		line(32, 23, 36, 16, "#b8aa89", 1.1) +
		circle(36.5, 15.4, 1.4, "#d98c42"),

	oil: () => ground() + barrel(32, 25, 23, 25, "#2f363a") + hazard(22, 34, 20, 4),

	gas: () =>
		ground() +
		barrel(32, 24, 17, 28, "#5c7d72", false) +
		rect(28, 17, 8, 5, "#9aa8a2", 1) +
		circle(32, 16, 2.5, "#777f79") +
		line(32, 16, 32, 11, "#777f79", 1.4) +
		hazard(24, 36, 16, 4),

	uranium: () =>
		ground() +
		barrel(29, 28, 18, 23, "#969450", false) +
		trefoil(29, 38, 6.2) +
		rock(46, 45, 11, 12, "#7faa58") +
		circle(43, 39, 1.2, "#a8cf7a"),

	rare_earth: () =>
		ground() +
		crate(32, 47, 28, 12, 7, "#4d4459") +
		crystal(21, 42, 18, 10, "#6a5b86") +
		crystal(43, 42, 17, 10, "#5d5077") +
		crystal(32, 45, 27, 13, "#8976a8"),

	silicon: () => ground() + wafers(28, 45, 4, 11, "#838d94") + wafers(43, 45, 3, 8, "#9aa4ab"),

	chromium: () =>
		ground() +
		cube(24, 32, 11, 6, 22, "#7fa2ae") +
		cube(39, 35, 10, 6, 19, "#8fb0bb") +
		line(22, 22, 22, 43, "#cbe3eb", 1.1, 'opacity="0.8"') +
		line(37, 27, 37, 44, "#cbe3eb", 1, 'opacity="0.7"'),

	tungsten: () => {
		let s = ground() + cube(32, 45, 26, 11, 6, "#434850");
		for (const [x, y] of [
			[25, 36],
			[32, 33],
			[39, 36],
			[29, 30],
			[36, 29]
		]) {
			s += circle(x, y, 3.4, palette("#4f545a").top, stroke(palette("#4f545a").edge, 0.5));
			s += circle(x, y, 1.5, palette("#4f545a").right);
		}
		s += line(21, 33, 43, 31, "#2f3339", 2.2, 'opacity="0.8"');
		s += line(21, 38, 43, 36, "#2f3339", 2.2, 'opacity="0.8"');
		return s;
	},

	rubber: () => ground() + tyre(32, 38, 26, 13, "#2c3132") + tyre(32, 48, 26, 13, "#252a2b"),

	aluminium: () =>
		ground() + angle(28, 39, 24, "#909ba2") + angle(38, 47, 26, "#a0abb1") + angle(34, 28, 20, "#adb7bd"),

	chips: () =>
		ground() +
		board("#3d6d50") +
		rect(26, 28, 12, 3, "#69737a", 0.5, stroke("#3c4349", 0.5)) +
		line(28, 28, 28, 31, "#99a3a9", 0.6) +
		line(32, 28, 32, 31, "#99a3a9", 0.6) +
		line(36, 28, 36, 31, "#99a3a9", 0.6),

	machine_tools: () => {
		let s = ground() + crate(32, 42, 28, 12, 10, "#5c646c");
		s += circle(32, 31, 6.5, "#a8893d");
		for (let i = 0; i < 8; i++) {
			s += rect(31, 22.5, 2, 4, "#a8893d", 0, `transform="rotate(${i * 45} 32 31)"`);
		}
		s += circle(32, 31, 2.2, "#3c4147");
		s += line(44, 33, 49, 27, "#9aa3aa", 1.7);
		return s;
	},

	fab_equipment: () =>
		ground() +
		crate(32, 42, 32, 14, 12, "#555f6b") +
		rect(20, 30, 15, 8, "#222d37", 0.6, stroke("#3b4753", 0.5)) +
		line(23, 33, 31, 33, "#6fc0c9", 0.9, 'opacity="0.85"') +
		line(23, 35, 29, 35, "#6fc0c9", 0.9, 'opacity="0.7"') +
		circle(39, 45, 1.8, "#b89a35") +
		circle(45, 45, 1.8, "#6f9c72") +
		line(48, 33, 52, 25, "#a8b2ba", 1.6),

	fuel: () =>
		ground() +
		cube(31, 37, 21, 10, 16, "#8d7a34") +
		path("M 26 30 Q 26 24 31 24 Q 36 24 36 30", "none", 'stroke="#6d5d28" stroke-width="2.6"') +
		rect(42, 32, 5, 7, "#756529", 1) +
		line(44.5, 32, 44.5, 27, "#5b4f21", 1.6) +
		stencil(31, 39, 9),

	enriched_uranium: () => {
		let s = ground() + crate(32, 47, 28, 12, 6, "#3f4a42");
		for (const x of [23, 29, 35, 41]) {
			s += bulletShape(x, 41, 20, 5, "#54845d");
			s += circle(x, 22, 1.3, "#a7d3a2");
		}
		s += line(20, 36, 44, 36, "#2d352f", 2, 'opacity="0.8"');
		return s;
	},

	electronics: () =>
		ground() +
		crate(32, 41, 30, 12, 14, "#3e5f70") +
		rect(22, 35, 11, 8, "#1e2c35", 0.5) +
		line(24, 36, 24, 42, "#5b7d88", 0.7) +
		line(27, 36, 27, 42, "#5b7d88", 0.7) +
		line(30, 36, 30, 42, "#5b7d88", 0.7) +
		circle(38, 36, 2.4, "#a8893d") +
		circle(44, 36, 2.4, "#8e9ba2") +
		line(44, 34, 48, 9, "#9aa6ad", 1.3) +
		stencil(32, 47, 11),

	gold: () =>
		ground() +
		ingot(32, 44, 30, 13, 8, "#b58b39") +
		ingot(29, 33, 24, 10, 7, "#c99c42") +
		line(24, 30, 28, 32, "#e6c46f", 1, 'opacity="0.75"'),

	currency: () => {
		let s = ground();
		for (let i = 0; i < 4; i++) {
			const y = 49 - i * 3.4;
			s += ellipse(32, y + 1.5, 12, 3.2, dark("#a98536", 0.35));
			s += ellipse(32, y, 12, 3.2, i === 3 ? light("#a98536", 0.2) : "#a98536", stroke(dark("#a98536", 0.5), 0.5));
		}
		s += polygon(
			[
				[32, 30],
				[33.2, 32.6],
				[36, 33],
				[34, 35],
				[34.6, 37.6],
				[32, 36.3],
				[29.4, 37.6],
				[30, 35],
				[28, 33],
				[30.8, 32.6]
			],
			"#e3c67c",
			'opacity="0.9"'
		);
		return s;
	},

	money: () =>
		ground() +
		rect(16, 41, 32, 10, dark("#62704e", 0.35), 1) +
		rect(16, 38, 32, 10, "#62704e", 1, stroke(dark("#62704e", 0.5), 0.5)) +
		rect(19, 35, 32, 10, "#71805a", 1, stroke(dark("#71805a", 0.5), 0.5)) +
		ellipse(35, 40, 6, 4, "#8b9572", 'opacity="0.9"') +
		rect(28, 38, 8, 4, "#c6b98e", 0.5, 'opacity="0.85"'),

	package: () =>
		ground() +
		crate(32, 39, 27, 12, 13, "#6b5b45") +
		line(32, 33, 32, 52, "#433829", 1.6, 'opacity="0.8"') +
		stencil(32, 43, 11)
};

/** Cartridge / shell silhouette, point up. */
function bulletShape(cx: number, baseY: number, h: number, w: number, base: Hex): string {
	const p = palette(base);
	const shoulder = baseY - h * 0.62;
	return (
		polygon(
			[
				[cx - w / 2, shoulder],
				[cx, shoulder],
				[cx, baseY],
				[cx - w / 2, baseY]
			],
			p.left
		) +
		polygon(
			[
				[cx, shoulder],
				[cx + w / 2, shoulder],
				[cx + w / 2, baseY],
				[cx, baseY]
			],
			p.right
		) +
		polygon(
			[
				[cx - w / 2, shoulder],
				[cx, baseY - h],
				[cx + w / 2, shoulder]
			],
			p.top,
			stroke(p.edge, 0.5)
		) +
		polygon(
			[
				[cx - w / 2, baseY - 2.6],
				[cx + w / 2, baseY - 2.6],
				[cx + w / 2, baseY],
				[cx - w / 2, baseY]
			],
			dark(base, 0.35)
		)
	);
}

/** PCB slab with traces, contacts and an IC. */
function board(base: Hex, chipColor = "#242a31", pins = "#c7a44e"): string {
	const p = palette(base);
	let s = cube(32, 40, 34, 14, 4.5, base);
	s += line(16, 39, 25, 39, p.hi, 1, 'opacity="0.7"');
	s += line(39, 39, 48, 39, p.hi, 1, 'opacity="0.7"');
	s += line(19, 35, 27, 35, light(base, 0.45), 1, 'opacity="0.6"');
	s += line(37, 43, 46, 43, light(base, 0.45), 1, 'opacity="0.6"');
	s += cube(32, 36, 13, 6.5, 3.5, chipColor);
	for (let i = 0; i < 4; i++) {
		const x = 27 + i * 3.4;
		s += rect(x, 30.4, 1.8, 1.6, pins);
		s += rect(x, 41.2, 1.8, 1.6, pins);
	}
	return s;
}

/** Faceted crystal cluster piece. */
function crystal(cx: number, baseY: number, h: number, w: number, base: Hex): string {
	const p = palette(base);
	const tip = baseY - h;
	const mid = baseY - h * 0.34;
	return (
		polygon(
			[
				[cx, tip],
				[cx - w / 2, mid],
				[cx, baseY]
			],
			p.left,
			stroke(p.edge, 0.5)
		) +
		polygon(
			[
				[cx, tip],
				[cx + w / 2, mid],
				[cx, baseY]
			],
			p.right,
			stroke(p.edge, 0.5)
		) +
		polygon(
			[
				[cx, tip],
				[cx - w * 0.14, mid],
				[cx, baseY]
			],
			p.top,
			'opacity="0.75"'
		) +
		line(cx, tip + 2, cx, baseY - 2, p.hi, 0.8, 'opacity="0.6"')
	);
}

/** Raw SVG markup for one resource/product. Falls back to a supply crate. */
export function isometricIconMarkup(name: string): string {
	activeDefs = new Map();
	const body = (icons[name] ?? icons.package)!();
	const defs =
		"<defs>" +
		[...activeDefs.values()].join("") +
		'<filter id="iso-shadow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="1.3"/></filter>' +
		'<filter id="iso-lift" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#04070b" flood-opacity="0.4"/></filter>' +
		"</defs>";
	activeDefs = null;
	return defs + `<g filter="url(#iso-lift)">${body}</g>`;
}

export const isometricIconNames = Object.keys(icons);
