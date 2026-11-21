// src/routes/api/cron/earnings/+server.ts
// Fortnightly money cycle: pay state-bond coupons and publish company earnings
// reports. Vercel calls this weekly; the service guard makes the work land
// every other week (and catches up when a weekly run was missed).
import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { runBondCoupons } from "#lib/server/services/economy/bonds.js";
import { generateEarningsReports, isBiweeklyDue } from "#lib/server/services/economy/earnings.js";

export const config = {
	maxDuration: 60
};

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		if (!isBiweeklyDue(now)) {
			return cronResponse("earnings", { skipped: true, reason: "not a biweekly run" }, 0);
		}
		const bonds = await runBondCoupons(db, now);
		const earnings = await generateEarningsReports(db, now);
		return cronResponse("earnings", { skipped: false, ...bonds, ...earnings }, bonds.skipped);
	} catch (error) {
		return cronCrash("earnings", error);
	}
};
