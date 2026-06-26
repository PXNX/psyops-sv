import { readFileSync } from "fs";
import { resolve } from "path";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const pkgPath = resolve("package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

	let changelog = "";
	try {
		changelog = readFileSync(resolve("CHANGELOG.md"), "utf-8");
	} catch {
		changelog = "No changelog available.";
	}

	return {
		version: pkg.version as string,
		changelog
	};
};
