// src/lib/server/services/military/covert-ops.ts
// Cyber operations and psyops against the database: who may order them, what
// the planner shows (odds per target and why), launching one (pay, roll,
// leave effects, tell the target), cyber defence, and the operations ledger.
//
// Operations resolve the moment they are launched; their effects then run
// out on their own (state_effects.expiresAt), so no cron is needed. What the
// effects do lives in state-effects.ts, every number in
// config/game/{cyber,psyops}.config.ts.
//
// No SvelteKit virtual modules at the top level (tests import this file);
// push notifications are loaded lazily.
import { and, desc, eq, gt, gte, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	covertOperations,
	governmentBudgetTransactions,
	infiltrationAssets,
	inboxMessages,
	ministers,
	presidents,
	regions,
	stateCyberDefence,
	stateEffects,
	stateTreasury,
	states,
	type CovertOperation,
	type StateEffect
} from "../../schema";
import {
	COVERT_OPS,
	CYBER,
	PSYOPS,
	covertOdds,
	cyberDefenceUpgradeCost,
	datacenterCyberBonus,
	moraleMagnitude,
	postureMagnitude,
	rollOperation,
	theftAmount,
	type CovertOpKind,
	type DisinfoPosture,
	type Odds,
	type StateEffectKind
} from "#lib/config/index.js";
import { enemiesOf, sideOf } from "./recon";
import { activeEffects, hasCasusBelli, isResilient } from "./state-effects";
import { aiLevel, datacenterStocks } from "./ai";
import { statePopulation, statePopulations } from "../population";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

/** An operation the player should see the reason for refusing. */
export class CovertOpError extends Error {}

export type OpsRole = "president" | "defense" | "foreign_affairs";
export const OPS_ROLE_LABEL: Record<OpsRole, string> = {
	president: "President",
	defense: "Minister of Defence",
	foreign_affairs: "Foreign Minister"
};

/**
 * The state a player may order operations for: as its president, or as its
 * defence or foreign minister. Null if they hold none of those offices.
 */
export async function opsAuthority(db: Db, userId: string): Promise<{ stateId: number; role: OpsRole } | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId, ministry: ministers.ministry })
		.from(ministers)
		.where(and(eq(ministers.userId, userId), inArray(ministers.ministry, ["defense", "foreign_affairs"])))
		.limit(1);
	return minister ? { stateId: minister.stateId, role: minister.ministry as OpsRole } : null;
}

/** Cyber defence upgrades are the president's or the defence minister's call. */
export const canUpgradeDefence = (role: OpsRole) => role === "president" || role === "defense";

export async function cyberDefenceLevel(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ level: stateCyberDefence.level })
		.from(stateCyberDefence)
		.where(eq(stateCyberDefence.stateId, stateId));
	return row?.level ?? 0;
}

/** Hostile operations `stateId` launched against `targetStateId` within the heat window. */
async function recentOps(db: Db, stateId: number, targetStateId: number, now: Date): Promise<number> {
	const rows = await db
		.select({ id: covertOperations.id })
		.from(covertOperations)
		.where(
			and(
				eq(covertOperations.stateId, stateId),
				eq(covertOperations.targetStateId, targetStateId),
				ne(covertOperations.kind, "counter_propaganda"),
				gte(covertOperations.launchedAt, new Date(now.getTime() - CYBER.HEAT_WINDOW_HOURS * HOUR))
			)
		);
	return rows.length;
}

/** When `stateId` may launch `kind` again (null = now). */
export async function opCooldownEndsAt(db: Db, stateId: number, kind: CovertOpKind, now = new Date()) {
	const spec = COVERT_OPS[kind];
	const [last] = await db
		.select({ launchedAt: covertOperations.launchedAt })
		.from(covertOperations)
		.where(
			and(
				eq(covertOperations.stateId, stateId),
				eq(covertOperations.kind, kind),
				gt(covertOperations.launchedAt, new Date(now.getTime() - spec.cooldownHours * HOUR))
			)
		)
		.orderBy(desc(covertOperations.launchedAt))
		.limit(1);
	return last ? new Date(last.launchedAt.getTime() + spec.cooldownHours * HOUR) : null;
}

