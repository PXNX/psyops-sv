// src/lib/server/services/military/convoys.ts
// Player-ordered logistics: relief convoys that restore a region's carrying
// capacity, and repair crews that rebuild infrastructure a strategic strike
// tore down. Both are paid for in treasury and machine tools, and both can be
// undone by the next blockade or airstrike.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	presidents,
	regionEffects,
	regions,
	stateProductInventory,
	stateTreasury,
	states,
	supplyConvoys
} from "../../schema";
import {
	CONVOY,
	REPAIR,
	convoyBoost,
	convoyCost,
	convoyCargoLimit,
	convoyInterdictionChance,
	convoyTravelHours,
	repairCost,
	canRepair
} from "#lib/config/index.js";
import { blockadeStrengthOn, seaControlOf } from "./naval";
import { regionSupply } from "./logistics";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

export class ConvoyError extends Error {}

export type ConvoyRole = "president" | "economy";
export const CONVOY_ROLE_LABEL: Record<ConvoyRole, string> = {
	president: "President",
	economy: "Minister of the Economy"
};

/** Who may order logistics work: president or economy minister. */
export async function convoyAuthority(db: Db, userId: string): Promise<{ stateId: number; role: ConvoyRole } | null> {
	const [president] = await db.select({ stateId: presidents.stateId }).from(presidents).where(eq(presidents.userId, userId)).limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId })
		.from(ministers)
		.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "economy")))
		.limit(1);
	return minister ? { stateId: minister.stateId, role: "economy" } : null;
}

/** Great-circle distance between two regions, from their map coordinates. */
export function regionDistanceKm(a: { latitude: unknown; longitude: unknown }, b: { latitude: unknown; longitude: unknown }): number {
	const toNum = (v: unknown) => Number(v ?? 0);
	const lat1 = toNum(a.latitude) * Math.PI / 180;
	const lat2 = toNum(b.latitude) * Math.PI / 180;
	const dLat = lat2 - lat1;
	const dLon = (toNum(b.longitude) - toNum(a.longitude)) * Math.PI / 180;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LaunchConvoyInput {
	stateId: number;
	orderedBy: string;
	originRegionId: number;
	targetRegionId: number;
	cargo: number;
	rng?: () => number;
	now?: Date;
}

export interface ConvoyResult {
	convoyId: number;
	outcome: "delivered" | "intercepted" | "lost";
	interceptionChance: number;
	travelHours: number;
	cost: number;
	deliveredCargo: number;
	message: string;
}

/**
 * Dispatch a relief convoy. Its cargo only counts if it gets through: a
 * blockade and the enemy's sea power raise the chance of interception, while
 * the state's own hulls escort it and cut that risk.
 */
export async function launchSupplyConvoy(db: Database, input: LaunchConvoyInput): Promise<ConvoyResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const cargo = Math.floor(input.cargo);
	if (!Number.isInteger(cargo) || cargo <= 0) throw new ConvoyError("Choose a positive cargo.");
	if (input.originRegionId === input.targetRegionId) throw new ConvoyError("Choose two different regions.");

	return db.transaction(async (tx) => {
		const [origin, target] = await Promise.all([
			tx.select().from(regions).where(eq(regions.id, input.originRegionId)),
			tx.select().from(regions).where(eq(regions.id, input.targetRegionId))
		]);
		if (!origin[0] || !target[0]) throw new ConvoyError("One of those regions doesn't exist.");
		if (origin[0].stateId !== input.stateId || target[0].stateId !== input.stateId)
			throw new ConvoyError("Convoys can only run between regions of your own state.");

		const supply = await regionSupply(tx, input.originRegionId, now);
		const limit = convoyCargoLimit(supply.capacity, supply.demand);
		if (cargo > limit)
			throw new ConvoyError(`The origin can spare at most ${limit} supply units; its own units and factories need the rest.`);

		const cost = convoyCost(cargo);
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new ConvoyError(`The treasury needs ${cost.toLocaleString()} to dispatch this convoy.`);

		const escorts = await seaControlOf(tx, input.stateId);
		const blockade = await blockadeStrengthOn(tx, input.stateId, now);
		const chance = convoyInterdictionChance(blockade, escorts);
		const intercepted = rng() < chance;
		const outcome: ConvoyResult["outcome"] = intercepted ? (rng() < 0.5 ? "intercepted" : "lost") : "delivered";
		const travelHours = convoyTravelHours(regionDistanceKm(origin[0], target[0]));

		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: now
			})
			.where(eq(stateTreasury.stateId, input.stateId));

		let deliveredCargo = 0;
		if (outcome === "delivered") {
			deliveredCargo = cargo;
			const targetSupply = await regionSupply(tx, input.targetRegionId, now);
			const boost = convoyBoost(cargo, targetSupply.demand);
			if (boost > 0) {
				await tx.insert(regionEffects).values({
					regionId: input.targetRegionId,
					stateId: input.stateId,
					kind: "supply_boost",
					// Negative magnitude is a boost; positive magnitudes are cuts.
					magnitude: -boost,
					startsAt: now,
					expiresAt: new Date(now.getTime() + (CONVOY.BOOST_HOURS + travelHours) * HOUR)
				});
			}
		}

		const [convoy] = await tx
			.insert(supplyConvoys)
			.values({
				stateId: input.stateId,
				originRegionId: input.originRegionId,
				targetRegionId: input.targetRegionId,
				orderedBy: input.orderedBy,
				cargo,
				escortPoints: escorts,
				interceptionChance: Math.round(chance * 100),
				travelHours,
				cost,
				outcome
			})
			.returning({ id: supplyConvoys.id });

		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "supply_convoy",
			amount: cost,
			balanceAfter: Number(treasury.balance) - cost,
			description: `Supply convoy: ${cargo} units to region ${input.targetRegionId} (${outcome})`,
			authorizedBy: input.orderedBy
		});

		const message =
			outcome === "delivered"
				? `Convoy delivered ${cargo} supply units; the region's roads carry more for ${CONVOY.BOOST_HOURS} h.`
				: `Convoy ${outcome}: the cargo never reached region ${input.targetRegionId}.`;
		return { convoyId: convoy.id, outcome, interceptionChance: chance, travelHours, cost, deliveredCargo, message };
	});
}

