import { TokenBucket } from "$lib/server/rate-limit";
import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from "$lib/server/session";
import { sequence } from "@sveltejs/kit/hooks";

import { error, type Handle } from "@sveltejs/kit";

const bucket = new TokenBucket<string>(100, 1);

const rateLimitHandle: Handle = async ({ event, resolve }) => {
	// Note: Assumes X-Forwarded-For will always be defined.
	const clientIP = event.request.headers.get("X-Forwarded-For");
	if (clientIP === null) {
		return resolve(event);
	}
	let cost: number;
	if (event.request.method === "GET" || event.request.method === "OPTIONS") {
		cost = 1;
	} else {
		cost = 3;
	}
	if (!bucket.consume(clientIP, cost)) {
		throw error(429, "Too many requests");
	}
	return resolve(event);
};

const authHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get("session") ?? null;
	if (token === null) {
		event.locals.account = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, account } = await validateSessionToken(token);
	if (session !== null) {
		setSessionTokenCookie(event, token, session.expiresAt);
	} else {
		deleteSessionTokenCookie(event);
	}

	event.locals.session = session;
	event.locals.account = account;
	return resolve(event);
};

export const handle = sequence(rateLimitHandle, authHandle);
