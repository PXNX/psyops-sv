// src/routes/(authenticated)/(dock)/state/[id]/power/+page.server.ts
// An explainable power score for this state and a ranking of every state.
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { statePowerReport } from "#lib/server/services/economy/state-metrics.js";
import { intelViewer, stateIntel, stateIntelMany } from "#lib/server/services/military/state-intel.js";
import { powerView } from "../state-stats";

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db
		.select({ id: states.id, name: states.name })
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);
	if (!state) error(404, "State not found");

	const now = new Date();
	const [report, viewer] = await Promise.all([statePowerReport(db, stateId), intelViewer(db, locals.account?.id)]);
	// Every row of the ranking is fogged by what the viewer's state knows of it.
	const intels = await stateIntelMany(
		db,
		viewer.stateId,
		report.ranking.map((r) => r.id),
		now
	);
	const intel = intels.get(stateId) ?? (await stateIntel(db, viewer.stateId, stateId, now));
	const view = powerView(intel, report.focus, report.ranking, (id) => intels.get(id) ?? intel);
	return {
		state: { id: state.id, name: state.name },
		...view,
		intel: { exact: intel.exact, level: intel.level.groups.military }
	};
};
