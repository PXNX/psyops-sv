// src/lib/server/telegram.ts
// Thin wrappers around the Telegram Bot API used for premium purchases.
import { env } from "$env/dynamic/private";
import { TELEGRAM_API_URL, TELEGRAM_BOT_TOKEN } from "$lib/server/auth";

function apiUrl(method: string): string {
	return `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

/** Secret token expected in the X-Telegram-Bot-Api-Secret-Token webhook header. */
export const TELEGRAM_WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET || "";

async function callTelegram(method: string, body: Record<string, unknown>): Promise<any> {
	try {
		const res = await fetch(apiUrl(method), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
		const data = await res.json();
		if (!data.ok) {
			console.error(`Telegram API ${method} failed:`, data.description);
		}
		return data;
	} catch (err) {
		console.error(`Telegram API ${method} error:`, err);
		return { ok: false };
	}
}

export function sendTelegramMessage(
	chatId: number | string,
	text: string,
	extra: Record<string, unknown> = {}
): Promise<any> {
	return callTelegram("sendMessage", {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		...extra
	});
}

/**
 * Send a Telegram Stars (XTR) invoice. Stars invoices use an empty provider_token
 * and the "XTR" currency, with the amount expressed directly in stars.
 */
export function sendTelegramInvoice(params: {
	chatId: number | string;
	title: string;
	description: string;
	payload: string;
	stars: number;
	label: string;
}): Promise<any> {
	return callTelegram("sendInvoice", {
		chat_id: params.chatId,
		title: params.title,
		description: params.description,
		payload: params.payload,
		provider_token: "",
		currency: "XTR",
		prices: [{ label: params.label, amount: params.stars }]
	});
}

export function answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string): Promise<any> {
	return callTelegram("answerPreCheckoutQuery", {
		pre_checkout_query_id: preCheckoutQueryId,
		ok,
		...(errorMessage ? { error_message: errorMessage } : {})
	});
}