/** Everything the planner needs to know about one possible target. */
export interface TargetIntel {
	id: number;
	name: string;
	/** The state's coat of arms file id, for the planner's dropdown. */
	logo: number | null;
	/** At war with it (bloc wars included). */
	atWar: boolean;
	/** Holding a casus belli on it: may strike as if at war. */
	casusBelli: boolean;
	/** In the planner's own bloc: off limits. */
	ally: boolean;
	defenceLevel: number;
	/** Running counter-propaganda (it's public). */
	resilient: boolean;
	recentOps: number;
	population: number;
	/** Active network assets your state holds inside the target. */
	networkAssets: number;
}

/** The planner's view of every other state. */
export async function targetsFor(db: Db, stateId: number, now = new Date()): Promise<TargetIntel[]> {
	const side = await sideOf(db, stateId);
	const [all, enemies, defence, boosts, beliCause, heat, populations, footholds] = await Promise.all([
		db.select({ id: states.id, name: states.name, logo: states.logo }).from(states),
		enemiesOf(db, side),
		db.select({ stateId: stateCyberDefence.stateId, level: stateCyberDefence.level }).from(stateCyberDefence),
		db
			.select({ stateId: stateEffects.stateId })
			.from(stateEffects)
			.where(and(eq(stateEffects.kind, "morale_boost"), gt(stateEffects.expiresAt, now))),
		db
			.select({ against: stateEffects.sourceStateId })
			.from(stateEffects)
			.where(
				and(eq(stateEffects.stateId, stateId), eq(stateEffects.kind, "casus_belli"), gt(stateEffects.expiresAt, now))
			),
		db
			.select({ target: covertOperations.targetStateId })
			.from(covertOperations)
			.where(
				and(
					eq(covertOperations.stateId, stateId),
					ne(covertOperations.kind, "counter_propaganda"),
					gte(covertOperations.launchedAt, new Date(now.getTime() - CYBER.HEAT_WINDOW_HOURS * HOUR))
				)
			),
		statePopulations(db),
		db
			.select({ target: infiltrationAssets.targetStateId })
			.from(infiltrationAssets)
			.where(and(eq(infiltrationAssets.stateId, stateId), eq(infiltrationAssets.status, "active")))
	]);
	const level = new Map(defence.map((d) => [d.stateId, d.level]));
	const resilient = new Set(boosts.map((b) => b.stateId));
	const cb = new Set(beliCause.map((b) => b.against));
	return all
		.filter((s) => s.id !== stateId)
		.map((s) => ({
			id: s.id,
			name: s.name,
			logo: s.logo,
			atWar: enemies.has(s.id),
			casusBelli: cb.has(s.id),
			ally: side.stateIds.includes(s.id),
			defenceLevel: level.get(s.id) ?? 0,
			resilient: resilient.has(s.id),
			recentOps: heat.filter((h) => h.target === s.id).length,
			population: populations.get(s.id) ?? 0,
			networkAssets: footholds.filter((f) => f.target === s.id).length
		}))
		.sort((a, b) => Number(b.atWar) - Number(a.atWar) || a.name.localeCompare(b.name));
}

export interface LaunchInput {
	userId: string;
	kind: CovertOpKind;
	/** Ignored for counter-propaganda (always your own state). */
	targetStateId?: number;
	/** Disinformation: the region of yours whose picture you falsify. */
	regionId?: number;
	posture?: DisinfoPosture;
	/** Leaflet drop: the text. */
	message?: string;
	now?: Date;
	/** Random source for the rolls (tests); default Math.random. */
	rng?: () => number;
	/** Notify the target's leadership (default true). */
	notify?: boolean;
	/** Extra footholds from an interactive intrusion, added to the network bonus. */
	extraFootholds?: number;
}

