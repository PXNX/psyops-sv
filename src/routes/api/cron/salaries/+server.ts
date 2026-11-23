// src/routes/api/cron/salaries/+server.ts
// Weekly pay for presidents, ministers and parliament members, from each
// state's treasury. The service claims one pay period per state so a repeated
// run cannot pay twice.
import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { payOfficialSalaries } from "#lib/server/services/economy/official-salaries.js";

export const config = { maxDuration: 60 };

export const GET: RequestHandler = async () => {
	try {
		const run = await payOfficialSalaries(db, new Date());
		return cronResponse("salaries", { ...run }, 0);
	} catch (error) {
		return cronCrash("salaries", error);
	}
};
