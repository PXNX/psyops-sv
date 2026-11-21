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
	intrusionSessions,
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
	INTRUSION,
	ATTACK_VECTORS,
	intrusionChance,
	scanFor,
	stageLines,
	type AssetKind,
	type InfiltrationActionKind,
	type IntrusionStage,
	type LogLine,
	type ScanReport,
	type Site,
	fileSystemFor,
	listDirectory,
	findRecords
} from "#lib/config/index.js";
import { opsAuthority } from "./covert-ops";
import { sideOf } from "./recon";
import { dtg } from "#lib/utils/military.js";

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

		// An operator who has pivoted into the right segment knows the system:
		// cameras and file shares are easier to take from there.
		const [pivoted] =
			input.action === "cover"
				? [null]
				: await tx
						.select({ id: intrusionSessions.id })
						.from(intrusionSessions)
						.where(
							and(
								eq(intrusionSessions.assetId, asset.id),
								eq(intrusionSessions.siteId, input.siteId ?? ""),
								eq(intrusionSessions.stage, "pivot")
							)
						)
						.limit(1);
		const chance =
			input.action === "cover"
				? 1
				: Math.min(
						0.98,
						actionChance(input.action, { access: asset.access, heat }, site!) +
							(pivoted ? INTRUSION.PIVOT_ACTION_BONUS : 0)
					);
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

// ── Interactive intrusion ───────────────────────────────────────────────────

export type IntrusionStep = IntrusionStage | "reset";

async function sitesIn(db: Db, targetStateId: number): Promise<Site[]> {
	const plants = await db
		.select({ id: powerPlants.id, name: powerPlants.name, plantType: powerPlants.plantType })
		.from(powerPlants)
		.where(eq(powerPlants.stateId, targetStateId));
	return sitesForTarget(
		targetStateId,
		plants.map((p) => ({ id: p.id, name: p.name, plantType: p.plantType }))
	);
}

/** The current intrusion session for an asset/site pair, if any. */
export function sessionFor(db: Db, assetId: number, siteId: string) {
	return db.query.intrusionSessions.findFirst({
		where: (s, { eq: is, and: both }) => both(is(s.assetId, assetId), is(s.siteId, siteId))
	});
}

/** True when an operator has pivoted into this site's systems. */
export async function isPivoted(db: Db, assetId: number, siteId: string): Promise<boolean> {
	const session = await sessionFor(db, assetId, siteId);
	return session?.stage === "pivot";
}

export interface IntrusionResult {
	session: null | Awaited<ReturnType<typeof sessionFor>>;
	success: boolean | null;
	lines: { t: string; line: string; tone: "info" | "ok" | "warn" | "bad" }[];
}

/**
 * Advance an intrusion one step. Each step pays for itself and leaves heat;
 * a failed step leaves more. The transcript is kept on the session so the
 * console can replay exactly what the operator saw.
 */