export interface LaunchResult {
	operation: CovertOperation;
	odds: Odds;
	effect: StateEffect | null;
	/** Treasury breach: taken from the target and what reached you. */
	stolen: { taken: number; kept: number } | null;
	targetName: string;
}

/**
 * Launch an operation: checks authority, target, war status and cooldown,
 * pays from the treasury, rolls success/detection/attribution, leaves the
 * effect and (if caught in peacetime) a casus belli, all in one transaction.
 * The launching state's treasury row is locked first, so two leaders can't
 * both slip past the cooldown or overdraw it.
 */
export async function launchOperation(db: Database, input: LaunchInput): Promise<LaunchResult> {
	const now = input.now ?? new Date();
	const spec = COVERT_OPS[input.kind];
	if (!spec) throw new CovertOpError("Unknown operation.");
	const rng = input.rng ?? Math.random;

	const result = await db.transaction(async (tx) => {
		const authority = await opsAuthority(tx, input.userId);
		if (!authority) {
			throw new CovertOpError("Only a president, defence minister or foreign minister can order operations.");
		}
		const stateId = authority.stateId;
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		if (!treasury) throw new CovertOpError("Your state has no treasury yet.");

		const targetStateId = spec.self ? stateId : input.targetStateId;
		if (!targetStateId) throw new CovertOpError("Choose a target state.");
		const [target] = await tx
			.select({ id: states.id, name: states.name })
			.from(states)
			.where(eq(states.id, targetStateId));
		if (!target) throw new CovertOpError("That state doesn't exist.");

		const side = await sideOf(tx, stateId);
		let atWar = false;
		let casusBelli = false;
		if (!spec.self) {
			if (side.stateIds.includes(target.id)) throw new CovertOpError("You can't run operations against your own bloc.");
			atWar = (await enemiesOf(tx, side)).has(target.id);
			casusBelli = !atWar && (await hasCasusBelli(tx, stateId, target.id, now));
			if (spec.needsWar && !atWar && !casusBelli) {
				throw new CovertOpError(`A ${spec.label.toLowerCase()} needs a war (or a casus belli) with ${target.name}.`);
			}
		}

		let regionId: number | null = null;
		if (spec.needsRegion) {
			if (!input.regionId) throw new CovertOpError("Choose one of your regions to dress up.");
			const [region] = await tx
				.select({ id: regions.id, stateId: regions.stateId })
				.from(regions)
				.where(eq(regions.id, input.regionId));
			if (!region?.stateId || !side.stateIds.includes(region.stateId)) {
				throw new CovertOpError("Disinformation needs a region your side holds.");
			}
			regionId = region.id;
		}

		let message: string | null = null;
		if (input.kind === "leaflet_drop") {
			message = (input.message ?? "").trim().replace(/\s+/g, " ");
			if (!message) throw new CovertOpError("Write what the leaflet says.");
			if (message.length > PSYOPS.LEAFLET_MAX_CHARS) {
				throw new CovertOpError(`Leaflets fit ${PSYOPS.LEAFLET_MAX_CHARS} characters.`);
			}
		}

		const cooldown = await opCooldownEndsAt(tx, stateId, input.kind, now);
		if (cooldown && cooldown > now) {
			const mins = Math.ceil((cooldown.getTime() - now.getTime()) / 60_000);
			const wait = mins >= 90 ? `${Math.round(mins / 60)} h` : `${mins} min`;
			throw new CovertOpError(`Your ${spec.label.toLowerCase()} teams are ready again in ${wait}.`);
		}

		// Pay.
		const [paid] = await tx
			.update(stateTreasury)
			.set({
				balance: sqlMinus(stateTreasury.balance, spec.cost),
				totalSpent: sqlPlus(stateTreasury.totalSpent, spec.cost),
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, stateId), gte(stateTreasury.balance, spec.cost)))
			.returning({ balance: stateTreasury.balance });
		if (!paid) throw new CovertOpError(`A ${spec.label.toLowerCase()} costs $${spec.cost.toLocaleString()}.`);
		await tx.insert(governmentBudgetTransactions).values({
			stateId,
			transactionType: "covert_operation",
			amount: -spec.cost,
			balanceAfter: paid.balance,
			description: spec.self ? spec.label : `${spec.label} against ${target.name}`,
			authorizedBy: input.userId,
			createdAt: now
		});

		// Roll. The computing base (stocked hardware and datacenters) is read
		// alongside AI capability: both states' machines shape the odds.
		const [defenceLevel, recent, resilient, attackerAi, defenderAi, attackerDc, defenderDc, networkAssets] = await Promise.all([
			spec.self ? 0 : cyberDefenceLevel(tx, target.id),
			spec.self ? 0 : recentOps(tx, stateId, target.id, now),
			spec.self || spec.domain !== "psyops" ? false : isResilient(tx, target.id, now),
			spec.self ? 0 : aiLevel(tx, stateId),
			spec.self ? 0 : aiLevel(tx, target.id),
			spec.self ? { hardware: 0, datacenters: 0 } : datacenterStocks(tx, stateId),
			spec.self ? { hardware: 0, datacenters: 0 } : datacenterStocks(tx, target.id),
			spec.self
				? Promise.resolve(0)
				: tx
						.select({ id: infiltrationAssets.id })
						.from(infiltrationAssets)
						.where(
							and(
								eq(infiltrationAssets.stateId, stateId),
								eq(infiltrationAssets.targetStateId, target.id),
								eq(infiltrationAssets.status, "active")
							)
						)
						.then((rows) => rows.length)
		]);
		const odds = covertOdds(input.kind, {
			defenceLevel,
			atWar: atWar || casusBelli,
			recentOps: recent,
			targetResilient: resilient,
			attackerAiLevel: attackerAi,
			defenderAiLevel: defenderAi,
			attackerDatacenter: datacenterCyberBonus(attackerDc.hardware, attackerDc.datacenters),
			defenderDatacenter: datacenterCyberBonus(defenderDc.hardware, defenderDc.datacenters),
			networkAssets: networkAssets + Math.max(0, input.extraFootholds ?? 0)
		});
		const roll = spec.self
			? { succeeded: true, detected: true, attributed: true }
			: rollOperation(odds, spec.visible, rng);

		let magnitude: number = spec.magnitude;
		if (spec.effect === "morale_shaken" && !spec.self) {
			// Bigger populations are harder to sway; counter-propaganda halves it.
			magnitude = Math.round(moraleMagnitude(spec.magnitude, await statePopulation(tx, target.id), resilient));
		}
		if (input.kind === "disinformation") magnitude = postureMagnitude(input.posture ?? "inflate");
		const effectEndsAt = spec.durationHours ? new Date(now.getTime() + spec.durationHours * HOUR) : null;

		const [operation] = await tx
			.insert(covertOperations)
			.values({
				kind: input.kind,
				launchedBy: input.userId,
				stateId,
				targetStateId: target.id,
				targetRegionId: regionId,
				cost: spec.cost,
				successChance: Math.round(odds.success * 100),
				attributionChance: Math.round(odds.attribution * 100),
				succeeded: roll.succeeded,
				detected: roll.detected,
				attributed: roll.attributed,
				atWar: atWar || casusBelli,
				magnitude,
				message,
				launchedAt: now,
				effectEndsAt: roll.succeeded ? effectEndsAt : null
			})
			.returning();

		let effect: StateEffect | null = null;
		if (roll.succeeded && spec.effect && effectEndsAt) {
			[effect] = await tx
				.insert(stateEffects)
				.values({
					stateId: target.id,
					regionId,
					kind: spec.effect,
					magnitude: Math.max(1, Math.abs(magnitude)) * Math.sign(magnitude || 1),
					sourceStateId: stateId,
					operationId: operation!.id,
					startsAt: now,
					expiresAt: effectEndsAt
				})
				.returning();
		}

		let stolen: LaunchResult["stolen"] = null;
		if (roll.succeeded && input.kind === "financial_theft") {
			stolen = await siphon(tx, { from: target.id, to: stateId, by: input.userId, operation: operation!, now });
		}

		// Caught red-handed in peacetime: the victim may hit back as if at war.
		if (roll.attributed && !atWar && !spec.self) {
			await tx.insert(stateEffects).values({
				stateId: target.id,
				kind: "casus_belli",
				magnitude: 0,
				sourceStateId: stateId,
				operationId: operation!.id,
				startsAt: now,
				expiresAt: new Date(now.getTime() + CYBER.CASUS_BELLI_HOURS * HOUR)
			});
		}

		const [source] = await tx.select({ name: states.name }).from(states).where(eq(states.id, stateId));
		return { operation: operation!, odds, effect, stolen, targetName: target.name, sourceName: source?.name ?? "" };
	});

	if (input.notify !== false && result.operation.detected && !COVERT_OPS[input.kind].self) {
		await notifyTarget(db, result.operation, result.sourceName).catch((err) =>
			console.error("Covert op notification error:", err)
		);
	}
	const { sourceName: _sourceName, ...rest } = result;
	return rest;
}

