import { redirect } from "@sveltejs/kit";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	if (event.locals.session !== null && event.locals.user !== null) {
		return redirect(302, "/");
	}
	return {};
};
