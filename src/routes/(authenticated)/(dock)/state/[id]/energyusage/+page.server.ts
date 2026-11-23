// src/routes/(authenticated)/(dock)/state/[id]/energyusage/+page.server.ts
// Why the state's energy books look the way they do: who consumes the power,
// how fuel and upkeep shortfalls bite, and how every state compares.
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { stateEnergyUsageReport } from "#lib/server/services/economy/state-metrics.js";
import { stateSeries } from "#lib/server/services/snapshot-history.js";

export const load: PageServerLoad = async ({ params }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db
		.select({ id: states.id, name: states.name })
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);
	if (!state) error(404, "State not found");

	const [report, history] = await Promise.all([
		stateEnergyUsageReport(db, stateId),
		stateSeries(stateId, 90)
	]);

	return {
		state: { id: state.id, name: state.name },
		usage: report.focus,
		ranking: report.ranking,
		history: history.map((h) => ({ ...h, at: h.at.toISOString() }))
	};
};
