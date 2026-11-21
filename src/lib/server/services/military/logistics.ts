// src/lib/server/services/military/logistics.ts
// Supply as it actually stands in the world: how much a region can move, how
// much its units and factories want, and what strikes and blockades are doing
// to the flow. Everything is computed on demand from existing rows, so no
// cron or migration is needed for the state to feel a severed supply line.
//
// The result feeds combat output (battle-engine) and factory production
// (factoryWork), and is shown to the player on the joint command page.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { factories, militaryUnits, regionBorders, regionEffects, regions } from "../../schema";
import {
	LOGISTICS,
	isCoastal,
	regionSupplyCapacity,
	supplyDemand,
	supplyBoost,
	logisticsSupplyFactor,
	disruptionFactor,
	type LogisticsRegion
} from "#lib/config/index.js";
import { blockadeStrengthOn } from "./naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export interface SupplySnapshot {
	regionId: number;
	stateId: number | null;
	/** Daily throughput before demand and disruptions. */
	capacity: number;
	/** Daily draw of the units and factories present. */
	demand: number;
	/** 0-1 share of capacity left after strikes and blockade. */
	disruption: number;
	blockadeStrength: number;
	/** 0.25-1 supply factor. */
	factor: number;
	/** Why the factor is what it is, for the UI. */
	reasons: string[];
}

/** Supply situation of one region right now. */
export async function regionSupply(db: Db, regionId: number, now = new Date()): Promise<SupplySnapshot> {
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId));
	if (!region) {
		return { regionId, stateId: null, capacity: 0, demand: 0, disruption: 1, blockadeStrength: 0, factor: 1, reasons: ["Unknown region"] };
	}
	const [neighbours, units, plants, effects, blockade] = await Promise.all([
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(regionBorders)
			.where(or(eq(regionBorders.regionId, regionId), eq(regionBorders.neighborId, regionId))),
		db
			.select({ unitType: militaryUnits.unitType })
			.from(militaryUnits)
			.where(and(eq(militaryUnits.regionId, regionId), eq(militaryUnits.isTraining, false))),
		db.select({ factoryType: factories.factoryType }).from(factories).where(eq(factories.regionId, regionId)),
		db
			.select({ magnitude: regionEffects.magnitude })
			.from(regionEffects)
			.where(
				and(
					eq(regionEffects.regionId, regionId),
					inArray(regionEffects.kind, ["supply", "supply_boost"]),
					lte(regionEffects.startsAt, now),
					gt(regionEffects.expiresAt, now)
				)
			),
		region.stateId ? blockadeStrengthOn(db, region.stateId, now) : Promise.resolve(0)
	]);
	const baseCapacity = regionSupplyCapacity(
		region as LogisticsRegion,
		neighbours[0]?.n ?? 0,
		isCoastal(region as LogisticsRegion)
	);
	const boost = supplyBoost(effects.map((e) => e.magnitude));
	const capacity = Math.round(baseCapacity * (1 + boost));
	const demand = supplyDemand(
		units.map((u) => u.unitType),
		plants.map((f) => f.factoryType)
	);
	const disruption = disruptionFactor(
		effects.map((e) => e.magnitude),
		blockade
	);
	const reasons: string[] = [];
	const strikes = effects.filter((e) => e.magnitude > 0).length;
	if (strikes) reasons.push(`${strikes} strike(s) on bridges and logistics`);
	if (boost > 0) reasons.push(`relief convoy +${Math.round(boost * 100)}% capacity`);
	if (blockade > 0) reasons.push(`blockade at ${Math.round(blockade * 100)}%`);
	if (demand > capacity * disruption) reasons.push("demand exceeds what the roads can carry");
	return {
		regionId,
		stateId: region.stateId,
		capacity,
		demand,
		disruption: Math.round(disruption * 1000) / 1000,
		blockadeStrength: blockade,
		factor: logisticsSupplyFactor(capacity, demand, disruption),
		reasons
	};
}

/** Average supply factor of a state's active regions, and its worst region. */
export async function stateSupply(db: Db, stateId: number, now = new Date()) {
	// Only regions with something actually drawing supply matter; a state with
	// a thousand empty provinces should not cost a thousand queries on load.
	const [unitRegions, factoryRegions] = await Promise.all([
		db
			.selectDistinct({ id: militaryUnits.regionId })
			.from(militaryUnits)
			.where(and(eq(militaryUnits.stateId, stateId), eq(militaryUnits.isTraining, false))),
		db
			.selectDistinct({ id: factories.regionId })
			.from(factories)
			.innerJoin(regions, eq(factories.regionId, regions.id))
			.where(eq(regions.stateId, stateId))
	]);
	const ids = [...new Set([...unitRegions, ...factoryRegions].map((r) => r.id))].slice(0, 60);
	const snapshots = await Promise.all(ids.map((id) => regionSupply(db, id, now)));
	const active = snapshots.filter((s) => s.demand > 0);
	if (!active.length) return { average: 1, worst: 1, regions: snapshots.length, blockaded: snapshots.some((s) => s.blockadeStrength > 0) };
	return {
		average: Math.round((active.reduce((sum, s) => sum + s.factor, 0) / active.length) * 1000) / 1000,
		worst: Math.min(...active.map((s) => s.factor)),
		regions: active.length,
		blockaded: active.some((s) => s.blockadeStrength > 0)
	};
}

/** Supply snapshots for a set of regions (used by the battle engine). */
export async function regionSupplies(db: Db, regionIds: number[], now = new Date()): Promise<Map<number, SupplySnapshot>> {
	const out = new Map<number, SupplySnapshot>();
	for (const id of [...new Set(regionIds)]) out.set(id, await regionSupply(db, id, now));
	return out;
}

/** Exposed for the UI: the constants behind the numbers. */
export const LOGISTICS_RULES = LOGISTICS;
