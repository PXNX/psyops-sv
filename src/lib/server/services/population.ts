// src/lib/server/services/population.ts
// Civilian population on the server: one region, one state (the sum of its
// regions) or many states at once. Computed on read from regionPopulation()
// (config/game/population.config.ts), so states.population is not used for
// civilians. Strikes lower a region's civilians through reduceRegionPopulation.
//
// No SvelteKit virtual modules here (tests import this file).
import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db";
import { regions } from "../schema";
import { POPULATION_FLOOR, regionPopulation } from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "select" | "update">;

export { regionPopulation };

const popColumns = {
	id: regions.id,
	stateId: regions.stateId,
	population: regions.population,
	terrain: regions.terrain,
	infrastructure: regions.infrastructure,
	economy: regions.economy,
	education: regions.education,
	hospitals: regions.hospitals
};

/** Civilians in one region (0 if it doesn't exist). */
export async function regionPopulationById(db: Db, regionId: number): Promise<number> {
	const [row] = await db.select(popColumns).from(regions).where(eq(regions.id, regionId));
	return row ? regionPopulation(row) : 0;
}

/** Civilians in a state: the sum over the regions it holds. */
export async function statePopulation(db: Db, stateId: number): Promise<number> {
	const rows = await db.select(popColumns).from(regions).where(eq(regions.stateId, stateId));
	return rows.reduce((s, r) => s + regionPopulation(r), 0);
}

/** Civilians per state for many states (states without regions are 0). */
export async function statePopulations(db: Db, stateIds?: number[]): Promise<Map<number, number>> {
	if (stateIds && !stateIds.length) return new Map();
	const rows = await db
		.select(popColumns)
		.from(regions)
		.where(stateIds ? inArray(regions.stateId, stateIds) : sql`${regions.stateId} is not null`);
	const out = new Map<number, number>((stateIds ?? []).map((id) => [id, 0]));
	for (const r of rows) {
		if (r.stateId == null) continue;
		out.set(r.stateId, (out.get(r.stateId) ?? 0) + regionPopulation(r));
	}
	return out;
}

/**
 * Take `casualties` civilians off a region (never below POPULATION_FLOOR).
 * Stores the figure, so the derived population becomes the stored one.
 * Returns the new population.
 */
export async function reduceRegionPopulation(db: Db, regionId: number, casualties: number): Promise<number> {
	const [row] = await db.select(popColumns).from(regions).where(eq(regions.id, regionId));
	if (!row) return 0;
	const next = Math.max(POPULATION_FLOOR, regionPopulation(row) - Math.max(0, Math.round(casualties)));
	await db.update(regions).set({ population: next }).where(eq(regions.id, regionId));
	return next;
}
