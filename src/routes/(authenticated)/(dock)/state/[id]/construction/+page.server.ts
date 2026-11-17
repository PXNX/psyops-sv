// src/routes/(authenticated)/(dock)/state/[id]/construction/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { eq, and, asc, inArray } from "drizzle-orm";
import { regions, states, stateBuildings, userProfiles } from "#lib/server/schema.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { completePendingConstructions } from "#lib/server/services/politics/construction.service.js";

export const load: PageServerLoad = async ({ params }) => {
	const stateId = parseInt(params.id);

	const state = await db.query.states.findFirst({
		where: eq(states.id, stateId)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Flip anything whose construction time has already elapsed before we
	// read the list below, so it shows up as completed rather than pending.
	await completePendingConstructions(db, { stateId });

	const pending = await db.query.stateBuildings.findMany({
		where: and(eq(stateBuildings.stateId, stateId), eq(stateBuildings.isUnderConstruction, true)),
		orderBy: asc(stateBuildings.constructionCompletesAt)
	});

	const regionRows = await db
		.select({
			id: regions.id,
			infrastructure: regions.infrastructure,
			education: regions.education,
			hospitals: regions.hospitals,
			economy: regions.economy,
			fortifications: regions.fortifications
		})
		.from(regions)
		.where(eq(regions.stateId, stateId))
		.orderBy(asc(regions.id));

	const builderIds = [...new Set(pending.map((b) => b.builtBy))];
	const builders = builderIds.length
		? await db.query.userProfiles.findMany({
				where: inArray(userProfiles.accountId, builderIds)
			})
		: [];
	const builderNameByAccountId = new Map(builders.map((b) => [b.accountId, b.name]));

	const pendingConstructions = pending.map((building) => ({
		id: building.id,
		name: building.name,
		type: building.buildingType,
		regionId: building.regionId,
		regionName: getRegionName(building.regionId),
		builtByName: builderNameByAccountId.get(building.builtBy) ?? "Unknown",
		startedAt: building.constructionStartedAt,
		completesAt: building.constructionCompletesAt
	}));

	return {
		state: { id: state.id, name: state.name },
		pendingConstructions,
		regions: regionRows.map((r) => ({ ...r, name: getRegionName(r.id) }))
	};
};
