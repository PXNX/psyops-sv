import { fail, redirect } from "@sveltejs/kit";
import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/session";

import type { Actions, RequestEvent } from "./$types";
import sql from "$lib/db";

export async function load(event: RequestEvent) {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, "/login");
	}

	const user = await sql`SELECT * FROM users WHERE id = ${event.locals.user.id}`;

	return {
		user
	};
}

export const actions: Actions = {
	default: action
};

async function action(event: RequestEvent) {
	if (event.locals.session === null) {
		return fail(401);
	}
	invalidateSession(event.locals.session.id);
	deleteSessionTokenCookie(event);
	return redirect(302, "/login");
}