// Arithmetic in the UPDATE itself, so concurrent writers can't overwrite each other.
type MoneyColumn = typeof stateTreasury.balance | typeof stateTreasury.totalSpent | typeof stateTreasury.totalCollected;
const sqlPlus = (col: MoneyColumn, n: number) => sql`${col} + ${n}`;
const sqlMinus = (col: MoneyColumn, n: number) => sql`${col} - ${n}`;

/** Move the breach's take from the victim's treasury to the thief's (minus laundering losses). */
async function siphon(
	tx: Tx,
	op: { from: number; to: number; by: string; operation: CovertOperation; now: Date }
): Promise<{ taken: number; kept: number }> {
	const [victim] = await tx
		.select({ balance: stateTreasury.balance })
		.from(stateTreasury)
		.where(eq(stateTreasury.stateId, op.from))
		.for("update");
	const taken = theftAmount(victim?.balance ?? 0);
	if (!taken) return { taken: 0, kept: 0 };
	const kept = Math.floor(taken * CYBER.THEFT_KEPT);
	const [after] = await tx
		.update(stateTreasury)
		.set({ balance: sqlMinus(stateTreasury.balance, taken), updatedAt: op.now })
		.where(and(eq(stateTreasury.stateId, op.from), gte(stateTreasury.balance, taken)))
		.returning({ balance: stateTreasury.balance });
	if (!after) return { taken: 0, kept: 0 };
	const [mine] = await tx
		.update(stateTreasury)
		.set({
			balance: sqlPlus(stateTreasury.balance, kept),
			totalCollected: sqlPlus(stateTreasury.totalCollected, kept),
			updatedAt: op.now
		})
		.where(eq(stateTreasury.stateId, op.to))
		.returning({ balance: stateTreasury.balance });
	await tx.update(covertOperations).set({ amount: taken }).where(eq(covertOperations.id, op.operation.id));

	// Both ledgers record it. The victim's names the culprit only if attributed,
	// and is signed by its own president (the ledger needs an account).
	if (mine) {
		await tx.insert(governmentBudgetTransactions).values({
			stateId: op.to,
			transactionType: "covert_theft",
			amount: kept,
			balanceAfter: mine.balance,
			description: "Proceeds of a treasury breach",
			authorizedBy: op.by,
			createdAt: op.now
		});
	}
	const [victimPresident] = await tx
		.select({ userId: presidents.userId })
		.from(presidents)
		.where(eq(presidents.stateId, op.from));
	const signer = victimPresident?.userId ?? (op.operation.attributed ? op.by : null);
	if (signer) {
		const [thief] = await tx.select({ name: states.name }).from(states).where(eq(states.id, op.to));
		await tx.insert(governmentBudgetTransactions).values({
			stateId: op.from,
			transactionType: "covert_theft",
			amount: -taken,
			balanceAfter: after.balance,
			description: op.operation.attributed
				? `Treasury breach traced to ${thief?.name ?? "a foreign state"}`
				: "Treasury breach, origin unknown",
			authorizedBy: signer,
			createdAt: op.now
		});
	}
	return { taken, kept };
}

