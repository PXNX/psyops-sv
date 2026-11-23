import { collectDependencyData } from "#lib/server/meta/dependencies.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const { licenses, iconSets } = collectDependencyData();
	return { licenses, iconSets };
};
