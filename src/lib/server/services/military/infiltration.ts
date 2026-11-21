// src/lib/server/services/military/infiltration.ts
// The player-driven layer beneath cyber operations and psyops: build a network
// inside a target, probe its sites, watch their cameras, copy their sensitive
// files, and cover tracks before the heat burns the asset.
//
// Authority is shared with the covert-ops console (only a president or a
// defence/foreign minister runs operations). Everything that spends or changes
// state happens in one transaction with the treasury row locked.

import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	userProfiles,
	governmentBudgetTransactions,
	infiltrationActions,
	infiltrationAssets,
	infiltrationFiles,
	powerPlants,
	stateTreasury,
	states
} from "../../schema";
import {
	INFILTRATION,
	INFILTRATION_ACTION_KINDS,
	INFILTRATION_ACTIONS,
	INFILTRATION_ASSETS,
	actionChance,
	assetCodename,
	effectiveHeat,
	fileFor,
	sitesForTarget,
	type AssetKind,
	type InfiltrationActionKind,
	type Site
} from "#lib/config/index.js";
import { opsAuthority } from "./covert-ops";
import { sideOf } from "./recon";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Refuse an action the player should see the reason for. */
export class InfiltrationError extends Error {}

// ── Reading ─────────────────────────────────────────────────────────────────

/** States this leadership may build a network inside (not home, not bloc). */
export async function networkTargets(db: Db, stateId: number) {
	const side = await sideOf(db, stateId);
	const rows = await db
		.select({ id: states.id, name: states.name, logo: states.logo })
		.from(states)
		.orderBy(states.name);
	return rows.filter((s) => !side.stateIds.includes(s.id)).map((s) => ({ id: s.id, name: s.name, logo: s.logo }));
}

export interface NetworkAsset {
	id: number;
	codename: string;
	kind: AssetKind;
	access: number;
	heat: number;
	status: "active" | "burned";
	plantedAt: string;
	plantedBy: string | null;
	handler: string | null;
	usable: boolean;
}

/** Assets a state holds in a target, with idle heat decay applied for display. */
export async function assetsFor(
	db: Db,
	stateId: number,
	targetStateId: number,
	now = new Date()
): Promise<NetworkAsset[]> {
	const rows = await db
		.select({
			asset: infiltrationAssets,
			handler: userProfiles.name
		})
		.from(infiltrationAssets)
		.leftJoin(userProfiles, eq(infiltrationAssets.plantedBy, userProfiles.accountId))
		.where(and(eq(infiltrationAssets.stateId, stateId), eq(infiltrationAssets.targetStateId, targetStateId)))
		.orderBy(desc(infiltrationAssets.plantedAt));
	return rows.map(({ asset, handler }) => {
		const heat = effectiveHeat(asset, now);
		return {
			id: asset.id,
			codename: asset.codename,
			kind: asset.kind as AssetKind,
			access: asset.access,
			heat,
			status: asset.status as "active" | "burned",
			plantedAt: asset.plantedAt.toISOString(),
			plantedBy: asset.plantedBy,
			handler,
			usable: asset.status === "active" && heat < INFILTRATION.HEAT_MAX
		};
	});
}

export interface KnownSite extends Site {
	/** The viewer has successfully probed or watched this site at least once. */
	known: boolean;
	/** Successful camera taps. */
	cameras: number;
	files: number;
	lastSeen: string | null;
}

