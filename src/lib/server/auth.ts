// src/lib/server/auth.ts
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from "$env/static/private";
import { Google } from "arctic";
import { getContext } from "./context";

export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

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
