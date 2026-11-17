#!/usr/bin/env bun
// tools/map/render-coats.ts: turns the downloaded coats of arms into the small
// images the app serves.
//
// Originals (tools/map/.coat-cache/<id>.svg, git-ignored, filled by
// fetch-coats.ts) can be several MB each, far too heavy for an icon shown at
// ~40-64px. Each one is rendered once to a 256px WebP in static/coats/<id>.webp.
//
//   bun tools/map/render-coats.ts            # render coats that have no WebP yet
//   bun tools/map/render-coats.ts --all      # re-render everything
//   bun tools/map/render-coats.ts 812 990    # re-render these ids
import { existsSync, readdirSync, readFileSync } from "fs";
import sharp from "sharp";

const dir = import.meta.dir;
export const COAT_CACHE = `${dir}/.coat-cache`;
const out = `${dir}/../../static/coats`;
const SIZE = 256;

const all = process.argv.includes("--all");
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
const ids = readdirSync(COAT_CACHE)
	.filter((f) => f.endsWith(".svg"))
	.map((f) => f.slice(0, -4))
	.filter((id) => (only.length ? only.includes(id) : all || !existsSync(`${out}/${id}.webp`)))
	.sort((a, b) => Number(a) - Number(b));

/** Some Commons SVGs are saved as UTF-16; the renderer only reads UTF-8. */
function readSvg(path: string): Buffer {
	const raw = readFileSync(path);
	const utf16le = raw[0] === 0xff && raw[1] === 0xfe;
	const utf16be = raw[0] === 0xfe && raw[1] === 0xff;
	if (!utf16le && !utf16be) return raw;
	const body = utf16le ? raw.subarray(2) : Buffer.from(raw.subarray(2)).swap16();
	return Buffer.from(body.toString("utf16le").replace(/encoding="UTF-16"/i, 'encoding="UTF-8"'), "utf8");
}

let done = 0;
const failed: string[] = [];
for (const id of ids) {
	try {
		await sharp(readSvg(`${COAT_CACHE}/${id}.svg`), { density: 144, limitInputPixels: false })
			.resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.webp({ quality: 82, alphaQuality: 90, effort: 5 })
			.toFile(`${out}/${id}.webp`);
		done++;
	} catch (err) {
		failed.push(`${id} (${err instanceof Error ? err.message.split("\n")[0] : err})`);
	}
}
console.log(`Rendered ${done} coats to ${SIZE}px WebP${failed.length ? `; failed: ${failed.join(", ")}` : ""}`);
