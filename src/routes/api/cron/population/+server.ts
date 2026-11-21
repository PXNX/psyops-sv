// src/routes/api/cron/population/+server.ts
// Triggered by the weekly Vercel Schedule (see "population" in vercel.json).
// Advances every region's civilian population by a week of births, mortality,
// environmental and conscription pressure, and instability-driven emigration.
// Access is checked for all /api/cron/* routes in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { populationTick } from "#lib/server/services/stability.js";

const TICK_DAYS = 7;

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await populationTick(db, now, TICK_DAYS);
		return cronResponse("population", { ...result }, 0);
	} catch (error) {
		return cronCrash("population", error);
	}
};
