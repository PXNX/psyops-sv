// src/routes/(authenticated)/(dock)/region/[id]/budget/+page.server.ts
// The region's purse and everything currently being built with it.
import { db } from "#lib/server/db.js";
import { regions, stateBuildings } from "#lib/server/schema.js";
import { and, asc, eq } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getRegionName } from "#lib/utils/formatting.js";
import { BUILDING_TEMPLATES } from "#lib/config/index.js";
import { canOrderConstruction } from "#lib/server/services/politics/construction-access.js";
import { actions as constructionActions } from "../construction/+page.server.js";
import {
	RegionalBudgetError,
	regionBudgetSummary,
	startProgramme
} from "#lib/server/services/politics/regional-budget.js";
import { completePendingConstructions } from "#lib/server/services/politics/construction.service.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const regionId = parseInt(params.id);
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region) throw error(404, "Region not found");

	// Settle anything whose completion date has passed before showing the queue.
	await completePendingConstructions(db, { regionId });
	const [budget, queue] = await Promise.all([
		region.stateId ? regionBudgetSummary(db, regionId, locals.account!.id) : null,
		db.query.stateBuildings.findMany({
			where: and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, true)),
			orderBy: asc(stateBuildings.constructionCompletesAt)
		})
	]);
	const access = region.stateId ? await canOrderConstruction(db, locals.account!.id, region.stateId, regionId) : null;
	const canPayFromRegion = !!access?.roles.includes("governor");
	const payFrom: "region" | "treasury" = canPayFromRegion && access!.stateTypes.length === 0 ? "region" : "treasury";
	const buildOptions = (payFrom === "region" ? access!.regionTypes : access!.stateTypes).map((type) => {
		const template = BUILDING_TEMPLATES[type];
		return {
			type,
			label: `${template.icon} ${template.name}`,
			days: template.constructionTime,
			currency: template.costs.currency
		};
	});

	return {
		region: { id: region.id, name: getRegionName(region.id), stateId: region.stateId },
		budget,
		payFrom,
		canPayFromRegion,
		buildOptions,
		queue: queue.map((b) => ({
			id: b.id,
			name: b.name || b.buildingType,
			type: b.buildingType,
			startedAt: b.constructionStartedAt,
			completesAt: b.constructionCompletesAt
		}))
	};
};

export const actions: Actions = {
	// Ordering works from here uses exactly the same rules as the construction page.
	build: constructionActions.build,
	startProgramme: async ({ request, params, locals }) => {
		const form = await request.formData();
		try {
			const { endsAt } = await startProgramme(db, {
				regionId: parseInt(params.id),
				userId: locals.account!.id,
				kind: String(form.get("kind") ?? "")
			});
			return { success: true, message: `Programme running until ${endsAt.toLocaleDateString("en-GB")}.` };
		} catch (err) {
			if (err instanceof RegionalBudgetError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