const DETECTED_SUBJECT: Record<CovertOpKind, string> = {
	grid_attack: "Cyber attack on the power grid",
	c2_disruption: "Our sensor and command networks are jammed",
	financial_theft: "Treasury breach",
	morale_campaign: "Enemy influence campaign",
	disinformation: "Planted intelligence uncovered",
	counter_propaganda: "Counter-propaganda",
	leaflet_drop: "Propaganda leaflets dropped",
	comms_intercept: "Unauthorised intercept on government traffic",
	air_defence_spoof: "Radar network fed false tracks",
	supply_chain: "Compromised supplier software"
};

/** Tell the target's president and ministers what hit them (and who, if attributed). */
async function notifyTarget(db: Database, op: CovertOperation, sourceName: string) {
	const leaders = [
		...(await db
			.select({ userId: presidents.userId })
			.from(presidents)
			.where(eq(presidents.stateId, op.targetStateId))),
		...(await db.select({ userId: ministers.userId }).from(ministers).where(eq(ministers.stateId, op.targetStateId)))
	];
	const recipients = [...new Set(leaders.map((l) => l.userId))];
	if (!recipients.length) return;
	const spec = COVERT_OPS[op.kind as CovertOpKind];
	const who = op.attributed ? `Our analysts traced it to ${sourceName}.` : "Its origin could not be traced.";
	const what = op.succeeded
		? `${spec.label} succeeded against us.`
		: `A ${spec.label.toLowerCase()} against us was detected and stopped.`;
	const cb =
		op.attributed && !op.atWar ? ` This was an act of aggression in peacetime: we hold a casus belli for a week.` : "";
	const subject = `${op.succeeded ? "" : "Thwarted: "}${DETECTED_SUBJECT[op.kind as CovertOpKind]}`;
	await db.insert(inboxMessages).values(
		recipients.map((recipientId) => ({
			recipientId,
			// The inbox needs a sender: the culprit's officer if known, else a note to self.
			senderId: op.attributed ? op.launchedBy : recipientId,
			messageType: "system" as const,
			stateId: op.targetStateId,
			subject,
			content: `${what} ${who}${cb} See /ops for details.`
		}))
	);
	void (async () => {
		const { sendNotificationIfEnabled } = await import("../push-notification.service");
		await Promise.allSettled(
			recipients.map((userId) =>
				sendNotificationIfEnabled(userId, "notifyBattleResults", {
					title: subject,
					body: `${what} ${who}`,
					icon: "/favicon.png",
					badge: "/badge.png",
					data: { url: "/ops", tag: `covert-${op.id}` }
				})
			)
		);
	})().catch((err) => console.error("Covert op push error:", err));
}

