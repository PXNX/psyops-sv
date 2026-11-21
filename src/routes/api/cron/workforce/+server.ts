// src/routes/api/cron/workforce/+server.ts
// Triggered by the weekly Vercel Schedule (see "workforce" in vercel.json).
// Fills each factory's free shifts with civilians from its region, pays their
// wages from the company budget and collects income tax for the state.
// Access is checked for all /api/cron/* routes in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { runCivilianWork } from "#lib/server/services/economy/civilian-work.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await runCivilianWork(db, now);
		return cronResponse("workforce", { ...result }, 0);
	} catch (error) {
		return cronCrash("workforce", error);
	}
};
