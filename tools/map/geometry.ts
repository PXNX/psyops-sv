// tools/map/geometry.ts
// Minimal SVG path geometry for the world map: turns a path's `d` attribute
// into polygons (sampled points), and measures area, centroid and bounds.
// Supports every command the map uses (M L H V C S Q T A Z, absolute and
// relative). Curves are sampled; arcs are sampled along their true ellipse.

export type Point = [number, number];
export type Polygon = Point[];

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const COMMAND = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;

/** Arc flags may be written without separators ("a5 5 0 011 1"), so read them digit by digit. */
function readArcArgs(raw: string): number[] {
	const out: number[] = [];
	let rest = raw.trim();
	while (rest.length) {
		const slot = out.length % 7;
		rest = rest.replace(/^[\s,]+/, "");
		if (!rest.length) break;
		if (slot === 3 || slot === 4) {
			out.push(rest[0] === "1" ? 1 : 0);
			rest = rest.slice(1);
			continue;
		}
		const m = rest.match(/^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i);
		if (!m) break;
		out.push(parseFloat(m[0]));
		rest = rest.slice(m[0].length);
	}
	return out;
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
	const pts: Point[] = [];
	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		const u = 1 - t;
		pts.push([
			u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
			u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
		]);
	}
	return pts;
}

function quad(p0: Point, p1: Point, p2: Point, steps: number): Point[] {
	const pts: Point[] = [];
	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		const u = 1 - t;
		pts.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
	}
	return pts;
}

/** Endpoint-parameterised elliptical arc (SVG spec F.6.5), sampled. */
function arc(
	p0: Point,
	rx: number,
	ry: number,
	phiDeg: number,
	large: number,
	sweep: number,
	p1: Point,
	steps: number
): Point[] {
	if (rx === 0 || ry === 0 || (p0[0] === p1[0] && p0[1] === p1[1])) return [p1];
	rx = Math.abs(rx);
	ry = Math.abs(ry);
	const phi = (phiDeg * Math.PI) / 180;
	const cos = Math.cos(phi);
	const sin = Math.sin(phi);
	const dx = (p0[0] - p1[0]) / 2;
	const dy = (p0[1] - p1[1]) / 2;
	const x1 = cos * dx + sin * dy;
	const y1 = -sin * dx + cos * dy;
	const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
	if (lambda > 1) {
		rx *= Math.sqrt(lambda);
		ry *= Math.sqrt(lambda);
	}
	const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
	const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
	let coef = Math.sqrt(Math.max(0, num / den));
	if (large === sweep) coef = -coef;
	const cx1 = (coef * rx * y1) / ry;
	const cy1 = (-coef * ry * x1) / rx;
	const cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2;
	const cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2;
	const angle = (ux: number, uy: number, vx: number, vy: number) => {
		const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
		return a;
	};
	const theta1 = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
	let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
	if (!sweep && delta > 0) delta -= 2 * Math.PI;
	if (sweep && delta < 0) delta += 2 * Math.PI;
	const pts: Point[] = [];
	for (let i = 1; i <= steps; i++) {
		const t = theta1 + (delta * i) / steps;
		pts.push([
			cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
			cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos
		]);
	}
	pts[pts.length - 1] = p1;
	return pts;
}

