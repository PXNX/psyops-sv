// src/routes/(authenticated)/(dock)/domains/+page.server.ts
// One command page for the support domains: sea power, space, AI and the
// shadow economy. Leaders plan operations; citizens run smuggling cargo.
// The rules and the service calls live outside SvelteKit (see the config and
// services imports below), so this file is only permission checks and forms.
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import {
	productInventory,
	resourceInventory,
	states,
	userWallets
} from "#lib/server/schema.js";
import {
	NAVAL_OPS,
	NAVAL_OP_KINDS,
	SATELLITE_KINDS,
	SATELLITE_KIND_IDS,
	SMUGGLING_GOOD_IDS,
	SPACE_OPS,
	SPACE_OP_KINDS,
	aiUpgradeCost,
	spaceDefenceUpgradeCost,
	type NavalOpKind,
	type SatelliteKind,
	type SmugglingGood,
	type SpaceOpKind
} from "#lib/config/index.js";
import {
	NavalOpError,
	navalAuthority,
	navalFleet,
	navalLedger,
	seaControlOf,
	blockadesOn,
	launchNavalOperation
} from "#lib/server/services/military/naval.js";
import {
	SpaceError,
	launchSatellite,
	launchSpaceOperation,
	satelliteFleet,
	spaceAuthority,
	spaceBonuses,
	spaceDefenceLevel,
	spaceLedger,
	upgradeSpaceDefence
} from "#lib/server/services/military/space.js";
import { AiError, aiAuthority, aiBonuses, upgradeAi } from "#lib/server/services/military/ai.js";
import {
	SmugglingError,
	openSmugglingRoute,
	routesForState,
	runSmuggling,
	runsByUser,
	smugglingAuthority
} from "#lib/server/services/economy/smuggling.js";
import { viewerSide } from "#lib/server/services/military/recon.js";

const nameOfState = (rows: { id: number; name: string }[], id: number | null | undefined) =>
	id ? (rows.find((s) => s.id === id)?.name ?? `State ${id}`) : null;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const [naval, space, ai, smuggler, side] = await Promise.all([
		navalAuthority(db, account.id),
		spaceAuthority(db, account.id),
		aiAuthority(db, account.id),
		smugglingAuthority(db, account.id),
		viewerSide(db, account.id)
	]);
	const stateId = naval?.stateId ?? space?.stateId ?? ai?.stateId ?? smuggler?.stateId ?? side?.stateId ?? null;
	if (!stateId) return { state: null, planner: null, civilian: null };

	const stateRows = await db.select({ id: states.id, name: states.name }).from(states);
	const state = stateRows.find((s) => s.id === stateId) ?? null;
	const [fleet, seaControl, blockades, navalOps, sats, bonuses, defence, spaceOps, aiInfo, routes, runs, wallet, resources, products] =
		await Promise.all([
			navalFleet(db, stateId),
			seaControlOf(db, stateId),
			blockadesOn(db, stateId),
			navalLedger(db, stateId),
			satelliteFleet(db, stateId),
			spaceBonuses(db, stateId),
			spaceDefenceLevel(db, stateId),
			spaceLedger(db, stateId),
			aiBonuses(db, stateId),
			routesForState(db, stateId),
			runsByUser(db, account.id),
			db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, account.id)),
			db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id)),
			db.select().from(productInventory).where(eq(productInventory.userId, account.id))
		]);

	return {
		state: { id: stateId, name: state?.name ?? "Unknown state" },
		planner: naval || space || ai || smuggler
			? {
					roles: { naval, space, ai, smuggler },
					fleet,
					seaControl,
					blockades: blockades.map((b) => ({
						...b,
						blockader: nameOfState(stateRows, b.blockaderStateId)
					})),
					navalOps: navalOps.map((o) => ({ ...o, target: nameOfState(stateRows, o.targetStateId) })),
					satellites: sats,
					space: bonuses,
					spaceDefence: defence,
					spaceOps: spaceOps.map((o) => ({ ...o, target: nameOfState(stateRows, o.targetStateId) })),
					ai: aiInfo,
					aiNextCost: aiUpgradeCost(aiInfo.level),
					spaceNextCost: spaceDefenceUpgradeCost(defence),
					routes: routes.map((r) => ({
						...r,
						origin: nameOfState(stateRows, r.originStateId),
						target: nameOfState(stateRows, r.targetStateId)
					})),
					targets: stateRows.filter((s) => s.id !== stateId)
				}
			: null,
		civilian: {
			wallet: Number(wallet[0]?.balance ?? 0),
			resources: Object.fromEntries(resources.map((r) => [r.resourceType, r.quantity])),
			products: Object.fromEntries(products.map((p) => [p.productType, p.quantity])),
			runs
		}
	};
};

