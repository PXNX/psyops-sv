// src/lib/server/auth.ts
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, TELEGRAM_BOT_TOKEN } from "$env/static/private";
import { Google } from "arctic";
import { getContext } from "./context";

export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

// Telegram OAuth2 configuration
export const TELEGRAM_CLIENT_ID = TELEGRAM_BOT_TOKEN;
export { TELEGRAM_BOT_TOKEN };
export const TELEGRAM_REDIRECT_URI = `${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/auth/callback/telegram`;
export const TELEGRAM_API_URL = 'https://api.telegram.org';

export interface TelegramUser {
	id: number;
	first_name: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
}

// Helper functions that delegate to the AuthService
export async function validateSessionToken(token: string) {
	const ctx = getContext();
	return ctx.services.auth.validateSessionToken(token);
}

export function generateSessionToken(): string {
	const ctx = getContext();
	return ctx.services.auth.generateSessionToken();
}

export async function createSession(token: string, accountId: string) {
	const ctx = getContext();
	return ctx.services.auth.createSession(token, accountId);
}

export async function invalidateSession(sessionId: string) {
	const ctx = getContext();
	return ctx.services.auth.invalidateSession(sessionId);
}
