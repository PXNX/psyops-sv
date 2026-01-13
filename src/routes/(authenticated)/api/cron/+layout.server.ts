// src/routes/(authenticated)/api/cron/+layout.server.ts

import { error, redirect } from "@sveltejs/kit";
import { jsonify } from "surrealdb";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	//await parent();
	if (!isValidCronRequest(event.request)) {
		return error(403, "Invalid request");
	}

	//protecting just here feels wrong tbh

	const dataUser = jsonify(event.locals.account);

	console.log("dataUser", dataUser);

	return {
		account: dataUser
	};
};

function isValidCronRequest(request: Request): boolean {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		return process.env.NODE_ENV === "development";
	}

	return authHeader === `Bearer ${cronSecret}`;
}