export async function runIntrusion(
	db: Database,
	userId: string,
	input: { assetId: number; siteId: string; step: IntrusionStep; vector?: string; now?: Date; rng?: () => number }
): Promise<IntrusionResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const stamp = dtg(now);
	return db.transaction(async (tx) => {
		const authority = await opsAuthority(tx, userId);
		if (!authority) throw new InfiltrationError("Only your state's leadership can direct an intrusion.");
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
		if (heat >= INFILTRATION.HEAT_MAX) throw new InfiltrationError(`${asset.codename} is too exposed to continue.`);

		const targetName = await assertTarget(tx, stateId, asset.targetStateId);
		const site = (await sitesIn(tx, asset.targetStateId)).find((s) => s.id === input.siteId);
		if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
		const [existing] = await tx
			.select()
			.from(intrusionSessions)
			.where(and(eq(intrusionSessions.assetId, asset.id), eq(intrusionSessions.siteId, site.id)))
			.limit(1);

		if (input.step === "reset") {
			if (existing) await tx.delete(intrusionSessions).where(eq(intrusionSessions.id, existing.id));
			return { session: null, success: null, lines: [] };
		}

		const stageOrder: Record<IntrusionStage, number> = { scan: 0, access: 1, escalate: 2, pivot: 3 };
		if (existing && stageOrder[input.step as IntrusionStage] <= stageOrder[existing.stage as IntrusionStage]) {
			throw new InfiltrationError(
				`That step is already done. ${input.step === "scan" ? "Reset the session to scan again." : "Move to the next step."}`
			);
		}
		// Each step needs the previous one to have succeeded: a failed access
		// cannot be skipped by escalating straight away.
		const required: Record<"access" | "escalate" | "pivot", IntrusionStage> = {
			access: "scan",
			escalate: "access",
			pivot: "escalate"
		};
		if (input.step !== "scan" && (!existing || existing.stage !== required[input.step])) {
			throw new InfiltrationError(`Finish the ${required[input.step]} step first.`);
		}

		const report: ScanReport = existing
			? {
					host: existing.host,
					ip: existing.ip,
					os: existing.os,
					subnet: existing.segment ?? "",
					ports: existing.ports,
					notes: []
				}
			: scanFor(site, targetName);
		let cost: number = INTRUSION.SCAN_COST;
		let heatDelta: number = INTRUSION.SCAN_HEAT;
		let success = true;
		let lines: LogLine[] = [];
		let stage: IntrusionStage = "scan";
		let privileges = "unauthenticated";
		let segment: string | null = null;
		let vector: string | null = null;

		if (input.step === "scan") {
			lines = stageLines("scan", report, undefined, true, targetName, stamp);
		} else {
			if (!existing) throw new InfiltrationError("Scan the site first.");
			if (!report.ports.some((p) => p.vector)) throw new InfiltrationError("No exposed service to attack here.");
			const vectorId = input.vector ?? report.ports.find((p) => p.vector)?.vector;
			const spec = vectorId ? ATTACK_VECTORS[vectorId] : undefined;
			if (!vectorId || !spec) throw new InfiltrationError("Choose an exposed service to attack.");
			if (asset.access < spec.accessNeeded) {
				throw new InfiltrationError(`${spec.label} needs level ${spec.accessNeeded} access.`);
			}
			if (input.step === "access" && !report.ports.some((p) => p.vector === vectorId)) {
				throw new InfiltrationError("That service wasn't found in the scan.");
			}
			cost =
				input.step === "access"
					? INTRUSION.ACCESS_COST
					: input.step === "escalate"
						? INTRUSION.ESCALATE_COST
						: INTRUSION.PIVOT_COST;
			const chance = intrusionChance(
				input.step,
				{ access: asset.access, heat },
				site,
				input.step === "access" ? vectorId : undefined
			);
			success = rng() < chance;
			heatDelta = success ? INTRUSION.SUCCESS_HEAT : INTRUSION.FAIL_HEAT;
			lines = stageLines(input.step, report, vectorId, success, targetName, stamp);
			if (success) lines.push({ t: stamp, line: `> roll ${Math.round(chance * 100)}% · accepted`, tone: "ok" });
			else lines.push({ t: stamp, line: `> roll ${Math.round(chance * 100)}% · logged by target SOC`, tone: "bad" });
			stage = success ? input.step : (existing.stage as IntrusionStage);
			vector = existing.vector;
			privileges = existing.privileges;
			segment = existing.segment;
			if (success && input.step === "access") {
				vector = vectorId;
				privileges = "user";
			}
			if (success && input.step === "escalate") privileges = "SYSTEM";
			if (success && input.step === "pivot") segment = `10.${(asset.targetStateId % 40) + 20}.7.0/24`;
		}

		await tx
			.select({ id: stateTreasury.id })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		await charge(tx, stateId, cost, `${input.step} via ${asset.codename} on ${site.code}`, userId, now);
		const nextHeat = clamp(heat + heatDelta, 0, INFILTRATION.HEAT_MAX);
		await tx
			.update(infiltrationAssets)
			.set({ heat: nextHeat, status: nextHeat >= INFILTRATION.HEAT_MAX ? "burned" : "active", lastActionAt: now })
			.where(eq(infiltrationAssets.id, asset.id));

		const log = [...(existing?.log ?? []), ...lines];
		const [session] = await tx
			.insert(intrusionSessions)
			.values({
				assetId: asset.id,
				stateId,
				targetStateId: asset.targetStateId,
				siteId: site.id,
				stage,
				host: report.host,
				ip: report.ip,
				os: report.os,
				ports: report.ports,
				vector,
				privileges,
				segment,
				log
			})
			.onConflictDoUpdate({
				target: [intrusionSessions.assetId, intrusionSessions.siteId],
				set: { stage, vector, privileges, segment, log, updatedAt: now }
			})
			.returning();
		return { session, success, lines };
	});
}