export interface RepairResult {
	regionId: number;
	level: number;
	cost: number;
	tools: number;
	message: string;
}

/** Rebuild one infrastructure level a strike knocked down. */
export async function repairInfrastructure(db: Database, regionId: number, userId: string): Promise<RepairResult> {
	const authority = await convoyAuthority(db, userId);
	if (!authority) throw new ConvoyError("Only the president or economy minister can fund repairs.");
	return db.transaction(async (tx) => {
		const [region] = await tx.select().from(regions).where(eq(regions.id, regionId)).for("update");
		if (!region) throw new ConvoyError("That region doesn't exist.");
		if (region.stateId !== authority.stateId) throw new ConvoyError("You can only repair your own regions.");
		const level = region.infrastructure ?? 0;
		if (!canRepair(level)) throw new ConvoyError("That region's infrastructure is already at its best.");
		const cost = repairCost(level);

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new ConvoyError(`The treasury needs ${cost.toLocaleString()} for this repair.`);
		const [tools] = await tx
			.select({ quantity: stateProductInventory.quantity })
			.from(stateProductInventory)
			.where(
				and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "machine_tools"))
			)
			.for("update");
		if ((tools?.quantity ?? 0) < REPAIR.TOOLS)
			throw new ConvoyError(`Repairs need ${REPAIR.TOOLS} machine tools in the state stockpile.`);

		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, authority.stateId));
		await tx
			.update(stateProductInventory)
			.set({ quantity: sql`${stateProductInventory.quantity} - ${REPAIR.TOOLS}`, updatedAt: new Date() })
			.where(
				and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "machine_tools"))
			);
		await tx.update(regions).set({ infrastructure: level + 1 }).where(eq(regions.id, regionId));
		await tx.insert(governmentBudgetTransactions).values({
			stateId: authority.stateId,
			transactionType: "infrastructure_repair",
			amount: cost,
			balanceAfter: Number(treasury.balance) - cost,
			description: `Rebuilt infrastructure in region ${regionId} to level ${level + 1}`,
			authorizedBy: userId
		});

		return { regionId, level: level + 1, cost, tools: REPAIR.TOOLS, message: `Region ${regionId} infrastructure rebuilt to level ${level + 1}.` };
	});
}

/** Ledger for the logistics page. */
export async function convoyLedger(db: Db, stateId: number, limit = 30) {
	return db
		.select()
		.from(supplyConvoys)
		.where(eq(supplyConvoys.stateId, stateId))
		.orderBy(sql`${supplyConvoys.createdAt} desc`)
		.limit(limit);
}

/** Convenience for the UI: cost of a convoy of the given size. */
export const CONVOY_COST = CONVOY.COST_PER_UNIT;
