import { readFileSync } from "fs";
import { resolve } from "path";
import type { PageServerLoad } from "./$types";

export interface LicenseInfo {
	name: string;
	version: string;
	license: string;
	author: string | null;
	url: string | null;
}

export interface IconSetInfo {
	name: string;
	prefix: string;
	total: number | null;
	author: string | null;
	authorUrl: string | null;
	license: string;
	licenseUrl: string | null;
}

function readJSON(path: string): any | null {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return null;
	}
}

function normalizeLicense(pkg: any): string {
	if (!pkg) return "Unknown";
	if (typeof pkg.license === "string") return pkg.license;
	if (pkg.license && typeof pkg.license === "object" && pkg.license.type) return pkg.license.type;
	if (Array.isArray(pkg.licenses)) {
		return (
			pkg.licenses
				.map((l: any) => (typeof l === "string" ? l : l?.type))
				.filter(Boolean)
				.join(", ") || "Unknown"
		);
	}
	return "Unknown";
}

function normalizeAuthor(author: any): string | null {
	if (!author) return null;
	if (typeof author === "string")
		return (
			author
				.replace(/\s*<[^>]*>/, "")
				.replace(/\s*\([^)]*\)/, "")
				.trim() || null
		);
	if (typeof author === "object" && author.name) return author.name;
	return null;
}

function normalizeUrl(pkg: any): string | null {
	if (!pkg) return null;
	if (typeof pkg.homepage === "string" && pkg.homepage) return pkg.homepage;
	const repo = pkg.repository;
	let url: string | null = null;
	if (typeof repo === "string") url = repo;
	else if (repo && typeof repo === "object" && typeof repo.url === "string") url = repo.url;
	if (!url) return null;
	return url
		.replace(/^git\+/, "")
		.replace(/^git:\/\//, "https://")
		.replace(/\.git$/, "")
		.replace(/^git@github\.com:/, "https://github.com/");
}

interface DependencyData {
	version: string;
	licenses: LicenseInfo[];
	iconSets: IconSetInfo[];
}

let cached: DependencyData | null = null;

function collectDependencyData(): DependencyData {
	if (cached) return cached;

	const pkg = readJSON(resolve("package.json")) ?? {};
	const allDeps: Record<string, string> = {
		...(pkg.dependencies ?? {}),
		...(pkg.devDependencies ?? {})
	};

	const licenses: LicenseInfo[] = [];
	const iconSets: IconSetInfo[] = [];

	for (const [name, range] of Object.entries(allDeps)) {
		const depPkg = readJSON(resolve("node_modules", name, "package.json"));
		const version = depPkg?.version ?? String(range).replace(/^[\^~>=<\s]*/, "");

		if (name.startsWith("@iconify-json/")) {
			const info = readJSON(resolve("node_modules", name, "info.json"));
			if (info) {
				iconSets.push({
					name: info.name ?? name,
					prefix: info.prefix ?? name.replace("@iconify-json/", ""),
					total: typeof info.total === "number" ? info.total : null,
					author: info.author?.name ?? null,
					authorUrl: info.author?.url ?? null,
					license: info.license?.title ?? normalizeLicense(depPkg),
					licenseUrl: info.license?.url ?? null
				});
				continue;
			}
		}

		licenses.push({
			name,
			version,
			license: normalizeLicense(depPkg),
			author: normalizeAuthor(depPkg?.author),
			url: normalizeUrl(depPkg)
		});
	}

	licenses.sort((a, b) => a.name.localeCompare(b.name));
	iconSets.sort((a, b) => a.name.localeCompare(b.name));

	cached = { version: (pkg.version as string) ?? "0.0.0", licenses, iconSets };
	return cached;
}

export const load: PageServerLoad = async () => {
	const { version, licenses, iconSets } = collectDependencyData();

	let changelog = "";
	try {
		changelog = readFileSync(resolve("CHANGELOG.md"), "utf-8");
	} catch {
		changelog = "No changelog available.";
	}

	return {
		version,
		changelog,
		licenses,
		iconSets
	};
};
