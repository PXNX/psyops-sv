import type { LayoutServerLoad } from "./$types";

import { redirect } from "@sveltejs/kit";
import { jsonify } from "surrealdb";
import { fail } from "@sveltejs/kit";
import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/session";

import type { RequestEvent } from "./$types";

//TODO: Add your own language detection logic, so that when HL is detected, it's set as cookie and used for translation
const langParam = "hl"; // or maybe better to let user set it and have en default

export const load = async (event: RequestEvent) => {
	//await parent();
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, "/login?next=" + event.url.pathname);
	}

	//rptecting just here feels wrong tbh

	const dataUser = jsonify(event.locals.user);

	return {
		user: dataUser
	};
};
