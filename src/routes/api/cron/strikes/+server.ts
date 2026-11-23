// src/routes/api/cron/strikes/+server.ts
// Weekly fair-pay cycle: workers can walk out at most once a week, and paying
// their demand ends the strike. Access is checked for all /api/cron/* routes
// in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { runStrikeCycle } from "#lib/server/services/economy/strikes.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await runStrikeCycle(db, now);
		return cronResponse("strikes", { ...result }, 0);
	} catch (error) {
		return cronCrash("strikes", error);
	}
};
