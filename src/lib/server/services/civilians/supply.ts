// src/lib/server/services/civilians/supply.ts
// What civilians actually get today: food from the land and imported through
// open trade, electricity and heat from the part of the grid left after
// industry, water from rivers, aquifers and water works. Everything is read
// from existing rows, so a blockade, a grid attack or a poisoned water table
// is felt the moment it happens — no migration and no tick required.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, count, eq, inArray, lte } from "drizzle-orm";
import type { Database } from "../../db";
import { factories, regions, states, stateEnergy } from "../../schema";
import { civicProjects } from "../../schema-investments";
import {
	NEED_META,
	factoryWaterDraw,
	gridFactor,
	regionNeeds,
	regionPopulation,
	regionTerrain,
	type CivilianNeed,
	type NeedsInput,
	type RegionNeeds
} from "#lib/config/index.js";
import { gridDegradation } from "../military/state-effects";
import { blockadeEffectsOn } from "../military/naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export interface CivilianNeedsSnapshot extends RegionNeeds {
	regionId: number;
	stateId: number | null;
	population: number;
	/** Why a need is short, for panels and tooltips. */
	reasons: string[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Basic needs for a set of regions, in a handful of queries. The map has an
 * entry for every id that resolved to a real region; unknown ids are skipped.
 */
export async function regionsCivilianNeeds(
	db: Db,
	regionIds: number[],
	now: Date = new Date()
): Promise<Map<number, CivilianNeedsSnapshot>> {
	const ids = [...new Set(regionIds)];
	const out = new Map<number, CivilianNeedsSnapshot>();
	if (!ids.length) return out;

	// Mature any water works whose ribbon-cutting date has passed so they count.
	// Inlined rather than calling civic.service (which imports this module for
	// opinion) to keep the dependency graph acyclic.
	await db
		.update(civicProjects)
		.set({ completed: true, completedAt: now })
		.where(and(eq(civicProjects.completed, false), lte(civicProjects.completesAt, now)));
	const regionRows = await db.select().from(regions).where(inArray(regions.id, ids));
	if (!regionRows.length) return out;

	const stateIds = [...new Set(regionRows.map((r) => r.stateId).filter((id): id is number => id != null))];
	const [stateRows, stateRegionRows, energyRows, waterWorksRows, factoryRows, blockades, degradations] = await Promise.all([
		stateIds.length
			? db
					.select({ id: states.id, policy: states.exploitationPolicy })
					.from(states)
					.where(inArray(states.id, stateIds))
			: Promise.resolve([]),
		stateIds.length
			? db
					.select({
						id: regions.id,
						stateId: regions.stateId,
						population: regions.population,
						terrain: regions.terrain,
						infrastructure: regions.infrastructure,
						economy: regions.economy,
						education: regions.education,
						hospitals: regions.hospitals
					})
					.from(regions)
					.where(inArray(regions.stateId, stateIds))
			: Promise.resolve([]),
		stateIds.length ? db.select().from(stateEnergy).where(inArray(stateEnergy.stateId, stateIds)) : Promise.resolve([]),
		db
			.select({ regionId: civicProjects.regionId, n: count() })
			.from(civicProjects)
			.where(and(eq(civicProjects.completed, true), eq(civicProjects.buildingType, "water_works"), inArray(civicProjects.regionId, ids)))
			.groupBy(civicProjects.regionId),
		db
			.select({
				regionId: factories.regionId,
				resourceOutput: factories.resourceOutput,
				productOutput: factories.productOutput
			})
			.from(factories)
			.where(inArray(factories.regionId, ids)),
		Promise.all(stateIds.map((id) => blockadeEffectsOn(db, id, now).then((e) => [id, e] as const))),
		Promise.all(stateIds.map((id) => gridDegradation(db, id, now).then((d) => [id, d] as const)))
	]);

	const policyByState = new Map(stateRows.map((s) => [s.id, s.policy]));
	const populationByState = new Map<number, number>();
	for (const r of stateRegionRows) {
		if (r.stateId == null) continue;
		populationByState.set(r.stateId, (populationByState.get(r.stateId) ?? 0) + regionPopulation(r));
	}
	const blockadeByState = new Map(blockades);
	const degradationByState = new Map(degradations);
	const gridByState = new Map<number, { totalProduction: number; usedProduction: number; gridDegraded: number }>();
	for (const id of stateIds) {
		const row = energyRows.find((e) => e.stateId === id);
		const degraded = degradationByState.get(id) ?? 0;
		gridByState.set(id, {
			totalProduction: Math.floor(
				(row?.totalProduction ?? 1000) * gridFactor(degraded) * (blockadeByState.get(id)?.energyFactor ?? 1)
			),
			usedProduction: row?.usedProduction ?? 0,
			gridDegraded: degraded
		});
	}
	const waterWorksByRegion = new Map(waterWorksRows.map((r) => [r.regionId, Number(r.n)]));
	const factoryWaterByRegion = new Map<number, number>();
	for (const f of factoryRows) {
		factoryWaterByRegion.set(
			f.regionId,
			(factoryWaterByRegion.get(f.regionId) ?? 0) + factoryWaterDraw(f.productOutput ?? f.resourceOutput)
		);
	}

	for (const row of regionRows) {
		const stateId = row.stateId;
		const pop = regionPopulation(row);
		const statePop = stateId != null ? (populationByState.get(stateId) ?? 0) : 0;
		const grid = stateId != null ? gridByState.get(stateId) : undefined;
		const blockade = stateId != null ? blockadeByState.get(stateId) : undefined;
		const input: NeedsInput = {
			population: pop,
			terrain: regionTerrain(row),
			infrastructure: Number(row.infrastructure ?? 0),
			gridCapacity: grid?.totalProduction ?? 0,
			gridUsed: grid?.usedProduction ?? 0,
			// Keep the full precision: a small region in a huge state still
			// deserves its sliver of the grid.
			populationShare: statePop > 0 ? pop / statePop : 0,
			waterWorks: waterWorksByRegion.get(row.id) ?? 0,
			factoryWaterDemand: factoryWaterByRegion.get(row.id) ?? 0,
			tradeFactor: blockade?.tradeFactor ?? 1,
			environment: stateId != null ? (policyByState.get(stateId) ?? "standard") : "standard"
		};
		const needs = regionNeeds(input);
		const reasons: string[] = [];
		if (needs.food.sufficiency < 0.85 && (blockade?.tradeFactor ?? 1) < 1)
			reasons.push("Blockade is cutting food imports");
		if (needs.electricity.sufficiency < 0.85 && (grid?.gridDegraded ?? 0) > 0)
			reasons.push("The grid is degraded by attacks");
		if (needs.water.sufficiency < 0.85 && (waterWorksByRegion.get(row.id) ?? 0) === 0)
			reasons.push("No water works serve this region");
		if (needs.shortages.length && !reasons.length)
			reasons.push(`Short of ${needs.shortages.map((k) => NEED_META[k].label.toLowerCase()).join(", ")}`);
		out.set(row.id, { regionId: row.id, stateId, population: pop, ...needs, reasons });
	}
	return out;
}

/** One region's basic needs, or null when the region does not exist. */
export async function regionCivilianNeeds(
	db: Db,
	regionId: number,
	now: Date = new Date()
): Promise<CivilianNeedsSnapshot | null> {
	return (await regionsCivilianNeeds(db, [regionId], now)).get(regionId) ?? null;
}

/** Mean and worst hardship across a state's regions, plus the short regional snapshots. */
export async function stateCivilianNeeds(db: Db, stateId: number, now: Date = new Date()) {
	const rows = await db
		.select({ id: regions.id })
		.from(regions)
		.where(eq(regions.stateId, stateId));
	const snapshots = await regionsCivilianNeeds(
		db,
		rows.map((r) => r.id),
		now
	);
	const active = [...snapshots.values()];
	const worstNeed = (key: CivilianNeed) =>
		active.length ? round3(Math.min(...active.map((s) => s[key].sufficiency))) : 1;
	return {
		regions: snapshots,
		hardship: active.length ? round3(active.reduce((sum, s) => sum + s.hardship, 0) / active.length) : 0,
		worstHardship: active.length ? round3(Math.max(...active.map((s) => s.hardship))) : 0,
		shortages: [...new Set(active.flatMap((s) => s.shortages))],
		worst: {
			food: worstNeed("food"),
			electricity: worstNeed("electricity"),
			heat: worstNeed("heat"),
			water: worstNeed("water")
		}
	};
}
