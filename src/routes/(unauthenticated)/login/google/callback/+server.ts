import { ObjectParser } from "@pilcrowjs/object-parser";
import { createUser, getUserFromGoogleId } from "$lib/server/user";
import { createSession, generateSessionToken, setSessionTokenCookie } from "$lib/server/session";
import { decodeIdToken } from "arctic";

import type { RequestEvent } from "./$types";
import type { OAuth2Tokens } from "arctic";
import { googleProvider } from "$lib/server/oauth";
import { extractId } from "$lib/util";

export async function GET(event: RequestEvent): Promise<Response> {
	const storedState = event.cookies.get("google_oauth_state") ?? null;
	const codeVerifier = event.cookies.get("google_code_verifier") ?? null;
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");

	if (storedState === null || codeVerifier === null || code === null || state === null) {
		console.error("Invalid state or code");
		return new Response("Please restart the process. 1", {
			status: 400
		});
	}
	if (storedState !== state) {
		console.error("Invalid stored state");

		return new Response("Please restart the process. 2", {
			status: 400
		});
	}

	console.log("code", code, codeVerifier);

	let tokens: OAuth2Tokens;
	try {
		tokens = await googleProvider.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		console.error("Invalid validateAuthorizationCode", e);

		return new Response("Please restart the process. 3", {
			status: 400
		});
	}

	const claims = decodeIdToken(tokens.idToken());
	const claimsParser = new ObjectParser(claims);

	const googleId = claimsParser.getString("sub");
	const name = claimsParser.getString("name");
	const picture = claimsParser.getString("picture");
	const email = claimsParser.getString("email");

	const existingUser = await getUserFromGoogleId(googleId);

	console.log("EXISTING USER", existingUser);

	if (existingUser !== null && existingUser !== undefined) {
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, existingUser.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	}

	const user = await createUser(googleId, email, name, picture);
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);
	return new Response(null, {
		status: 302,
		headers: {
			Location: "/"
		}
	});
}
