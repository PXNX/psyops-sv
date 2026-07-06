import type { Component } from "svelte";

export interface DocMeta {
	/** URL slug, derived from the markdown file name. */
	slug: string;
	title: string;
	description?: string;
	/** Sort order in the docs navigation. Lower comes first. */
	order: number;
}

export interface LoadedDoc {
	component: Component;
	metadata: Record<string, unknown>;
	meta: DocMeta;
}

// Eagerly import only the frontmatter of every markdown doc so the navigation
// and index page can be built without loading the full page components.
const metaModules = import.meta.glob<Record<string, unknown>>("./*.md", {
	eager: true,
	import: "metadata"
});

// Lazily import the actual components; only the requested doc is loaded.
const componentModules = import.meta.glob<{
	default: Component;
	metadata: Record<string, unknown>;
}>("./*.md");

function slugFromPath(path: string): string {
	return path.replace(/^\.\//, "").replace(/\.md$/, "");
}

function toMeta(path: string, raw: Record<string, unknown> | undefined): DocMeta {
	const m = raw ?? {};
	const slug = slugFromPath(path);
	return {
		slug,
		title: typeof m.title === "string" ? m.title : slug,
		description: typeof m.description === "string" ? m.description : undefined,
		order: typeof m.order === "number" ? m.order : 999
	};
}

/** All docs, sorted by `order` then title. */
export const docs: DocMeta[] = Object.entries(metaModules)
	.map(([path, meta]) => toMeta(path, meta))
	.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

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
