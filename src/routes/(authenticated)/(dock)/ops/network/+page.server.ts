// src/routes/(authenticated)/(dock)/ops/network/+page.server.ts
// The network console: build assets inside a target, probe its sites, tap its
// cameras, copy its sensitive files and cover tracks. Rules and persistence
// live in services/military/infiltration.ts.

import { fail } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { intrusionSessions, states } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { COVERT_OPS, INTRUSION, isExploitTier, payloadBonus, readDeep, type CovertOpKind } from "#lib/config/index.js";
import {
	CovertOpError,
	OPS_ROLE_LABEL,
	launchOperation,
	opsAuthority
} from "#lib/server/services/military/covert-ops.js";
import { viewerSide } from "#lib/server/services/military/recon.js";
import {
	DEEP_MOVES,
	InfiltrationError,
	actionsFor,
	assetsFor,
	browseSystem,
	enemyAssetsIn,
	exfilRecord,
	flipAsset,
	filesFor,
	grepSystem,
	isPivoted,
	lastPlantedAt,
	networkTargets,
	plantAsset,
	readSystemRecord,
	runAction,
	runDeepMove,
	runIntrusion,
	sessionFor,
	sitesFor,
	type DeepMove,
	type IntrusionStep
} from "#lib/server/services/military/infiltration.js";
import {
	ASSET_KINDS,
	INFILTRATION,
	plantReadyAt,
	INFILTRATION_ACTION_KINDS,
	SPY_TRAITS,
	type AssetKind,
	type SpyTraitId,
	type InfiltrationActionKind
} from "#lib/config/index.js";

const empty = {
	state: null,
	authority: null,
	targets: [] as { id: number; name: string; logo: string | null }[],
	selectedTargetId: null as number | null,
	assets: [] as Awaited<ReturnType<typeof assetsFor>>,
	enemyAssets: [] as Awaited<ReturnType<typeof enemyAssetsIn>>,
	sites: [] as Awaited<ReturnType<typeof sitesFor>>,
	files: [] as Awaited<ReturnType<typeof filesFor>>,
	actions: [] as Awaited<ReturnType<typeof actionsFor>>,
	sessions: [] as Awaited<ReturnType<typeof loadSessions>>,
	treasury: null as number | null
};

function loadSessions(stateId: number, targetStateId: number) {
	return db.query.intrusionSessions.findMany({
		where: and(eq(intrusionSessions.stateId, stateId), eq(intrusionSessions.targetStateId, targetStateId)),
		orderBy: (s, { desc }) => [desc(s.updatedAt)]
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;
	const now = new Date();
	const [authority, side] = await Promise.all([opsAuthority(db, account.id), viewerSide(db, account.id)]);
	const stateId = authority?.stateId ?? side?.stateId ?? null;
	if (!stateId) return { ...empty, targets: [] };

	const targets = authority ? await networkTargets(db, stateId) : [];
	const requested = url.searchParams.get("target");
	const selectedTargetId = targets.find((t) => String(t.id) === requested)?.id ?? targets[0]?.id ?? null;

	const [treasury, targetNames, assets, sites, files, actions, sessions, enemyAssets, lastPlant] = await Promise.all([
		db.query.stateTreasury.findFirst({ where: (t, { eq }) => eq(t.stateId, stateId) }),
		Promise.all(targets.map(async (t) => ({ ...t, logo: await getLogoUrl(t.logo) }))),
		selectedTargetId ? assetsFor(db, stateId, selectedTargetId, now) : Promise.resolve([]),
		selectedTargetId ? sitesFor(db, stateId, selectedTargetId, now, getRegionName) : Promise.resolve([]),
		selectedTargetId ? filesFor(db, stateId, selectedTargetId) : Promise.resolve([]),
		selectedTargetId ? actionsFor(db, stateId, selectedTargetId) : Promise.resolve([]),
		selectedTargetId ? loadSessions(stateId, selectedTargetId) : Promise.resolve([]),
		enemyAssetsIn(db, stateId, now),
		selectedTargetId ? lastPlantedAt(db, stateId, selectedTargetId) : Promise.resolve(null)
	]);
	const readyAt = plantReadyAt(lastPlant);
	const [state] = await db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, stateId));

	return {
		state: state ?? { id: stateId, name: "Your state" },
		authority: authority ? { role: authority.role, roleLabel: OPS_ROLE_LABEL[authority.role] } : null,
		targets: targetNames,
		selectedTargetId,
		assets,
		enemyAssets,
		sites,
		files,
		actions,
		sessions,
		treasury: authority ? (treasury?.balance ?? 0) : null,
		maxAssets: INFILTRATION.MAX_ASSETS_PER_TARGET,
		/** Set while recruiting in the selected target is on cooldown. */
		plantReadyAt: readyAt && readyAt > now ? readyAt.toISOString() : null
	};
};

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const int = (v: FormDataEntryValue | null) => parseInt(str(v), 10) || 0;