/** The target's site catalogue, annotated with what this network has learned. */
export async function sitesFor(db: Db, stateId: number, targetStateId: number, now = new Date()): Promise<KnownSite[]> {
	const [plantRows, actionRows, fileRows] = await Promise.all([
		db
			.select({ id: powerPlants.id, name: powerPlants.name, plantType: powerPlants.plantType })
			.from(powerPlants)
			.where(eq(powerPlants.stateId, targetStateId)),
		db
			.select({
				siteId: infiltrationActions.siteId,
				action: infiltrationActions.action,
				createdAt: infiltrationActions.createdAt
			})
			.from(infiltrationActions)
			.where(
				and(
					eq(infiltrationActions.stateId, stateId),
					eq(infiltrationActions.targetStateId, targetStateId),
					eq(infiltrationActions.success, true)
				)
			)
			.orderBy(desc(infiltrationActions.createdAt)),
		db
			.select({ siteId: infiltrationFiles.siteId })
			.from(infiltrationFiles)
			.where(and(eq(infiltrationFiles.stateId, stateId), eq(infiltrationFiles.targetStateId, targetStateId)))
	]);
	const sites = sitesForTarget(
		targetStateId,
		plantRows.map((p) => ({ id: p.id, name: p.name, plantType: p.plantType }))
	);
	const filesBySite = new Map<string, number>();
	for (const f of fileRows) filesBySite.set(f.siteId, (filesBySite.get(f.siteId) ?? 0) + 1);
	return sites.map((site) => {
		const acts = actionRows.filter((a) => a.siteId === site.id);
		return {
			...site,
			known: acts.length > 0 || filesBySite.has(site.id),
			cameras: acts.filter((a) => a.action === "camera").length,
			files: filesBySite.get(site.id) ?? 0,
			lastSeen: acts[0]?.createdAt.toISOString() ?? null
		};
	});
}

/** Dossiers this network has pulled from the target, newest first. */
export function filesFor(db: Db, stateId: number, targetStateId: number) {
	return db
		.select()
		.from(infiltrationFiles)
		.where(and(eq(infiltrationFiles.stateId, stateId), eq(infiltrationFiles.targetStateId, targetStateId)))
		.orderBy(desc(infiltrationFiles.capturedAt));
}

/** The network's activity log, newest first. */
export function actionsFor(db: Db, stateId: number, targetStateId: number) {
	return db
		.select({ action: infiltrationActions, codename: infiltrationAssets.codename })
		.from(infiltrationActions)
		.innerJoin(infiltrationAssets, eq(infiltrationActions.assetId, infiltrationAssets.id))
		.where(and(eq(infiltrationActions.stateId, stateId), eq(infiltrationActions.targetStateId, targetStateId)))
		.orderBy(desc(infiltrationActions.createdAt))
		.limit(INFILTRATION.LOG_LIMIT);
}

// ── Writing ─────────────────────────────────────────────────────────────────

type MoneyColumn = typeof stateTreasury.balance | typeof stateTreasury.totalSpent;
const sqlMinus = (col: MoneyColumn, n: number) => sql`${col} - ${n}`;
const sqlPlus = (col: MoneyColumn, n: number) => sql`${col} + ${n}`;

/** Charge the treasury and write the budget line inside an open transaction. */
async function charge(tx: Tx, stateId: number, cost: number, description: string, userId: string, now: Date) {
	const [paid] = await tx
		.update(stateTreasury)
		.set({
			balance: sqlMinus(stateTreasury.balance, cost),
			totalSpent: sqlPlus(stateTreasury.totalSpent, cost),
			updatedAt: now
		})
		.where(and(eq(stateTreasury.stateId, stateId), sql`${stateTreasury.balance} >= ${cost}`))
		.returning({ balance: stateTreasury.balance });
	if (!paid) throw new InfiltrationError(`The treasury cannot cover $${cost.toLocaleString()}.`);
	await tx.insert(governmentBudgetTransactions).values({
		stateId,
		transactionType: "covert_operation",
		amount: -cost,
		balanceAfter: paid.balance,
		description,
		authorizedBy: userId,
		createdAt: now
	});
}

async function assertTarget(tx: Tx, stateId: number, targetStateId: number): Promise<string> {
	if (stateId === targetStateId) throw new InfiltrationError("You cannot build a network in your own state.");
	const side = await sideOf(tx, stateId);
	if (side.stateIds.includes(targetStateId)) {
		throw new InfiltrationError("Bloc partners are off limits.");
	}
	const [target] = await tx.select({ name: states.name }).from(states).where(eq(states.id, targetStateId));
	if (!target) throw new InfiltrationError("That state doesn't exist.");
	return target.name;
}

