// src/routes/auth/login/telegram/+server.ts
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { TELEGRAM_BOT_TOKEN } from "$lib/server/auth";

export const GET: RequestHandler = async ({ url }) => {
	// Get the 'next' parameter to redirect after login
	const next = url.searchParams.get("next") || "/";

	// Build the Telegram login URL with Web App
	// This uses the Telegram Web App authentication flow
	const telegramLoginUrl = new URL("https://oauth.telegram.org/tg/start");

	// For standalone Telegram login, we need to use the bot's username
	// The bot_id should be the numeric ID of your Telegram bot
	// You can get this from BotFather
	const botId = TELEGRAM_BOT_TOKEN.split(":")[0];

	telegramLoginUrl.searchParams.set("bot_id", botId);
	telegramLoginUrl.searchParams.set("origin", new URL(url).origin);
	telegramLoginUrl.searchParams.set("return_to", `${new URL(url).origin}/auth/callback/telegram?next=${encodeURIComponent(next)}`);
	telegramLoginUrl.searchParams.set("request_access", "write");

	console.log("🔍 Telegram Login - Redirect URL:", next);
	console.log("🔍 Telegram Login - Bot ID:", botId);

	redirect(302, telegramLoginUrl.toString());
};
