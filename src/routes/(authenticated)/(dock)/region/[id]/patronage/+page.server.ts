// src/routes/(authenticated)/(dock)/region/[id]/patronage/+page.server.ts
// Patronage in one region: fund civic buildings here from your own wallet,
// expand them, put your name on them, and see every patron's buildings, the
// region's opinion and what the next building would still be worth.
import { error, fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, residences, states, userWallets } from "#lib/server/schema.js";
import { InsufficientFundsError } from "#lib/server/money.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
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
	type CivicBuildingType
} from "#lib/config/game/civic.config.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { regionsCivilianNeeds } from "#lib/server/services/civilians/supply.js";
import {
	CivicError,
	dedicateCivicProject,
	regionCivicProjects,
	regionOpinionBreakdown,
	startCivicProject,
	upgradeCivicProject
} from "#lib/server/services/politics/civic.service.js";

type HistoryKind = "funded" | "opened" | "expanding" | "expanded" | "dedicated";

/** The region id from the URL, or a 400/404 before anything else runs. */
function regionIdFrom(params: { id: string }) {
	const regionId = Number(params.id);
	if (!Number.isSafeInteger(regionId) || regionId <= 0) error(400, "Invalid region");
	return regionId;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const regionId = regionIdFrom(params);
	const now = new Date();
	const [region] = await db
		.select({ id: regions.id, stateId: regions.stateId, stateName: states.name })
		.from(regions)
		.leftJoin(states, eq(states.id, regions.stateId))
		.where(eq(regions.id, regionId))
		.limit(1);
	if (!region) error(404, "Region not found");

	const [wallet, home, all, needs] = await Promise.all([
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, account.id)).limit(1),
		db.select({ regionId: residences.regionId }).from(residences).where(eq(residences.userId, account.id)).limit(1),
		regionCivicProjects(db, regionId, now),
		regionsCivilianNeeds(db, [regionId], now)
	]);
	const breakdown = await regionOpinionBreakdown(db, regionId, now, needs.get(regionId));
	const regionName = getRegionName(regionId);

	const projects = await Promise.all(
		all.map(async (p) => {
			const known = isCivicBuildingType(p.buildingType);
			const nextTier = p.tier < CIVIC_MAX_TIER ? p.tier + 1 : null;
			return {
				id: p.id,
				mine: p.userId === account.id,
				patron: {
					id: p.userId,
					name: p.patronName,
					logo: p.patronLogo ? await getLogoUrl(p.patronLogo) : null
				},
				buildingType: p.buildingType,
				regionId,
				regionName,
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
		})
	);

	// The region's patronage record, newest first, from the dates on each building.
	const history: { at: Date; kind: HistoryKind; projectId: number; mine: boolean; text: string }[] = [];
	for (const p of projects) {
		const name = isCivicBuildingType(p.buildingType) ? CIVIC_BUILDINGS[p.buildingType].name : p.buildingType;
		const who = p.mine ? "You" : p.patron.name;
		const push = (at: Date | null, kind: HistoryKind, text: string) => {
			if (at) history.push({ at, kind, projectId: p.id, mine: p.mine, text });
		};
		push(p.startedAt, "funded", `${who} funded a ${name.toLowerCase()}`);
		push(p.completedAt, "opened", `${name} opened (${p.mine ? "yours" : p.patron.name})`);
		push(
			p.upgradedAt,
			"expanded",
			`${name} became ${CIVIC_TIERS[p.tier - 1]?.label.toLowerCase() ?? "larger"} (${p.mine ? "yours" : p.patron.name})`
		);
		push(p.upgradeCompletesAt, "expanding", `Expansion of the ${name} due (${p.mine ? "yours" : p.patron.name})`);
		if (p.plaque) push(p.dedicatedAt, "dedicated", `Plaque unveiled on the ${name}: “${p.plaque}”`);
	}
	history.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

	const civic = projects.reduce((s, p) => s + p.goodwill, 0);
	const mine = projects.filter((p) => p.mine).reduce((s, p) => s + p.goodwill, 0);

	return {
		region: {
			id: regionId,
			name: regionName,
			stateId: region.stateId,
			stateName: region.stateName,
			home: home[0]?.regionId === regionId
		},
		walletBalance: Number(wallet[0]?.balance ?? 0),
		opinion: breakdown ?? { score: 50, raw: 50, components: [] },
		// Every civic building here, finished or not, is ahead of a new one in the queue.
		existing: projects.length,
		nextMultiplier: civicSaturation(projects.length),
		civicTotal: Math.round(civic * 10) / 10,
		myGoodwill: Math.round(mine * 10) / 10,
		projects,
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

// The region comes from the URL, never the form; the service checks it exists
// and that expansions and plaques only touch the caller's buildings here.
export const actions: Actions = {
	build: async ({ request, params, locals }) => {
		const regionId = regionIdFrom(params);
		const form = await request.formData();
		const type = String(form.get("type") ?? "");
		return attempt(
			() => startCivicProject(db, { userId: locals.account!.id, regionId, type }),
			() => "Funded. Goodwill arrives when it opens."
		);
	},
	upgrade: async ({ request, params, locals }) => {
		const regionId = regionIdFrom(params);
		const form = await request.formData();
		const projectId = Number(form.get("projectId"));
		return attempt(
			() => upgradeCivicProject(db, { userId: locals.account!.id, projectId, regionId }),
			(r) => `Expansion paid. It becomes ${CIVIC_TIERS[r.toTier - 1]!.label.toLowerCase()} when the work is done.`
		);
	},
	dedicate: async ({ request, params, locals }) => {
		const regionId = regionIdFrom(params);
		const form = await request.formData();
		const projectId = Number(form.get("projectId"));
		return attempt(
			() => dedicateCivicProject(db, { userId: locals.account!.id, projectId, plaque: form.get("plaque"), regionId }),
			(r) => `Plaque unveiled: “${r.plaque}”.`
		);
	}
};
