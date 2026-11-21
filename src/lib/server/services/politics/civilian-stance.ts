// src/lib/server/services/politics/civilian-stance.ts
// Civilians judge foreign states separately from their own government. A row
// only exists once something has happened, so an absent pair is neutral and no
// migration has to seed a row for every state against every other state.
//
// All writes are upserts of a clamped delta, so two simultaneous wars or
// bailouts can't lose each other's update. No SvelteKit virtual modules other
// than the config alias, so integration tests can import this directly.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { civilianStances, states } from "../../schema";
import { STANCE_CONFIG, clampStance, stanceLabel } from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "insert" | "update" | "select">;

/** Change how `observerStateId`'s civilians feel about `targetStateId`. */
export async function adjustCivilianStance(
	db: Db,
	observerStateId: number,
	targetStateId: number,
	delta: number,
	now: Date = new Date()
): Promise<number> {
	if (observerStateId === targetStateId) return STANCE_CONFIG.DEFAULT;
	const change = clampStance(delta);
	if (change === 0) return civilianStance(db, observerStateId, targetStateId);
	await db
		.insert(civilianStances)
		.values({ observerStateId, targetStateId, stance: change, updatedAt: now })
		.onConflictDoUpdate({
			target: [civilianStances.observerStateId, civilianStances.targetStateId],
			set: {
				stance: sql`greatest(${STANCE_CONFIG.MIN}, least(${STANCE_CONFIG.MAX}, ${civilianStances.stance} + ${change}))`,
				updatedAt: now
			}
		});
	return civilianStance(db, observerStateId, targetStateId);
}

/** The stance a state's civilians currently hold toward a foreign state. */
export async function civilianStance(db: Db, observerStateId: number, targetStateId: number): Promise<number> {
	if (observerStateId === targetStateId) return STANCE_CONFIG.DEFAULT;
	const [row] = await db
		.select({ stance: civilianStances.stance })
		.from(civilianStances)
		.where(
			and(eq(civilianStances.observerStateId, observerStateId), eq(civilianStances.targetStateId, targetStateId))
		)
		.limit(1);
	return row?.stance ?? STANCE_CONFIG.DEFAULT;
}

/** Stance penalty for a strike that harmed `casualties` civilians. */
export function casualtyStancePenalty(casualties: number): number {
	if (casualties <= 0) return 0;
	return -Math.min(
		STANCE_CONFIG.MAX_CASUALTY_PENALTY,
		Math.floor((casualties / 1000) * STANCE_CONFIG.CASUALTY_PENALTY_PER_THOUSAND)
	);
}

export interface StanceRow {
	stateId: number;
	name: string;
	stance: number;
	label: ReturnType<typeof stanceLabel>;
}

/** Every foreign state `observerStateId`'s civilians have an opinion of. */
export async function stancesHeldBy(db: Db, observerStateId: number): Promise<StanceRow[]> {
	const rows = await db
		.select({ stateId: states.id, name: states.name, stance: civilianStances.stance })
		.from(civilianStances)
		.innerJoin(states, eq(civilianStances.targetStateId, states.id))
		.where(eq(civilianStances.observerStateId, observerStateId))
		.orderBy(asc(civilianStances.stance));
	return rows.map((r) => ({ ...r, label: stanceLabel(r.stance) }));
}

/** Every state whose civilians have judged `targetStateId`. */
export async function stancesToward(db: Db, targetStateId: number): Promise<StanceRow[]> {
	const rows = await db
		.select({ stateId: states.id, name: states.name, stance: civilianStances.stance })
		.from(civilianStances)
		.innerJoin(states, eq(civilianStances.observerStateId, states.id))
		.where(eq(civilianStances.targetStateId, targetStateId))
		.orderBy(asc(civilianStances.stance));
	return rows.map((r) => ({ ...r, label: stanceLabel(r.stance) }));
}
