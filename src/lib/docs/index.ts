import type { Component } from "svelte";

export interface DocMeta {
	/** URL slug, derived from the markdown file name. */
	slug: string;
	title: string;
	description?: string;
	/** Sort order in the docs navigation. Lower comes first. */
	order: number;
	/** Navigation group; docs without one land in "Weitere Themen". */
	category?: string;
}

export interface LoadedDoc {
	component: Component;
	metadata: Record<string, unknown>;
	meta: DocMeta;
}

// Eagerly read only the frontmatter of every markdown doc so the navigation
// and index page can be built without loading the full page components.
// Reading the raw text keeps this independent of mdsvex's query-module API,
// which has changed between versions (and made the docs nav empty at build,
// leaving its prerenderable slug routes with no links to crawl).
const rawModules = import.meta.glob<string>("./*.md", { eager: true, query: "?raw", import: "default" });

function parseFrontmatter(raw: string): Record<string, unknown> {
	const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
	if (!block) return {};
	const meta: Record<string, unknown> = {};
	for (const line of block[1]!.split(/\r?\n/)) {
		const colon = line.indexOf(":");
		if (colon < 0) continue;
		const key = line.slice(0, colon).trim();
		let value = line.slice(colon + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		meta[key] = /^-?\d+$/.test(value) ? Number(value) : value;
	}
	return meta;
}

const metaModules = Object.fromEntries(
	Object.entries(rawModules).map(([path, raw]) => [path, parseFrontmatter(raw)])
);

// Lazily import the actual components; only the requested doc is loaded.
const componentModules = import.meta.glob<{
	default: Component;
	metadata: Record<string, unknown>;
}>("./*.md");

function slugFromPath(path: string): string {
	return path.replace(/^\.\//, "").replace(/\.md$/, "").replace(/\?.*$/, "");
}

function toMeta(path: string, raw: Record<string, unknown> | undefined): DocMeta {
	const m = raw ?? {};
	const slug = slugFromPath(path);
	return {
		slug,
		title: typeof m.title === "string" ? m.title : slug,
		description: typeof m.description === "string" ? m.description : undefined,
		order: typeof m.order === "number" ? m.order : 999,
		category: typeof m.category === "string" ? m.category : undefined
	};
}

/** All docs, sorted by `order` then title. */
export const docs: DocMeta[] = Object.entries(metaModules)
	.map(([path, meta]) => toMeta(path, meta))
	.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

/** Docs grouped by category, in `order`, for the index and sidebar. */
export function groupedDocs(all: DocMeta[] = docs): { category: string; items: DocMeta[] }[] {
	const groups = new Map<string, DocMeta[]>();
	for (const doc of all) {
		const category = doc.category ?? "Weitere Themen";
		const list = groups.get(category) ?? [];
		list.push(doc);
		groups.set(category, list);
	}
	return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

export function getDocMeta(slug: string): DocMeta | undefined {
	return docs.find((d) => d.slug === slug);
}

/** Load a single doc component by slug, or return `null` if it does not exist. */
export async function loadDoc(slug: string): Promise<LoadedDoc | null> {
	const loader = componentModules[`./${slug}.md`];
	const meta = getDocMeta(slug);
	if (!loader || !meta) return null;

	const mod = await loader();
	return {
		component: mod.default,
		metadata: mod.metadata ?? {},
		meta
	};
}