// ── Life inside the system ──────────────────────────────────────────────────

/** The file system of a site, stable for every visitor and every visit. */
export function recordsFor(site: Site, target: string) {
	return fileSystemFor(site, target);
}

/** Append operator commands to the session transcript. */
async function trace(tx: Tx, sessionId: number, lines: LogLine[], now: Date) {
	const [current] = await tx
		.select({ log: intrusionSessions.log })
		.from(intrusionSessions)
		.where(eq(intrusionSessions.id, sessionId));
	await tx
		.update(intrusionSessions)
		.set({ log: [...(current?.log ?? []), ...lines], updatedAt: now })
		.where(eq(intrusionSessions.id, sessionId));
}

/** Require an established pivot before the player can work inside the host. */
async function requirePivot(tx: Tx, userId: string, assetId: number, siteId: string) {
	const authority = await opsAuthority(tx, userId);
	if (!authority) throw new InfiltrationError("Only your state's leadership can work inside a host.");
	const [row] = await tx
		.select({ asset: infiltrationAssets })
		.from(infiltrationAssets)
		.where(eq(infiltrationAssets.id, assetId))
		.for("update");
	const asset = row?.asset;
	if (!asset || asset.stateId !== authority.stateId) throw new InfiltrationError("That asset isn't yours.");
	if (asset.status !== "active") throw new InfiltrationError(`${asset.codename} has been burned.`);
	const [session] = await tx
		.select()
		.from(intrusionSessions)
		.where(and(eq(intrusionSessions.assetId, assetId), eq(intrusionSessions.siteId, siteId)))
		.limit(1);
	if (!session || session.stage !== "pivot") throw new InfiltrationError("You need a pivot into this site first.");
	const targetName = await assertTarget(tx, authority.stateId, asset.targetStateId);
	return { asset, session, targetName, stateId: authority.stateId };
}

export interface BrowseResult {
	path: string;
	dirs: string[];
	files: ReturnType<typeof listDirectory>["files"];
	lines: LogLine[];
}

/** List a directory inside the compromised host. */
export async function browseSystem(
	db: Database,
	userId: string,
	input: { assetId: number; siteId: string; path: string; now?: Date }
): Promise<BrowseResult> {
	const now = input.now ?? new Date();
	return db.transaction(async (tx) => {
		const { session, targetName } = await requirePivot(tx, userId, input.assetId, input.siteId);
		const site = (await sitesIn(tx, session.targetStateId)).find((s) => s.id === input.siteId);
		if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
		const listing = listDirectory(recordsFor(site, targetName), input.path || "/");
		const t = dtg(now);
		const lines: LogLine[] = [
			{ t, line: `$ ls -la ${listing.path}`, tone: "info" },
			...listing.dirs.map((d) => ({ t, line: `drwxr-xr-x  ${d.split("/").pop()}/`, tone: "ok" as const })),
			...listing.files.map((f) => ({
				t,
				line: `-rw-------  ${String(f.size).padStart(7)}  ${f.name}  [${f.classification}]`,
				tone: "info" as const
			}))
		];
		await trace(tx, session.id, lines, now);
		return { ...listing, lines };
	});
}

