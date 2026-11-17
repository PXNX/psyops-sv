#!/usr/bin/env bun
// tools/map/optimize-coats.ts: makes the coat SVGs lighter without changing
// how they look. Each file in static/coats is run through svgo (editor
// metadata, comments, redundant markup removed; the drawing kept). The result
// is rendered next to the original and compared pixel by pixel: a file whose
// optimised version looks even slightly different keeps its original.
//
//   bun tools/map/optimize-coats.ts           # every coat
//   bun tools/map/optimize-coats.ts 812 990   # just these ids
import { readdirSync, readFileSync, writeFileSync } from "fs";
import sharp from "sharp";
import { optimize } from "svgo";

const coatsDir = `${import.meta.dir}/../../static/coats`;
const MAX_PIXEL_DIFF = 2; // mean absolute difference per channel (0-255) at 128px

/** Some Commons SVGs are UTF-16; normalise to UTF-8 so every tool can read them. */
export function toUtf8(raw: Buffer): string {
	const le = raw[0] === 0xff && raw[1] === 0xfe;
	const be = raw[0] === 0xfe && raw[1] === 0xff;
	if (!le && !be) return raw.toString("utf8");
	const body = le ? raw.subarray(2) : Buffer.from(raw.subarray(2)).swap16();
	return body.toString("utf16le").replace(/encoding="UTF-16"/i, 'encoding="UTF-8"');
}

async function render(svg: string): Promise<Buffer> {
	return sharp(Buffer.from(svg), { density: 72, limitInputPixels: false })
		.resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.ensureAlpha()
		.raw()
		.toBuffer();
}

function meanDiff(a: Buffer, b: Buffer): number {
	if (a.length !== b.length) return Infinity;
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
	return sum / a.length;
}

if (import.meta.main) await main();

async function main() {
	const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
	const files = readdirSync(coatsDir)
		.filter((f) => f.endsWith(".svg") && (!only.length || only.includes(f.slice(0, -4))))
		.sort((a, b) => parseInt(a) - parseInt(b));

	let before = 0;
	let after = 0;
	const kept: string[] = [];
	for (const file of files) {
		const path = `${coatsDir}/${file}`;
		const raw = readFileSync(path);
		const original = toUtf8(raw);
		before += raw.length;
		let optimised: string;
		try {
			optimised = optimize(original, {
				multipass: true,
				plugins: ["preset-default"] // svgo 4 keeps viewBox, so coats still scale
			}).data;
		} catch {
			kept.push(`${file} (svgo failed)`);
			after += raw.length;
			continue;
		}
		let diff = Infinity;
		try {
			diff = meanDiff(await render(original), await render(optimised));
		} catch {
			// Can't render one of them: keep the original untouched.
		}
		if (diff <= MAX_PIXEL_DIFF && optimised.length < original.length) {
			writeFileSync(path, optimised);
			after += Buffer.byteLength(optimised);
		} else {
			if (original !== raw.toString("utf8")) writeFileSync(path, original); // still fix the encoding
			after += Buffer.byteLength(original);
			if (diff > MAX_PIXEL_DIFF)
				kept.push(`${file} (looked different: ${diff === Infinity ? "unrenderable" : diff.toFixed(1)})`);
		}
	}
	const mb = (n: number) => (n / 1e6).toFixed(1);
	console.log(`${files.length} coats: ${mb(before)} MB → ${mb(after)} MB`);
	if (kept.length) console.log(`Kept original: ${kept.join(", ")}`);
}
