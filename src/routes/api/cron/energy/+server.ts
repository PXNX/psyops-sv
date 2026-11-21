// src/routes/api/cron/energy/+server.ts
// Daily energy desk: finish plant construction, recompute every grid from
// regional siting/grid/storage, burn fuel, charge upkeep and allocate refined
// fuel between civilians, the military and export. Access is checked in
// hooks.server.ts.
import type { RequestHandler } from "./$types";
import { db } from "#lib/server/db.js";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { dailyEnergyTick } from "#lib/server/services/economy/energy.js";

export const config = {
	maxDuration: 60
};

export const GET: RequestHandler = async () => {
	try {
		const result = await dailyEnergyTick(db, new Date());
		return cronResponse("energy", { ...result }, 0);
	} catch (error) {
		return cronCrash("energy", error);
	}
};
