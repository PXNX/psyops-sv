// src/routes/(authenticated)/api/cron/premium/+server.ts
// Triggered by an external scheduler (cron-jobs.org). Runs production, military
// training and factory-work automation for all active premium members.
import { json, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import { runPremiumAutomation } from "$lib/server/service/premium";

function isValidCronRequest(request: Request): boolean {
	const authHeader = request.headers.get("authorization");
	const cronSecret = env.CRON_SECRET;
	if (!cronSecret) {
		return env.NODE_ENV === "development";
	}
	return authHeader === `Bearer ${cronSecret}`;
}

export const GET: RequestHandler = async ({ request }) => {
	if (!isValidCronRequest(request)) {
		throw error(403, "Invalid request");
	}

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
				return acc;
			},
			{
				wagesCollected: 0,
				shiftsStarted: 0,
				productionCollected: 0,
				productionStarted: 0,
				trainingsCompleted: 0,
				unitsTrained: 0
			}
		);

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			membersProcessed: summaries.length,
			...stats
		});
	} catch (err) {
		console.error("Premium automation cron error:", err);
		return json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
	}
};
