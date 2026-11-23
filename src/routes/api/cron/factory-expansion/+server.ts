// src/routes/api/cron/factory-expansion/+server.ts
// Hourly: bring filed factory expansions online once their works period ends.
// Access is checked for all /api/cron/* routes in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { completeFactoryExpansions } from "#lib/server/services/economy/factory-expansion.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await completeFactoryExpansions(db, now);
		return cronResponse("factory-expansion", { ...result }, 0);
	} catch (error) {
		return cronCrash("factory-expansion", error);
	}
};
