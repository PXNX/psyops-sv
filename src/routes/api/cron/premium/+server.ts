// src/routes/api/cron/premium/+server.ts
// Triggered by Vercel Schedules (see the "premium" entry in vercel.json). Runs
// production, military training and factory-work automation for all active
// premium members.
import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { runPremiumAutomation } from "#lib/server/service/premium.js";

// Access is checked for all /api/cron/* routes in hooks.server.ts.
export const GET: RequestHandler = async () => {
	try {
		const summaries = await runPremiumAutomation();

		const stats = summaries.reduce(
			(acc, s) => {
				if (s.wageCollected) acc.wagesCollected++;
				if (s.shiftStarted) acc.shiftsStarted++;
				if (s.productionCollected) acc.productionCollected++;
				if (s.productionStarted) acc.productionStarted++;
				acc.trainingsCompleted += s.trainingCompleted;
				if (s.unitTrained) acc.unitsTrained++;
				acc.errors += s.errors;
				return acc;
			},
			{
				wagesCollected: 0,
				shiftsStarted: 0,
				productionCollected: 0,
				productionStarted: 0,
				trainingsCompleted: 0,
				unitsTrained: 0,
				errors: 0
			}
		);

		const { errors, ...counts } = stats;
		return cronResponse("premium", { membersProcessed: summaries.length, ...counts }, errors);
	} catch (err) {
		return cronCrash("premium", err);
	}
};
