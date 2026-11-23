// src/lib/server/services/civilians/diseases.ts
// Daily disease cycle. Outbreaks grow by a disease's spread rate and kill a
// share of active cases; hospitals, clean water and nutrition blunt both.
// Bad water and food can seed new outbreaks, and neighbours can catch it.
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { diseaseOutbreaks, regionBorders, regions } from "../../schema";
import { civicProjects } from "../../schema-investments";
import {
	DISEASES,
	DISEASE_IDS,
	DISEASE_RULES,
	diseaseDeaths,
	diseaseHarmFactor,
	diseaseRecoveries,
	diseaseSpread,
	regionPopulation,
	type DiseaseId,
	type DiseaseProtection
} from "#lib/config/index.js";
import { regionsCivilianNeeds } from "./supply.js";
import { statesPressure } from "./pressure.js";

export interface DiseaseTickResult {
	outbreaks: number;
	seeded: number;
	ended: number;
	deaths: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Advance every active outbreak one day. Safe to call once per daily cron. */
export async function runDiseaseTick(
	db: Database,
	now: Date = new Date(),
	rng: () => number = Math.random
): Promise<DiseaseTickResult> {
	const [active, regionRows, borderRows, clinics] = await Promise.all([
		db.select().from(diseaseOutbreaks).where(eq(diseaseOutbreaks.active, true)),
		db.select().from(regions),
		db.select({ a: regionBorders.regionId, b: regionBorders.neighborId }).from(regionBorders),
		db
			.select({ regionId: civicProjects.regionId })
			.from(civicProjects)
			.where(and(eq(civicProjects.buildingType, "clinic"), eq(civicProjects.completed, true)))
	]);

	const regionById = new Map(regionRows.map((r) => [r.id, r]));
	const stateIds = [...new Set(regionRows.map((r) => r.stateId).filter((id): id is number => id != null))];
	const [needs, pressure] = await Promise.all([
		regionsCivilianNeeds(db, regionRows.map((r) => r.id), now),
		statesPressure(db, stateIds, now)
	]);
	const clinicsByRegion = new Map<number, number>();
	for (const c of clinics) clinicsByRegion.set(c.regionId, (clinicsByRegion.get(c.regionId) ?? 0) + 1);

	const protectionFor = (regionId: number): DiseaseProtection => {
		const region = regionById.get(regionId);
		const need = needs.get(regionId);
		const strain = region?.stateId != null ? pressure.get(region.stateId) : undefined;
		const extraClinics = clinicsByRegion.get(regionId) ?? 0;
		return {
			hospital: clamp01((strain?.hospital ?? 1) + extraClinics * 0.1),
			water: need?.water.sufficiency ?? 1,
			nutrition: need?.food.sufficiency ?? 1
		};
	};

	const infectedRegions = new Set(active.map((o) => o.regionId));
	const neighbours = new Map<number, number[]>();
	for (const b of borderRows) {
		neighbours.set(b.a, [...(neighbours.get(b.a) ?? []), b.b]);
		neighbours.set(b.b, [...(neighbours.get(b.b) ?? []), b.a]);
	}

	const result: DiseaseTickResult = { outbreaks: active.length, seeded: 0, ended: 0, deaths: 0 };
	const seed = async (regionId: number, diseaseId: DiseaseId, cases: number) => {
		if (!regionById.has(regionId) || infectedRegions.has(regionId)) return;
		await db.insert(diseaseOutbreaks).values({
			regionId,
			diseaseId,
			cases,
			startedAt: now,
			updatedAt: now,
			active: true
		});
		infectedRegions.add(regionId);
		result.seeded++;
	};

	for (const outbreak of active) {
		const disease = DISEASES[outbreak.diseaseId as DiseaseId];
		if (!disease) continue;
		const currentCases = Number.isFinite(outbreak.cases) ? Math.max(0, Math.floor(outbreak.cases)) : 0;
		const harm = diseaseHarmFactor(disease, protectionFor(outbreak.regionId));
		const spread = diseaseSpread(disease, currentCases, harm);
		const recovered = diseaseRecoveries(disease, currentCases);
		const deaths = Math.min(currentCases, diseaseDeaths(disease, currentCases, harm));
		const cases = Math.min(
			DISEASE_RULES.MAX_CASES,
			Math.max(0, currentCases + spread - recovered - deaths)
		);

		if (deaths > 0) {
			const region = regionById.get(outbreak.regionId);
			if (region) {
				const before = regionPopulation(region);
				const after = Math.max(1, before - deaths);
				await db.update(regions).set({ population: after }).where(eq(regions.id, region.id));
				regionById.set(region.id, { ...region, population: after });
				result.deaths += before - after;
			}
		}

		const expired = cases < DISEASE_RULES.END_BELOW_CASES || now.getTime() - outbreak.startedAt.getTime() > DISEASE_RULES.MAX_DURATION_DAYS * 86_400_000;
		await db
			.update(diseaseOutbreaks)
			.set({ cases, active: !expired, updatedAt: now })
			.where(eq(diseaseOutbreaks.id, outbreak.id));
		if (expired) result.ended++;

		// Neighbouring regions can catch it; already-infected ones are skipped.
		for (const neighbourId of neighbours.get(outbreak.regionId) ?? []) {
			if (infectedRegions.has(neighbourId)) continue;
			if (rng() < disease.spreadRate * harm * DISEASE_RULES.BORDER_SEED_SHARE) {
				await seed(neighbourId, disease.id, Math.max(1, Math.round(disease.seedCases * 0.4)));
			}
		}
	}

	// Outbreaks emerge where water or food is failing — the same diseases a
	// state with broken water works and empty markets should expect.
	for (const region of regionRows) {
		if (infectedRegions.has(region.id)) continue;
		const protection = protectionFor(region.id);
		const vulnerability = Math.max(0, 1 - Math.min(protection.water, protection.nutrition));
		if (vulnerability <= 1 - DISEASE_RULES.EMERGENCE_THRESHOLD) continue;
		if (rng() >= DISEASE_RULES.EMERGENCE_PER_DAY * vulnerability * 20) continue;
		const diseaseId: DiseaseId =
			protection.water < protection.nutrition ? "cholera" : protection.nutrition < 0.7 ? "typhus" : "influenza";
		await seed(region.id, diseaseId, DISEASES[diseaseId].seedCases);
	}

	return result;
}

/** Active outbreaks in a state, with their disease and current case count. */
export async function stateOutbreaks(db: Database, stateId: number) {
	return db
		.select({
			id: diseaseOutbreaks.id,
			regionId: diseaseOutbreaks.regionId,
			diseaseId: diseaseOutbreaks.diseaseId,
			cases: diseaseOutbreaks.cases,
			startedAt: diseaseOutbreaks.startedAt,
			updatedAt: diseaseOutbreaks.updatedAt
		})
		.from(diseaseOutbreaks)
		.innerJoin(regions, eq(diseaseOutbreaks.regionId, regions.id))
		.where(and(eq(regions.stateId, stateId), eq(diseaseOutbreaks.active, true)));
}
