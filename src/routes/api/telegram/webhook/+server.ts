// src/routes/api/telegram/webhook/+server.ts
// Telegram bot webhook for premium membership.
//
// NOTE: Telegram Stars payments are temporarily DISABLED. For now, requesting
// premium via the bot grants it immediately for free (mock). To re-enable real
// payments, restore the commented-out invoice / payment handling below (and the
// `answerPreCheckoutQuery` / `sendTelegramInvoice` imports).
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { userProfiles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { PREMIUM_PLANS, isPremiumPlanId, type PremiumPlanId } from "$lib/config";
import { grantPremium } from "$lib/server/service/premium";
import { TELEGRAM_WEBHOOK_SECRET, sendTelegramMessage } from "$lib/server/telegram";
// import { answerPreCheckoutQuery, sendTelegramInvoice } from "$lib/server/telegram";

async function findAccountByTelegramId(telegramId: number): Promise<string | null> {
	const [profile] = await db
		.select({ accountId: userProfiles.accountId })
		.from(userProfiles)
		.where(eq(userProfiles.telegramId, telegramId));
	return profile?.accountId ?? null;
}

// --- Payment flow (temporarily disabled) -------------------------------------
// function buildPayload(planId: PremiumPlanId, accountId: string): string {
// 	return `premium:${planId}:${accountId}`;
// }
//
// function parsePayload(payload: string): { planId: PremiumPlanId; accountId: string } | null {
// 	const parts = payload.split(":");
// 	if (parts.length !== 3 || parts[0] !== "premium") return null;
// 	if (!isPremiumPlanId(parts[1])) return null;
// 	return { planId: parts[1], accountId: parts[2] };
// }
//
// async function handleSuccessfulPayment(message: any): Promise<void> {
// 	const chatId = message.chat.id;
// 	const payment = message.successful_payment;
// 	const parsed = parsePayload(payment?.invoice_payload ?? "");
//
// 	if (!parsed) {
// 		console.error("Telegram payment with invalid payload:", payment?.invoice_payload);
// 		return;
// 	}
//
// 	// Prefer the account encoded in the payload; fall back to the linked account.
// 	let accountId: string | null = parsed.accountId;
// 	if (!accountId && message.from?.id) {
// 		accountId = await findAccountByTelegramId(message.from.id);
// 	}
// 	if (!accountId) {
// 		console.error("Telegram payment for unknown account");
// 		return;
// 	}
//
// 	const plan = PREMIUM_PLANS[parsed.planId];
// 	const premiumUntil = await grantPremium(accountId, plan.days);
//
// 	await sendTelegramMessage(
// 		chatId,
// 		`✅ Thank you! Your <b>${plan.label}</b> premium is active until ${premiumUntil.toUTCString()}. Automation is now working for you.`
// 	);
// }

async function handleCommand(message: any): Promise<void> {
	const chatId = message.chat.id;
	const fromId = message.from?.id as number | undefined;
	const text: string = (message.text || "").trim();

	if (!fromId) return;

	const accountId = await findAccountByTelegramId(fromId);
	if (!accountId) {
		await sendTelegramMessage(
			chatId,
			"Please link your Telegram account first by logging in with Telegram on the website, then try again."
		);
		return;
	}

	// /premium [weekly|monthly|seasonal]
	const arg = text.split(/\s+/)[1]?.toLowerCase() ?? "";
	const planId: PremiumPlanId = isPremiumPlanId(arg) ? arg : "monthly";
	const plan = PREMIUM_PLANS[planId];

	if (text.startsWith("/start")) {
		const options = Object.values(PREMIUM_PLANS)
			.map((p) => `• <b>${p.label}</b> — ${p.days} days (send /premium ${p.id})`)
			.join("\n");
		await sendTelegramMessage(
			chatId,
			`Welcome! With a <b>Premium membership</b> the game automatically runs production, military training and factory work for you.\n\nPremium is currently <b>free</b> — just pick a plan:\n\n${options}`
		);
		return;
	}

	// MOCK: grant premium immediately for free instead of sending a Stars invoice.
	const premiumUntil = await grantPremium(accountId, plan.days);
	await sendTelegramMessage(
		chatId,
		`✅ Your <b>${plan.label}</b> premium (${plan.days} days, currently free) is active until ${premiumUntil.toUTCString()}. Automation is now working for you.`
	);

	// --- Real payment flow (disabled) ---
	// await sendTelegramInvoice({
	// 	chatId,
	// 	title: `${plan.label} Premium`,
	// 	description: `${plan.days} days of premium: automatic production, military training and factory work.`,
	// 	payload: buildPayload(planId, accountId),
	// 	stars: plan.telegramStars,
	// 	label: `${plan.label} Premium`
	// });
}

export const POST: RequestHandler = async ({ request }) => {
	// Verify the webhook secret token when configured.
	if (TELEGRAM_WEBHOOK_SECRET) {
		const token = request.headers.get("x-telegram-bot-api-secret-token");
		if (token !== TELEGRAM_WEBHOOK_SECRET) {
			return json({ ok: false }, { status: 403 });
		}
	}

	let update: any;
	try {
		update = await request.json();
	} catch {
		return json({ ok: false }, { status: 400 });
	}

	try {
		// --- Payment updates (disabled while premium is free) ---
		// if (update.pre_checkout_query) {
		// 	await answerPreCheckoutQuery(update.pre_checkout_query.id, true);
		// } else if (update.message?.successful_payment) {
		// 	await handleSuccessfulPayment(update.message);
		// } else if (update.message?.text?.startsWith("/")) {
		if (update.message?.text?.startsWith("/")) {
			await handleCommand(update.message);
		}
	} catch (err) {
		console.error("Telegram webhook error:", err);
	}

	// Always ack so Telegram does not retry indefinitely.
	return json({ ok: true });
};
