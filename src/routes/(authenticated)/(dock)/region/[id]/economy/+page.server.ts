// src/routes/(authenticated)/(dock)/region/[id]/economy/+page.server.ts
// One page for the region's purse and the people who live on it: the budget
// the governor spends, the civilian population trend and local supplies.
import { db } from "#lib/server/db.js";
import { regions } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getRegionName } from "#lib/utils/formatting.js";
import {
	CIVILIAN_NEEDS,
	NEED_META,
	civilianLabour,
	labourShare,
	regionDensity,
	regionPopulation
} from "#lib/config/index.js";
import {
	RegionalBudgetError,
	regionBudgetSummary,
	startProgramme
} from "#lib/server/services/politics/regional-budget.js";
import { regionCivilianNeeds } from "#lib/server/services/civilians/supply.js";
import { regionPopulationReport } from "#lib/server/services/population-report.js";
import { populationHistory } from "#lib/server/services/snapshot-history.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const regionId = parseInt(params.id);
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region) throw error(404, "Region not found");

	const [budget, needs, report, trend] = await Promise.all([
		region.stateId ? regionBudgetSummary(db, regionId, locals.account!.id) : null,
		regionCivilianNeeds(db, regionId),
		regionPopulationReport(db, regionId),
		populationHistory(regionId)
	]);

	return {
		region: {
			id: region.id,
			name: getRegionName(region.id),
			stateId: region.stateId
		},
		budget,
		civilianNeeds: needs
			? {
					hardship: needs.hardship,
					shortages: needs.shortages,
					reasons: needs.reasons,
					supplies: CIVILIAN_NEEDS.map((key) => ({
						key,
						label: NEED_META[key].label,
						icon: NEED_META[key].icon,
						demand: needs[key].demand,
						capacity: needs[key].capacity,
						sufficiency: needs[key].sufficiency
					}))
				}
			: null,
		civilians: {
			population: regionPopulation(region),
			density: Math.round(regionDensity(region)),
			report,
			trend: trend.map((p) => p.value),
			workforce: {
				available: civilianLabour(regionPopulation(region), region.education ?? 0),
				share: labourShare(region.education ?? 0),
				education: region.education ?? 0
			}
		}
	};
};

export const actions: Actions = {
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
