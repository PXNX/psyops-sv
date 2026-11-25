// src/routes/(authenticated)/(dock)/state/[id]/stability/+page.server.ts
// How a state's regime stability is built from the records other systems write.
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { stateStabilitiesInfo } from "#lib/server/services/stability.js";
import { intelViewer, stateIntel } from "#lib/server/services/military/state-intel.js";

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
	const [info, viewer] = await Promise.all([
		stateStabilitiesInfo(db, [stateId], now),
		intelViewer(db, locals.account?.id)
	]);
	const intel = await stateIntel(db, viewer.stateId, stateId, now);
	const detail = info.get(stateId);
	const exact = intel.exact && !!detail;

	return {
		state: { id: state.id, name: state.name },
		intel: { exact, level: intel.level.groups.population },
		stability: exact ? detail!.stability : null,
		facts: exact
			? {
					atWar: detail!.atWar,
					defending: detail!.defending,
					conscription: detail!.conscription,
					population: detail!.population,
					hardship: detail!.hardship,
					environment: detail!.environment
				}
			: null
	};
};
