// src/routes/api/cron/fleet/+server.ts
// Advances everything afloat: movement legs, dock construction/repair queues,
// engagements between hostile fleets, port fuel and minefield expiry.
import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { processFleetTick } from "#lib/server/services/military/fleet.js";

export const GET: RequestHandler = async () => {
	try {
		const summary = await processFleetTick(db, new Date());
		return cronResponse("fleet", { ...summary }, 0);
	} catch (error) {
		return cronCrash("fleet", error);
	}
};
