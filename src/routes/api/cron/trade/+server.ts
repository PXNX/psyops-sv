// src/routes/api/cron/trade/+server.ts
// Periodic trade revenue for open air and sea lanes. Blockades and airspace/
// EEZ closures are read at collection time, so shutting a rival's lane has an
// immediate effect on its treasury. Access is checked in hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { collectTradeRevenue } from "#lib/server/services/economy/trade.js";

export const config = {
	maxDuration: 60
};

export const GET: RequestHandler = async () => {
	try {
		const result = await collectTradeRevenue(db, new Date());
		return cronResponse("trade", { ...result }, 0);
	} catch (error) {
		return cronCrash("trade", error);
	}
};