export interface PlantResult {
	assetId: number;
	codename: string;
	cost: number;
}

/** Establish a new asset inside a target state. */
export async function plantAsset(
	db: Database,
	userId: string,
	input: { targetStateId: number; kind: AssetKind; now?: Date }
): Promise<PlantResult> {
	const now = input.now ?? new Date();
	const spec = INFILTRATION_ASSETS[input.kind];
	if (!spec) throw new InfiltrationError("Unknown asset type.");
	return db.transaction(async (tx) => {
		const authority = await opsAuthority(tx, userId);
		if (!authority)
			throw new InfiltrationError("Only your state's president or a defence/foreign minister can build networks.");
		const stateId = authority.stateId;
		const targetName = await assertTarget(tx, stateId, input.targetStateId);
		await tx
			.select({ id: stateTreasury.id })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		const [count] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(infiltrationAssets)
			.where(
				and(
					eq(infiltrationAssets.stateId, stateId),
					eq(infiltrationAssets.targetStateId, input.targetStateId),
					eq(infiltrationAssets.status, "active")
				)
			);
		if ((count?.n ?? 0) >= INFILTRATION.MAX_ASSETS_PER_TARGET) {
			throw new InfiltrationError(
				`You can keep at most ${INFILTRATION.MAX_ASSETS_PER_TARGET} active assets in one state.`
			);
		}
		await charge(tx, stateId, spec.cost, `${spec.label} planted in ${targetName}`, userId, now);
		const [all] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(infiltrationAssets)
			.where(and(eq(infiltrationAssets.stateId, stateId), eq(infiltrationAssets.targetStateId, input.targetStateId)));
		const codename = assetCodename(stateId, input.targetStateId, all?.n ?? 0);
		const [asset] = await tx
			.insert(infiltrationAssets)
			.values({
				stateId,
				targetStateId: input.targetStateId,
				kind: input.kind,
				codename,
				access: spec.access,
				heat: spec.plantHeat,
				status: "active",
				plantedBy: userId,
				plantedAt: now,
				lastActionAt: now
			})
			.returning({ id: infiltrationAssets.id });
		return { assetId: asset!.id, codename, cost: spec.cost };
	});
}

export interface ActionResult {
	success: boolean;
	chance: number;
	detail: string;
	heatAfter: number;
	burned: boolean;
	fileId: number | null;
	siteId: string;
	codename: string;
}

