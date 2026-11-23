// src/routes/(authenticated)/(dock)/user/[id]/reputation/+page.server.ts
// Reputation is the civilian opinion of the region a player lives in. Show the
// full arithmetic from regionOpinion plus whatever the player built there.
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { accounts, regions, residences, userProfiles } from "#lib/server/schema.js";
import { regionOpinionBreakdown, patronage } from "#lib/server/services/politics/civic.service.js";
import { CIVIC_BUILDINGS, isCivicBuildingType } from "#lib/config/game/civic.config.js";
import { getRegionName } from "#lib/utils/formatting.js";

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.id;

	const [profile] = await db
		.select({
			id: accounts.id,
			name: userProfiles.name,
			logo: userProfiles.logo,
			regionId: residences.regionId,
			homeRegionId: residences.homeRegionId,
			regionChangedAt: residences.regionChangedAt
		})
		.from(accounts)
		.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
		.leftJoin(residences, eq(residences.userId, accounts.id))
		.where(eq(accounts.id, userId))
		.limit(1);
	if (!profile) error(404, "User not found");

	const [breakdown, patron, regionRows] = await Promise.all([
		profile.regionId != null ? regionOpinionBreakdown(db, profile.regionId) : Promise.resolve(null),
		patronage(db, userId),
		profile.regionId != null
			? db.select({ stateId: regions.stateId }).from(regions).where(eq(regions.id, profile.regionId)).limit(1)
			: Promise.resolve([])
	]);

	const ownProjects = patron.projects.filter(
		(p) => p.regionId === profile.regionId && p.completedAt != null && isCivicBuildingType(p.buildingType)
	);

	return {
		user: {
			id: profile.id,
			name: profile.name,
			logo: await getLogoUrl(profile.logo)
		},
		region:
			profile.regionId != null
				? {
						id: profile.regionId,
						name: getRegionName(profile.regionId),
						stateId: regionRows[0]?.stateId ?? null,
						since: profile.regionChangedAt?.toISOString() ?? null
					}
				: null,
		homeRegionId: profile.homeRegionId,
		reputation: breakdown?.score ?? null,
		components:
			breakdown?.components.map((c) => ({
				key: c.key,
				label: c.label,
				detail: c.detail,
				points: c.points
			})) ?? [],
		ownGoodwill: ownProjects.reduce((sum, p) => sum + CIVIC_BUILDINGS[p.buildingType as keyof typeof CIVIC_BUILDINGS].opinion, 0),
		ownProjects: ownProjects.map((p) => ({
			id: p.id,
			name: CIVIC_BUILDINGS[p.buildingType as keyof typeof CIVIC_BUILDINGS].name,
			icon: CIVIC_BUILDINGS[p.buildingType as keyof typeof CIVIC_BUILDINGS].icon,
			completedAt: p.completedAt!.toISOString(),
			goodwill: CIVIC_BUILDINGS[p.buildingType as keyof typeof CIVIC_BUILDINGS].opinion
		}))
	};
};
