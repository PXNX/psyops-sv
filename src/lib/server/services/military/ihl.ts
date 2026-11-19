// src/lib/server/services/military/ihl.ts
// International humanitarian law on the server: a state's IHL score and
// standing (computed on read from its decaying violations), its public
// record, and the bloc-expulsion rule for violators. Violations are written
// by strike.ts; the scoring rules live in config/game/ihl.config.ts.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { ihlViolations, states, strikes } from "../../schema";
import {
	IHL_EXPULSION_SHARE,
	IHL_HALF_LIFE_DAYS,
	IHL_KIND_LABEL,
	ihlEasyExpulsion,
	ihlEmbargoFactor,
	ihlMoraleFactor,
	ihlScore,
	ihlStanding,
	type IhlKind
} from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "select">;

/** Violations older than this no longer move the score (< 1% left). */
const RELEVANT_DAYS = IHL_HALF_LIFE_DAYS * 7;

/** Current IHL score per state (0 for states without violations). */
export async function ihlScores(db: Db, stateIds: number[], now = new Date()): Promise<Map<number, number>> {
	const ids = [...new Set(stateIds)];
	const out = new Map<number, number>(ids.map((id) => [id, 0]));
	if (!ids.length) return out;
	const since = new Date(now.getTime() - RELEVANT_DAYS * 86_400_000);
	const rows = await db
		.select({ stateId: ihlViolations.stateId, points: ihlViolations.points, createdAt: ihlViolations.createdAt })
		.from(ihlViolations)
		.where(and(inArray(ihlViolations.stateId, ids), gt(ihlViolations.createdAt, since)));
	const byState = new Map<number, typeof rows>();
	for (const r of rows) byState.set(r.stateId, [...(byState.get(r.stateId) ?? []), r]);
	for (const [id, vs] of byState) out.set(id, ihlScore(vs, now));
	return out;
}

export async function ihlScoreOf(db: Db, stateId: number, now = new Date()): Promise<number> {
	return (await ihlScores(db, [stateId], now)).get(stateId) ?? 0;
}

/** Share of bloc votes that expels this state (a third for violators, else more than half). */
export async function expulsionPassShare(db: Db, stateId: number, now = new Date()): Promise<number> {
	return ihlEasyExpulsion(await ihlScoreOf(db, stateId, now)) ? IHL_EXPULSION_SHARE : 0.5;
}

export interface IhlRecord {
	score: number;
	standing: ReturnType<typeof ihlStanding>["standing"];
	label: string;
	blurb: string;
	moraleFactor: number;
	embargoFactor: number;
	easyExpulsion: boolean;
	totals: { violations: number; casualties: number; strikes: number; civilianCasualties: number };
	violations: {
		id: number;
		kind: IhlKind;
		kindLabel: string;
		severity: number;
		points: number;
		casualties: number;
		reason: string;
		createdAt: string;
		victimStateId: number | null;
		victimStateName: string | null;
		regionId: number | null;
		strikeId: number | null;
	}[];
}

/** A state's public IHL record: standing, consequences and recent violations. */
export async function ihlRecord(db: Db, stateId: number, now = new Date(), limit = 12): Promise<IhlRecord> {
	const score = await ihlScoreOf(db, stateId, now);
	const standing = ihlStanding(score);
	const rows = await db
		.select({
			id: ihlViolations.id,
			kind: ihlViolations.kind,
			severity: ihlViolations.severity,
			points: ihlViolations.points,
			casualties: ihlViolations.casualties,
			reason: ihlViolations.reason,
			createdAt: ihlViolations.createdAt,
			victimStateId: ihlViolations.victimStateId,
			victimStateName: states.name,
			strikeId: ihlViolations.strikeId,
			regionId: strikes.regionId
		})
		.from(ihlViolations)
		.leftJoin(states, eq(ihlViolations.victimStateId, states.id))
		.leftJoin(strikes, eq(ihlViolations.strikeId, strikes.id))
		.where(eq(ihlViolations.stateId, stateId))
		.orderBy(desc(ihlViolations.createdAt), desc(ihlViolations.id));
	const strikeRows = await db
		.select({ casualties: strikes.civilianCasualties })
		.from(strikes)
		.where(eq(strikes.attackerStateId, stateId));
	return {
		score,
		standing: standing.standing,
		label: standing.label,
		blurb: standing.blurb,
		moraleFactor: ihlMoraleFactor(score),
		embargoFactor: ihlEmbargoFactor(score),
		easyExpulsion: ihlEasyExpulsion(score),
		totals: {
			violations: rows.length,
			casualties: rows.reduce((s, r) => s + r.casualties, 0),
			strikes: strikeRows.length,
			civilianCasualties: strikeRows.reduce((s, r) => s + r.casualties, 0)
		},
		violations: rows.slice(0, limit).map((r) => ({
			...r,
			kindLabel: IHL_KIND_LABEL[r.kind],
			createdAt: r.createdAt.toISOString()
		}))
	};
}
