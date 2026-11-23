// src/routes/api/cron/share-listings/+server.ts
// Hourly: once a filed IPO's 72-hour window elapses, its float goes onto the
// order book at the determined issue price. Access is checked for all
// /api/cron/* routes in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { listPendingShares } from "#lib/server/services/economy/share-listings.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await listPendingShares(db, now);
		return cronResponse("share-listings", { ...result }, 0);
	} catch (error) {
		return cronCrash("share-listings", error);
	}
};