const form = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const int = (fd: FormData, key: string) => Number.parseInt(form(fd, key), 10);

export const actions: Actions = {
	naval: async ({ request, locals }) => {
		const authority = await navalAuthority(db, locals.account!.id);
		if (!authority) return fail(403, { error: "Only the president or defence minister can order naval operations." });
		const fd = await request.formData();
		const kind = form(fd, "kind") as NavalOpKind;
		if (!NAVAL_OP_KINDS.includes(kind)) return fail(400, { error: "Unknown naval operation." });
		try {
			const result = await launchNavalOperation(db, {
				stateId: authority.stateId,
				orderedBy: locals.account!.id,
				kind,
				targetStateId: int(fd, "targetStateId") || null,
				regionId: int(fd, "regionId") || null
			});
			return { success: true, message: result.message, cost: NAVAL_OPS[kind].cost };
		} catch (e) {
			return fail(400, { error: e instanceof NavalOpError ? e.message : "The operation could not be launched." });
		}
	},
	launchSatellite: async ({ request, locals }) => {
		const authority = await spaceAuthority(db, locals.account!.id);
		if (!authority) return fail(403, { error: "Only the president or defence minister can run the space programme." });
		const fd = await request.formData();
		const kind = form(fd, "kind") as SatelliteKind;
		if (!SATELLITE_KIND_IDS.includes(kind)) return fail(400, { error: "Unknown satellite type." });
		try {
			const result = await launchSatellite(db, {
				stateId: authority.stateId,
				launchedBy: locals.account!.id,
				kind,
				name: form(fd, "name")
			});
			return { success: true, message: `${form(fd, "name")} launched; operational with ${SATELLITE_KINDS[kind].launchHours} h.`, cost: result.cost };
		} catch (e) {
			return fail(400, { error: e instanceof SpaceError ? e.message : "The launch failed." });
		}
	},
	spaceOp: async ({ request, locals }) => {
		const authority = await spaceAuthority(db, locals.account!.id);
		if (!authority) return fail(403, { error: "Only the president or defence minister can order space operations." });
		const fd = await request.formData();
		const kind = form(fd, "kind") as SpaceOpKind;
		if (!SPACE_OP_KINDS.includes(kind)) return fail(400, { error: "Unknown space operation." });
		try {
			const result = await launchSpaceOperation(db, {
				stateId: authority.stateId,
				orderedBy: locals.account!.id,
				kind,
				targetStateId: int(fd, "targetStateId"),
				satelliteId: int(fd, "satelliteId") || null
			});
			return { success: true, message: result.message, cost: SPACE_OPS[kind].cost };
		} catch (e) {
			return fail(400, { error: e instanceof SpaceError ? e.message : "The operation failed." });
		}
	},
	upgradeSpaceDefence: async ({ locals }) => {
		try {
			const level = await upgradeSpaceDefence(db, locals.account!.id);
			return { success: true, message: `Space defence raised to level ${level}.` };
		} catch (e) {
			return fail(400, { error: e instanceof SpaceError ? e.message : "The upgrade failed." });
		}
	},
	upgradeAi: async ({ locals }) => {
		try {
			const result = await upgradeAi(db, locals.account!.id);
			return { success: true, message: `AI programme raised to level ${result.level}: ${result.label}.` };
		} catch (e) {
			return fail(400, { error: e instanceof AiError ? e.message : "The upgrade failed." });
		}
	},
	openRoute: async ({ request, locals }) => {
		const authority = await smugglingAuthority(db, locals.account!.id);
		if (!authority) return fail(403, { error: "Only the president or foreign minister can open a route." });
		const fd = await request.formData();
		const good = form(fd, "good") as SmugglingGood;
		if (!SMUGGLING_GOOD_IDS.includes(good)) return fail(400, { error: "Unknown cargo." });
		try {
			const result = await openSmugglingRoute(db, {
				stateId: authority.stateId,
				openedBy: locals.account!.id,
				targetStateId: int(fd, "targetStateId"),
				good
			});
			return { success: true, message: `Route opened: ${result.risk}% interception risk.`, cost: 25_000 };
		} catch (e) {
			return fail(400, { error: e instanceof SmugglingError ? e.message : "The route could not be opened." });
		}
	},
	runRoute: async ({ request, locals }) => {
		const fd = await request.formData();
		try {
			const result = await runSmuggling(db, {
				userId: locals.account!.id,
				routeId: int(fd, "routeId"),
				quantity: int(fd, "quantity")
			});
			return { success: true, message: result.message };
		} catch (e) {
			return fail(400, { error: e instanceof SmugglingError ? e.message : "The run failed." });
		}
	}
};
