import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { captureWorldSnapshot } from "#lib/server/services/world-snapshots.js";

export const GET: RequestHandler = async () => {
	try {
		const saved = await captureWorldSnapshot(db, new Date());
		return cronResponse("world-snapshot", { captured: saved ? 1 : 0 }, 0);
	} catch (error) {
		return cronCrash("world-snapshot", error);
	}
};
