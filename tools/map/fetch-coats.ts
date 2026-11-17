#!/usr/bin/env bun
// tools/map/fetch-coats.ts: downloads a coat of arms for every region that
// has none yet (static/coats/<id>.svg), from Wikimedia Commons via Wikidata.
// New files are then slimmed down (optimize-coats.ts) and put on the shared
// square canvas (square-coats.ts), both run automatically.
//
// For each region it searches Wikidata by name and only accepts places whose
// coordinates are near the region's position on the map, so "Georgia" or
// "Córdoba" can't pick the wrong one. It takes the place's coat of arms
// (P94), else its seal (P158); if the place has neither it walks up to the
// province / country it lies in (P131, P17) and uses that one. Every file's
// source, author and licence go to tools/map/coat-sources.json.
//
// If the name finds nothing nearby, it looks up what lies at the region's map
// position instead (Wikidata geo search) and uses that area's arms. Wrong
// picks can be pinned to a specific Commons file in coat-overrides.json.
//
//   bun tools/map/fetch-coats.ts            # all regions without a coat
//   bun tools/map/fetch-coats.ts 812 990    # just these ids (re-fetch)
import { existsSync, readFileSync, writeFileSync } from "fs";
import { toUtf8 } from "./optimize-coats";
import { haversineKm } from "./projection";

const dir = import.meta.dir;
const coatsDir = `${dir}/../../static/coats`;
const sourcesPath = `${dir}/coat-sources.json`;
const UA = "psyops-sv-map-tools/1.0 (https://github.com/PXNX/psyops-sv)";
const MAX_KM = 600; // a search hit further than this from the region is a different place
const CANDIDATES = 8;

interface Region {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
}
export interface CoatSource {
	file: string;
	url: string;
	entity: string;
	entityLabel: string;
	/** own: the place itself; parent/country: the area it belongs to; override: pinned by hand. */
	match: "own" | "parent" | "country" | "location" | "override";
	license?: string;
	artist?: string;
}

const regions = JSON.parse(readFileSync(`${dir}/data/regions.json`, "utf8")) as Region[];
const sources: Record<string, CoatSource> = existsSync(sourcesPath)
	? JSON.parse(readFileSync(sourcesPath, "utf8"))
	: {};
const overrides = JSON.parse(readFileSync(`${dir}/coat-overrides.json`, "utf8")) as Record<string, string>;
const only = process.argv.slice(2).map(Number).filter(Boolean);
const todo = regions.filter((r) => (only.length ? only.includes(r.id) : !existsSync(`${coatsDir}/${r.id}.svg`)));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function api(host: string, params: Record<string, string>): Promise<any> {
	const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", ...params });
	for (let attempt = 0; attempt < 4; attempt++) {
		const res = await fetch(url, { headers: { "User-Agent": UA } });
		if (res.ok) return res.json();
		await sleep(1500 * (attempt + 1));
	}
	throw new Error(`API failed: ${url}`);
}

type Entity = { id: string; labels?: any; claims?: Record<string, any[]> };
const entityCache = new Map<string, Entity>();
async function entities(ids: string[]): Promise<Entity[]> {
	const missing = ids.filter((id) => !entityCache.has(id));
	for (let i = 0; i < missing.length; i += 40) {
		const data = await api("www.wikidata.org", {
			action: "wbgetentities",
			ids: missing.slice(i, i + 40).join("|"),
			props: "claims|labels",
			languages: "en"
		});
		for (const [id, e] of Object.entries<any>(data.entities ?? {})) entityCache.set(id, e);
	}
	return ids.map((id) => entityCache.get(id)!).filter(Boolean);
}

const claim = (e: Entity, prop: string) =>
	e.claims?.[prop]?.find((c: any) => c.rank !== "deprecated")?.mainsnak?.datavalue?.value;
const coords = (e: Entity) => {
	const v = claim(e, "P625");
	return v ? { lat: v.latitude as number, lon: v.longitude as number } : null;
};
const image = (e: Entity): string | null => claim(e, "P94") ?? claim(e, "P158") ?? null;
const label = (e: Entity) => e.labels?.en?.value ?? e.id;

/** Items around a point (Wikidata SPARQL geo search), nearest first. */
async function itemsAround(lat: number, lon: number, radiusKm: number): Promise<string[]> {
	const query = `SELECT ?item ?dist WHERE {
		SERVICE wikibase:around { ?item wdt:P625 ?loc . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral ; wikibase:radius "${radiusKm}" ; wikibase:distance ?dist }
		?item wdt:P131 ?admin .
	} ORDER BY ?dist LIMIT 15`;
	const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
		headers: { "User-Agent": UA, Accept: "application/sparql-results+json" }
	});
	if (!res.ok) return [];
	const data = (await res.json()) as any;
	return data.results.bindings.map((b: any) => b.item.value.split("/").pop());
}

/** Arms of whatever administrative area lies at the region's position. */
async function coatAtLocation(r: Region): Promise<{ file: string; entity: Entity; match: CoatSource["match"] } | null> {
	for (const radius of [60, 200]) {
		const ids = await itemsAround(r.latitude, r.longitude, radius);
		for (const start of await entities(ids.slice(0, 5))) {
			let current: Entity | undefined = start;
			for (let depth = 0; depth < 5 && current; depth++) {
				const parentId = claim(current, "P131")?.id;
				if (!parentId) break;
				[current] = await entities([parentId]);
				const f = current && image(current);
				if (f) return { file: f, entity: current!, match: "location" };
			}
			const countryId = claim(start, "P17")?.id;
			if (countryId) {
				const [country] = await entities([countryId]);
				const f = country && (image(country) ?? claim(country, "P41"));
				if (f) return { file: f, entity: country, match: "country" };
			}
		}
		await sleep(500);
	}
	return null;
}

