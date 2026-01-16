// src/routes/auth/callback/google/+server.ts
import { createSession, generateSessionToken, google } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { accounts, userProfiles } from "$lib/server/schema";
import { OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const storedStateWithRedirect = cookies.get("google_oauth_state");
	const codeVerifier = cookies.get("google_code_verifier");

	console.log("🔍 Callback - Received state from Google:", state);
	console.log("🔍 Callback - Stored state from cookie:", storedStateWithRedirect);

	if (!code || !state || !storedStateWithRedirect || !codeVerifier) {
		console.error("❌ Missing required parameters");
		return new Response("Invalid request", { status: 400 });
	}

	// Extract the random state and redirect URL
	const [storedState, encodedRedirect] = storedStateWithRedirect.split("|");
	let redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : "/";

	console.log("🔍 Callback - Extracted redirect URL:", redirectTo);

	// Validate the state matches (only the random part)
	if (state !== storedState) {
		console.error("❌ State mismatch");
		return new Response("Invalid state", { status: 400 });
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
			headers: { Authorization: `Bearer ${tokens.accessToken()}` }
		});

		const googleUser = await response.json();
		console.log("👤 Google user:", googleUser.email);

		// Check if account exists, if not create them
		const existingAccount = await db.select().from(accounts).where(eq(accounts.email, googleUser.email)).limit(1);

		let account;
		let isNewUser = false;

		if (existingAccount.length === 0) {
			console.log("✨ Creating new account");

			// Create new account with user role (default permission)
			const newAccount = await db
				.insert(accounts)
				.values({
					id: googleUser.sub,
					email: googleUser.email,
					role: "user" // Default permission
				})
				.returning();

			account = newAccount[0];

			// Create corresponding user profile WITHOUT name (to trigger welcome flow)
			// This ensures new users go through the welcome process
			await db.insert(userProfiles).values({
				accountId: account.id,
				logo: null,
				bio: null
			});

			isNewUser = true;
			// New users always go to welcome, regardless of original redirect
			redirectTo = "/welcome";
		} else {
			console.log("✅ Account already exists");
			account = existingAccount[0];

			// Check if profile is incomplete (no name set)
			const profile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, account.id)
			});

			// If profile exists but has no name, redirect to welcome
			if (!profile?.name) {
				redirectTo = "/welcome";
			}
			// Otherwise keep the original redirect destination
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, account.id);

		cookies.set("session", sessionToken, {
			httpOnly: true,
			sameSite: "lax",
			secure: import.meta.env.PROD,
			expires: session.expiresAt,
			path: "/"
		});

		// Clear OAuth cookies
		cookies.delete("google_oauth_state", { path: "/" });
		cookies.delete("google_code_verifier", { path: "/" });

		console.log("✅ Login successful, redirecting to:", redirectTo);
		console.log("👤 User role (Permission):", account.role);

		return new Response(null, {
			status: 302,
			headers: { Location: redirectTo }
		});
	} catch (e) {
		console.error("❌ Error during authentication:", e);

		// Clear OAuth cookies on error
		cookies.delete("google_oauth_state", { path: "/" });
		cookies.delete("google_code_verifier", { path: "/" });

		if (e instanceof OAuth2RequestError) {
			return new Response("❌ OAuth error", { status: 400 });
		}
		return new Response("❌ Server error", { status: 500 });
	}
};
