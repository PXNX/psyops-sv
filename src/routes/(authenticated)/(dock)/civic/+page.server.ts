// src/routes/(authenticated)/(dock)/civic/+page.server.ts
// The patronage desk: fund civic buildings from your own wallet, expand them,
// put your name on them and watch civilian opinion move where they stand.
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, residences, states, userWallets } from "#lib/server/schema.js";
import { InsufficientFundsError } from "#lib/server/money.js";
import {
	CIVIC_BUILDINGS,
	CIVIC_BUILDING_TYPES,
	CIVIC_DEDICATION,
	CIVIC_MAX_TIER,
	CIVIC_SATURATION,
	CIVIC_TIERS,
	civicBuildingOpinion,
	civicSaturation,
	civicUpgradeCost,
	civicUpgradeDays,
	isCivicBuildingType,
	patronRank,
	type CivicBuildingType
} from "#lib/config/game/civic.config.js";
import { getRegionName } from "#lib/utils/formatting.js";
import {
	CivicError,
	civicAllocations,
	civicCrowding,
	dedicateCivicProject,
	patronage,
	regionOpinions,
	startCivicProject,
	upgradeCivicProject
} from "#lib/server/services/politics/civic.service.js";

type HistoryKind = "funded" | "opened" | "expanding" | "expanded" | "dedicated";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const now = new Date();
	const [wallet, home, allRegions, patron, crowding] = await Promise.all([
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, account.id)).limit(1),
		db.select({ regionId: residences.regionId }).from(residences).where(eq(residences.userId, account.id)).limit(1),
		db
			.select({ id: regions.id, stateId: regions.stateId, stateName: states.name })
			.from(regions)
			.leftJoin(states, eq(states.id, regions.stateId))
			.orderBy(regions.id),
		patronage(db, account.id, now),
		civicCrowding(db)
	]);
	const homeRegionId = home[0]?.regionId ?? null;
	const regionInfo = new Map(
		allRegions.map((r) => [r.id, { name: getRegionName(r.id), stateId: r.stateId, stateName: r.stateName }])
	);

	// Regions the patron cares about: home, and wherever they have built.
	const watched = [...new Set([homeRegionId, ...patron.projects.map((p) => p.regionId)])].filter(
		(id): id is number => id != null
	);
	const [opinions, allocations] = await Promise.all([regionOpinions(db, watched, now), civicAllocations(db, watched)]);

	const projects = patron.projects.map((p) => {
		const known = isCivicBuildingType(p.buildingType);
		const nextTier = p.tier < CIVIC_MAX_TIER ? p.tier + 1 : null;
		return {
			id: p.id,
			buildingType: p.buildingType,
			regionId: p.regionId,
			regionName: regionInfo.get(p.regionId)?.name ?? getRegionName(p.regionId),
			startedAt: p.startedAt,
			completesAt: p.completesAt,
			completedAt: p.completedAt,
			tier: p.tier,
			upgradeCompletesAt: p.upgradeCompletesAt,
			upgradedAt: p.upgradedAt,
			plaque: p.plaque,
			dedicatedAt: p.dedicatedAt,
			value: p.value,
			goodwill: p.goodwill,
			multiplier: p.multiplier,
			invested: p.invested,
			upgrade:
				known && nextTier
					? {
							tier: nextTier,
							cost: civicUpgradeCost(p.buildingType as CivicBuildingType, nextTier),
							days: civicUpgradeDays(p.buildingType as CivicBuildingType, nextTier),
							value: civicBuildingOpinion(p.buildingType as CivicBuildingType, nextTier, !!p.plaque)
						}
					: null
		};
	});

	const goodwillView = watched
		.map((regionId) => {
			const list = allocations.get(regionId) ?? [];
			const mine = list.filter((a) => a.userId === account.id);
			const civicTotal = list.reduce((s, a) => s + a.effective, 0);
			const myTotal = mine.reduce((s, a) => s + a.effective, 0);
			const info = regionInfo.get(regionId);
			return {
				regionId,
				name: info?.name ?? getRegionName(regionId),
				stateId: info?.stateId ?? null,
				stateName: info?.stateName ?? null,
				home: regionId === homeRegionId,
				opinion: opinions.get(regionId) ?? 50,
				mine: Math.round(myTotal * 10) / 10,
				civic: Math.round(civicTotal * 10) / 10,
				buildings: crowding.get(regionId) ?? 0,
				myBuildings: patron.projects.filter((p) => p.regionId === regionId).length,
				nextMultiplier: civicSaturation(crowding.get(regionId) ?? 0)
			};
		})
		.sort((a, b) => Number(b.home) - Number(a.home) || b.mine - a.mine || a.name.localeCompare(b.name));

	// The patron's history, newest first, from the dates on each building.
	const history: { at: Date; kind: HistoryKind; projectId: number; text: string }[] = [];
	for (const p of projects) {
		const name = isCivicBuildingType(p.buildingType) ? CIVIC_BUILDINGS[p.buildingType].name : p.buildingType;
		history.push({
			at: p.startedAt,
			kind: "funded",
			projectId: p.id,
			text: `Funded a ${name.toLowerCase()} in ${p.regionName}`
		});
		if (p.completedAt)
			history.push({ at: p.completedAt, kind: "opened", projectId: p.id, text: `${name} opened in ${p.regionName}` });
		if (p.upgradedAt)
			history.push({
				at: p.upgradedAt,
				kind: "expanded",
				projectId: p.id,
				text: `${name} in ${p.regionName} became ${CIVIC_TIERS[p.tier - 1]?.label.toLowerCase() ?? "larger"}`
			});
		if (p.upgradeCompletesAt)
			history.push({
				at: p.upgradeCompletesAt,
				kind: "expanding",
				projectId: p.id,
				text: `Expansion of the ${name} in ${p.regionName} due`
			});
		if (p.dedicatedAt && p.plaque)
			history.push({
				at: p.dedicatedAt,
				kind: "dedicated",
				projectId: p.id,
				text: `Plaque unveiled in ${p.regionName}: “${p.plaque}”`
			});
	}
	history.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

	return {
		walletBalance: Number(wallet[0]?.balance ?? 0),
		homeRegionId,
		regions: allRegions.map((r) => ({
			id: r.id,
			name: getRegionName(r.id),
			hint: r.stateName ?? "unclaimed"
		})),
		crowding: Object.fromEntries(crowding),
		projects,
		goodwill: patron.goodwill,
		invested: patron.invested,
		completed: patron.completed,
		rank: patronRank(patron.goodwill),
		goodwillView,
		history: history.slice(0, 30),
		buildings: CIVIC_BUILDING_TYPES.map((type) => CIVIC_BUILDINGS[type]),
		tiers: CIVIC_TIERS,
		dedication: CIVIC_DEDICATION,
		saturation: CIVIC_SATURATION,
		now: now.getTime()
	};
};

