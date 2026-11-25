// What a viewer's state knows about another state: gathers the intel signals
// (dossier files, planted assets, recon, covert ops, bloc, shared border) and
// turns true figures into the estimates the viewer may see. The rules live in
// the pure module #lib/utils/intel-estimate.

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "../../db";
import {
	covertOperations,
	infiltrationAssets,
	infiltrationFiles,
	reconMissions,
	regionBorders,
	regions,
	states
} from "../../schema";
import {
	estimateStat,
	exactStat,
	intelLevel,
	type Estimate,
	type IntelLevel,
	type IntelRelation,
	type IntelSignals,
	type StatSpec
} from "#lib/utils/intel-estimate.js";
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

async function relationOf(db: Db, viewerStateId: number | null, targetStateId: number): Promise<IntelRelation> {
	if (viewerStateId == null) return "foreign";
	if (viewerStateId === targetStateId) return "self";
	const rows = await db
		.select({ id: states.id, blocId: states.blocId })
		.from(states)
		.where(inArray(states.id, [viewerStateId, targetStateId]));
	const a = rows.find((r) => r.id === viewerStateId)?.blocId;
	const b = rows.find((r) => r.id === targetStateId)?.blocId;
	return a != null && a === b ? "bloc" : "foreign";
}

async function sharesBorder(db: Db, a: number, b: number): Promise<boolean> {
	const r1 = alias(regions, "r1");
	const r2 = alias(regions, "r2");
	const [row] = await db
		.select({ id: regionBorders.id })
		.from(regionBorders)
		.innerJoin(r1, eq(regionBorders.regionId, r1.id))
		.innerJoin(r2, eq(regionBorders.neighborId, r2.id))
		.where(sql`(${r1.stateId} = ${a} and ${r2.stateId} = ${b}) or (${r1.stateId} = ${b} and ${r2.stateId} = ${a})`)
		.limit(1);
	return !!row;
}

/** Everything that feeds the viewer state's intel level on the target. */
export async function intelSignals(
	db: Db,
	viewerStateId: number | null,
	targetStateId: number,
	now = new Date()
): Promise<IntelSignals> {
	const relation = await relationOf(db, viewerStateId, targetStateId);
	if (viewerStateId == null || relation === "self") {
		return { relation, sharedBorder: false, activeAssets: 0, files: [], recon: [], covertOps: [] };
	}
	const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
	const [sharedBorder, assets, files, recon, ops] = await Promise.all([
		sharesBorder(db, viewerStateId, targetStateId),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(infiltrationAssets)
			.where(
				and(
					eq(infiltrationAssets.stateId, viewerStateId),
					eq(infiltrationAssets.targetStateId, targetStateId),
					eq(infiltrationAssets.status, "active")
				)
			),
		db
			.select({
				siteId: infiltrationFiles.siteId,
				classification: infiltrationFiles.classification,
				capturedAt: infiltrationFiles.capturedAt
			})
			.from(infiltrationFiles)
			.where(
				and(
					eq(infiltrationFiles.stateId, viewerStateId),
					eq(infiltrationFiles.targetStateId, targetStateId),
					gte(infiltrationFiles.capturedAt, since)
				)
			),
		db
			.select({ at: reconMissions.completedAt })
			.from(reconMissions)
			.where(
				and(
					eq(reconMissions.stateId, viewerStateId),
					eq(reconMissions.targetStateId, targetStateId),
					eq(reconMissions.status, "completed"),
					gte(reconMissions.completesAt, since)
				)
			),
		db
			.select({ at: covertOperations.launchedAt })
			.from(covertOperations)
			.where(
				and(
					eq(covertOperations.stateId, viewerStateId),
					eq(covertOperations.targetStateId, targetStateId),
					eq(covertOperations.succeeded, true),
					gte(covertOperations.launchedAt, since)
				)
			)
	]);
	return {
		relation,
		sharedBorder,
		activeAssets: assets[0]?.n ?? 0,
		files,
		recon: recon.map((r) => r.at).filter((at): at is Date => !!at),
		covertOps: ops.map((o) => o.at)
	};
}

/** An estimator bound to one viewer and target: true figure in, estimate out. */
export interface StateIntel {
	viewerStateId: number | null;
	relation: IntelRelation;
	level: IntelLevel;
	/** True when figures are shown as they are (own state, or confirmed). */
	exact: boolean;
	estimate: (stat: string, value: number, spec: StatSpec) => Estimate;
}

export async function stateIntel(
	db: Db,
	viewerStateId: number | null,
	targetStateId: number,
	now = new Date()
): Promise<StateIntel> {
	const signals = await intelSignals(db, viewerStateId, targetStateId, now);
	const level = intelLevel(signals, now);
	const self = signals.relation === "self";
	return {
		viewerStateId,
		relation: signals.relation,
		level,
		exact: self,
		estimate: (stat, value, spec) =>
			self
				? exactStat(value, spec.group)
				: estimateStat(value, level.groups[spec.group], spec, { viewerStateId, targetStateId, stat, now })
	};
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
