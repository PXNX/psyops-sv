// src/routes/(authenticated)/(dock)/ops/+page.server.ts
// Covert operations: the planner for a state's leadership (president,
// defence or foreign minister) with odds per target, what is currently
// working on our state and what our operations are doing to others, cyber
// defence, and the ledger. Citizens without office see what their state
// knows. Rules in services/military/covert-ops.ts.
import { fail } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions, stateTreasury, states } from "#lib/server/schema.js";
import { COVERT_OP_KINDS, cyberDefenceUpgradeCost, type CovertOpKind, type DisinfoPosture } from "#lib/config/index.js";
import {
	CovertOpError,
	OPS_ROLE_LABEL,
	canUpgradeDefence,
	cyberDefenceLevel,
	effectsCausedBy,
	knownEffects,
	launchOperation,
	opCooldownEndsAt,
	opsAuthority,
	opsLedger,
	targetsFor,
	upgradeCyberDefence
} from "#lib/server/services/military/covert-ops.js";
import { sideOf, viewerSide } from "#lib/server/services/military/recon.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;
	const now = new Date();
	const [authority, residentSide] = await Promise.all([opsAuthority(db, account.id), viewerSide(db, account.id)]);
	// Leaders plan for the state they serve; everyone else sees their home state.
	const stateId = authority?.stateId ?? residentSide?.stateId ?? null;
	if (!stateId) return { authority: null, state: null, planner: null, effectsOnUs: [], ledger: [], targetId: null };
	const urlTargetId = parseInt(url.searchParams.get("target") ?? "", 10) || null;

	const side = authority ? await sideOf(db, stateId) : residentSide!;
	const [stateRows, [treasury], defenceLevel, effectsOnUs, ledger] = await Promise.all([
		db.select({ id: states.id, name: states.name }).from(states),
		db.select({ balance: stateTreasury.balance }).from(stateTreasury).where(eq(stateTreasury.stateId, stateId)),
		cyberDefenceLevel(db, stateId),
		knownEffects(db, stateId, side.stateIds, now),
		opsLedger(db, stateId)
	]);
	const stateName = new Map(stateRows.map((s) => [s.id, s.name]));
	const nameOf = (id: number | null) => (id ? (stateName.get(id) ?? "Unknown state") : null);

	const planner = authority
		? await (async () => {
				const [targets, ownRegions, cooldowns, running] = await Promise.all([
					targetsFor(db, stateId, now),
					db
						.select({ id: regions.id, stateId: regions.stateId })
						.from(regions)
						.where(inArray(regions.stateId, side.stateIds)),
					Promise.all(
						COVERT_OP_KINDS.map(
							async (k) => [k, (await opCooldownEndsAt(db, stateId, k, now))?.toISOString() ?? null] as const
						)
					),
					effectsCausedBy(db, stateId, now)
				]);
				return {
					targets: await Promise.all(targets.map(async (t) => ({ ...t, logo: await getLogoUrl(t.logo) }))),
					regions: ownRegions.map((r) => ({
						id: r.id,
						name: getRegionName(r.id),
						logo: regionCoatUrl(r.id),
						hint: r.stateId === stateId ? null : nameOf(r.stateId)
					})),
					cooldowns: Object.fromEntries(cooldowns) as Record<CovertOpKind, string | null>,
					running: running.map((e) => ({
						id: e.id,
						kind: e.kind,
						magnitude: e.magnitude,
						expiresAt: e.expiresAt.toISOString(),
						target: nameOf(e.stateId),
						region: e.regionId ? getRegionName(e.regionId) : null
					}))
				};
			})()
		: null;

	const row = (o: (typeof ledger.ours)[number], ours: boolean) => ({
		id: o.id,
		kind: o.kind as CovertOpKind,
		ours,
		// Against us: the culprit is only named if attributed.
		other: ours ? nameOf(o.targetStateId) : o.attributed ? nameOf(o.stateId) : null,
		self: o.stateId === o.targetStateId,
		region: o.targetRegionId ? getRegionName(o.targetRegionId) : null,
		successChance: o.successChance,
		attributionChance: o.attributionChance,
		succeeded: o.succeeded,
		detected: o.detected,
		attributed: o.attributed,
		atWar: o.atWar,
		magnitude: o.magnitude,
		amount: o.amount,
		message: o.message,
		launchedAt: o.launchedAt.toISOString(),
		effectEndsAt: o.effectEndsAt?.toISOString() ?? null
	});

	return {
		targetId: planner?.targets.some((t) => t.id === urlTargetId) ? urlTargetId : null,
		authority: authority ? { role: authority.role, roleLabel: OPS_ROLE_LABEL[authority.role] } : null,
		state: {
			id: stateId,
			name: nameOf(stateId),
			treasury: authority ? (treasury?.balance ?? 0) : null,
			defenceLevel,
			upgradeCost: cyberDefenceUpgradeCost(defenceLevel),
			canUpgrade: !!authority && canUpgradeDefence(authority.role)
		},
		planner,
		effectsOnUs: effectsOnUs.map((e) => ({
			...e,
			source: nameOf(e.sourceStateId),
			region: e.regionId ? getRegionName(e.regionId) : null
		})),
		ledger: [...ledger.ours.map((o) => row(o, true)), ...ledger.against.map((o) => row(o, false))].sort((a, b) =>
			b.launchedAt.localeCompare(a.launchedAt)
		)
	};
};

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export const actions: Actions = {
	launch: async ({ request, locals }) => {
		const form = await request.formData();
		const kind = str(form.get("kind")) as CovertOpKind;
		if (!COVERT_OP_KINDS.includes(kind)) return fail(400, { error: "Choose an operation." });
		const targetStateId = parseInt(str(form.get("targetStateId"))) || undefined;
		const regionId = parseInt(str(form.get("regionId"))) || undefined;
		const posture: DisinfoPosture = str(form.get("posture")) === "conceal" ? "conceal" : "inflate";
		try {
			const r = await launchOperation(db, {
				userId: locals.account!.id,
				kind,
				targetStateId,
				regionId,
				posture,
				message: str(form.get("message"))
			});
			return {
				outcome: {
					id: r.operation.id,
					kind,
					target: r.targetName,
					self: r.operation.stateId === r.operation.targetStateId,
					succeeded: r.operation.succeeded,
					detected: r.operation.detected,
					attributed: r.operation.attributed,
					atWar: r.operation.atWar,
					successChance: r.operation.successChance,
					attributionChance: r.operation.attributionChance,
					magnitude: r.operation.magnitude,
					effectEndsAt: r.operation.effectEndsAt?.toISOString() ?? null,
					stolen: r.stolen
				}
			};
		} catch (err) {
			if (err instanceof CovertOpError) return fail(400, { error: err.message });
			throw err;
		}
	},

	upgradeDefence: async ({ locals }) => {
		try {
			const level = await upgradeCyberDefence(db, locals.account!.id);
			return { defenceLevel: level };
		} catch (err) {
			if (err instanceof CovertOpError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
