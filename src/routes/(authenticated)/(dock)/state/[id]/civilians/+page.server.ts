// src/routes/(authenticated)/(dock)/state/[id]/civilians/+page.server.ts
// The state's non-player population, its living conditions, and how its
// civilians feel about this state and the wider world.
import { error } from "@sveltejs/kit";
import { desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, stateBailouts, states } from "#lib/server/schema.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { civilianLabour, labourShare, regionDensity, regionPopulation } from "#lib/config/index.js";
import { statePopulation } from "#lib/server/services/population.js";
import { stancesHeldBy, stancesToward } from "#lib/server/services/politics/civilian-stance.js";
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

	const [civilians, regionRows, series, stancesAbout, stancesHeld, bailoutRows] = await Promise.all([
		statePopulation(db, stateId),
		db.select().from(regions).where(eq(regions.stateId, stateId)),
		stateSeries(stateId, 90),
		stancesToward(db, stateId),
		stancesHeldBy(db, stateId),
		db
			.select({
				amount: stateBailouts.amount,
				from: states.name,
				createdAt: stateBailouts.createdAt
			})
			.from(stateBailouts)
			.innerJoin(states, eq(stateBailouts.donorStateId, states.id))
			.where(eq(stateBailouts.recipientStateId, stateId))
			.orderBy(desc(stateBailouts.createdAt))
			.limit(5)
	]);

	const byRegion = regionRows
		.map((r) => {
			const population = regionPopulation(r);
			const education = r.education ?? 0;
			return {
				id: r.id,
				name: getRegionName(r.id),
				population,
				density: Math.round(regionDensity(r)),
				workforce: Math.round(civilianLabour(population, education)),
				workforceShare: labourShare(education)
			};
		})
		.sort((a, b) => b.population - a.population);

	return {
		state: { id: state.id, name: state.name },
		civilians,
		trend: series.map((p) => p.civilians),
		regions: byRegion,
		stancesAbout,
		stancesHeld,
		bailoutHistory: bailoutRows.map((b) => ({
			amount: Number(b.amount),
			from: b.from,
			date: b.createdAt.toISOString()
		}))
	};
};
