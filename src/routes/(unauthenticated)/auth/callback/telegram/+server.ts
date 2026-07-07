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
import { createHmac } from "crypto";
import { redirect } from "@sveltejs/kit";

function verifyTelegramData(data: Record<string, string>, botToken: string): boolean {
	const checkString = Object.keys(data)
		.filter((key) => key !== "hash")
		.sort()
		.map((key) => `${key}=${data[key]}`)
		.join("\n");

	const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
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

// Handle GET requests from Telegram Web App
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		// Parse Telegram data from URL parameters
		const params = new URLSearchParams(url.search);
		const telegramData: Record<string, string> = {};

		// Extract all Telegram parameters
		const telegramParams = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"];

		for (const param of telegramParams) {
			const value = params.get(param);
			if (value) {
				telegramData[param] = value;
			}
		}

		// Get the next parameter for redirect
		const next = params.get("next") || "/";

		if (!telegramData.hash || !telegramData.auth_date) {
			console.error("❌ Missing required Telegram parameters");
			redirect(302, `/auth/login?error=missing_params&next=${encodeURIComponent(next)}`);
		}

		// Verify the data from Telegram
		if (!verifyTelegramData(telegramData, TELEGRAM_BOT_TOKEN)) {
			console.error("❌ Invalid Telegram data signature");
			redirect(302, `/auth/login?error=invalid_signature&next=${encodeURIComponent(next)}`);
		}

		// Check if auth_date is recent (within 5 minutes)
		const authTime = parseInt(telegramData.auth_date) * 1000;
		const now = Date.now();
		if (now - authTime > 5 * 60 * 1000) {
			console.error("❌ Auth data too old");
			redirect(302, `/auth/login?error=auth_expired&next=${encodeURIComponent(next)}`);
		}

		const telegramUser: TelegramUser = {
			id: parseInt(telegramData.id),
			first_name: telegramData.first_name,
			username: telegramData.username,
			photo_url: telegramData.photo_url,
			auth_date: parseInt(telegramData.auth_date),
			hash: telegramData.hash
		};

		console.log("👤 Telegram user:", telegramUser.username || telegramUser.first_name);

		const result = await handleTelegramAuth(telegramUser, cookies);

		redirect(302, result.redirectTo);
	} catch (e) {
		console.error("❌ Error during Telegram authentication:", e);
		redirect(302, "/auth/login?error=server_error");
	}
};

// Handle POST requests from Web App
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
