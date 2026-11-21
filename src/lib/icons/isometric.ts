/**
 * Isometric resource & product icons.
 *
 * Every icon is built from a handful of shaded primitives drawn in a 64x64
 * viewBox: a top face (light), a left face (base colour) and a right face
 * (shadow). Keeping the projection and the light direction identical across
 * all icons makes them read as one coherent, slightly 3D set instead of the
 * flat single-colour line art they replace.
 *
 * The module returns raw SVG *inner* markup so callers can wrap it in their
 * own <svg> element and control sizing with CSS (Tailwind `size-*` classes).
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
const dark = (c: Hex, t = 0.2) => mix(c, "#111722", t);
const tint = (c: Hex, t: number) => (t >= 1 ? light(c, (t - 1) * 0.9) : dark(c, (1 - t) * 0.9));

function palette(base: Hex) {
	return {
		top: light(base, 0.24),
		left: base,
		right: dark(base, 0.17),
		edge: dark(base, 0.4),
		hi: light(base, 0.46)
	};
}

/* ---------- tiny SVG builders ---------- */

const n = (v: number) => Number(v.toFixed(1)).toString();

const points = (...p: Pt[]) => p.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

const polygon = (p: Pt[], fill: string, extra = "") => `<polygon points="${points(...p)}" fill="${fill}" ${extra}/>`;

const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = "") =>
	`<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = "") =>
	`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}" ${extra}/>`;

const circle = (cx: number, cy: number, r: number, fill: string, extra = "") =>
	`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" ${extra}/>`;

const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1, extra = "") =>
	`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(sw)}" stroke-linecap="round" ${extra}/>`;

const group = (inner: string, transform = "") => `<g${transform ? ` transform="${transform}"` : ""}>${inner}</g>`;

const stroke = (color: string, w = 0.6) => `stroke="${color}" stroke-width="${w}" stroke-linejoin="round"`;

/* ---------- isometric primitives ---------- */

/** A solid box. `cy` is the centre of its top diamond. */
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

/** A metal ingot: narrow top, flared base. */
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

/** A drum / barrel standing upright. */
function drum(cx: number, topY: number, w: number, h: number, base: Hex, hoops = true): string {
	const p = palette(base);
	const rx = w / 2;
	const ry = w * 0.17;
	let s = "";
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
	if (hoops) {
		for (const t of [0.24, 0.76]) {
			const y = topY + h * t;
			s += `<path d="M ${n(cx - rx)} ${n(y)} Q ${n(cx)} ${n(y + ry * 1.7)} ${n(cx + rx)} ${n(y)}" fill="none" stroke="${p.edge}" stroke-width="1.5" opacity="0.5"/>`;
		}
	}
	s += ellipse(cx, topY, rx, ry, p.top, stroke(p.edge));
	s += ellipse(cx, topY - 0.8, rx * 0.7, ry * 0.58, p.hi, 'opacity="0.45"');
	return s;
}

/** A pointed crystal / gem. */
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
			stroke(p.edge)
		) +
		polygon(
			[
				[cx, tip],
				[cx + w / 2, mid],
				[cx, baseY]
			],
			p.right,
			stroke(p.edge)
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
		line(cx, tip + 2, cx, baseY - 2, p.hi, 0.8, 'opacity="0.65"')
	);
}

/** A standing cartridge / shell. Point faces up. */
function bullet(cx: number, baseY: number, h: number, w: number, base: Hex): string {
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
			dark(base, 0.3)
		)
	);
}

/** A mound of ore lumps. */
function pile(cx: number, baseY: number, base: Hex, s = 1, tones: [number, number, number] = [0.95, 1.06, 1]): string {
	return (
		cube(cx, baseY - 15 * s, 18 * s, 9 * s, 7 * s, tint(base, tones[2])) +
		cube(cx - 11 * s, baseY - 6 * s, 16 * s, 8 * s, 7 * s, tint(base, tones[0])) +
		cube(cx + 11 * s, baseY - 4 * s, 15 * s, 8 * s, 6 * s, tint(base, tones[1]))
	);
}

