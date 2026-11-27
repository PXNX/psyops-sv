// src/routes/(authenticated)/(dock)/region/[id]/population/+page.server.ts
import { db } from "#lib/server/db.js";
import { regions, residences, accounts, userProfiles, files } from "#lib/server/schema.js";
import { getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { eq, desc, asc, sql, count } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getRegionName } from "#lib/utils/formatting.js";
import {
	CIVILIAN_NEEDS,
	MIGRATION_CONFIG,
	NEED_META,
	labourShare,
	regionDensity,
	regionPopulation
} from "#lib/config/index.js";
import { regionCivilianNeeds } from "#lib/server/services/civilians/supply.js";
import { regionPopulationReport } from "#lib/server/services/population-report.js";
import { populationHistory } from "#lib/server/services/snapshot-history.js";
import { regionCivilianEmployment } from "#lib/server/services/economy/civilian-work.js";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const account = locals.account!;
	const regionId = parseInt(params.id);
	const sortOrder = (url.searchParams.get("sort") || "desc") as "asc" | "desc";
	const currentPage = parseInt(url.searchParams.get("page") || "1");

	// Validate page number
	if (currentPage < 1) {
		error(400, "Invalid page number");
	}

	// Calculate offset
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Region, resident count and the residents page are independent reads
	const [region, totalCountResult, residentsData] = await Promise.all([
		// Get region; fail fast if it doesn't exist
		db.query.regions
			.findFirst({
				where: eq(regions.id, parseInt(params.id)),
				with: {
					state: true
				}
			})
			.then((region) => region ?? error(404, "Region not found")),
		// Get total count of residents
		db
			.select({ count: count() })
			.from(residences)
			.where(eq(residences.regionId, parseInt(params.id))),
		// Get paginated residents with manual join
		db
			.select({
				userId: residences.userId,
				movedInAt: residences.movedInAt,
				userName: userProfiles.name,
				userLogoKey: files.key
			})
			.from(residences)
			.leftJoin(accounts, eq(residences.userId, accounts.id))
			.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
			.leftJoin(files, eq(userProfiles.logo, files.id))
			.where(eq(residences.regionId, parseInt(params.id)))
			.orderBy(sortOrder === "asc" ? asc(residences.movedInAt) : desc(residences.movedInAt))
			.limit(PAGE_SIZE)
			.offset(offset)
	]);

	const totalResidents = totalCountResult[0]?.count || 0;

	const [civilianNeeds, report, trend, employment] = await Promise.all([
		regionCivilianNeeds(db, regionId),
		regionPopulationReport(db, regionId),
		populationHistory(regionId),
		regionCivilianEmployment(db, regionId)
	]);

	return {
		region: {
			id: region.id,
			name: getRegionName(region.id),
			stateId: region.stateId,
			stateName: region.state?.name
		},
		civilianNeeds: civilianNeeds
			? {
					hardship: civilianNeeds.hardship,
					shortages: civilianNeeds.shortages,
					reasons: civilianNeeds.reasons,
					supplies: CIVILIAN_NEEDS.map((key) => ({
						key,
						label: NEED_META[key].label,
						icon: NEED_META[key].icon,
						demand: civilianNeeds[key].demand,
						capacity: civilianNeeds[key].capacity,
						sufficiency: civilianNeeds[key].sufficiency
					}))
				}
			: null,
		civilians: {
			population: regionPopulation(region),
			density: Math.round(regionDensity(region)),
			report,
			trend: trend.map((p) => p.value),
			workforce: {
				labour: employment.labour,
				employed: employment.employed,
				available: employment.available,
				unemployed: Math.max(0, employment.labour - employment.employed),
				unemploymentShare: employment.labour > 0 ? (employment.labour - employment.employed) / employment.labour : 0,
				moodPenalty:
					employment.labour > 0
						? Math.round(
								Math.min(
									1,
									Math.max(0, employment.labour - employment.employed) /
										employment.labour /
										MIGRATION_CONFIG.FULL_PENALTY_UNEMPLOYMENT
								) * MIGRATION_CONFIG.MAX_UNEMPLOYMENT_OPINION_PENALTY
							)
						: 0,
				share: labourShare(region.education ?? 0),
				education: region.education ?? 0
			}
		},
		residents: await Promise.all(
			residentsData.map(async (r) => ({
				userId: r.userId,
				movedInAt: r.movedInAt.toISOString(),
				user: {
					name: r.userName || null,
					logo: r.userLogoKey ? await getSignedDownloadUrl(r.userLogoKey) : null
				}
			}))
		),
		currentUserId: account.id,
		sortOrder,
		currentPage,
		totalResidents,
		pageSize: PAGE_SIZE
	};
};
