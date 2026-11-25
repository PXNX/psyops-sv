// Weekly movement of idle civilians to regions with better job prospects.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { runMigrationTick } from "#lib/server/services/civilians/migration.js";

export const GET: RequestHandler = async () => {
	try {
		const result = await runMigrationTick(db, new Date());
		return cronResponse("migration", { ...result }, 0);
	} catch (error) {
		return cronCrash("migration", error);
	}
};
