import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	let raw = "";
	try {
		raw = readFileSync(resolve("CHANGELOG.md"), "utf-8");
	} catch {
		raw = "# Changelog\n\nNo changelog available.";
	}
	return { releases: (await import("#lib/changelog.js")).parseChangelog(raw) };
};
