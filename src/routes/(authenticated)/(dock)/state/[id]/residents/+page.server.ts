// src/routes/(authenticated)/(dock)/state/[id]/residents/+page.server.ts
// Who lives in this state, where, and how the number has changed.
import { error } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, residences, states } from "#lib/server/schema.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { residentHistory } from "#lib/server/services/snapshot-history.js";

export const load: PageServerLoad = async ({ params }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db
		.select({ id: states.id, name: states.name })
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);
	if (!state) error(404, "State not found");

	const [regionRows, history] = await Promise.all([
		db
			.select({
				id: regions.id,
				population: sql<number>`count(${residences.id})::int`
			})
			.from(regions)
			.leftJoin(residences, eq(residences.regionId, regions.id))
			.where(eq(regions.stateId, stateId))
			.groupBy(regions.id),
		residentHistory(stateId, 90)
	]);

	const residentRegions = regionRows
		.map((r) => ({ id: r.id, name: getRegionName(r.id), population: Number(r.population ?? 0) }))
		.sort((a, b) => b.population - a.population);

	return {
		state: { id: state.id, name: state.name },
		regions: residentRegions,
		total: residentRegions.reduce((sum, r) => sum + r.population, 0),
		history: history.map((p) => p.value)
	};
};