async function findCoat(r: Region): Promise<{ file: string; entity: Entity; match: CoatSource["match"] } | null> {
	const queries = [...new Set([r.name, r.name.normalize("NFD").replace(/[̀-ͯ]/g, ""), r.name.split(/[ -]/)[0]!])];
	const hits: Entity[] = [];
	for (const search of queries) {
		const res = await api("www.wikidata.org", {
			action: "wbsearchentities",
			search,
			language: "en",
			type: "item",
			limit: String(CANDIDATES)
		});
		hits.push(...(await entities((res.search ?? []).map((s: any) => s.id))));
		if (hits.some((e) => coords(e))) break;
	}
	// Places near the region, closest first.
	const near = hits
		.map((e) => ({ e, c: coords(e) }))
		.filter((x): x is { e: Entity; c: { lat: number; lon: number } } => !!x.c)
		.map((x) => ({ e: x.e, km: haversineKm(r.latitude, r.longitude, x.c.lat, x.c.lon) }))
		.filter((x) => x.km <= MAX_KM)
		.sort((a, b) => a.km - b.km);
	for (const { e } of near) {
		const f = image(e);
		if (f) return { file: f, entity: e, match: "own" };
	}
	// Walk up the administrative hierarchy of the best match, then its country.
	const best = near[0]?.e;
	if (!best) return null;
	let current: Entity | undefined = best;
	for (let depth = 0; depth < 4 && current; depth++) {
		const parentId = claim(current, "P131")?.id;
		if (!parentId) break;
		[current] = await entities([parentId]);
		const f = current && image(current);
		if (f) return { file: f, entity: current!, match: "parent" };
	}
	const countryId = claim(best, "P17")?.id;
	if (countryId) {
		const [country] = await entities([countryId]);
		const f = country && (image(country) ?? claim(country, "P41")); // emblem, else flag
		if (f) return { file: f, entity: country, match: "country" };
	}
	return null;
}

async function download(r: Region, file: string): Promise<boolean> {
	const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
	const res = await fetch(url, { headers: { "User-Agent": UA } });
	if (!res.ok) return false;
	const type = res.headers.get("content-type") ?? "";
	const bytes = Buffer.from(await res.arrayBuffer());
	let svg: string;
	if (type.includes("svg") || file.toLowerCase().endsWith(".svg")) {
		svg = toUtf8(bytes);
		if (!svg.includes("<svg")) return false;
	} else {
		// Raster coat: wrap it so every coat is served as /coats/<id>.svg.
		const mime = type.split(";")[0] || "image/png";
		svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="data:${mime};base64,${bytes.toString("base64")}" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></svg>`;
	}
	writeFileSync(`${coatsDir}/${r.id}.svg`, svg);
	return true;
}

async function licence(file: string): Promise<{ license?: string; artist?: string }> {
	const data = await api("commons.wikimedia.org", {
		action: "query",
		titles: `File:${file}`,
		prop: "imageinfo",
		iiprop: "extmetadata"
	});
	const meta = (Object.values<any>(data.query?.pages ?? {})[0] as any)?.imageinfo?.[0]?.extmetadata ?? {};
	const strip = (s?: string) => s?.replace(/<[^>]+>/g, "").trim() || undefined;
	return { license: strip(meta.LicenseShortName?.value), artist: strip(meta.Artist?.value) };
}

const tally = { own: 0, parent: 0, country: 0, location: 0, override: 0, none: 0 };
const failed: string[] = [];
for (const [n, r] of todo.entries()) {
	try {
		const pinned = overrides[String(r.id)];
		const found = pinned
			? {
					file: pinned,
					entity: { id: "-", labels: { en: { value: "pinned in coat-overrides.json" } } } as Entity,
					match: "override" as const
				}
			: ((await findCoat(r)) ?? (await coatAtLocation(r)));
		if (!found || !(await download(r, found.file))) {
			tally.none++;
			failed.push(`${r.id} ${r.name}`);
			console.log(`[${n + 1}/${todo.length}] ✗ ${r.id} ${r.name}`);
			continue;
		}
		tally[found.match]++;
		sources[r.id] = {
			file: found.file,
			url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(found.file.replace(/ /g, "_"))}`,
			entity: found.entity.id,
			entityLabel: label(found.entity),
			match: found.match,
			...(await licence(found.file))
		};
		console.log(
			`[${n + 1}/${todo.length}] ✓ ${r.id} ${r.name} ← ${found.match}: ${label(found.entity)} (${found.file})`
		);
	} catch (err) {
		tally.none++;
		failed.push(`${r.id} ${r.name}`);
		console.log(`[${n + 1}/${todo.length}] ✗ ${r.id} ${r.name}: ${err instanceof Error ? err.message : err}`);
	}
	await sleep(150);
}

if (todo.length) {
	const fetched = todo.filter((r) => sources[r.id]).map((r) => String(r.id));
	await Bun.spawn(["bun", `${dir}/optimize-coats.ts`, ...fetched], { stdout: "inherit", stderr: "inherit" }).exited;
	await Bun.spawn(["bun", `${dir}/square-coats.ts`, ...fetched], { stdout: "inherit", stderr: "inherit" }).exited;
}

const sorted = Object.fromEntries(Object.entries(sources).sort(([a], [b]) => Number(a) - Number(b)));
writeFileSync(sourcesPath, JSON.stringify(sorted, null, "\t") + "\n");
console.log(
	`
own ${tally.own}, province ${tally.parent}, by location ${tally.location}, country ${tally.country}, pinned ${tally.override}, none ${tally.none}`
);
if (failed.length) console.log(`No coat found: ${failed.join(", ")}`);
