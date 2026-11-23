// The hex-sea fleet console is now overlaid on the maritime map.
// Keep old links and tutorials working by forwarding them there.
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { fleetActions } from "#lib/server/services/military/fleet-page.js";

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.account) redirect(303, "/");
	const query = url.searchParams.toString();
	redirect(307, `/map${query ? `?${query}` : ""}`);
};

export const actions = fleetActions;
