// What a viewer's state knows about another state: gathers the intel signals
// (dossier files, planted assets, recon, covert ops, bloc, shared border) and
// turns true figures into the estimates the viewer may see. The rules live in
// the pure module #lib/utils/intel-estimate.

import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "../../db";
import {
	covertOperations,
	infiltrationAssets,
	infiltrationFiles,
	migrationFlows,
	reconMissions,
	regionBorders,
	regions,
	states
} from "../../schema";
import { stateIntelFrom, type IntelRelation, type IntelSignals, type StateIntel } from "#lib/utils/intel-estimate.js";
import { opsAuthority } from "./covert-ops.js";
import { viewerSide } from "./recon.js";

type Db = Database;

/** Sources older than this no longer count at all. */
const LOOKBACK_DAYS = 90;

/** The state whose intelligence a player sees through: the one they serve, else the one they live in. */
export async function intelViewer(db: Db, accountId: string | undefined) {
	if (!accountId) return { stateId: null, authority: null };
	const [authority, side] = await Promise.all([opsAuthority(db, accountId), viewerSide(db, accountId)]);
	return { stateId: authority?.stateId ?? side?.stateId ?? null, authority };
}

/** Everything that feeds the viewer state's intel level on each target, in one round of grouped queries. */
export async function intelSignalsMany(
	db: Db,
	viewerStateId: number | null,
	targetStateIds: number[],
	now = new Date()
): Promise<Map<number, IntelSignals>> {
	const targets = [...new Set(targetStateIds)];
	const out = new Map<number, IntelSignals>();
	const blank = (relation: IntelRelation): IntelSignals => ({
		relation,
		sharedBorder: false,
		activeAssets: 0,
		files: [],
		recon: [],
		covertOps: [],
		migration: []
	});
	if (!targets.length) return out;
	if (viewerStateId == null) {
		for (const t of targets) out.set(t, blank("foreign"));
		return out;
	}
	const foreign = targets.filter((t) => t !== viewerStateId);
	if (targets.includes(viewerStateId)) out.set(viewerStateId, blank("self"));
	if (!foreign.length) return out;

	const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
	const r1 = alias(regions, "r1");
	const r2 = alias(regions, "r2");
	const [blocs, borders, assets, files, recon, ops, arrivals] = await Promise.all([
		db
			.select({ id: states.id, blocId: states.blocId })
			.from(states)
			.where(inArray(states.id, [viewerStateId, ...foreign])),
		// Neighbours among the targets: the other side of any border the viewer touches.
		db
			.selectDistinct({ a: r1.stateId, b: r2.stateId })
			.from(regionBorders)
			.innerJoin(r1, eq(regionBorders.regionId, r1.id))
			.innerJoin(r2, eq(regionBorders.neighborId, r2.id))
			.where(
				or(
					and(eq(r1.stateId, viewerStateId), inArray(r2.stateId, foreign)),
					and(eq(r2.stateId, viewerStateId), inArray(r1.stateId, foreign))
				)
			),
		db
			.select({ target: infiltrationAssets.targetStateId, n: sql<number>`count(*)::int` })
			.from(infiltrationAssets)
			.where(
				and(
					eq(infiltrationAssets.stateId, viewerStateId),
					inArray(infiltrationAssets.targetStateId, foreign),
					eq(infiltrationAssets.status, "active")
				)
			)
			.groupBy(infiltrationAssets.targetStateId),
		db
			.select({
				target: infiltrationFiles.targetStateId,
				siteId: infiltrationFiles.siteId,
				classification: infiltrationFiles.classification,
				capturedAt: infiltrationFiles.capturedAt
			})
			.from(infiltrationFiles)
			.where(
				and(
					eq(infiltrationFiles.stateId, viewerStateId),
					inArray(infiltrationFiles.targetStateId, foreign),
					gte(infiltrationFiles.capturedAt, since)
				)
			),
		db
			.select({ target: reconMissions.targetStateId, at: reconMissions.completedAt })
			.from(reconMissions)
			.where(
				and(
					eq(reconMissions.stateId, viewerStateId),
					inArray(reconMissions.targetStateId, foreign),
					eq(reconMissions.status, "completed"),
					gte(reconMissions.completesAt, since)
				)
			),
		db
			.select({ target: covertOperations.targetStateId, at: covertOperations.launchedAt })
			.from(covertOperations)
			.where(
				and(
					eq(covertOperations.stateId, viewerStateId),
					inArray(covertOperations.targetStateId, foreign),
					eq(covertOperations.succeeded, true),
					gte(covertOperations.launchedAt, since)
				)
			),
		db
			.select({
				origin: migrationFlows.fromStateId,
				civilians: migrationFlows.civilians,
				at: migrationFlows.createdAt
			})
			.from(migrationFlows)
			.where(
				and(
					eq(migrationFlows.toStateId, viewerStateId),
					inArray(migrationFlows.fromStateId, foreign),
					gte(migrationFlows.createdAt, since)
				)
			)
	]);

	const viewerBloc = blocs.find((r) => r.id === viewerStateId)?.blocId ?? null;
	for (const t of foreign) {
		const bloc = blocs.find((r) => r.id === t)?.blocId ?? null;
		out.set(t, blank(viewerBloc != null && viewerBloc === bloc ? "bloc" : "foreign"));
	}
	for (const b of borders) {
		const other = b.a === viewerStateId ? b.b : b.a;
		const s = other != null ? out.get(other) : undefined;
		if (s) s.sharedBorder = true;
	}
	for (const a of assets) {
		const s = a.target != null ? out.get(a.target) : undefined;
		if (s) s.activeAssets = a.n;
	}
	for (const f of files) {
		out.get(f.target)?.files.push({ siteId: f.siteId, classification: f.classification, capturedAt: f.capturedAt });
	}
	for (const r of recon) if (r.at && r.target != null) out.get(r.target)?.recon.push(r.at);
	for (const o of ops) if (o.target != null) out.get(o.target)?.covertOps.push(o.at);
	for (const f of arrivals) {
		if (f.origin != null) out.get(f.origin)?.migration.push({ civilians: f.civilians, at: f.at });
	}
	return out;
}

