// src/routes/auth/callback/telegram/+server.ts
import {
	createSession,
	generateAccountId,
	generateSessionToken,
	TELEGRAM_BOT_TOKEN,
	type TelegramUser
} from "$lib/server/auth";
import { db } from "$lib/server/db";
import { accounts, userProfiles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { createHash, createHmac } from "crypto";
import { redirect } from "@sveltejs/kit";

// Verification algorithm for Telegram's Login Widget family (login_url
// buttons and Telegram.Login.auth()), per
// https://core.telegram.org/widgets/login#checking-authorization:
// secret_key = SHA256(bot_token), hash = HMAC_SHA256(data_check_string, secret_key).
// This is NOT the same as Mini App initData verification, which HMAC-keys
// the bot token with the literal string "WebAppData" instead.
function verifyTelegramData(data: Record<string, string>, botToken: string): boolean {
	const checkString = Object.keys(data)
		.filter((key) => key !== "hash")
		.sort()
		.map((key) => `${key}=${data[key]}`)
		.join("\n");

	const secretKey = createHash("sha256").update(botToken).digest();
	const hash = createHmac("sha256", secretKey).update(checkString).digest("hex");

	return hash === data.hash;
}

async function handleTelegramAuth(telegramUser: TelegramUser, cookies: any) {
	// Check if account exists with this Telegram ID
	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.telegramId, telegramUser.id)
	});

	let account;
	let isNewUser = false;

	if (existingProfile) {
		// Get the associated account
		const existingAccount = await db.query.accounts.findFirst({
			where: eq(accounts.id, existingProfile.accountId)
		});

		if (!existingAccount) {
			console.error("❌ Profile exists but account not found");
			throw new Error("Account not found");
		}

		account = existingAccount;
		console.log("✅ Account already exists with Telegram ID");
	} else {
		// Legacy accounts used `telegram_<id>` as their id. Look those up so
		// existing users keep working, but brand-new accounts get a short id.
		const legacyTelegramAccountId = `telegram_${telegramUser.id}`;

		// Check if a legacy account with this ID already exists
		const existingAccount = await db.query.accounts.findFirst({
			where: eq(accounts.id, legacyTelegramAccountId)
		});

		if (existingAccount) {
			account = existingAccount;
			console.log("✅ Account already exists");
		} else {
			console.log("✨ Creating new account with Telegram");

			// Create new account with a short, unique id
			const newAccount = await db
				.insert(accounts)
				.values({
					id: generateAccountId(),
					email: `${telegramUser.username || telegramUser.id}@telegram.local`,
					role: "user"
				})
				.returning();

			account = newAccount[0];

			// Create user profile with Telegram info
			await db.insert(userProfiles).values({
				accountId: account.id,
				name: telegramUser.first_name,
				telegramId: telegramUser.id,
				telegramUsername: telegramUser.username || null,
				logo: null,
				bio: null
			});

			isNewUser = true;
		}
	}

	// Update Telegram info in profile
	if (existingProfile) {
		await db
			.update(userProfiles)
			.set({
				telegramId: telegramUser.id,
				telegramUsername: telegramUser.username || null,
				updatedAt: new Date()
			})
			.where(eq(userProfiles.accountId, account.id));
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

	console.log("✅ Telegram login successful");
	console.log("👤 User role (Permission):", account.role);

	return {
		success: true,
		redirectTo: isNewUser ? "/welcome" : "/",
		isNewUser
	};
}

// Handle GET requests from Telegram's `login_url` button (see
// bot/private/premium.py's login_cmd in ptb-psyops, which sends a LoginUrl
// pointing here). This is a different, well-documented Telegram mechanism
// than the website's own login widget below — Telegram appends the signed
// auth fields to this URL as a query string and opens it in the user's
// browser directly, no popup/redirect dance involved.
export const GET: RequestHandler = async ({ url, cookies }) => {
	// Validation redirects are kept outside the try/catch below: redirect()
	// throws internally, and catching that here would swallow it and turn
	// every one of these into a generic "server_error" redirect instead.
	const params = url.searchParams;
	const telegramData: Record<string, string> = {};
	const telegramParams = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"];

	for (const param of telegramParams) {
		const value = params.get(param);
		if (value) telegramData[param] = value;
	}

	if (!telegramData.hash || !telegramData.auth_date) {
		console.error("❌ Missing required Telegram parameters");
		redirect(302, "/auth/login?error=missing_params");
	}

	if (!verifyTelegramData(telegramData, TELEGRAM_BOT_TOKEN)) {
		console.error("❌ Invalid Telegram data signature");
		redirect(302, "/auth/login?error=invalid_signature");
	}

	const authTime = parseInt(telegramData.auth_date) * 1000;
	if (Date.now() - authTime > 5 * 60 * 1000) {
		console.error("❌ Auth data too old");
		redirect(302, "/auth/login?error=auth_expired");
	}

	const telegramUser: TelegramUser = {
		id: parseInt(telegramData.id),
		first_name: telegramData.first_name,
		username: telegramData.username,
		photo_url: telegramData.photo_url,
		auth_date: parseInt(telegramData.auth_date),
		hash: telegramData.hash
	};

	console.log("👤 Telegram user (bot login_url):", telegramUser.username || telegramUser.first_name);

	let result: Awaited<ReturnType<typeof handleTelegramAuth>>;
	try {
		result = await handleTelegramAuth(telegramUser, cookies);
	} catch (e) {
		console.error("❌ Error during Telegram authentication:", e);
		redirect(302, "/auth/login?error=server_error");
	}

	redirect(302, result.redirectTo);
};

// Handle POST requests from the website's own Telegram login button (see
// src/lib/components/TelegramLoginWidget.svelte), which uses
// Telegram.Login.auth()'s popup + JS callback instead of a redirect.
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { user, hash, auth_date } = body;

		// Verify the data from Telegram
		const dataToVerify = {
			...user,
			hash,
			auth_date: auth_date.toString()
		};

		if (!verifyTelegramData(dataToVerify, TELEGRAM_BOT_TOKEN)) {
			console.error("❌ Invalid Telegram data signature");
			return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
		}

		// Check if auth_date is recent (within 5 minutes)
		const authTime = auth_date * 1000;
		const now = Date.now();
		if (now - authTime > 5 * 60 * 1000) {
			console.error("❌ Auth data too old");
			return new Response(JSON.stringify({ error: "Auth data expired" }), { status: 400 });
		}

		const telegramUser: TelegramUser = {
			id: user.id,
			first_name: user.first_name,
			username: user.username,
			photo_url: user.photo_url,
			auth_date,
			hash
		};

		console.log("👤 Telegram user:", telegramUser.username || telegramUser.first_name);

		const result = await handleTelegramAuth(telegramUser, cookies);

		return new Response(JSON.stringify(result), { status: 200 });
	} catch (e) {
		console.error("❌ Error during Telegram authentication:", e);
		return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
	}
};