/** A log lying along the isometric x axis. */
function log(cx: number, cy: number, length: number, r: number, base: Hex): string {
	const p = palette(base);
	const x0 = cx - length / 2;
	const x1 = cx + length / 2;
	let s = "";
	s += rect(x0, cy - r, length, r, p.left);
	s += rect(x0, cy, length, r, p.right);
	s += ellipse(x1, cy, r * 0.42, r, p.right, stroke(p.edge, 0.5));
	s += ellipse(x0, cy, r * 0.42, r, p.top, stroke(p.edge, 0.5));
	s += ellipse(x0, cy, r * 0.22, r * 0.5, p.hi, 'opacity="0.45"');
	return group(s, `rotate(-30 ${n(cx)} ${n(cy)})`);
}

/** A rubber tyre seen from slightly above. */
function tyre(cx: number, cy: number, w: number, h: number, base: Hex): string {
	const p = palette(base);
	const rx = w / 2;
	const ry = h / 2;
	return (
		ellipse(cx, cy + 3.5, rx, ry, p.right) +
		rect(cx - rx, cy, w, 3.5, p.left) +
		ellipse(cx, cy, rx, ry, p.left, stroke(p.edge, 0.5)) +
		ellipse(cx, cy, rx * 0.52, ry * 0.52, "#171c1a") +
		ellipse(cx, cy - 0.5, rx * 0.42, ry * 0.4, p.edge, 'opacity="0.6"')
	);
}

/** A circuit board slab with an IC and gold contacts. */
function board(base: Hex, chipColor = "#242a31", pins = "#e7bb55"): string {
	const p = palette(base);
	let s = cube(32, 40, 34, 14, 4.5, base);
	// Traces on the top face.
	s += line(16, 39, 25, 39, p.hi, 1, 'opacity="0.7"');
	s += line(39, 39, 48, 39, p.hi, 1, 'opacity="0.7"');
	s += line(19, 35, 27, 35, light(base, 0.5), 1, 'opacity="0.6"');
	s += line(37, 43, 46, 43, light(base, 0.5), 1, 'opacity="0.6"');
	// The IC package.
	s += cube(32, 36, 13, 6.5, 3.5, chipColor);
	for (let i = 0; i < 4; i++) {
		const x = 27 + i * 3.4;
		s += rect(x, 30.4, 1.8, 1.6, pins);
		s += rect(x, 41.2, 1.8, 1.6, pins);
	}
	return s;
}

/* ---------- individual icons ---------- */

