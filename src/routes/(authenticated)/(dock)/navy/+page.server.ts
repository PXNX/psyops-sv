// The standalone fleet console now lives in the Forces page (Navy tab).
// Keep old links and tutorials working by forwarding them there.
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { fleetActions } from "#lib/server/services/military/fleet-page.js";

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.account) redirect(303, "/");
	const query = url.searchParams.toString();
	redirect(307, `/training?view=navy${query ? `&${query}` : ""}`);
};

export const actions = fleetActions;
