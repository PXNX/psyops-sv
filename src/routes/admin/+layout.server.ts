import { error, fail, redirect } from "@sveltejs/kit";
import { jsonify } from "surrealdb";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	//await parent();
	if (event.locals.session === null || event.locals.account === null) {
		return redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	if (event.locals.account.role !== "admin") {
		return error(403, "Only admins can access this page");
	}

	//protecting just here feels wrong tbh

	const dataUser = jsonify(event.locals.account);

	console.log("dataUser", dataUser);

	return {
		account: dataUser
	};
};