// ── Cyber defence ───────────────────────────────────────────────────────────

/** Raise the state's cyber defence one level, paid from the treasury. Returns the new level. */
export async function upgradeCyberDefence(db: Database, userId: string, now = new Date()): Promise<number> {
	return db.transaction(async (tx) => {
		const authority = await opsAuthority(tx, userId);
		if (!authority || !canUpgradeDefence(authority.role)) {
			throw new CovertOpError("Only the president or the defence minister can fund cyber defence.");
		}
		const { stateId } = authority;
		await tx
			.select({ id: stateTreasury.id })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.for("update");
		const level = await cyberDefenceLevel(tx, stateId);
		const cost = cyberDefenceUpgradeCost(level);
		if (cost === null) throw new CovertOpError("Cyber defence is already at its highest level.");
		const [paid] = await tx
			.update(stateTreasury)
			.set({
				balance: sqlMinus(stateTreasury.balance, cost),
				totalSpent: sqlPlus(stateTreasury.totalSpent, cost),
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, stateId), gte(stateTreasury.balance, cost)))
			.returning({ balance: stateTreasury.balance });
		if (!paid) throw new CovertOpError(`Level ${level + 1} costs $${cost.toLocaleString()}.`);
		await tx
			.insert(stateCyberDefence)
			.values({ stateId, level: level + 1, upgradedBy: userId, upgradedAt: now })
			.onConflictDoUpdate({
				target: stateCyberDefence.stateId,
				set: { level: level + 1, upgradedBy: userId, upgradedAt: now }
			});
		await tx.insert(governmentBudgetTransactions).values({
			stateId,
			transactionType: "cyber_defence",
			amount: -cost,
			balanceAfter: paid.balance,
			description: `Cyber defence level ${level + 1}`,
			authorizedBy: userId,
			createdAt: now
		});
		return level + 1;
	});
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** Operations a state launched, and the ones against it that it detected, newest first. */
export async function opsLedger(db: Db, stateId: number, limit = 40) {
	const [ours, against] = await Promise.all([
		db
			.select()
			.from(covertOperations)
			.where(eq(covertOperations.stateId, stateId))
			.orderBy(desc(covertOperations.launchedAt))
			.limit(limit),
		db
			.select()
			.from(covertOperations)
			.where(
				and(
					eq(covertOperations.targetStateId, stateId),
					ne(covertOperations.stateId, stateId),
					eq(covertOperations.detected, true)
				)
			)
			.orderBy(desc(covertOperations.launchedAt))
			.limit(limit)
	]);
	return { ours, against };
}

