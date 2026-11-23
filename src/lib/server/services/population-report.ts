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

/** Aggregate the same population explanation across a whole state. */
export async function statePopulationReport(db: Database, stateId: number, now: Date = new Date()) {
	const regionRows = await db.select().from(regions).where(eq(regions.stateId, stateId));
	if (!regionRows.length) {
		return {
			population: 0,
			fertility: 0,
			mortality: 0,
			annualRate: 0,
			netPerYear: 0,
			contributions: [] as { label: string; value: number }[]
		};
	}
	const [info, needs, pressure] = await Promise.all([
		stateStabilitiesInfo(db, [stateId], now),
		regionsCivilianNeeds(db, regionRows.map((r) => r.id), now),
		statesPressure(db, [stateId], now)
	]);
	const s = info.get(stateId);
	const strain = pressure.get(stateId);
	const totals = new Map<string, number>();
	let population = 0;
	let net = 0;
	for (const row of regionRows) {
		const pop = regionPopulation(row);
		population += pop;
		const breakdown = populationBreakdown(pop, {
			days: 365,
			atWar: s?.atWar ?? false,
			environment: s?.environment ?? "standard",
			conscription: strain?.pressure ?? s?.conscription ?? 0,
			stability: s?.stability.score ?? 60,
			hardship: needs.get(row.id)?.hardship ?? 0,
			replicationFactor: strain?.band.replicationFactor,
			conscriptionMortality: strain?.band.mortalityAdd,
			hospital: strain?.hospital
		});
		net += breakdown.net;
		for (const c of breakdown.contributions) totals.set(c.label, (totals.get(c.label) ?? 0) + c.value);
	}
	const deathLabels = (label: string) =>
		label !== "Births" && !label.startsWith("Emigration") && !label.startsWith("Hardship emigration");
	const births = totals.get("Births") ?? 0;
	const deaths = [...totals.entries()]
		.filter(([label, value]) => deathLabels(label) && value < 0)
		.reduce((sum, [, value]) => sum + Math.abs(value), 0);
	const perCapita = (n: number) => (population > 0 ? Math.round((n / population) * 10_000) / 10_000 : 0);
	return {
		population,
		fertility: perCapita(births),
		mortality: perCapita(deaths),
		annualRate: population > 0 ? net / population : 0,
		netPerYear: net,
		contributions: [...totals.entries()]
			.map(([label, value]) => ({ label, value }))
			.filter((c) => c.value !== 0)
			.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
	};
}

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
