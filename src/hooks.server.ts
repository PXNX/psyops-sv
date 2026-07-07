// src/hooks.server.ts
import { TokenBucket } from "$lib/server/rate-limit";
import { sequence } from "@sveltejs/kit/hooks";
import { validateSessionToken } from "$lib/server/auth";
import type { HandleServerError } from "@sveltejs/kit";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { error, type Handle } from "@sveltejs/kit";
import { themes } from "$lib/themes";
import { isMockMode } from "$lib/server/db";
import "@valibot/i18n/de/schema";

const bucket = new TokenBucket<string>(100, 1);

const rateLimitHandle: Handle = async ({ event, resolve }) => {
	// Note: Assumes X-Forwarded-For will always be defined.
	const clientIP = event.request.headers.get("X-Forwarded-For");
	if (clientIP === null) {
		return resolve(event);
	}
	let cost: number;
	if (event.request.method === "GET" || event.request.method === "OPTIONS") {
		cost = 1;
	} else {
		cost = 3;
	}
	if (!bucket.consume(clientIP, cost)) {
		throw error(429, "Too many requests");
	}
	return resolve(event);
};

function createMockAuthHandle(): Handle {
	const mockAccount = {
		id: "user-1",
		email: "alice@example.com",
		role: "admin" as const,
		notifyNewspaperPosts: true,
		notifyDirectMessages: true,
		notifyWarDeclarations: true,
		notifyBattleResults: true,
		notifyElections: true,
		notifyTravelComplete: true,
		notifyShiftComplete: true,
		notifyMarketSales: true,
		notifyNewProposals: true,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01")
	};

	const mockSession = {
		id: "mock-session-alice",
		accountId: "user-1",
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
		createdAt: new Date("2024-01-01")
	};

	return async ({ event, resolve }) => {
		event.locals.account = mockAccount;
		event.locals.session = mockSession;
		return resolve(event);
	};
}

function createRealAuthHandle(): Handle {
	return async ({ event, resolve }) => {
		console.log("🔍 Session - Checking session");
		const sessionToken = event.cookies.get("session");

		if (!sessionToken) {
			event.locals.account = null;
			event.locals.session = null;
			return resolve(event);
		}

		const { account, session } = await validateSessionToken(sessionToken);

		// validateSessionToken always resolves to an object; when the token is
		// invalid or expired both fields are null. Clear the stale cookie so the
		// browser stops sending it (otherwise authenticated routes keep receiving
		// a null account and crash).
		if (!account || !session) {
			event.locals.account = null;
			event.locals.session = null;
			event.cookies.delete("session", { path: "/" });
			return resolve(event);
		}

		event.locals.account = account;
		event.locals.session = session;

		return resolve(event);
	};
}

const authHandle: Handle = isMockMode ? createMockAuthHandle() : createRealAuthHandle();

export const handleError: HandleServerError = async ({ error, event }) => {
	const requestId = crypto.randomUUID();
	const err = error instanceof Error ? error : undefined;

	event.locals.error = error?.toString() || undefined;
	event.locals.errorStackTrace = err?.stack || undefined;
	event.locals.requestId = requestId;

	// Include the acting user and session so errors can be traced back to a
	// specific account (e.g. legacy accounts whose id is a provider identifier).
	const account = event.locals.account;
	const session = event.locals.session;
	const context = {
		requestId,
		method: event.request.method,
		route: event.route.id ?? event.url.pathname,
		accountId: account?.id ?? null,
		accountEmail: account?.email ?? null,
		accountRole: account?.role ?? null,
		sessionId: session?.id ?? null,
		sessionExpiresAt: session?.expiresAt ?? null
	};

	// Log error with request ID and user/session context for debugging
	console.error(`[ERROR ${requestId}] ${error?.toString() || "Unknown error"}`, context);
	if (err?.stack) {
		console.error(`[STACK ${requestId}]`, err.stack);
	}
	// Drizzle and other libraries wrap the original failure in `cause`. Surface
	// it so query errors reveal the underlying database message.
	if (err?.cause) {
		console.error(`[CAUSE ${requestId}]`, err.cause);
	}

	return {
		message: "An unexpected error occurred.",
		requestId
	};
};

export const themesHandle: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get("theme");

	if (!theme || !themes.includes(theme)) {
		return await resolve(event);
	}

	return await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace('data-theme=""', `data-theme="${theme}"`);
		}
	});
};

// creating a handle to use the paraglide middleware
const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace("%lang%", locale);
			}
		});
	});

export const handle = sequence(rateLimitHandle, authHandle, paraglideHandle, themesHandle);
