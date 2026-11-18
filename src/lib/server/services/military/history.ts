// War and battle records for state, bloc and region pages.
import { desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "#lib/server/db.js";
import { battles, states, wars } from "#lib/server/schema.js";

export interface WarRecord {
	id: number;
	status: "active" | "ended";
	declaredAt: Date;
	endedAt: Date | null;
	endedReason: string | null;
	attacker: { id: number; name: string };
	defender: { id: number; name: string };
	/** From the perspective of the state/bloc whose history this is. */
	side: "attacker" | "defender";
	/** won / lost / draw for ended wars, null while active. */
	result: "won" | "lost" | "draw" | null;
	battles: number;
}

export interface BattleRecord {
	id: number;
	warId: number;
	status: string;
	startedAt: Date;
	endedAt: Date | null;
	attacker: { id: number; name: string };
	defender: { id: number; name: string };
	buildingsDestroyed: Partial<Record<string, number>> | null;
}

const attackerState = alias(states, "attacker_state");
const defenderState = alias(states, "defender_state");

async function warRecords(db: Database, where: SQL, isOurs: (w: typeof wars.$inferSelect) => boolean) {
	const rows = await db
		.select({
			war: wars,
			attackerName: attackerState.name,
			defenderName: defenderState.name,
			attackerCapitulated: attackerState.capitulated
		})
		.from(wars)
		.innerJoin(attackerState, eq(wars.attackerId, attackerState.id))
		.innerJoin(defenderState, eq(wars.defenderId, defenderState.id))
		.where(where)
		.orderBy(desc(wars.declaredAt))
		.limit(30);
	if (rows.length === 0) return [];

	const battleRows = await db
		.select({ warId: battles.warId, status: battles.status })
		.from(battles)
		.where(
			inArray(
				battles.warId,
				rows.map((r) => r.war.id)
			)
		);

	return rows.map(({ war, attackerName, defenderName, attackerCapitulated }): WarRecord => {
		const side = isOurs(war) ? "attacker" : "defender";
		const warBattles = battleRows.filter((b) => b.warId === war.id);
		let result: WarRecord["result"] = null;
		if (war.status === "ended") {
			if (war.endedReason === "surrender" || war.endedReason === "capitulation") {
				// The side that gave up (or ran out of land) lost.
				const loserIsAttacker = war.surrenderedBy != null ? war.surrenderedBy === war.attackerId : attackerCapitulated;
				result = (side === "attacker") === loserIsAttacker ? "lost" : "won";
			} else {
				result = "draw";
			}
		}
		return {
			id: war.id,
			status: war.status as WarRecord["status"],
			declaredAt: war.declaredAt,
			endedAt: war.endedAt,
			endedReason: war.endedReason,
			attacker: { id: war.attackerId, name: attackerName },
			defender: { id: war.defenderId, name: defenderName },
			side,
			result,
			battles: warBattles.length
		};
	});
}

/** Every war a state fought, newest first. */
export function warsOfState(db: Database, stateId: number) {
	return warRecords(
		db,
		or(eq(wars.attackerId, stateId), eq(wars.defenderId, stateId))!,
		(w) => w.attackerId === stateId
	);
}

/** Every war a bloc took part in as a coalition, newest first. */
export function warsOfBloc(db: Database, blocId: number) {
	return warRecords(
		db,
		or(eq(wars.attackerBlocId, blocId), eq(wars.defenderBlocId, blocId))!,
		(w) => w.attackerBlocId === blocId
	);
}

/** Every battle fought over a region, newest first. */
export async function battlesInRegion(db: Database, regionId: number): Promise<BattleRecord[]> {
	const rows = await db
		.select({
			battle: battles,
			attackerName: attackerState.name,
			defenderName: defenderState.name
		})
		.from(battles)
		.innerJoin(attackerState, eq(battles.attackerStateId, attackerState.id))
		.innerJoin(defenderState, eq(battles.defenderStateId, defenderState.id))
		.where(eq(battles.regionId, regionId))
		.orderBy(desc(battles.startedAt))
		.limit(30);
	return rows.map(({ battle, attackerName, defenderName }) => ({
		id: battle.id,
		warId: battle.warId,
		status: battle.status,
		startedAt: battle.startedAt,
		endedAt: battle.endedAt,
		attacker: { id: battle.attackerStateId, name: attackerName },
		defender: { id: battle.defenderStateId, name: defenderName },
		buildingsDestroyed: battle.buildingsDestroyed ?? null
	}));
}
