// src/routes/auth/login/telegram/+server.ts
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { TELEGRAM_CLIENT_ID, TELEGRAM_REDIRECT_URI } from "$lib/server/auth";

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Generate random state for security
	const randomState = crypto.getRandomValues(new Uint8Array(32));
	const state = Array.from(randomState)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Get the 'next' parameter to redirect after login
	const next = url.searchParams.get("next") || "/";

	// Encode the redirect URL into the state parameter
	const stateWithRedirect = `${state}|${encodeURIComponent(next)}`;

	// Store the state for validation
	cookies.set("telegram_oauth_state", stateWithRedirect, {
		path: "/",
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	// Telegram OAuth2 URL
	const telegramAuthUrl = new URL("https://oauth.telegram.org/tg/start");
	telegramAuthUrl.searchParams.set("bot_id", TELEGRAM_CLIENT_ID);
	telegramAuthUrl.searchParams.set("origin", new URL(url).origin);
	telegramAuthUrl.searchParams.set("return_to", TELEGRAM_REDIRECT_URI);
	telegramAuthUrl.searchParams.set("request_access", "write");

	console.log("🔍 Telegram Login - Redirect URL:", next);
	console.log("🔍 Telegram Login - State with redirect:", stateWithRedirect);

	redirect(302, telegramAuthUrl.toString());
};
