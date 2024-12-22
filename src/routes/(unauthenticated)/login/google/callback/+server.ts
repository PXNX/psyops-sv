import { googleProvider } from "$lib/server/oauth";
import { createSession, generateSessionToken, setSessionTokenCookie } from "$lib/server/session";
import { createUser, getUserFromGoogleId } from "$lib/server/user";
import { error, redirect } from "@sveltejs/kit";
import type { OAuth2Tokens } from "arctic";
import { decodeIdToken } from "arctic";
import type { RequestEvent } from "./$types";

type Claims = {
	sub: string;
	name: string;
	email: string;
	picture: string;
};

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");
	const storedState = event.cookies.get("google_oauth_state") ?? null;
	const codeVerifier = event.cookies.get("google_code_verifier") ?? null;
	if (code === null || state === null || storedState === null || codeVerifier === null) {
		return new Response(null, {
			status: 400
		});
	}
	if (state !== storedState) {
		throw error(400, "Invalid state");
	}

	let tokens: OAuth2Tokens;
	try {
		tokens = await googleProvider.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		throw error(400, "Invalid code or client credentials");
	}

	const { email, picture: avatar, name: username, sub: googleUserId } = decodeIdToken(tokens.idToken()) as Claims;

	const existingUser = await getUserFromGoogleId(googleUserId);

	console.log("EXISTING USER", existingUser);

	if (existingUser) {
		console.log("User exists.");
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, existingUser.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);
		return redirect(302, "/");
	}

	const user = await createUser(googleUserId, email, username, avatar);
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);
	return redirect(302, "/welcome");
}
