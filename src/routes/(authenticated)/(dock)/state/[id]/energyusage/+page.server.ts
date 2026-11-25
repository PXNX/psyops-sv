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
import { intelViewer, stateIntel, stateIntelMany } from "#lib/server/services/military/state-intel.js";
import { energyUsageView } from "../state-stats";

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
	const [report, history, viewer] = await Promise.all([
		stateEnergyUsageReport(db, stateId),
		stateSeries(stateId, 90),
		intelViewer(db, locals.account?.id)
	]);
	// Every row of the ranking is fogged by what the viewer's state knows of it.
	const intels = await stateIntelMany(
		db,
		viewer.stateId,
		report.ranking.map((r) => r.id),
		now
	);
	const intel = intels.get(stateId) ?? (await stateIntel(db, viewer.stateId, stateId, now));
	const view = energyUsageView(
		intel,
		report.focus,
		report.ranking,
		history.map((h) => ({ at: h.at.toISOString(), power: h.power, usedPower: h.usedPower })),
		(id) => intels.get(id) ?? intel
	);

	return {
		state: { id: state.id, name: state.name },
		...view,
		intel: { exact: intel.exact, level: intel.level.groups.energy }
	};
};
