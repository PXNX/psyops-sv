import { error } from "@sveltejs/kit";

import { loadDoc } from "$lib/docs";

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
	const doc = await loadDoc(params.slug);
	if (!doc) {
		error(404, `Die Dokumentation "${params.slug}" wurde nicht gefunden.`);
	}

	return {
		component: doc.component,
		meta: doc.meta
	};
};
