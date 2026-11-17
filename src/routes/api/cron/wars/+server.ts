// src/routes/api/cron/wars/+server.ts

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { resolveWars } from "#lib/server/services/military/war-resolution.service.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await resolveWars(now);

		return cronResponse("wars", { ...result }, result.failed);
	} catch (error) {
		return cronCrash("wars", error);
	}
};