/** Use an asset against one of the target's sites (or to cover its tracks). */
export async function runAction(
	db: Database,
	userId: string,
	input: {
		assetId: number;
		siteId?: string;
		action: InfiltrationActionKind;
		nonce?: number;
		now?: Date;
		rng?: () => number;
	}
): Promise<ActionResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const spec = INFILTRATION_ACTIONS[input.action];
	if (!spec || !INFILTRATION_ACTION_KINDS.includes(input.action)) {
		throw new InfiltrationError("Unknown action.");
	}
	return db.transaction(async (tx) => {
		const authority = await opsAuthority(tx, userId);
		if (!authority) throw new InfiltrationError("Only your state's leadership can direct the network.");
		const stateId = authority.stateId;
		const [row] = await tx
			.select({ asset: infiltrationAssets })
			.from(infiltrationAssets)
			.where(eq(infiltrationAssets.id, input.assetId))
			.for("update");
		const asset = row?.asset;
		if (!asset || asset.stateId !== stateId) throw new InfiltrationError("That asset isn't yours.");
		if (asset.status !== "active") throw new InfiltrationError(`${asset.codename} has been burned.`);

		const heat = effectiveHeat(asset, now);
		if (heat >= INFILTRATION.HEAT_MAX)
			throw new InfiltrationError(`${asset.codename} is too exposed to use. Cover its tracks first.`);

		// A site is needed for everything except covering tracks.
		let site: Site | null = null;
		let targetName = "";
		if (input.action !== "cover") {
			if (!input.siteId) throw new InfiltrationError("Choose a site.");
			targetName = await assertTarget(tx, stateId, asset.targetStateId);
			const plantRows = await tx
				.select({ id: powerPlants.id, name: powerPlants.name, plantType: powerPlants.plantType })
				.from(powerPlants)
				.where(eq(powerPlants.stateId, asset.targetStateId));
			const sites = sitesForTarget(
				asset.targetStateId,
				plantRows.map((p) => ({ id: p.id, name: p.name, plantType: p.plantType }))
			);
			site = sites.find((s) => s.id === input.siteId) ?? null;
			if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
			if (asset.access < site.accessRequired) {
				throw new InfiltrationError(
					`${site.code} needs access level ${site.accessRequired}; ${asset.codename} has ${asset.access}.`
				);
			}
		} else {
			await assertTarget(tx, stateId, asset.targetStateId);
		}

		await tx
			.select({ id: stateTreasury.id })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		await charge(tx, stateId, spec.cost, `${spec.label} via ${asset.codename}`, userId, now);

		const chance = input.action === "cover" ? 1 : actionChance(input.action, { access: asset.access, heat }, site!);
		const success = rng() < chance;
		const nextHeat = clamp(heat + spec.heat, 0, INFILTRATION.HEAT_MAX);
		const burned = nextHeat >= INFILTRATION.HEAT_MAX;

		let detail: string;
		let fileId: number | null = null;
		if (input.action === "cover") {
			detail = "Logs scrubbed, cut-out rotated. Heat down.";
		} else if (!success) {
			detail = `Access to ${site!.code} was refused. ${asset.codename} left traces.`;
		} else if (input.action === "probe") {
			detail = `Perimeter mapped: security ${site!.security}, file access level ${site!.accessRequired}.`;
		} else if (input.action === "camera") {
			detail = `${site!.camera} — ${site!.code} watched for several minutes.`;
		} else {
			const dossier = fileFor(site!, targetName, input.nonce ?? Math.floor(Math.random() * 1_000_000), now);
			const [file] = await tx
				.insert(infiltrationFiles)
				.values({
					stateId,
					targetStateId: asset.targetStateId,
					siteId: site!.id,
					assetId: asset.id,
					title: dossier.title,
					classification: dossier.classification,
					body: dossier.body,
					capturedAt: now
				})
				.returning({ id: infiltrationFiles.id });
			fileId = file!.id;
			detail = `${dossier.title} (${dossier.classification}) copied from ${site!.code}.`;
		}
		if (burned) detail += ` ${asset.codename} is burned and can no longer be used.`;

		await tx
			.update(infiltrationAssets)
			.set({ heat: nextHeat, status: burned ? "burned" : "active", lastActionAt: now })
			.where(eq(infiltrationAssets.id, asset.id));
		await tx.insert(infiltrationActions).values({
			assetId: asset.id,
			stateId,
			targetStateId: asset.targetStateId,
			siteId: input.siteId ?? "",
			action: input.action,
			success,
			chance: Math.round(chance * 100),
			detail,
			heatAfter: nextHeat,
			createdAt: now
		});
		return {
			success,
			chance: Math.round(chance * 100),
			detail,
			heatAfter: nextHeat,
			burned,
			fileId,
			siteId: input.siteId ?? "",
			codename: asset.codename
		};
	});
}

/** Convenience for the operations planner: is this leadership allowed to run networks? */
export const canRunNetworks = (role: string) =>
	role === "president" || role === "defense" || role === "foreign_affairs";

/** Number of live footholds, for the odds preview and the network console. */
export function liveFootholds(assets: { status: string; heat: number }[]): number {
	return assets.filter((a) => a.status === "active" && a.heat < INFILTRATION.HEAT_MAX).length;
}
