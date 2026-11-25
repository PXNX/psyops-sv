// src/routes/(authenticated)/(dock)/region/[id]/construction/+page.server.ts
// Building in one region: its levels, what's under construction and, for the
// people allowed to order it, starting new buildings. State leaders pay from
// the treasury and state stockpile; the governor builds the civilian works in
// GOVERNOR_BUILDINGS from the regional budget and regional stockpile
// (?fund=region, the default for a governor without a state office).
import { error, fail, redirect } from "@sveltejs/kit";
import { reconTargetReason, viewerSide } from "#lib/server/services/military/recon.js";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regionBudgets, regions, stateBuildings, stateTreasury } from "#lib/server/schema.js";
import { BUILDING_TEMPLATES, VALID_BUILDING_TYPES, isBuildingType, type BuildingType } from "#lib/config/index.js";
import { formatDateTime } from "#lib/utils/formatting.js";
import {
	ConstructionError,
	checkConstruction,
	completePendingConstructions,
	pendingByType,
	regionLevel,
	startConstruction,
	stateStockpile
} from "#lib/server/services/politics/construction.service.js";
import {
	canOrderConstruction,
	canProposeIn,
	type ConstructionRole
} from "#lib/server/services/politics/construction-access.js";
import { regionStockpile } from "#lib/server/services/politics/regional-stockpile.js";

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const account = locals.account!;
	const regionId = Number(params.id);
	if (!Number.isInteger(regionId)) error(400, "Invalid region");

	await completePendingConstructions(db, { regionId });
	const region = await db.query.regions.findFirst({ where: eq(regions.id, regionId), with: { state: true } });
	if (!region) error(404, "Region not found");

	// Fog of war: an enemy's construction details aren't public. Region page
	// shows what fresh intel saw instead.
	if (region.stateId) {
		const side = await viewerSide(db, account.id);
		if (
			side &&
			!side.stateIds.includes(region.stateId) &&
			!(await reconTargetReason(db, side, { id: region.id, stateId: region.stateId }))
		) {
			redirect(303, `/region/${regionId}`);
		}
	}

	const stateId = region.stateId;
	const noAccess = {
		roles: [] as ConstructionRole[],
		types: [] as BuildingType[],
		stateTypes: [] as BuildingType[],
		regionTypes: [] as BuildingType[]
	};
	const [access, canPropose, treasury, stateStock, regionStock, pending, queue, finished, regionBudget] =
		await Promise.all([
			stateId ? canOrderConstruction(db, account.id, stateId, regionId) : noAccess,
			stateId ? canProposeIn(db, account.id, stateId) : false,
			stateId ? db.query.stateTreasury.findFirst({ where: eq(stateTreasury.stateId, stateId) }) : undefined,
			stateId ? stateStockpile(db, stateId) : ({} as Record<string, number>),
			regionStockpile(db, regionId),
			pendingByType(db, regionId),
			db.query.stateBuildings.findMany({
				where: and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, true)),
				orderBy: asc(stateBuildings.constructionCompletesAt)
			}),
			db.query.stateBuildings.findMany({
				where: and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, false)),
				orderBy: desc(stateBuildings.constructionCompletesAt),
				limit: 10
			}),
			db.query.regionBudgets.findFirst({ where: eq(regionBudgets.regionId, regionId) })
		]);
	const treasuryBalance = treasury?.balance ?? 0;
	const regionBalance = regionBudget?.balance ?? 0;
	const isGovernor = access.roles.includes("governor");
	// Only the governor spends the regional budget; a governor with no state
	// office has nothing else to pay from.
	const fund = url.searchParams.get("fund");
	const payFrom: "treasury" | "region" =
		isGovernor && (fund === "region" || (fund !== "treasury" && access.stateTypes.length === 0))
			? "region"
			: "treasury";
	const balance = payFrom === "region" ? regionBalance : treasuryBalance;
	const stockpile = payFrom === "region" ? regionStock : stateStock;
	const orderable = payFrom === "region" ? access.regionTypes : access.stateTypes;

	return {
		region: { id: region.id, infrastructure: regionLevel(region, "infrastructure") },
		state: region.state ? { id: region.state.id, name: region.state.name } : null,
		roles: access.roles,
		canPropose,
		treasury: treasuryBalance,
		regionBudget: regionBalance,
		isGovernor,
		canPayFromTreasury: access.stateTypes.length > 0,
		payFrom,
		stockpile,
		buildings: VALID_BUILDING_TYPES.map((type) => {
			const template = BUILDING_TEMPLATES[type];
			const check = checkConstruction({
				type,
				quantity: 1,
				region,
				pending: pending[type] ?? 0,
				treasury: balance,
				stockpile,
				fund: payFrom
			});
			return {
				type,
				name: template.name,
				icon: template.icon,
				statLabel: template.statLabel,
				description: template.description,
				benefits: template.benefits,
				days: template.constructionTime,
				infrastructureRequired: template.infrastructureRequired,
				level: check.level,
				pending: check.pending,
				maxLevel: check.maxLevel,
				costs: check.costs,
				problems: check.problems,
				canOrder: orderable.includes(type),
				// Shown to a governor building on the regional budget.
				stateOnly: isGovernor && !access.regionTypes.includes(type),
				// The level going up right now, if any (one at a time).
				underway: (() => {
					const b = queue.find((q) => q.buildingType === type);
					return b ? { startedAt: b.constructionStartedAt, completesAt: b.constructionCompletesAt } : null;
				})()
			};
		}),
		queue: queue.map((b) => ({
			id: b.id,
			name: b.name,
			type: b.buildingType,
			startedAt: b.constructionStartedAt,
			completesAt: b.constructionCompletesAt
		})),
		finished: finished.map((b) => ({ id: b.id, name: b.name, type: b.buildingType, at: b.constructionCompletesAt }))
	};
};

export const actions: Actions = {
	build: async ({ params, locals, request }) => {
		const account = locals.account!;
		const regionId = Number(params.id);
		const form = await request.formData();
		const type = String(form.get("buildingType") ?? "");
		const quantity = Number(form.get("quantity") ?? 1);
		const payFrom = form.get("payFrom") === "region" ? "region" : "treasury";
		if (!isBuildingType(type)) return fail(400, { error: "Unknown building type." });

		const region = await db.query.regions.findFirst({ where: eq(regions.id, regionId) });
		if (!region?.stateId) return fail(400, { error: "Only regions that belong to a state can be built up." });

		const access = await canOrderConstruction(db, account.id, region.stateId, regionId);
		if (payFrom === "region" && !access.regionTypes.includes(type)) {
			return fail(403, {
				error: access.roles.includes("governor")
					? `A ${BUILDING_TEMPLATES[type].name.toLowerCase()} is built by the state, not from the regional budget.`
					: "Only the region's governor can build from the regional budget."
			});
		}
		if (payFrom === "treasury" && !access.stateTypes.includes(type)) {
			return fail(403, { error: "Only the president or the responsible minister can order this from the treasury." });
		}

		try {
			const { completesAt } = await startConstruction(db, {
				stateId: region.stateId,
				regionId,
				type,
				quantity,
				builtBy: account.id,
				payFrom
			});
			const template = BUILDING_TEMPLATES[type];
			return {
				success: true,
				message: `${quantity > 1 ? `${quantity} × ` : ""}${template.name} under construction${payFrom === "region" ? " (paid from the regional budget)" : ""}, done ${formatDateTime(completesAt)}.`
			};
		} catch (err) {
			if (err instanceof ConstructionError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
