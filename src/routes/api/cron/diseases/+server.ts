// src/routes/api/cron/diseases/+server.ts
// Daily biological cycle: outbreaks spread, kill and recover, and new ones can
// emerge where water and food are failing. Access is checked for all
// /api/cron/* routes in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { runDiseaseTick } from "#lib/server/services/civilians/diseases.js";

export const GET: RequestHandler = async () => {
	try {
		const result = await runDiseaseTick(db, new Date());
		return cronResponse("diseases", { ...result }, 0);
	} catch (error) {
		return cronCrash("diseases", error);
	}
};
