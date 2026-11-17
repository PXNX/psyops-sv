#!/usr/bin/env bun
// tools/map/square-coats.ts: puts every coat of arms on the same square
// canvas, so they all render at the same size and resolution.
//
// Each SVG keeps its drawing untouched; only the root <svg> changes: the
// drawing's box (its viewBox, or its width/height, or the size the renderer
// measures) is centred in a square viewBox and the canvas is set to
// SIZE x SIZE. Every result is rendered and compared with the original drawn
// "contained" in the same square; a file that comes out different is left
// as it was and reported.
//
//   bun tools/map/square-coats.ts            # every coat
//   bun tools/map/square-coats.ts 812 990    # just these ids
//   bun tools/map/square-coats.ts --dry      # only report
//   bun tools/map/square-coats.ts 583 --force  # write a reviewed file despite a big difference
import { readdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

export const COAT_SIZE = 512;
const coatsDir = `${import.meta.dir}/../../static/coats`;
// Mean per-channel difference allowed between the original (drawn contained
// in a square) and the squared file. Re-rasterising at a different size alone
// causes ~5-9 from anti-aliasing; real damage shows up far higher. Files above
// this are not written but listed for a look (some are originals whose own
// viewBox cropped the drawing, which squaring fixes; force those by id).
const MAX_PIXEL_DIFF = 15;

const UNIT_PX: Record<string, number> = { "": 1, px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };

function toPx(value: string | undefined): number | null {
	const m = value?.trim().match(/^(-?[\d.]+(?:e[-+]?\d+)?)\s*(px|pt|pc|mm|cm|in)?$/i);
	if (!m) return null;
	const n = parseFloat(m[1]!) * UNIT_PX[(m[2] ?? "").toLowerCase()]!;
	return Number.isFinite(n) && n > 0 ? n : null;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];

/** The drawing's box in user units: [x, y, w, h]. */
async function drawingBox(svg: string, rootTag: string): Promise<[number, number, number, number] | null> {
	const vb = attr(rootTag, "viewBox")
		?.trim()
		.split(/[\s,]+/)
		.map(Number);
	const w = toPx(attr(rootTag, "width"));
	const h = toPx(attr(rootTag, "height"));
	if (vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2]! > 0 && vb[3]! > 0) {
		let [x, y, vw, vh] = vb as [number, number, number, number];
		// With a width/height of a different shape than the viewBox, renderers
		// centre the viewBox ("xMidYMid meet") and also show the drawing that
		// lies outside it to fill the canvas. Use that whole visible area.
		const par = (attr(rootTag, "preserveAspectRatio") ?? "xMidYMid meet").trim();
		if (w && h && !/^none\b/.test(par) && !/\bslice\b/.test(par)) {
			const canvas = w / h;
			if (canvas > vw / vh) {
				const nw = vh * canvas;
				x -= (nw - vw) / 2;
				vw = nw;
			} else if (canvas < vw / vh) {
				const nh = vw / canvas;
				y -= (nh - vh) / 2;
				vh = nh;
			}
		}
		return [x, y, vw, vh];
	}
	if (w && h) return [0, 0, w, h];
	// No usable size on the root: ask the renderer what it measures.
	const meta = await sharp(Buffer.from(svg), { limitInputPixels: false }).metadata();
	return meta.width && meta.height ? [0, 0, meta.width, meta.height] : null;
}

export async function squareSvg(svg: string): Promise<string | null> {
	const rootTag = svg.match(/<svg\b[^>]*>/i)?.[0];
	if (!rootTag) return null;
	const box = await drawingBox(svg, rootTag);
	if (!box) return null;
	const [x, y, w, h] = box;
	const side = Math.max(w, h);
	const round = (n: number) => +n.toFixed(4);
	const viewBox = [x - (side - w) / 2, y - (side - h) / 2, side, side].map(round).join(" ");
	const cleaned = rootTag.replace(/\s(width|height|viewBox|preserveAspectRatio)\s*=\s*(["']).*?\2/gi, "");
	const newTag = cleaned.replace(
		/^<svg\b/i,
		`<svg width="${COAT_SIZE}" height="${COAT_SIZE}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"`
	);
	return svg.replace(rootTag, newTag);
}

async function render(svg: string, contain: boolean): Promise<Buffer> {
	let img = sharp(Buffer.from(svg), { density: 72, limitInputPixels: false });
	img = contain
		? img.resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
		: img.resize(128, 128);
	return img.ensureAlpha().raw().toBuffer();
}

function meanDiff(a: Buffer, b: Buffer): number {
	if (a.length !== b.length) return Infinity;
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
	return sum / a.length;
}

if (import.meta.main) {
	const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
	const dry = process.argv.includes("--dry");
	const force = process.argv.includes("--force"); // write even if it looks different (after reviewing it)
	const files = readdirSync(coatsDir)
		.filter((f) => f.endsWith(".svg") && (!only.length || only.includes(f.slice(0, -4))))
		.sort((a, b) => parseInt(a) - parseInt(b));
	let changed = 0;
	const problems: string[] = [];
	for (const file of files) {
		const path = `${coatsDir}/${file}`;
		const original = readFileSync(path, "utf8");
		try {
			const squared = await squareSvg(original);
			if (!squared) {
				problems.push(`${file} (no size found)`);
				continue;
			}
			if (squared === original) continue;
			const meta = await sharp(Buffer.from(squared), { limitInputPixels: false }).metadata();
			const diff = meanDiff(await render(original, true), await render(squared, false));
			if (meta.width !== COAT_SIZE || meta.height !== COAT_SIZE || (diff > MAX_PIXEL_DIFF && !force)) {
				problems.push(`${file} (${meta.width}x${meta.height}, diff ${diff.toFixed(1)})`);
				continue;
			}
			if (!dry) writeFileSync(path, squared);
			changed++;
		} catch (err) {
			problems.push(`${file} (${err instanceof Error ? err.message.split("\n")[0] : err})`);
		}
	}
	console.log(
		`${changed} of ${files.length} coats ${dry ? "would be" : ""} put on a ${COAT_SIZE}x${COAT_SIZE} square canvas`
	);
	if (problems.length) console.log(`Left unchanged: ${problems.join(", ")}`);
}