const icons: Record<string, () => string> = {
	iron: () =>
		pile(32, 46, "#8e99a6", 1.05) +
		circle(30, 29, 1.5, "#a9663c") +
		circle(37, 34, 1.2, "#b57748") +
		circle(24, 39, 1.3, "#a9663c"),

	copper: () =>
		pile(32, 46, "#cf7f4a", 1.05, [1.02, 1.12, 1.06]) +
		cube(29, 28, 9, 5, 5, "#efab6d") +
		circle(40, 36, 1.6, "#f4bd82"),

	steel: () => ingot(28, 30, 25, 10, 8, "#9db2c6") + ingot(37, 43, 28, 12, 9, "#b4c3d1"),

	gunpowder: () =>
		ellipse(32, 50, 13, 3.2, "#3c3d42") +
		drum(32, 25, 22, 23, "#54565d") +
		ellipse(32, 24.6, 8, 2.6, "#34363b") +
		line(32, 23, 36, 17, "#c9b18a", 1.1) +
		circle(36.5, 16.4, 1.5, "#f0a24a"),

	wood: () => log(24, 44, 22, 5.5, "#956235") + log(40, 44, 22, 5.5, "#a16e3f") + log(32, 34, 25, 6, "#b07d4f"),

	coal: () =>
		pile(32, 46, "#3b3d43", 1.05, [0.88, 1.2, 1]) +
		polygon(
			[
				[29, 28],
				[33, 29],
				[31, 31]
			],
			"#6b6e77",
			'opacity="0.8"'
		) +
		polygon(
			[
				[39, 35],
				[42, 35],
				[40, 37]
			],
			"#61646d",
			'opacity="0.8"'
		),

	rifles: () =>
		group(
			rect(10, 30, 24, 9, "#795a38") +
				rect(10, 30, 24, 3, "#9c7649") +
				polygon(
					[
						[23, 39],
						[31, 39],
						[29, 49],
						[22, 49]
					],
					"#6a4b2e"
				) +
				rect(33, 32, 20, 5, "#8e98a2") +
				rect(33, 32, 20, 2, "#bcc6cf") +
				rect(52, 31, 3, 7, "#646d76") +
				rect(29, 27, 5, 4, "#4f565e") +
				rect(18, 33, 7, 2.5, "#5e4329"),
			"rotate(-26 32 34)"
		),

	ammunition: () =>
		cube(32, 38, 26, 11, 9, "#8a6a45") +
		bullet(25, 39, 15, 6, "#c9992f") +
		bullet(39, 39, 15, 6, "#c9992f") +
		bullet(32, 35, 19, 7, "#e0b34a"),

	artillery: () =>
		ellipse(32, 51, 12, 3, "#3a3a3e") +
		bullet(32, 50, 31, 15, "#b05c3c") +
		rect(24.5, 42, 15, 3.4, dark("#b05c3c", 0.36)) +
		rect(25, 36, 14, 2, "#e0b24a", 1.2, 'opacity="0.9"'),

	vehicles: () =>
		ellipse(32, 50, 22, 3.5, "#000000", 'opacity="0.12"') +
		cube(39, 28, 22, 10, 10, "#6f8261") +
		cube(21, 30, 14, 8, 8, "#657b56") +
		polygon(
			[
				[21, 31],
				[26, 34],
				[26, 39],
				[21, 36]
			],
			"#9cc2cf"
		) +
		polygon(
			[
				[27, 35],
				[28, 35.5],
				[28, 40],
				[27, 39.5]
			],
			"#9cc2cf"
		) +
		ellipse(23, 45, 4.6, 4, "#2f3336") +
		circle(23, 45, 1.8, "#88929a") +
		ellipse(42, 47, 5.2, 4.4, "#2f3336") +
		circle(42, 47, 2, "#88929a"),

	explosives: () =>
		drum(21, 29, 10, 24, "#bb4529", false) +
		drum(43, 29, 10, 24, "#a83d25", false) +
		drum(32, 24, 11, 29, "#cf5230", false) +
		rect(15, 35, 34, 3.2, "#71523a") +
		rect(15, 44, 34, 3.2, "#71523a") +
		line(32, 23, 35, 16, "#d8c79c", 1.1) +
		circle(35.5, 15.4, 1.5, "#f2a64c"),

	oil: () =>
		ellipse(32, 52, 14, 3, "#2b2417", 'opacity="0.25"') +
		drum(32, 26, 24, 25, "#c9a227") +
		polygon(
			[
				[32, 19],
				[35, 24],
				[32, 27],
				[29, 24]
			],
			"#8c6d18",
			'opacity="0.9"'
		),

	gas: () =>
		drum(32, 24, 18, 28, "#57a6c5") +
		rect(28, 17, 8, 5, "#c4d1d8", 1) +
		circle(32, 16, 2.6, "#8f9da6") +
		line(32, 16, 32, 11, "#8f9da6", 1.4),

	uranium: () =>
		drum(29, 28, 17, 22, "#b6b437") +
		crystal(44, 44, 17, 10, "#8cc552") +
		circle(26, 35, 2.4, "#76912b") +
		circle(30, 38, 1.6, "#76912b"),

	rare_earth: () =>
		pile(32, 49, "#6a5a8f", 0.8) +
		crystal(21, 45, 20, 11, "#7b62c3") +
		crystal(43, 45, 19, 11, "#6952ad") +
		crystal(32, 49, 30, 14, "#a98ce6"),

	silicon: () => ingot(27, 33, 23, 10, 8, "#a6b3bd") + cube(38, 43, 17, 9, 7, "#c1ccd4"),

	chromium: () =>
		ingot(27, 32, 23, 10, 8, "#a2d0e2") +
		cube(39, 43, 17, 9, 7, "#c1e4f0") +
		line(35, 29, 38, 31, "#ffffff", 1, 'opacity="0.7"'),

	tungsten: () => ingot(27, 32, 23, 10, 8, "#6f7680") + ingot(38, 44, 17, 8, 7, "#858d98"),

	rubber: () => tyre(32, 38, 26, 13, "#3d4a40") + tyre(32, 48, 26, 13, "#323d35"),

	aluminium: () => ingot(27, 32, 23, 10, 8, "#bcc5cd") + cube(39, 43, 17, 9, 7, "#d5dbe0"),

	chips: () => board("#3f8a60"),

	machine_tools: () => {
		let gear = circle(32, 32, 7, "#e0b23c");
		for (let i = 0; i < 8; i++) {
			gear += rect(31, 22.5, 2, 4, "#e0b23c", 0, `transform="rotate(${i * 45} 32 32)"`);
		}
		gear += circle(32, 32, 2.4, "#6b5420");
		return cube(32, 41, 28, 12, 10, "#888e98") + gear;
	},

	fab_equipment: () =>
		cube(32, 42, 32, 14, 12, "#7b8796") +
		cube(32, 33, 16, 7, 4, "#2c3c4a") +
		rect(25, 31, 10, 1.4, "#6fd0e0", 0.7, 'opacity="0.9"') +
		circle(24, 46, 1.6, "#d9a441") +
		circle(30, 47, 1.6, "#6fd0a0") +
		line(44, 33, 48, 25, "#b9c4ce", 1.6) +
		cube(49, 22, 7, 4, 3, "#aab6c2"),

	fuel: () =>
		ellipse(32, 54, 12, 3, "#2b2417", 'opacity="0.2"') +
		cube(31, 37, 22, 10, 16, "#dfa73b") +
		`<path d="M 26 30 Q 26 24 31 24 Q 36 24 36 30" fill="none" stroke="#b8842a" stroke-width="2.6"/>` +
		rect(42, 32, 5, 7, "#c79330", 1) +
		line(44.5, 32, 44.5, 28, "#8c681f", 1.6),

	enriched_uranium: () =>
		drum(32, 29, 18, 23, "#4e8f5a") +
		bullet(27, 28, 15, 4, "#8ee08f") +
		bullet(32, 26, 18, 4, "#a6efa6") +
		bullet(37, 28, 15, 4, "#7fd47f"),

	electronics: () =>
		board("#3b7f9c", "#2a2f35", "#cfd6dc") +
		cube(40, 33, 7, 4, 3, "#8a939c") +
		circle(22, 36, 1.8, "#d4564c") +
		circle(26, 34, 1.4, "#d4564c"),

	gold: () =>
		ingot(32, 44, 30, 13, 8, "#d9aa3c") +
		ingot(29, 33, 24, 10, 7, "#f0c956") +
		line(24, 30, 28, 32, "#fff0b0", 1, 'opacity="0.8"'),

	currency: () =>
		ingot(32, 44, 30, 13, 8, "#d9aa3c") +
		ingot(29, 33, 24, 10, 7, "#f0c956") +
		line(24, 30, 28, 32, "#fff0b0", 1, 'opacity="0.8"'),

	money: () =>
		ingot(32, 44, 30, 13, 8, "#d9aa3c") +
		ingot(29, 33, 24, 10, 7, "#f0c956") +
		line(24, 30, 28, 32, "#fff0b0", 1, 'opacity="0.8"'),

	package: () =>
		cube(32, 39, 26, 12, 13, "#a98356") +
		line(32, 33, 32, 52, "#7a5c39", 1.4, 'opacity="0.8"') +
		line(19, 45, 45, 45, "#7a5c39", 1.4, 'opacity="0.8"')
};

/** Raw SVG markup for one resource/product. Falls back to a cardboard box. */
export function isometricIconMarkup(name: string): string {
	return (icons[name] ?? icons.package)!();
}

export const isometricIconNames = Object.keys(icons);
