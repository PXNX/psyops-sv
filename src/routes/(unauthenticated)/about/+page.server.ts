import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectDependencyData } from "#lib/server/meta/dependencies.js";
import type { PageServerLoad } from "./$types";

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
