// src/lib/server/services/civilians/migration.ts
// Weekly civilian movement. Idle people in a region look for somewhere with
// better odds: first visa-free regions of the same or a slightly happier
// state, then — rarely — a foreign country whose visa they apply for. Each
// move is recorded so destination states carry the disease and intel risk of
// new arrivals.
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { blocs, diseaseOutbreaks, regions, states, stateVisaSettings, migrationFlows } from "../../schema";
import { DISEASES, MIGRATION_CONFIG, regionPopulation, type DiseaseId } from "#lib/config/index.js";
import { regionOpinions } from "../politics/civic.service.js";
import { regionCivilianEmployment } from "../economy/civilian-work.js";

const DAY = 86_400_000;
const diseaseIds = Object.keys(DISEASES) as DiseaseId[];

type RegionRow = {
	id: number;
	stateId: number | null;
	population: number | null;
	education: number | null;
	terrain: string | null;
	infrastructure: number | null;
	economy: number | null;
	hospitals: number | null;
};

/** How open a move is: same state and bloc-members with free movement need no visa. */
async function visaFreePairs(db: Database, stateRows: { id: number; blocId: number | null }[]) {
	const [settings, blocRows] = await Promise.all([
		db.select().from(stateVisaSettings),
		db.select({ id: blocs.id, visaFreeForMembers: blocs.visaFreeForMembers }).from(blocs)
	]);
	const byState = new Map(settings.map((s) => [s.stateId, s]));
	const blocById = new Map(blocRows.map((b) => [b.id, b]));
	const free = new Set<string>();
	for (const a of stateRows) {
		for (const b of stateRows) {
			if (a.id === b.id) continue;
			if (byState.get(b.id)?.visaRequired === false) {
				free.add(`${a.id}:${b.id}`);
			} else if (a.blocId != null && a.blocId === b.blocId && blocById.get(a.blocId)?.visaFreeForMembers) {
				free.add(`${a.id}:${b.id}`);
			}
		}
	}
	return free;
}

export interface MigrationTickResult {
	regions: number;
	movers: number;
	flows: number;
	visaFlows: number;
	diseasesSeeded: number;
}

/** Move civilians from regions with too many idle hands to better odds elsewhere. */
export async function runMigrationTick(db: Database, now = new Date()): Promise<MigrationTickResult> {
	const result: MigrationTickResult = { regions: 0, movers: 0, flows: 0, visaFlows: 0, diseasesSeeded: 0 };
	const [regionRows, stateRows] = await Promise.all([
		db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				population: regions.population,
				education: regions.education,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				hospitals: regions.hospitals
			})
			.from(regions),
		db.select({ id: states.id, blocId: states.blocId }).from(states)
	]);
	if (regionRows.length < 2) return result;

	const [opinions, employment] = await Promise.all([
		regionOpinions(
			db,
			regionRows.map((r) => r.id),
			now
		),
		Promise.all(regionRows.map(async (r) => ({ id: r.id, work: await regionCivilianEmployment(db, r.id, now) }))).then(
			(rows) => new Map(rows.map((r) => [r.id, r.work]))
		)
	]);
	const free = await visaFreePairs(db, stateRows);
	const stateById = new Map(stateRows.map((s) => [s.id, s]));
	const unemploymentOf = (r: RegionRow) => {
		const work = employment.get(r.id);
		return work && work.labour > 0 ? Math.max(0, work.labour - work.employed) / work.labour : 0;
	};
	const populationOf = (r: RegionRow) => Math.max(0, regionPopulation(r));

	for (const origin of regionRows) {
		const share = unemploymentOf(origin);
		if (share < MIGRATION_CONFIG.MIN_UNEMPLOYMENT) continue;
		const unemployed = Math.max(0, (populationOf(origin) * share) | 0);
		if (unemployed <= 0) continue;
		const rate =
			MIGRATION_CONFIG.LEAVE_RATE +
			(MIGRATION_CONFIG.LEAVE_RATE_MAX - MIGRATION_CONFIG.LEAVE_RATE) * Math.min(1, share);
		const movers = Math.floor(unemployed * rate);
		if (movers <= 0) continue;

		const originOpinion = opinions.get(origin.id) ?? 50;
		// Visa-free neighbours first; a small slice of movers tries a foreign visa.
		const candidates = regionRows.filter((dest) => {
			if (dest.id === origin.id) return false;
			return (
				unemploymentOf(dest) + MIGRATION_CONFIG.EMPLOYMENT_ADVANTAGE <= share &&
				(opinions.get(dest.id) ?? 50) >= originOpinion - MIGRATION_CONFIG.OPINION_TOLERANCE
			);
		});
		if (!candidates.length) continue;

		const wantsVisa = Math.random() < MIGRATION_CONFIG.VISA_CHANCE;
		const pool = candidates.filter((dest) => {
			if (dest.stateId == null || origin.stateId == null) return true;
			const visaFree = dest.stateId === origin.stateId || free.has(`${dest.stateId}:${origin.stateId}`);
			return wantsVisa ? !visaFree : visaFree;
		});
		if (!pool.length) continue;
		// Prefer the best job prospects, with a little randomness between equals.
		pool.sort(
			(a, b) =>
				unemploymentOf(a) - unemploymentOf(b) ||
				(opinions.get(b.id) ?? 50) - (opinions.get(a.id) ?? 50) ||
				Math.random() - 0.5
		);
		const destination = pool[0]!;
		const neededVisa =
			destination.stateId != null &&
			origin.stateId != null &&
			destination.stateId !== origin.stateId &&
			!free.has(`${destination.stateId}:${origin.stateId}`);

		await db.transaction(async (tx) => {
			await tx
				.update(regions)
				.set({ population: Math.max(1, populationOf(origin) - movers) })
				.where(eq(regions.id, origin.id));
			await tx
				.update(regions)
				.set({ population: populationOf(destination) + movers })
				.where(eq(regions.id, destination.id));
			await tx.insert(migrationFlows).values({
				fromRegionId: origin.id,
				toRegionId: destination.id,
				fromStateId: origin.stateId,
				toStateId: destination.stateId,
				civilians: movers,
				neededVisa
			});
		});
		result.regions++;
		result.movers += movers;
		result.flows++;
		if (neededVisa) result.visaFlows++;

		// Travellers can carry an illness into a place with no outbreak yet.
		if (neededVisa && diseaseIds.length && Math.random() < MIGRATION_CONFIG.DISEASE_CHANCE) {
			const [active] = await db
				.select({ id: diseaseOutbreaks.id })
				.from(diseaseOutbreaks)
				.where(and(eq(diseaseOutbreaks.regionId, destination.id), eq(diseaseOutbreaks.active, true)))
				.limit(1);
			if (!active) {
				await db.insert(diseaseOutbreaks).values({
					regionId: destination.id,
					diseaseId: diseaseIds[Math.floor(Math.random() * diseaseIds.length)]!,
					cases: Math.max(1, Math.floor(movers / 10)),
					startedAt: now,
					updatedAt: now,
					active: true
				});
				result.diseasesSeeded++;
			}
		}
		// One region per tick keeps a weekly run bounded.
	}

	return result;
}
