import { json, redirect } from "@sveltejs/kit";

import type { RequestEvent } from "./$types";

//TODO: Add your own language detection logic, so that when HL is detected, it's set as cookie and used for translation
const langParam = "hl"; // or maybe better to let user set it and have en default

export const load = async (event: RequestEvent) => {
	//await parent();
	if (event.locals.session === null || event.locals.account === null) {
		return redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	return {
		account: event.locals.account
	};
};
