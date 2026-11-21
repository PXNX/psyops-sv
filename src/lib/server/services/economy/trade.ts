// src/lib/server/services/economy/trade.ts
// Legal air and sea trade lanes, airspace/EEZ closures, and the revenue that
// flows while the lanes stay open. Closures are read on demand (their rows
// carry an expiry) and the revenue is collected by a scheduled cron.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	closedZones,
	governmentBudgetTransactions,
	ministers,
	presidents,
	stateTreasury,
	states,
	tradeLanes
} from "../../schema";
import {
	CLOSURES,
	TRADE_LANES,
	closureCost,
	closureStrength,
	tradeFlow,
	laneCost,
	laneRevenue,
	type ClosureKind,
	type TradeKind
} from "#lib/config/index.js";
import { blockadeStrengthOn } from "../military/naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

export class TradeError extends Error {}

export type TradeRole = "president" | "economy" | "foreign_affairs" | "defense";
export const TRADE_ROLE_LABEL: Record<TradeRole, string> = {
	president: "President",
	economy: "Minister of the Economy",
	foreign_affairs: "Foreign Minister",
	defense: "Minister of Defence"
};

/** Who may open trade lanes (economic portfolio). */
export async function tradeAuthority(db: Db, userId: string): Promise<{ stateId: number; role: TradeRole } | null> {
	const [president] = await db.select({ stateId: presidents.stateId }).from(presidents).where(eq(presidents.userId, userId)).limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId, ministry: ministers.ministry })
		.from(ministers)
		.where(eq(ministers.userId, userId))
		.limit(1);
	if (minister && (minister.ministry === "economy" || minister.ministry === "foreign_affairs"))
		return { stateId: minister.stateId, role: minister.ministry };
	return null;
}

/** Who may close airspace or an EEZ (foreign/security portfolio). */
export async function closureAuthority(db: Db, userId: string): Promise<{ stateId: number; role: TradeRole } | null> {
	const [president] = await db.select({ stateId: presidents.stateId }).from(presidents).where(eq(presidents.userId, userId)).limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId, ministry: ministers.ministry })
		.from(ministers)
		.where(eq(ministers.userId, userId))
		.limit(1);
	if (minister && (minister.ministry === "foreign_affairs" || minister.ministry === "defense"))
		return { stateId: minister.stateId, role: minister.ministry };
	return null;
}

// ── Lanes ───────────────────────────────────────────────────────────────────

export interface OpenLaneInput {
	stateId: number;
	openedBy: string;
	partnerStateId: number;
	kind: TradeKind;
	capacity: number;
}

export interface LaneResult {
	laneId: number;
	cost: number;
	flow: number;
}

export async function openTradeLane(db: Database, input: OpenLaneInput): Promise<LaneResult> {
	const spec = TRADE_LANES[input.kind];
	if (!spec) throw new TradeError("Unknown lane type.");
	if (input.partnerStateId === input.stateId) throw new TradeError("A state cannot trade with itself.");
	const capacity = Math.floor(input.capacity);
	if (capacity < spec.minCapacity || capacity > spec.maxCapacity)
		throw new TradeError(`Lane capacity must be between ${spec.minCapacity} and ${spec.maxCapacity}.`);

	return db.transaction(async (tx) => {
		const [partner] = await tx.select({ name: states.name }).from(states).where(eq(states.id, input.partnerStateId));
		if (!partner) throw new TradeError("That partner state doesn't exist.");
		const [existing] = await tx
			.select({ id: tradeLanes.id })
			.from(tradeLanes)
			.where(
				and(
					eq(tradeLanes.stateId, input.stateId),
					eq(tradeLanes.partnerStateId, input.partnerStateId),
					eq(tradeLanes.kind, input.kind),
					eq(tradeLanes.active, true)
				)
			)
			.limit(1);
		if (existing) throw new TradeError("That lane is already open.");
		const cost = laneCost(input.kind, capacity);
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new TradeError(`The treasury needs ${cost.toLocaleString()} to open this lane.`);
		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, input.stateId));
		const [lane] = await tx
			.insert(tradeLanes)
			.values({
				stateId: input.stateId,
				partnerStateId: input.partnerStateId,
				kind: input.kind,
				capacity,
				openedBy: input.openedBy
			})
			.returning({ id: tradeLanes.id });
		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "trade_lane",
			amount: cost,
			balanceAfter: Number(treasury.balance) - cost,
			description: `Opened ${spec.label.toLowerCase()} to ${partner.name}`,
			authorizedBy: input.openedBy
		});
		const factors = await tradeFactors(tx, input.stateId);
		return { laneId: lane.id, cost, flow: factors[input.kind] };
	});
}

/** Active lanes owned by a state, with partner names resolved by the caller. */
export async function lanesOf(db: Db, stateId: number) {
	return db.select().from(tradeLanes).where(and(eq(tradeLanes.stateId, stateId), eq(tradeLanes.active, true)));
}

// ── Closures ────────────────────────────────────────────────────────────────

export interface CloseZoneInput {
	stateId: number;
	orderedBy: string;
	kind: ClosureKind;
	targetStateId?: number | null;
	hours: number;
	strength?: number;
	now?: Date;
}

export interface ClosureResult {
	zoneId: number;
	cost: number;
	expiresAt: Date;
	message: string;
}