/** Everything that feeds the viewer state's intel level on the target. */
export async function intelSignals(
	db: Db,
	viewerStateId: number | null,
	targetStateId: number,
	now = new Date()
): Promise<IntelSignals> {
	const signals = await intelSignalsMany(db, viewerStateId, [targetStateId], now);
	return signals.get(targetStateId)!;
}

export type { StateIntel };

export async function stateIntel(
	db: Db,
	viewerStateId: number | null,
	targetStateId: number,
	now = new Date()
): Promise<StateIntel> {
	return stateIntelFrom(viewerStateId, targetStateId, await intelSignals(db, viewerStateId, targetStateId, now), now);
}

/** Estimators for many targets at once (rankings), keyed by target state id. */
export async function stateIntelMany(
	db: Db,
	viewerStateId: number | null,
	targetStateIds: number[],
	now = new Date()
): Promise<Map<number, StateIntel>> {
	const signals = await intelSignalsMany(db, viewerStateId, targetStateIds, now);
	return new Map([...signals].map(([id, s]) => [id, stateIntelFrom(viewerStateId, id, s, now)]));
}

/** The viewer's intel on one state, for the state's subpages. */
export async function viewerStateIntel(db: Db, accountId: string | undefined, targetStateId: number, now = new Date()) {
	const viewer = await intelViewer(db, accountId);
	return stateIntel(db, viewer.stateId, targetStateId, now);
}

/** The dossier: documents the viewer's network copied from the target, newest first. */
export function dossierFiles(db: Db, viewerStateId: number, targetStateId: number) {
	return db
		.select({
			id: infiltrationFiles.id,
			siteId: infiltrationFiles.siteId,
			title: infiltrationFiles.title,
			classification: infiltrationFiles.classification,
			body: infiltrationFiles.body,
			path: infiltrationFiles.path,
			capturedAt: infiltrationFiles.capturedAt
		})
		.from(infiltrationFiles)
		.where(and(eq(infiltrationFiles.stateId, viewerStateId), eq(infiltrationFiles.targetStateId, targetStateId)))
		.orderBy(desc(infiltrationFiles.capturedAt));
}
