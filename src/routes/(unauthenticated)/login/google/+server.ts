import { googleProvider } from "$lib/server/oauth";
import { generateCodeVerifier, generateState } from "arctic";

import type { RequestEvent } from "./$types";

export function GET(event: RequestEvent): Response {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	const url = googleProvider.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

	event.cookies.set("google_oauth_state", state, {
		httpOnly: true,
		maxAge: 60 * 10,
		secure: import.meta.env.PROD,
		path: "/",
		sameSite: "lax"
	});
	event.cookies.set("google_code_verifier", codeVerifier, {
		httpOnly: true,
		maxAge: 60 * 10,
		secure: import.meta.env.PROD,
		path: "/",
		sameSite: "lax"
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: url.toString()
			//+ "&next=" + event.url.searchParams.get("next")
			// or no Next if null
			// todo figure out how to actually make it rdircet without google error. maybe put Next in database?
		}
	});
}
