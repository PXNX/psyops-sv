import { error, fail, json, redirect } from "@sveltejs/kit";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	//await parent();
	if (event.locals.session === null || event.locals.account === null) {
		return redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	if (event.locals.account.role !== "admin") {
		return error(403, "Only admins can access this page");
	}

	return { account: event.locals.account! };
};