/** Run a civic action, turning rule and money errors into form errors. */
async function attempt<T>(run: () => Promise<T>, message: (r: T) => string) {
	try {
		const result = await run();
		return { success: true, message: message(result) };
	} catch (err) {
		if (err instanceof CivicError) return fail(400, { error: err.message });
		if (err instanceof InsufficientFundsError) return fail(400, { error: "Your wallet can't cover that." });
		throw err;
	}
}

export const actions: Actions = {
	build: async ({ request, locals }) => {
		const form = await request.formData();
		const regionId = Number(form.get("regionId"));
		const type = String(form.get("type") ?? "");
		if (!Number.isSafeInteger(regionId) || regionId <= 0) return fail(400, { error: "Choose a region." });
		return attempt(
			() => startCivicProject(db, { userId: locals.account!.id, regionId, type }),
			() => "Funded. Goodwill arrives when it opens."
		);
	},
	upgrade: async ({ request, locals }) => {
		const form = await request.formData();
		const projectId = Number(form.get("projectId"));
		return attempt(
			() => upgradeCivicProject(db, { userId: locals.account!.id, projectId }),
			(r) => `Expansion paid. It becomes ${CIVIC_TIERS[r.toTier - 1]!.label.toLowerCase()} when the work is done.`
		);
	},
	dedicate: async ({ request, locals }) => {
		const form = await request.formData();
		const projectId = Number(form.get("projectId"));
		return attempt(
			() => dedicateCivicProject(db, { userId: locals.account!.id, projectId, plaque: form.get("plaque") }),
			(r) => `Plaque unveiled: “${r.plaque}”.`
		);
	}
};