export const actions: Actions = {
	plant: async ({ request, locals }) => {
		const form = await request.formData();
		const kind = str(form.get("kind")) as AssetKind;
		if (!ASSET_KINDS.includes(kind)) return fail(400, { error: "Choose an asset type." });
		try {
			const result = await plantAsset(db, locals.account!.id, {
				targetStateId: int(form.get("targetStateId")),
				kind
			});
			const rare = result.traitIds.map((id) => SPY_TRAITS[id as SpyTraitId]).find((t) => t?.rare);
			const message = rare
				? `${result.name} (“${result.codename}”) recruited — a rare find: ${rare.label}.`
				: `${result.name} (“${result.codename}”) recruited.`;
			return { planted: result, message };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	flip: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await flipAsset(db, locals.account!.id, { assetId: int(form.get("assetId")) });
			return { flipped: result, message: result.detail };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	act: async ({ request, locals }) => {
		const form = await request.formData();
		const action = str(form.get("action")) as InfiltrationActionKind;
		if (!INFILTRATION_ACTION_KINDS.includes(action)) return fail(400, { error: "Unknown action." });
		try {
			const result = await runAction(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				action
			});
			return { outcome: result };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	intrude: async ({ request, locals }) => {
		const form = await request.formData();
		const step = str(form.get("step")) as IntrusionStep;
		if (!["scan", "access", "escalate", "pivot", "reset"].includes(step)) {
			return fail(400, { error: "Unknown intrusion step." });
		}
		const tier = str(form.get("tier"));
		if (tier && !isExploitTier(tier)) return fail(400, { error: "Pick quiet, standard or loud." });
		const port = str(form.get("port"));
		try {
			const result = await runIntrusion(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				step,
				vector: str(form.get("vector")) || undefined,
				port: port ? int(port) : undefined,
				tier: tier && isExploitTier(tier) ? tier : undefined
			});
			return { intrusion: result, assetId: int(form.get("assetId")), siteId: str(form.get("siteId")) };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	payload: async ({ request, locals }) => {
		const form = await request.formData();
		const kind = str(form.get("kind")) as CovertOpKind;
		if (!COVERT_OPS[kind] || COVERT_OPS[kind].domain !== "cyber") {
			return fail(400, { error: "Choose a cyber payload." });
		}
		const assetId = int(form.get("assetId"));
		const siteId = str(form.get("siteId"));
		const targetStateId = int(form.get("targetStateId"));
		try {
			if (!(await isPivoted(db, assetId, siteId))) {
				throw new InfiltrationError("The operator must pivot into the site before deploying a payload.");
			}
			const session = await sessionFor(db, assetId, siteId);
			const result = await launchOperation(db, {
				userId: locals.account!.id,
				kind,
				targetStateId,
				extraFootholds: INTRUSION.PAYLOAD_FOOTHOLDS + payloadBonus(readDeep(session?.deep)),
				notify: false
			});
			return {
				payload: {
					kind,
					target: result.targetName,
					succeeded: result.operation.succeeded,
					detected: result.operation.detected,
					attributed: result.operation.attributed,
					successChance: result.operation.successChance,
					attributionChance: result.operation.attributionChance,
					stolen: result.stolen
				}
			};
		} catch (err) {
			if (err instanceof InfiltrationError || err instanceof CovertOpError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}
	},

	deep: async ({ request, locals }) => {
		const form = await request.formData();
		const move = str(form.get("move")) as DeepMove;
		if (!DEEP_MOVES.includes(move)) return fail(400, { error: "Unknown move." });
		try {
			const result = await runDeepMove(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				move,
				host: str(form.get("host")) || undefined,
				item: str(form.get("item")) || undefined
			});
			return { deep: { move, success: result.success, lines: result.lines, cost: result.cost, state: result.deep } };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	browse: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await browseSystem(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				path: str(form.get("path"))
			});
			return { browse: result };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	read: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await readSystemRecord(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				recordId: str(form.get("recordId"))
			});
			return { read: result };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	grep: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await grepSystem(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				query: str(form.get("query"))
			});
			return { grep: result };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	},

	exfil: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await exfilRecord(db, locals.account!.id, {
				assetId: int(form.get("assetId")),
				siteId: str(form.get("siteId")),
				recordId: str(form.get("recordId"))
			});
			return { exfil: result };
		} catch (err) {
			if (err instanceof InfiltrationError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
