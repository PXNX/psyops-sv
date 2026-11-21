// src/lib/server/services/military/state-effects.ts
// Reading the time-limited effects covert operations leave on states (grid
// down, sensors jammed, morale shaken, planted intel, ...), and what they are
// worth to the systems they touch: recon, battles, factories, war weariness.
//
// Only reads, and no imports from recon.ts or covert-ops.ts, so recon and the
// battle engine can use it without an import cycle. Launching operations
// lives in covert-ops.ts; the numbers in config/game/{cyber,psyops}.config.ts.
import { and, desc, eq, gt, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { Database } from "../../db";
import { covertOperations, stateEffects, type StateEffect } from "../../schema";
import {
	CYBER,
	NEUTRAL_PSYOPS,
	gridFactor,
	psyopsBattleModifier,
	psyopsExhaustion,
	type CovertOpKind,
	type PsyopsBattleModifier,
	type StateEffectKind
} from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** Effects working on any of `stateIds` at `now`, optionally only some kinds. */
export async function activeEffects(
	db: Db,
	stateIds: number[],
	opts: { now?: Date; kinds?: StateEffectKind[]; regionId?: number } = {}
): Promise<StateEffect[]> {
	if (!stateIds.length) return [];
	const now = opts.now ?? new Date();
	return db
		.select()
		.from(stateEffects)
		.where(
			and(
				inArray(stateEffects.stateId, stateIds),
				lte(stateEffects.startsAt, now),
				gt(stateEffects.expiresAt, now),
				opts.kinds?.length ? inArray(stateEffects.kind, opts.kinds) : undefined,
				opts.regionId !== undefined ? eq(stateEffects.regionId, opts.regionId) : undefined
			)
		);
}

const strongest = (effects: StateEffect[]) => effects.reduce((m, e) => Math.max(m, e.magnitude), 0);

/** Percent the state's grid is degraded by (0 = intact). */
export async function gridDegradation(db: Db, stateId: number | null, now = new Date()): Promise<number> {
	if (!stateId) return 0;
	return strongest(await activeEffects(db, [stateId], { now, kinds: ["grid_degraded"] }));
}

/** Percent the state's sensors and command links are jammed by (0 = clear). */
export async function c2Degradation(db: Db, stateId: number, now = new Date()): Promise<number> {
	return strongest(await activeEffects(db, [stateId], { now, kinds: ["c2_degraded"] }));
}

/** Recon pass duration multiplier for a state (C2 disruption slows it). */
export async function reconDelayFactor(db: Db, stateId: number, now = new Date()): Promise<number> {
	return (await c2Degradation(db, stateId, now)) > 0 ? CYBER.C2_RECON_DELAY : 1;
}

/**
 * Intel planted for `side` about a region: the signed magnitude of the
 * strongest active deception (null = none). Planted against one state, it
 * fools that state's whole side, since they share their reports.
 */
export async function deceptionFor(
	db: Db,
	sideStateIds: number[],
	regionId: number,
	now = new Date()
): Promise<number | null> {
	const effects = await activeEffects(db, sideStateIds, { now, kinds: ["deception"], regionId });
	if (!effects.length) return null;
	return effects.reduce((best, e) => (Math.abs(e.magnitude) > Math.abs(best) ? e.magnitude : best), 0);
}

/** Battle output modifier for a state from morale, counter-propaganda and C2 disruption. */
export async function stateBattleModifier(db: Db, stateId: number, now = new Date()): Promise<PsyopsBattleModifier> {
	const effects = await activeEffects(db, [stateId], {
		now,
		kinds: ["morale_shaken", "morale_boost", "c2_degraded"]
	});
	if (!effects.length) return NEUTRAL_PSYOPS;
	const of = (k: StateEffectKind) => effects.filter((e) => e.kind === k).map((e) => e.magnitude);
	return psyopsBattleModifier({ morale: of("morale_shaken"), boosts: of("morale_boost"), c2: of("c2_degraded") });
}

/** Both sides' psyops/C2 battle modifiers (called by the battle engine each round). */
export async function battlePsyops(
	db: Db,
	battle: { attackerStateId: number; defenderStateId: number },
	now = new Date()
): Promise<{ attacker: PsyopsBattleModifier; defender: PsyopsBattleModifier }> {
	const [attacker, defender] = await Promise.all([
		stateBattleModifier(db, battle.attackerStateId, now),
		stateBattleModifier(db, battle.defenderStateId, now)
	]);
	return { attacker, defender };
}

/** Whether the state is running counter-propaganda right now. */
export async function isResilient(db: Db, stateId: number, now = new Date()): Promise<boolean> {
	return (await activeEffects(db, [stateId], { now, kinds: ["morale_boost"] })).length > 0;
}

/** Whether `holder` may treat `against` as an enemy thanks to a casus belli. */
export async function hasCasusBelli(db: Db, holder: number, against: number, now = new Date()): Promise<boolean> {
	const [row] = await db
		.select({ id: stateEffects.id })
		.from(stateEffects)
		.where(
			and(
				eq(stateEffects.stateId, holder),
				eq(stateEffects.kind, "casus_belli"),
				eq(stateEffects.sourceStateId, against),
				gt(stateEffects.expiresAt, now)
			)
		)
		.limit(1);
	return !!row;
}

/**
 * Extra exhaustion psyops added to a war: successful morale campaigns and
 * leaflet drops between its two belligerents since it was declared.
 */
export async function warPsyopsExhaustion(
	db: Db,
	war: { attackerId: number; defenderId: number; declaredAt: Date },
	now = new Date()
): Promise<number> {
	const rows = await db
		.select({ kind: covertOperations.kind })
		.from(covertOperations)
		.where(
			and(
				eq(covertOperations.succeeded, true),
				inArray(covertOperations.kind, ["morale_campaign", "leaflet_drop"]),
				gte(covertOperations.launchedAt, war.declaredAt),
				lte(covertOperations.launchedAt, now),
				or(
					and(eq(covertOperations.stateId, war.attackerId), eq(covertOperations.targetStateId, war.defenderId)),
					and(eq(covertOperations.stateId, war.defenderId), eq(covertOperations.targetStateId, war.attackerId))
				)
			)
		);
	return psyopsExhaustion(rows.map((r) => r.kind as CovertOpKind));
}

/** Leaflets currently lying in a state's streets, newest first. */
export async function activeLeaflets(db: Db, stateId: number, now = new Date()) {
	return db
		.select({
			id: covertOperations.id,
			message: covertOperations.message,
			attributed: covertOperations.attributed,
			sourceStateId: covertOperations.stateId,
			launchedAt: covertOperations.launchedAt,
			effectEndsAt: covertOperations.effectEndsAt
		})
		.from(covertOperations)
		.where(
			and(
				eq(covertOperations.kind, "leaflet_drop"),
				eq(covertOperations.targetStateId, stateId),
				eq(covertOperations.succeeded, true),
				or(isNull(covertOperations.effectEndsAt), gt(covertOperations.effectEndsAt, now)),
				lte(covertOperations.launchedAt, now)
			)
		)
		.orderBy(desc(covertOperations.launchedAt))
		.limit(5);
}

/**
 * A state's energy capacity as it stands: a grid attack takes its share of
 * totalProduction offline until it expires (usedProduction is unchanged).
 */
export async function effectiveEnergy<T extends { totalProduction: number; usedProduction: number }>(
	db: Db,
	stateId: number | null,
	energy: T,
	now = new Date()
): Promise<T & { gridDegraded: number }> {
	const degraded = await gridDegradation(db, stateId, now);
	// Sea domain: a blockade cuts imported fuel, so part of the grid goes dark.
	// Imported lazily to avoid a module cycle (naval.ts uses hasCasusBelli here).
	const { blockadeEffectsOn } = await import("./naval");
	const blockade = stateId ? await blockadeEffectsOn(db, stateId, now) : null;
	return {
		...energy,
		totalProduction: Math.floor(energy.totalProduction * gridFactor(degraded) * (blockade?.energyFactor ?? 1)),
		gridDegraded: degraded,
		blockadeTradeFactor: blockade?.tradeFactor ?? 1
	};
}
