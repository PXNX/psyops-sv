// src/lib/server/auth.ts
import { Google } from "arctic";
import { env } from "$env/dynamic/private";
import { getContext } from "./context";
import { isMockMode } from "./db";

// In mock mode, use dummy credentials
const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || "mock-client-id";
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || "mock-client-secret";
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI || "http://localhost:5173/auth/callback/google";
const TELEGRAM_BOT_TOKEN_VAL = env.TELEGRAM_BOT_TOKEN || "mock-bot-token";

export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

// Telegram OAuth2 configuration
export const TELEGRAM_CLIENT_ID = TELEGRAM_BOT_TOKEN_VAL;
export const TELEGRAM_BOT_TOKEN = TELEGRAM_BOT_TOKEN_VAL;
export const TELEGRAM_REDIRECT_URI = `${env.PUBLIC_APP_URL || 'http://localhost:5173'}/auth/callback/telegram`;
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
