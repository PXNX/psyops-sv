import { error } from "@sveltejs/kit";

// src/hooks.server.ts
import { TokenBucket } from "#lib/server/rate-limit.js";
import { sequence, type HandleServerError, type Handle } from "@sveltejs/kit/hooks";
import { validateSessionToken } from "#lib/server/auth.js";
import { paraglideMiddleware } from "#lib/paraglide/server.js";
import { cookieName as localeCookie } from "#lib/paraglide/runtime.js";
import { themes } from "#lib/themes.js";
import { isMockMode } from "#lib/server/db.js";
import { CRON_SECRET, NODE_ENV } from "$app/env/private";
import { isAllowedCronRequest } from "#lib/server/cron-auth.js";
import { incrementCounter, recordDuration, setSpanAttributes, trackEvent } from "#lib/server/telemetry.js";
import "@valibot/i18n/de/schema";

const bucket = new TokenBucket<string>(100, 1);

// Outermost handle: gives every request an id, times it and records the
// outcome. Cron endpoints get their own event so scheduled-job health is
// visible without instrumenting each of the seven routes separately.
const telemetryHandle: Handle = async ({ event, resolve }) => {
	const startedAt = performance.now();
	const requestId = event.request.headers.get("x-request-id") ?? crypto.randomUUID();
	event.locals.requestId = requestId;

	let status = 500;
	try {
		const response = await resolve(event);
		status = response.status;
		response.headers.set("x-request-id", requestId);
		return response;
	} catch (thrown) {
		const thrownStatus =
			typeof thrown === "object" && thrown !== null && "status" in thrown ? Number(thrown.status) : NaN;
		status = Number.isFinite(thrownStatus) && thrownStatus > 0 ? thrownStatus : 500;
		throw thrown;
	} finally {
		const durationMs = performance.now() - startedAt;
		const metricAttributes = {
			method: event.request.method,
			route: event.route.id ?? "unmatched",
			status
		};
		// Keep high-cardinality ids out of metric labels; they belong on events.
		const eventAttributes = { ...metricAttributes, request_id: requestId };
		recordDuration("http.server.request", durationMs, metricAttributes);
		if (durationMs > 1000) {
			trackEvent("http.request.slow", { ...eventAttributes, duration_ms: Math.round(durationMs) });
		}

		if (event.url.pathname.startsWith("/api/cron/")) {
			trackEvent("cron.run", {
				...eventAttributes,
				job: event.url.pathname.split("/")[3] ?? "unknown",
				outcome: status < 400 ? "ok" : "error",
				duration_ms: Math.round(durationMs)
			});
		}
	}
};

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
		incrementCounter("app.rate_limit.rejected", 1, { route: event.route.id ?? "unmatched" });
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
		setSpanAttributes({ "app.account.id": account.id });

		return resolve(event);
	};
}

const authHandle: Handle = isMockMode ? createMockAuthHandle() : createRealAuthHandle();

// Scheduled jobs change game state: only Vercel's scheduler or an admin may
// trigger them. Lives in a hook because layout loads never run for endpoints.
const cronGuardHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith("/api/cron/")) {
		const allowed = isAllowedCronRequest(
			event.request.headers.get("authorization"),
			event.locals.account?.role,
			CRON_SECRET,
			NODE_ENV
		);
		if (!allowed) return new Response("Forbidden", { status: 403 });
	}
	return resolve(event);
};

export const handleError: HandleServerError = async ({ kind, error, event }) => {
	// Reuse the id from telemetryHandle so logs, traces and the user-facing
	// error page all point at the same request.
	const requestId = event.locals.requestId ?? crypto.randomUUID();
	// Only truly unexpected (kind === "unknown") errors are JS exceptions; app/framework/validation
	// errors carry their own safe { status, message } that must stay intact for the error page.
	const err = kind === "unknown" && error instanceof Error ? error : undefined;
	const safeMessage = kind === "unknown" ? String(error) : error.message;

	event.locals.error = safeMessage;
	event.locals.errorStackTrace = err?.stack || undefined;
	event.locals.requestId = requestId;

	// Include the acting user and session so errors can be traced back to a
	// specific account (e.g. legacy accounts whose id is a provider identifier).
	const account = event.locals.account;
	const session = event.locals.session;
	const context = {
		requestId,
		kind,
		method: event.request.method,
		route: event.route.id ?? event.url.pathname,
		accountId: account?.id ?? null,
		accountEmail: account?.email ?? null,
		accountRole: account?.role ?? null,
		sessionId: session?.id ?? null,
		sessionExpiresAt: session?.expiresAt ?? null
	};

	// Log error with request ID and user/session context for debugging.
	// Only identifiers go into telemetry — the email in `context` stays in the
	// console log and is never shipped as a metric/event attribute.
	trackEvent("app.error", {
		request_id: requestId,
		kind,
		method: event.request.method,
		route: event.route.id ?? event.url.pathname,
		account_id: account?.id ?? "anonymous"
	});
	console.error(`[ERROR ${requestId}] ${safeMessage}`, context);
	if (err?.stack) {
		console.error(`[STACK ${requestId}]`, err.stack);
	}
	// Drizzle and other libraries wrap the original failure in `cause`. Surface
	// it so query errors reveal the underlying database message.
	if (err?.cause) {
		console.error(`[CAUSE ${requestId}]`, err.cause);
	}

	// Unknown errors may leak internals (stack traces, db messages) through their
	// message, so replace it with a generic one. app/framework/validation errors
	// already carry a safe, intentional message (e.g. `error(404, "Not found")`) —
	// leave status/message untouched by omitting them, so they're inherited.
	if (kind === "unknown") {
		// Admins get the full trace to debug live incidents; everyone else only
		// gets the request id they can hand to support.
		const debug =
			account?.role === "admin"
				? {
						stack: err?.stack || event.locals.errorStackTrace,
						cause: err?.cause ? String(err.cause) : undefined
					}
				: {};
		return { message: "An unexpected error occurred.", requestId, isAdmin: account?.role === "admin", ...debug };
	}

	return { requestId };
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
	paraglideMiddleware(event.request, async ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		// Remember the first detected locale (browser/Accept-Language) so the
		// choice sticks until the user changes it in Settings. Cookies must be
		// set before the response is generated.
		if (!event.cookies.get(localeCookie)) {
			event.cookies.set(localeCookie, locale, {
				path: "/",
				maxAge: 60 * 60 * 24 * 365,
				sameSite: "lax"
			});
		}
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace("%lang%", locale)
		});
	});

export const handle = sequence(
	telemetryHandle,
	rateLimitHandle,
	authHandle,
	cronGuardHandle,
	paraglideHandle,
	themesHandle
);