export interface KnownEffect {
	id: number;
	kind: StateEffectKind;
	magnitude: number;
	expiresAt: string;
	regionId: number | null;
	/** Who caused it, if the viewer knows. */
	sourceStateId: number | null;
}

/**
 * The effects on `stateId` a viewer may know about. The affected state sees
 * everything it detected (planted intel only once uncovered), and who did it
 * if attributed; the culprit's side sees its own handiwork; everyone else
 * only sees what has been publicly attributed. Counter-propaganda is public.
 */
export async function knownEffects(
	db: Db,
	stateId: number,
	viewerStateIds: number[],
	now = new Date()
): Promise<KnownEffect[]> {
	const rows = await db
		.select({ effect: stateEffects, op: covertOperations })
		.from(stateEffects)
		.leftJoin(covertOperations, eq(stateEffects.operationId, covertOperations.id))
		.where(and(eq(stateEffects.stateId, stateId), gt(stateEffects.expiresAt, now)));
	const own = viewerStateIds.includes(stateId);
	return rows
		.filter(({ effect, op }) => {
			if (effect.kind === "morale_boost") return true;
			if (effect.sourceStateId && viewerStateIds.includes(effect.sourceStateId)) return true;
			if (!op) return own;
			if (own) return op.detected;
			return op.attributed;
		})
		.map(({ effect, op }) => ({
			id: effect.id,
			kind: effect.kind as StateEffectKind,
			magnitude: effect.magnitude,
			expiresAt: effect.expiresAt.toISOString(),
			regionId: effect.regionId,
			sourceStateId:
				effect.kind === "morale_boost" ||
				effect.kind === "casus_belli" ||
				op?.attributed ||
				(effect.sourceStateId && viewerStateIds.includes(effect.sourceStateId))
					? effect.sourceStateId
					: null
		}));
}

/** Active effects a state is running on others (its own operations' results). */
export async function effectsCausedBy(db: Db, stateId: number, now = new Date()) {
	return db
		.select()
		.from(stateEffects)
		.where(
			and(
				eq(stateEffects.sourceStateId, stateId),
				gt(stateEffects.expiresAt, now),
				ne(stateEffects.kind, "casus_belli")
			)
		)
		.orderBy(stateEffects.expiresAt);
}

export { activeEffects };
