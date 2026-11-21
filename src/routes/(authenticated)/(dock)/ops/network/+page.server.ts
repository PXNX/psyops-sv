// src/routes/(authenticated)/(dock)/ops/network/+page.server.ts
// The network console: build assets inside a target, probe its sites, tap its
// cameras, copy its sensitive files and cover tracks. Rules and persistence
// live in services/military/infiltration.ts.

import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { OPS_ROLE_LABEL, opsAuthority } from "#lib/server/services/military/covert-ops.js";
import { viewerSide } from "#lib/server/services/military/recon.js";
import {
	InfiltrationError,
	actionsFor,
	assetsFor,
	filesFor,
	networkTargets,
	plantAsset,
	runAction,
	sitesFor
} from "#lib/server/services/military/infiltration.js";
import {
	ASSET_KINDS,
	INFILTRATION,
	INFILTRATION_ACTION_KINDS,
	type AssetKind,
	type InfiltrationActionKind
} from "#lib/config/index.js";

const empty = {
	state: null,
	authority: null,
	targets: [] as { id: number; name: string; logo: string | null }[],
	selectedTargetId: null as number | null,
	assets: [] as Awaited<ReturnType<typeof assetsFor>>,
	sites: [] as Awaited<ReturnType<typeof sitesFor>>,
	files: [] as Awaited<ReturnType<typeof filesFor>>,
	actions: [] as Awaited<ReturnType<typeof actionsFor>>,
	treasury: null as number | null
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;
	const [authority, side] = await Promise.all([opsAuthority(db, account.id), viewerSide(db, account.id)]);
	const stateId = authority?.stateId ?? side?.stateId ?? null;
	if (!stateId) return { ...empty, targets: [] };

	const targets = authority ? await networkTargets(db, stateId) : [];
	const requested = url.searchParams.get("target");
	const selectedTargetId = targets.find((t) => String(t.id) === requested)?.id ?? targets[0]?.id ?? null;

	const [treasury, targetNames, assets, sites, files, actions] = await Promise.all([
		db.query.stateTreasury.findFirst({ where: (t, { eq }) => eq(t.stateId, stateId) }),
		Promise.all(targets.map(async (t) => ({ ...t, logo: await getLogoUrl(t.logo) }))),
		selectedTargetId ? assetsFor(db, stateId, selectedTargetId) : Promise.resolve([]),
		selectedTargetId ? sitesFor(db, stateId, selectedTargetId) : Promise.resolve([]),
		selectedTargetId ? filesFor(db, stateId, selectedTargetId) : Promise.resolve([]),
		selectedTargetId ? actionsFor(db, stateId, selectedTargetId) : Promise.resolve([])
	]);
	const [state] = await db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, stateId));

	return {
		state: state ?? { id: stateId, name: "Your state" },
		authority: authority ? { role: authority.role, roleLabel: OPS_ROLE_LABEL[authority.role] } : null,
		targets: targetNames,
		selectedTargetId,
		assets,
		sites,
		files,
		actions,
		treasury: authority ? (treasury?.balance ?? 0) : null,
		maxAssets: INFILTRATION.MAX_ASSETS_PER_TARGET
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
			return { planted: result };
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
	}
};