export async function closeZone(db: Database, input: CloseZoneInput): Promise<ClosureResult> {
	const spec = CLOSURES[input.kind];
	if (!spec) throw new TradeError("Unknown closure kind.");
	const hours = Math.floor(input.hours);
	if (hours < spec.minHours || hours > spec.maxHours)
		throw new TradeError(`A closure must last between ${spec.minHours} and ${spec.maxHours} hours.`);
	const now = input.now ?? new Date();
	const strength = Math.max(1, Math.min(100, Math.floor(input.strength ?? 100)));

	return db.transaction(async (tx) => {
		const [recent] = await tx
			.select({ id: closedZones.id })
			.from(closedZones)
			.where(
				and(
					eq(closedZones.stateId, input.stateId),
					eq(closedZones.kind, input.kind),
					gt(closedZones.createdAt, new Date(now.getTime() - spec.cooldownHours * HOUR))
				)
			)
			.limit(1);
		if (recent) throw new TradeError(`That zone was closed recently; wait ${spec.cooldownHours} h before closing it again.`);
		const cost = closureCost(input.kind, hours);
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new TradeError(`The treasury needs ${cost.toLocaleString()} to close this zone.`);
		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: now
			})
			.where(eq(stateTreasury.stateId, input.stateId));
		const expiresAt = new Date(now.getTime() + hours * HOUR);
		const [zone] = await tx
			.insert(closedZones)
			.values({
				stateId: input.stateId,
				kind: input.kind,
				targetStateId: input.targetStateId ?? null,
				strength,
				orderedBy: input.orderedBy,
				startsAt: now,
				expiresAt
			})
			.returning({ id: closedZones.id });
		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "zone_closure",
			amount: cost,
			balanceAfter: Number(treasury.balance) - cost,
			description: `${spec.label} (${input.targetStateId ? `against state ${input.targetStateId}` : "all traffic"}) for ${hours} h`,
			authorizedBy: input.orderedBy
		});
		return {
			zoneId: zone.id,
			cost,
			expiresAt,
			message: `${spec.label} in force until ${expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC.`
		};
	});
}

/** Active closures affecting a state (global closures included, own excluded). */
export async function closuresOn(db: Db, stateId: number, now = new Date()) {
	return db
		.select()
		.from(closedZones)
		.where(
			and(
				sql`${closedZones.stateId} <> ${stateId}`,
				or(eq(closedZones.targetStateId, stateId), isNull(closedZones.targetStateId)),
				lte(closedZones.startsAt, now),
				gt(closedZones.expiresAt, now)
			)
		);
}

/** Closures a state has imposed, for its own overview. */
export async function closuresBy(db: Db, stateId: number, now = new Date()) {
	return db
		.select()
		.from(closedZones)
		.where(and(eq(closedZones.stateId, stateId), gt(closedZones.expiresAt, now)));
}

/** Current air/sea trade flow for a state (0-1 each). */
export async function tradeFactors(db: Db, stateId: number, now = new Date()): Promise<Record<TradeKind, number>> {
	const [zones, blockade] = await Promise.all([closuresOn(db, stateId, now), blockadeStrengthOn(db, stateId, now)]);
	const air = closureStrength(zones.filter((z) => z.kind === "airspace").map((z) => z.strength / 100));
	const eez = closureStrength(zones.filter((z) => z.kind === "eez").map((z) => z.strength / 100));
	return {
		air: tradeFlow("air", air),
		sea: tradeFlow("sea", eez, blockade)
	};
}

/** Closure strength of one kind against a state, for strike/smuggling checks. */
export async function zoneStrengthOn(db: Db, stateId: number, kind: ClosureKind, now = new Date()): Promise<number> {
	const zones = await closuresOn(db, stateId, now);
	return closureStrength(zones.filter((z) => z.kind === kind).map((z) => z.strength / 100));
}

// ── Revenue ─────────────────────────────────────────────────────────────────

export interface TradeRevenueSummary {
	lanes: number;
	states: number;
	total: number;
}

/** Credit every active lane's owner with one cycle of trade revenue. */
export async function collectTradeRevenue(db: Database, now = new Date()): Promise<TradeRevenueSummary> {
	return db.transaction(async (tx) => {
		const lanes = await tx.select().from(tradeLanes).where(eq(tradeLanes.active, true));
		const byOwner = new Map<number, number>();
		for (const lane of lanes) {
			const factors: Record<TradeKind, number> = await tradeFactors(tx, lane.stateId, now);
			const flow = lane.kind === "air" ? factors.air : factors.sea;
			const revenue = laneRevenue(lane.kind, lane.capacity, flow);
			if (revenue > 0) byOwner.set(lane.stateId, (byOwner.get(lane.stateId) ?? 0) + revenue);
		}
		let states = 0;
		let total = 0;
		for (const [stateId, amount] of byOwner) {
			await tx
				.update(stateTreasury)
				.set({ balance: sql`${stateTreasury.balance} + ${amount}`, updatedAt: now })
				.where(eq(stateTreasury.stateId, stateId));
			const [leader] = await tx
				.select({ userId: presidents.userId })
				.from(presidents)
				.where(eq(presidents.stateId, stateId))
				.limit(1);
			if (leader) {
				await tx.insert(governmentBudgetTransactions).values({
					stateId,
					transactionType: "trade_revenue",
					amount,
					balanceAfter: amount,
					description: `Trade revenue: ${amount.toLocaleString()}`,
					authorizedBy: leader.userId
				});
			}
			states++;
			total += amount;
		}
		return { lanes: lanes.length, states, total };
	});
}
