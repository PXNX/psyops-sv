// src/routes/(authenticated)/(dock)/settings/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";

import type { Actions, RequestEvent } from "./$types";

export const actions: Actions = {
	default: action
};

async function action(event: RequestEvent) {
	if (event.locals.session === null) {
		return fail(401);
	}

	return redirect(302, "/auth/logout");
}
