// src/routes/(authenticated)/(dock)/state/[id]/construction/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import { states, stateBuildings, userProfiles } from "$lib/server/schema";
import { getRegionName } from "$lib/utils/formatting";
import { completePendingConstructions } from "$lib/server/services/politics/construction.service";

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
	await completePendingConstructions({ stateId });

	const pending = await db.query.stateBuildings.findMany({
		where: and(eq(stateBuildings.stateId, stateId), eq(stateBuildings.isUnderConstruction, true)),
		orderBy: asc(stateBuildings.constructionCompletesAt)
	});

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
		buildingType: building.buildingType,
		regionId: building.regionId,
		regionName: getRegionName(building.regionId),
		builtByName: builderNameByAccountId.get(building.builtBy) ?? "Unknown",
		startedAt: building.constructionStartedAt,
		completesAt: building.constructionCompletesAt
	}));

	return {
		state,
		pendingConstructions
	};
};
