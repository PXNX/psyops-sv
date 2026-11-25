// War and battle records for state, bloc and region pages.
import { desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "#lib/server/db.js";
import {
	accounts,
	battles,
	blocDiplomats,
	blocLeaders,
	blocs,
	ministers,
	partyMembers,
	politicalParties,
	presidents,
	states,
	stateBailouts,
	userProfiles,
	wars
} from "#lib/server/schema.js";

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

import { renamesFor } from "../history/renames.js";

// ── Unified timeline for states, blocs, parties and users ────────────────────

export interface HistoryEntry {
	id: string;
	at: Date;
	kind: "founded" | "leader" | "member" | "war" | "bailout" | "rename";
	title: string;
	detail?: string;
	tone: "neutral" | "blue" | "green" | "red" | "amber";
	/** Current profile name of the person named in the entry, with a link. */
	person?: { id: string; name: string };
}

/** Resolve the current display name for an account, falling back to its email. */
async function personFor(db: Database, userId: string): Promise<{ id: string; name: string }> {
	const [profile] = await db
		.select({ name: userProfiles.name })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, userId))
		.limit(1);
	const [account] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, userId)).limit(1);
	return { id: userId, name: profile?.name || account?.email?.split("@")[0] || "Unknown" };
}

/** Merge the dated records that already exist into one readable timeline. */
export async function historyFor(
	db: Database,
	kind: "state" | "bloc" | "party" | "user",
	id: number | string,
	opts: { oldestFirst?: boolean } = {}
): Promise<HistoryEntry[]> {
	const entries: HistoryEntry[] = [];
	const renames = await renamesFor(db, kind, id);
	for (const rename of renames) {
		const person = await personFor(db, rename.changedBy);
		entries.push({
			id: rename.id,
			at: rename.changedAt,
			kind: "rename",
			title: `renamed from ${rename.oldName} to ${rename.newName}`,
			detail: "name change",
			tone: "amber",
			person
		});
	}
	if (kind === "user") {
		const [account] = await db
			.select()
			.from(accounts)
			.where(eq(accounts.id, String(id)));
		if (account?.createdAt)
			entries.push({
				id: `joined-${id}`,
				at: account.createdAt,
				kind: "founded",
				title: "Joined PsyOps",
				tone: "green"
			});
	} else if (kind === "state") {
		const [state] = await db.select().from(states).where(eq(states.id, id));
		if (state?.createdAt)
			entries.push({
				id: `founded-${id}`,
				at: state.createdAt,
				kind: "founded",
				title: "State founded",
				tone: "green"
			});
		const [president] = await db
			.select({ at: presidents.electedAt, userId: presidents.userId, term: presidents.term })
			.from(presidents)
			.innerJoin(accounts, eq(presidents.userId, accounts.id))
			.where(eq(presidents.stateId, id));
		if (president) {
			const person = await personFor(db, president.userId);
			entries.push({
				id: `president-${id}`,
				at: president.at,
				kind: "leader",
				title: "elected president",
				detail: `Term ${president.term}`,
				tone: "blue",
				person
			});
		}
		const cabinet = await db
			.select({ at: ministers.appointedAt, userId: ministers.userId, ministry: ministers.ministry })
			.from(ministers)
			.innerJoin(accounts, eq(ministers.userId, accounts.id))
			.where(eq(ministers.stateId, id));
		for (const m of cabinet) {
			const person = await personFor(db, m.userId);
			entries.push({
				id: `minister-${m.userId}-${m.ministry}-${m.at.getTime()}`,
				at: m.at,
				kind: "leader",
				title: "appointed minister",
				detail: m.ministry.replaceAll("_", " "),
				tone: "neutral",
				person
			});
		}
		const bailouts = await db.select().from(stateBailouts).where(eq(stateBailouts.recipientStateId, id));
		for (const b of bailouts)
			entries.push({
				id: `bailout-${b.id}`,
				at: b.createdAt,
				kind: "bailout",
				title: `Bailout of $${b.amount.toLocaleString()}`,
				tone: "amber"
			});
		for (const w of await warsOfState(db, id))
			entries.push({
				id: `war-${w.id}`,
				at: w.declaredAt,
				kind: "war",
				title: `War with ${w.side === "attacker" ? w.defender.name : w.attacker.name}`,
				detail: w.result ? `Result: ${w.result}` : "Ongoing",
				tone: w.result === "won" ? "green" : w.result === "lost" ? "red" : "neutral"
			});
	} else if (kind === "bloc") {
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, id));
		if (bloc?.createdAt)
			entries.push({ id: `founded-${id}`, at: bloc.createdAt, kind: "founded", title: "Bloc founded", tone: "green" });
		const leaders = await db
			.select({ at: blocLeaders.appointedAt, userId: blocLeaders.userId })
			.from(blocLeaders)
			.innerJoin(accounts, eq(blocLeaders.userId, accounts.id))
			.where(eq(blocLeaders.blocId, id));
		for (const l of leaders) {
			const person = await personFor(db, l.userId);
			entries.push({
				id: `leader-${l.userId}-${l.at.getTime()}`,
				at: l.at,
				kind: "leader",
				title: "became bloc leader",
				tone: "blue",
				person
			});
		}
		const diplomats = await db
			.select({ at: blocDiplomats.appointedAt, userId: blocDiplomats.userId })
			.from(blocDiplomats)
			.innerJoin(accounts, eq(blocDiplomats.userId, accounts.id))
			.where(eq(blocDiplomats.blocId, id));
		for (const d of diplomats) {
			const person = await personFor(db, d.userId);
			entries.push({
				id: `diplomat-${d.userId}-${d.at.getTime()}`,
				at: d.at,
				kind: "leader",
				title: "appointed diplomat",
				tone: "neutral",
				person
			});
		}
		for (const w of await warsOfBloc(db, id))
			entries.push({
				id: `war-${w.id}`,
				at: w.declaredAt,
				kind: "war",
				title: `Coalition war with ${w.side === "attacker" ? w.defender.name : w.attacker.name}`,
				detail: w.result ? `Result: ${w.result}` : "Ongoing",
				tone: w.result === "won" ? "green" : w.result === "lost" ? "red" : "neutral"
			});
	} else {
		const [party] = await db.select().from(politicalParties).where(eq(politicalParties.id, id));
		if (party?.foundedAt)
			entries.push({
				id: `founded-${id}`,
				at: party.foundedAt,
				kind: "founded",
				title: "Party founded",
				tone: "green"
			});
		const members = await db
			.select({ at: partyMembers.joinedAt, userId: partyMembers.userId, role: partyMembers.role })
			.from(partyMembers)
			.innerJoin(accounts, eq(partyMembers.userId, accounts.id))
			.where(eq(partyMembers.partyId, id));
		for (const m of members) {
			const person = await personFor(db, m.userId);
			entries.push({
				id: `member-${m.userId}-${m.at.getTime()}`,
				at: m.at,
				kind: "member",
				title: m.role === "leader" ? "became party leader" : "joined the party",
				detail: m.role,
				tone: "blue",
				person
			});
		}
	}
	return entries
		.sort((a, b) => (opts.oldestFirst ? a.at.getTime() - b.at.getTime() : b.at.getTime() - a.at.getTime()))
		.slice(0, 60);
}
