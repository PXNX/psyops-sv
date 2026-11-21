// src/routes/(authenticated)/(dock)/civic/+page.server.ts
// The patronage desk: fund civic buildings from your own wallet and watch
// civilian opinion move in the regions you care about.
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, residences, userWallets } from "#lib/server/schema.js";
import { CIVIC_BUILDINGS, CIVIC_BUILDING_TYPES } from "#lib/config/game/civic.config.js";
import { getRegionName } from "#lib/utils/formatting.js";
import {
	CivicError,
	patronage,
	regionOpinions,
	startCivicProject
} from "#lib/server/services/politics/civic.service.js";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const [wallet, home, allRegions, patron] = await Promise.all([
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, account.id)).limit(1),
		db.select({ regionId: residences.regionId }).from(residences).where(eq(residences.userId, account.id)).limit(1),
		db.select({ id: regions.id }).from(regions).orderBy(regions.id),
		patronage(db, account.id)
	]);
	const regionIds = [
		...new Set([home[0]?.regionId, ...patron.projects.map((p) => p.regionId)].filter(Boolean))
	] as number[];
	const opinions = await regionOpinions(db, regionIds);
	return {
		walletBalance: Number(wallet[0]?.balance ?? 0),
		homeRegionId: home[0]?.regionId ?? null,
		regions: allRegions.map((r) => ({ id: r.id, name: getRegionName(r.id) })),
		projects: patron.projects,
		goodwill: patron.goodwill,
		opinions: [...opinions.entries()].map(([regionId, score]) => ({
			regionId,
			name: getRegionName(regionId),
			score
		})),
		buildings: CIVIC_BUILDING_TYPES.map((type) => CIVIC_BUILDINGS[type]),
		now: Date.now()
	};
};

export const actions: Actions = {
	build: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await request.formData();
		const regionId = Number(form.get("regionId"));
		const type = String(form.get("type") ?? "");
		if (!Number.isSafeInteger(regionId) || regionId <= 0) return fail(400, { error: "Choose a region." });
		try {
			const project = await startCivicProject(db, { userId: account.id, regionId, type });
			return {
				success: true,
				message: "Civic project funded — goodwill arrives when it opens.",
				projectId: project.id
			};
		} catch (err) {
			if (err instanceof CivicError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
