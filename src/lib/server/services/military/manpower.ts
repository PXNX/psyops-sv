// src/lib/server/services/military/manpower.ts
// The civilian manpower pool a region can draw recruits from. Raising a unit
// converts civilians into soldiers: the region's stored population drops at
// the moment training starts, and the new unit is created in the same
// transaction. The rules live in config/game/manpower.config.ts.
//
// No SvelteKit virtual modules here (tests import this file).
import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { regions } from "../../schema";
import {
	afterRecruitment,
	canCoverManpower,
	manpowerCostOf,
	regionPopulation
} from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "select" | "update">;

const popColumns = {
	id: regions.id,
	population: regions.population,
	terrain: regions.terrain,
	infrastructure: regions.infrastructure,
	economy: regions.economy,
	education: regions.education,
	hospitals: regions.hospitals
};

/** Civilians currently available as recruits in a region (0 if it is gone). */
export async function regionManpower(db: Db, regionId: number): Promise<number> {
	const [row] = await db.select(popColumns).from(regions).where(eq(regions.id, regionId));
	return row ? regionPopulation(row) : 0;
}

export interface ManpowerCheck {
	available: number;
	cost: number;
	enough: boolean;
}

/** Whether a region can raise one unit of this type right now. */
export async function manpowerCheck(db: Db, regionId: number, unitType: string): Promise<ManpowerCheck> {
	const available = await regionManpower(db, regionId);
	const cost = manpowerCostOf(unitType);
	return { available, cost, enough: canCoverManpower(available, cost) };
}

/**
 * Convert `cost` civilians of a region into soldiers. Call inside the same
 * transaction that inserts the unit so a failed recruitment leaves the pool
 * untouched. Returns the region's new civilian population.
 */
export async function reserveManpower(db: Db, regionId: number, cost: number): Promise<number> {
	const [row] = await db.select(popColumns).from(regions).where(eq(regions.id, regionId));
	if (!row || cost <= 0) return row ? regionPopulation(row) : 0;
	const current = regionPopulation(row);
	const next = afterRecruitment(current, cost);
	await db.update(regions).set({ population: next }).where(eq(regions.id, regionId));
	return next;
}
