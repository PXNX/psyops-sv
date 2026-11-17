// src/lib/server/cron-auth.ts
// Who may trigger the scheduled jobs under /api/cron/*. They change game
// state (battles, elections, wars, ...), so only Vercel's scheduler, which
// sends `Authorization: Bearer <CRON_SECRET>`, or a signed-in admin (the
// manual buttons on /admin) may run them. Enforced in hooks.server.ts.

export function isAllowedCronRequest(
	authorization: string | null,
	role: string | null | undefined,
	cronSecret: string,
	nodeEnv: string
): boolean {
	if (role === "admin") return true;
	// Without a configured secret, only local development may run jobs freely.
	if (!cronSecret) return nodeEnv === "development";
	return authorization === `Bearer ${cronSecret}`;
}