/** Parse a path into closed polygons (one per subpath). */
export function parsePath(d: string, curveSteps = 6): Polygon[] {
	const polys: Polygon[] = [];
	let cur: Polygon = [];
	let pos: Point = [0, 0];
	let start: Point = [0, 0];
	let lastCtrl: Point | null = null;
	let lastCmd = "";

	const flush = () => {
		if (cur.length > 2) polys.push(cur);
		cur = [];
	};

	for (const [, cmd, rawArgs] of d.matchAll(COMMAND)) {
		const rel = cmd === cmd.toLowerCase();
		const C = cmd.toUpperCase();
		const args = C === "A" ? readArcArgs(rawArgs) : (rawArgs.match(NUMBER) ?? []).map(Number);
		const at = (x: number, y: number): Point => (rel ? [pos[0] + x, pos[1] + y] : [x, y]);

		if (C === "Z") {
			pos = start;
			flush();
			lastCtrl = null;
			lastCmd = C;
			continue;
		}

		let i = 0;
		let first = true;
		const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
		const n = arity[C]!;
		while (i + n <= args.length) {
			const a = args.slice(i, i + n);
			i += n;
			if (C === "M") {
				const p = at(a[0]!, a[1]!);
				if (first) {
					flush();
					start = p;
					cur.push(p);
					pos = p;
					lastCtrl = null;
					lastCmd = "M";
					first = false;
					continue;
				}
				cur.push(p); // extra pairs after M are implicit L
				pos = p;
			} else if (C === "L") {
				pos = at(a[0]!, a[1]!);
				cur.push(pos);
			} else if (C === "H") {
				pos = [rel ? pos[0] + a[0]! : a[0]!, pos[1]];
				cur.push(pos);
			} else if (C === "V") {
				pos = [pos[0], rel ? pos[1] + a[0]! : a[0]!];
				cur.push(pos);
			} else if (C === "C") {
				const c1 = at(a[0]!, a[1]!);
				const c2 = at(a[2]!, a[3]!);
				const p = at(a[4]!, a[5]!);
				cur.push(...cubic(pos, c1, c2, p, curveSteps));
				lastCtrl = c2;
				pos = p;
			} else if (C === "S") {
				const c1: Point =
					lastCtrl && (lastCmd === "C" || lastCmd === "S") ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos;
				const c2 = at(a[0]!, a[1]!);
				const p = at(a[2]!, a[3]!);
				cur.push(...cubic(pos, c1, c2, p, curveSteps));
				lastCtrl = c2;
				pos = p;
			} else if (C === "Q") {
				const c = at(a[0]!, a[1]!);
				const p = at(a[2]!, a[3]!);
				cur.push(...quad(pos, c, p, curveSteps));
				lastCtrl = c;
				pos = p;
			} else if (C === "T") {
				const c: Point =
					lastCtrl && (lastCmd === "Q" || lastCmd === "T") ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos;
				const p = at(a[0]!, a[1]!);
				cur.push(...quad(pos, c, p, curveSteps));
				lastCtrl = c;
				pos = p;
			} else if (C === "A") {
				const p = at(a[5]!, a[6]!);
				cur.push(...arc(pos, a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, p, curveSteps));
				pos = p;
			}
			if (C !== "C" && C !== "S" && C !== "Q" && C !== "T") lastCtrl = null;
			lastCmd = C;
			first = false;
		}
	}
	flush();
	return polys;
}

/** Signed shoelace area (map units²). */
export function polygonArea(poly: Polygon): number {
	let a = 0;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
		a += poly[j]![0] * poly[i]![1] - poly[i]![0] * poly[j]![1];
	return a / 2;
}

/** Area-weighted centroid over all subpaths (holes subtract). */
export function shapeCentroid(polys: Polygon[]): { x: number; y: number; area: number } {
	let ax = 0;
	let ay = 0;
	let area = 0;
	for (const poly of polys) {
		let pa = 0;
		let cx = 0;
		let cy = 0;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const f = poly[j]![0] * poly[i]![1] - poly[i]![0] * poly[j]![1];
			pa += f;
			cx += (poly[j]![0] + poly[i]![0]) * f;
			cy += (poly[j]![1] + poly[i]![1]) * f;
		}
		pa /= 2;
		if (Math.abs(pa) < 1e-9) continue;
		ax += cx / 6;
		ay += cy / 6;
		area += pa;
	}
	if (Math.abs(area) < 1e-9) {
		const pts = polys.flat();
		return {
			x: pts.reduce((s, p) => s + p[0], 0) / pts.length,
			y: pts.reduce((s, p) => s + p[1], 0) / pts.length,
			area: 0
		};
	}
	return { x: ax / area, y: ay / area, area: Math.abs(area) };
}

/** Points every `step` units along each polygon's outline (for border detection). */
export function densify(polys: Polygon[], step: number): Point[] {
	const out: Point[] = [];
	for (const poly of polys) {
		for (let i = 0; i < poly.length; i++) {
			const a = poly[i]!;
			const b = poly[(i + 1) % poly.length]!;
			const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
			const n = Math.max(1, Math.ceil(len / step));
			for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
		}
	}
	return out;
}

/** Read every <path> with an id outside <defs>: id → d. */
export function readShapes(svg: string): Map<string, string> {
	const body = svg.replace(/<defs>[\s\S]*?<\/defs>/, "");
	const shapes = new Map<string, string>();
	for (const [tag] of body.matchAll(/<path\b[^>]*>/g)) {
		const id = tag.match(/\bid="([^"]+)"/)?.[1];
		const d = tag.match(/\bd="([^"]+)"/)?.[1];
		if (id && d) shapes.set(id, d);
	}
	return shapes;
}
