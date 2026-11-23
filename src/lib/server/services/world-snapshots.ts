// Daily world snapshots: who held what and the numbers behind it, kept as
// JSON so the historic map viewer can replay any past day.
import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import {
	blocs,
	fleetShips,
	militaryUnits,
	mapSnapshots,
	regions,
	residences,
	stateEnergy,
	stateResourceInventory,
	stateTreasury,
	states,
	type MapSnapshotState
} from "#lib/server/schema.js";
import { AIRCRAFT_IDS, regionPopulation } from "#lib/config/index.js";

/** Capture one snapshot at midnight UTC, idempotent per day. */
export async function captureWorldSnapshot(db: Database, at: Date = new Date()) {
	const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
	const [allRegions, allStates, allBlocs, ships, units, steelRows, energyRows, treasuries, residentRows] =
		await Promise.all([
			db.select().from(regions),
			db.select().from(states),
			db.select().from(blocs),
			db.select({ stateId: fleetShips.stateId, id: fleetShips.id }).from(fleetShips),
			db.select({ stateId: militaryUnits.stateId, unitType: militaryUnits.unitType }).from(militaryUnits),
			db
				.select({ stateId: stateResourceInventory.stateId, quantity: stateResourceInventory.quantity })
				.from(stateResourceInventory)
				.where(eq(stateResourceInventory.resourceType, "steel")),
			db.select().from(stateEnergy),
			db.select().from(stateTreasury),
			db
				.select({ regionId: residences.regionId, total: sql<number>`count(*)::int` })
				.from(residences)
				.groupBy(residences.regionId)
		]);

	const residentsByRegion = new Map(residentRows.map((r) => [r.regionId, Number(r.total)]));

	const regionSnapshots = allRegions.map((r) => ({
		id: r.id,
		stateId: r.stateId,
		blocId: allStates.find((s) => s.id === r.stateId)?.blocId ?? null,
		terrain: r.terrain,
		population: regionPopulation({
			id: r.id,
			terrain: r.terrain,
			infrastructure: r.infrastructure,
			economy: r.economy,
			education: r.education,
			hospitals: r.hospitals,
			population: r.population
		}),
		residents: residentsByRegion.get(r.id) ?? 0
	}));

	const stateSnapshots: MapSnapshotState[] = allStates.map((s) => {
		const energy = energyRows.find((e) => e.stateId === s.id);
		return {
			id: s.id,
			name: s.name,
			blocId: s.blocId,
			population: Number(s.population ?? 0),
			regionCount: allRegions.filter((r) => r.stateId === s.id).length,
			army: units.filter((u) => u.stateId === s.id && !AIRCRAFT_IDS.includes(u.unitType as never)).length,
			ships: ships.filter((ship) => ship.stateId === s.id).length,
			aircraft: units.filter((u) => u.stateId === s.id && AIRCRAFT_IDS.includes(u.unitType as never)).length,
			steel: steelRows.find((r) => r.stateId === s.id)?.quantity ?? 0,
			civilians: regionSnapshots
				.filter((r) => r.stateId === s.id)
				.reduce((sum, r) => sum + (r.population ?? 0), 0),
			residents: regionSnapshots
				.filter((r) => r.stateId === s.id)
				.reduce((sum, r) => sum + (r.residents ?? 0), 0),
			power: energy?.totalProduction ?? 0,
			usedPower: energy?.usedProduction ?? 0,
			fuelFactor: energy?.fuelFactor ?? 100,
			maintenanceFactor: energy?.maintenanceFactor ?? 100,
			treasury: Number(treasuries.find((t) => t.stateId === s.id)?.balance ?? 0),
			debt: Number(treasuries.find((t) => t.stateId === s.id)?.debt ?? 0)
		};
	});

	const blocSnapshots = allBlocs.map((b) => ({
		id: b.id,
		name: b.name,
		color: b.color,
		memberStateIds: allStates.filter((s) => s.blocId === b.id).map((s) => s.id)
	}));

	const [saved] = await db
		.insert(mapSnapshots)
		.values({ capturedAt: day, regions: regionSnapshots, states: stateSnapshots, blocs: blocSnapshots })
		.onConflictDoNothing({ target: mapSnapshots.capturedAt })
		.returning({ id: mapSnapshots.id });
	return saved ?? null;
}

export async function listSnapshots(db: Database, limit = 180) {
	return db.select().from(mapSnapshots).orderBy(sql`${mapSnapshots.capturedAt} desc`).limit(limit);
}
