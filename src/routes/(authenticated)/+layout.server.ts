import { redirect, type RequestEvent } from "@sveltejs/kit";
import { jsonify } from "surrealdb";

export async function load(event: RequestEvent) {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, "/login");
	}

	//rptecting just here feels wrong tbh

	const dataUser = jsonify(event.locals.user);

	return {
		user: dataUser
	};
}
