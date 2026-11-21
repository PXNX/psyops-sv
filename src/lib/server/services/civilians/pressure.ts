// src/lib/server/services/civilians/pressure.ts
// The two pressures that shape a civilian population beyond economics: how
// many of its people are under arms, and how much healthcare is left for the
// ones who are not. Both are derived on read from records other systems write.
//
// Wounded soldiers come from damaged units (each unit's manpower cost times
// the health it has lost); the grid and supply effects of a cyber attack take
// hospital capacity offline; recent strike casualties fill the remaining beds.
// No SvelteKit virtual modules here (tests import this file).
import { and, gte, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { militaryUnits, regions, strikes } from "../../schema";
import {
	HOSPITALS,
	conscriptionBand,
	conscriptionPressure,
	hospitalAvailability,
	hospitalCapacity,
	hospitalDemand,
	manpowerCostOf,
	regionPopulation,
	type ConscriptionBand
} from "#lib/config/index.js";
import { activeEffects } from "../military/state-effects";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** What a state's civilians are dealing with at a point in time. */
export interface StatePressure {
	soldiers: number;
	/** Soldiers per 1,000 people. */
	pressure: number;
	band: ConscriptionBand;
	hospitalLevels: number;
	wounded: number;
	recentCasualties: number;
	/** Share of hospital demand that can be met (0-1). */
	hospital: number;
}

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

/** Conscription and hospital strain for many states at once. */
export async function statesPressure(db: Db, stateIds: number[], now: Date = new Date()): Promise<Map<number, StatePressure>> {
	const ids = [...new Set(stateIds)];
	const out = new Map<number, StatePressure>();
	if (!ids.length) return out;

	const since = new Date(now.getTime() - HOSPITALS.CASUALTY_WINDOW_DAYS * 86_400_000);
	const [regionRows, unitRows, effectRows, strikeRows] = await Promise.all([
		db.select(popColumns).from(regions).where(inArray(regions.stateId, ids)),
		db
			.select({ stateId: militaryUnits.stateId, unitType: militaryUnits.unitType, health: militaryUnits.health })
			.from(militaryUnits)
			.where(inArray(militaryUnits.stateId, ids)),
		activeEffects(db, ids, { now, kinds: ["grid_degraded", "supply_disrupted"] }),
		db
			.select({ stateId: strikes.targetStateId, casualties: strikes.civilianCasualties })
			.from(strikes)
			.where(and(inArray(strikes.targetStateId, ids), gte(strikes.createdAt, since)))
	]);

	const byState = <T>(rows: T[], key: (r: T) => number | null | undefined, value: (r: T) => number) => {
		const map = new Map<number, number>();
		for (const row of rows) {
			const k = key(row);
			if (k != null) map.set(k, (map.get(k) ?? 0) + value(row));
		}
		return map;
	};

	const civilians = byState(regionRows, (r) => r.stateId, (r) => regionPopulation(r));
	const hospitalLevels = byState(regionRows, (r) => r.stateId, (r) => Math.max(0, r.hospitals ?? 0));
	const soldiers = byState(unitRows, (u) => u.stateId, (u) => manpowerCostOf(u.unitType));
	const wounded = byState(
		unitRows,
		(u) => u.stateId,
		(u) => ((100 - Math.max(0, Math.min(100, u.health))) / 100) * manpowerCostOf(u.unitType)
	);
	const casualties = byState(strikeRows, (r) => r.stateId, (r) => Math.max(0, r.casualties));
	const grid = byState(effectRows, (e) => e.stateId, (e) => (e.kind === "grid_degraded" ? e.magnitude : 0));
	const supply = byState(effectRows, (e) => e.stateId, (e) => (e.kind === "supply_disrupted" ? e.magnitude : 0));

	for (const id of ids) {
		const civilian = civilians.get(id) ?? 0;
		const underArms = soldiers.get(id) ?? 0;
		const pressure = conscriptionPressure(underArms, civilian);
		const levels = hospitalLevels.get(id) ?? 0;
		const capacity = hospitalCapacity(levels, grid.get(id) ?? 0, supply.get(id) ?? 0);
		const demand = hospitalDemand(civilian, wounded.get(id) ?? 0, casualties.get(id) ?? 0);
		out.set(id, {
			soldiers: underArms,
			pressure,
			band: conscriptionBand(pressure),
			hospitalLevels: levels,
			wounded: Math.round(wounded.get(id) ?? 0),
			recentCasualties: casualties.get(id) ?? 0,
			hospital: hospitalAvailability(capacity, demand)
		});
	}
	return out;
}

/** One state's pressure, or null when it does not exist. */
export async function statePressure(db: Db, stateId: number, now: Date = new Date()): Promise<StatePressure | null> {
	return (await statesPressure(db, [stateId], now)).get(stateId) ?? null;
}