/** Open one record: the full, partially redacted text. */
export async function readSystemRecord(
	db: Database,
	userId: string,
	input: { assetId: number; siteId: string; recordId: string; now?: Date }
) {
	const now = input.now ?? new Date();
	return db.transaction(async (tx) => {
		const { session, targetName } = await requirePivot(tx, userId, input.assetId, input.siteId);
		const site = (await sitesIn(tx, session.targetStateId)).find((s) => s.id === input.siteId);
		if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
		const record = recordsFor(site, targetName).files.find((f) => f.id === input.recordId);
		if (!record) throw new InfiltrationError("That file no longer exists on the host.");
		const t = dtg(now);
		const lines: LogLine[] = [
			{ t, line: `$ cat ${record.path}`, tone: "info" },
			{ t, line: `${record.body.split("\n")[0] ?? ""} …`, tone: "ok" },
			{ t, line: `${record.body.split("\n").length} lines · ${record.classification}`, tone: "info" }
		];
		await trace(tx, session.id, lines, now);
		return { record, lines };
	});
}

/** Search the file system for a keyword. */
export async function grepSystem(
	db: Database,
	userId: string,
	input: { assetId: number; siteId: string; query: string; now?: Date }
) {
	const now = input.now ?? new Date();
	return db.transaction(async (tx) => {
		const { session, targetName } = await requirePivot(tx, userId, input.assetId, input.siteId);
		const site = (await sitesIn(tx, session.targetStateId)).find((s) => s.id === input.siteId);
		if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
		const matches = findRecords(recordsFor(site, targetName), input.query);
		const t = dtg(now);
		const lines: LogLine[] = [
			{ t, line: `$ grep -ri "${input.query.replace(/"/g, "")}" .`, tone: "info" },
			...matches.map((m) => ({ t, line: `${m.record.path}: ${m.match}`, tone: "ok" as const })),
			{ t, line: `${matches.length} file${matches.length === 1 ? "" : "s"} matched`, tone: "info" as const }
		];
		await trace(tx, session.id, lines, now);
		return { matches, lines };
	});
}

/** Copy one record out of the host and into the state's dossier. */
export async function exfilRecord(
	db: Database,
	userId: string,
	input: { assetId: number; siteId: string; recordId: string; now?: Date }
) {
	const now = input.now ?? new Date();
	return db.transaction(async (tx) => {
		const { asset, session, targetName, stateId } = await requirePivot(tx, userId, input.assetId, input.siteId);
		const site = (await sitesIn(tx, session.targetStateId)).find((s) => s.id === input.siteId);
		if (!site) throw new InfiltrationError("That site is not in the target's catalogue.");
		const record = recordsFor(site, targetName).files.find((f) => f.id === input.recordId);
		if (!record) throw new InfiltrationError("That file no longer exists on the host.");
		const [duplicate] = await tx
			.select({ id: infiltrationFiles.id })
			.from(infiltrationFiles)
			.where(
				and(
					eq(infiltrationFiles.stateId, stateId),
					eq(infiltrationFiles.siteId, input.siteId),
					eq(infiltrationFiles.recordId, record.id)
				)
			)
			.limit(1);
		if (duplicate) throw new InfiltrationError("That record is already in the dossier.");

		const cost = 300 + record.heat * 120;
		await tx
			.select({ id: stateTreasury.id })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		await charge(tx, stateId, cost, `Copy ${record.name} via ${asset.codename}`, userId, now);
		const heat = effectiveHeat(asset, now);
		const nextHeat = clamp(heat + record.heat, 0, INFILTRATION.HEAT_MAX);
		await tx
			.update(infiltrationAssets)
			.set({ heat: nextHeat, status: nextHeat >= INFILTRATION.HEAT_MAX ? "burned" : "active", lastActionAt: now })
			.where(eq(infiltrationAssets.id, asset.id));
		const [file] = await tx
			.insert(infiltrationFiles)
			.values({
				stateId,
				targetStateId: asset.targetStateId,
				siteId: input.siteId,
				assetId: asset.id,
				title: record.name,
				classification: record.classification,
				body: record.body,
				path: record.path,
				recordId: record.id,
				capturedAt: now
			})
			.returning();
		const t = dtg(now);
		await trace(
			tx,
			session.id,
			[
				{ t, line: `$ scp ${record.path} ./dossier/`, tone: "info" },
				{ t, line: `[+] ${record.name} copied · ${record.classification} · +${record.heat} heat`, tone: "ok" }
			],
			now
		);
		return { file: file!, heat: nextHeat, burned: nextHeat >= INFILTRATION.HEAT_MAX, cost };
	});
}
