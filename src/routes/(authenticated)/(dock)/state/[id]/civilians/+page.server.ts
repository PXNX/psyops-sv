// src/routes/(authenticated)/(dock)/state/[id]/civilians/+page.server.ts
// The state's non-player population, its living conditions, and how its
// civilians feel about this state and the wider world.
import { error } from "@sveltejs/kit";
import { desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, stateBailouts, states } from "#lib/server/schema.js";
import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { civilianLabour, labourShare, regionDensity, regionPopulation } from "#lib/config/index.js";
import { statePopulation } from "#lib/server/services/population.js";
import { statePopulationReport } from "#lib/server/services/population-report.js";
import { statesPressure } from "#lib/server/services/civilians/pressure.js";
import { stateOutbreaks } from "#lib/server/services/civilians/diseases.js";
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

	const [civilians, regionRows, series, stancesAbout, stancesHeld, bailoutRows, report, pressure, outbreaks, stateRows] =
		await Promise.all([
			statePopulation(db, stateId),
			db.select().from(regions).where(eq(regions.stateId, stateId)),
			stateSeries(stateId, 90),
			stancesToward(db, stateId),
			stancesHeldBy(db, stateId),
			db
				.select({
					amount: stateBailouts.amount,
					donorId: stateBailouts.donorStateId,
					from: states.name,
					createdAt: stateBailouts.createdAt
				})
				.from(stateBailouts)
				.innerJoin(states, eq(stateBailouts.donorStateId, states.id))
				.where(eq(stateBailouts.recipientStateId, stateId))
				.orderBy(desc(stateBailouts.createdAt))
				.limit(5),
			statePopulationReport(db, stateId),
			statesPressure(db, [stateId]),
			stateOutbreaks(db, stateId),
			db.select({ id: states.id, logo: states.logo }).from(states)
		]);

	const logoUrls = new Map<number, string | null>();
	for (const row of stateRows) logoUrls.set(row.id, await getLogoUrl(row.logo));

	const byRegion = regionRows
		.map((r) => {
			const population = regionPopulation(r);
			const education = r.education ?? 0;
			return {
				id: r.id,
				name: getRegionName(r.id),
				logo: regionCoatUrl(r.id),
				population,
				density: Math.round(regionDensity(r)),
				workforce: Math.round(civilianLabour(population, education)),
				workforceShare: labourShare(education)
			};
		})
		.sort((a, b) => b.population - a.population);

	const strain = pressure.get(stateId);
	const workforce = byRegion.reduce((sum, r) => sum + r.workforce, 0);

	return {
		state: { id: state.id, name: state.name },
		civilians,
		trend: series.map((p) => p.civilians),
		regions: byRegion,
		demographics: {
			fertility: report.fertility,
			mortality: report.mortality,
			annualRate: report.annualRate,
			netPerYear: report.netPerYear,
			contributions: report.contributions
		},
		manpower: {
			underArms: strain?.soldiers ?? 0,
			perThousand: strain?.pressure ?? 0,
			regime: strain?.band.label ?? "Volunteer army",
			available: Math.max(0, civilians - (strain?.soldiers ?? 0)),
			hospital: strain?.hospital ?? 1
		},
		workforce,
		outbreaks: outbreaks.map((o) => ({
			...o,
			startedAt: o.startedAt.toISOString(),
			updatedAt: o.updatedAt.toISOString()
		})),
		stancesAbout: stancesAbout.map((s) => ({ ...s, logo: logoUrls.get(s.stateId) ?? null })),
		stancesHeld: stancesHeld.map((s) => ({ ...s, logo: logoUrls.get(s.stateId) ?? null })),
		bailoutHistory: bailoutRows.map((b) => ({
			amount: Number(b.amount),
			donorId: b.donorId,
			from: b.from,
			logo: logoUrls.get(b.donorId) ?? null,
			date: b.createdAt.toISOString()
		}))
	};
};
