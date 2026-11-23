// Read-only population report for a region: the same inputs the weekly tick
// uses, plus a labelled explanation of what moves the number.
import { eq } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { regions } from "#lib/server/schema.js";
import { populationBreakdown, type PopulationPressure } from "#lib/config/index.js";
import { regionPopulation } from "#lib/config/index.js";
import { stateStabilitiesInfo } from "./stability.js";
import { regionsCivilianNeeds } from "./civilians/supply.js";
import { statesPressure } from "./civilians/pressure.js";

export async function regionPopulationReport(db: Database, regionId: number, now: Date = new Date()) {
	const [row] = await db.select().from(regions).where(eq(regions.id, regionId));
	if (!row) return null;
	const stateId = row.stateId;
	const [info, needs, pressure] = await Promise.all([
		stateId != null ? stateStabilitiesInfo(db, [stateId], now) : new Map(),
		regionsCivilianNeeds(db, [regionId], now),
		stateId != null ? statesPressure(db, [stateId], now) : new Map()
	]);
	const s = stateId != null ? info.get(stateId) : undefined;
	const strain = stateId != null ? pressure.get(stateId) : undefined;
	const population = regionPopulation(row);
	const pressureInput: PopulationPressure = {
		days: 365,
		atWar: s?.atWar ?? false,
		environment: s?.environment ?? "standard",
		conscription: strain?.pressure ?? s?.conscription ?? 0,
		stability: s?.stability.score ?? 60,
		hardship: needs.get(regionId)?.hardship ?? 0,
		replicationFactor: strain?.band.replicationFactor,
		conscriptionMortality: strain?.band.mortalityAdd,
		hospital: strain?.hospital
	};
	const breakdown = populationBreakdown(population, pressureInput);
	return {
		population,
		annualRate: breakdown.annualRate,
		netPerYear: breakdown.net,
		contributions: breakdown.contributions
	};
}
