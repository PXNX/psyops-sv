import { redirect } from "@sveltejs/kit";
import { jsonify } from "surrealdb";

import type { RequestEvent } from "./$types";

export async function load(event: RequestEvent) {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, "/login?next=" + event.url.pathname);
	}

	//rptecting just here feels wrong tbh

	const dataUser = jsonify(event.locals.user);

	return {
		user: dataUser
	};
}
