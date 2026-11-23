// src/routes/(authenticated)/(dock)/state/[id]/power/+page.server.ts
// An explainable power score for this state and a ranking of every state.
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { statePowerReport } from "#lib/server/services/economy/state-metrics.js";

export const load: PageServerLoad = async ({ params }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db
		.select({ id: states.id, name: states.name })
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);
	if (!state) error(404, "State not found");

	const report = await statePowerReport(db, stateId);
	return {
		state: { id: state.id, name: state.name },
		power: report.focus,
		ranking: report.ranking
	};
};
