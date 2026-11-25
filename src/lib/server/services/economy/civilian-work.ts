// src/lib/server/services/economy/civilian-work.ts
// Civilians at work. Each weekly tick, a region's spare labour fills the jobs
// its factories cannot cover with player workers. The company earns revenue
// from their output, pays their wage out of its budget, and the state taxes
// that wage as income. Companies without funds employ fewer people; regions
// without people employ none.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { companyBudgets, companies, factories, factoryWorkers, regions } from "../../schema";
import { calculateAndCollectTax } from "../../taxes";
import { statesPressure, statePressure } from "../civilians/pressure";
import {
	CIVILIAN_WORK,
	conscriptionWorkforce,
	healthyWorkforce,
	civilianLabour,
	civilianRevenue,
	civilianWage,
	employableCivilians,
	productivityFactor,
	regionPopulation,
	strikeOutputFactor
} from "#lib/config/index.js";

export interface RegionEmployment {
	/** Everyone in the region who could work a civilian shift. */
	labour: number;
	/** Civilians already filling factory shifts. */
	employed: number;
	/** Labour left for more shifts. */
	available: number;
	factories: number;
}

/**
 * Read-only view of the civilian labour market in one region, using the same
 * rules as the weekly civilian-work tick. The spare pool is the labour the
 * region can actually offer after its factories have taken their share.
 */
export async function regionCivilianEmployment(
	db: Database,
	regionId: number,
	now: Date = new Date(),
	days: number = CIVILIAN_WORK.TICK_DAYS
): Promise<RegionEmployment> {
	const [region] = await db
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
		.where(eq(regions.id, regionId))
		.limit(1);
	if (!region) return { labour: 0, employed: 0, available: 0, factories: 0 };

	const [factoryRows, workerCounts, budgetRows] = await Promise.all([
		db
			.select({
				id: factories.id,
				companyId: factories.companyId,
				maxWorkers: factories.maxWorkers,
				workerWage: factories.workerWage
			})
			.from(factories)
			.where(eq(factories.regionId, regionId)),
		db
			.select({ factoryId: factoryWorkers.factoryId, n: count() })
			.from(factoryWorkers)
			.groupBy(factoryWorkers.factoryId),
		db.select({ companyId: companyBudgets.companyId, balance: companyBudgets.balance }).from(companyBudgets)
	]);
	const strain = region.stateId != null ? await statePressure(db, region.stateId, now) : null;
	const participation = (strain ? conscriptionWorkforce(strain.pressure) : 1) * healthyWorkforce(strain?.hospital ?? 1);
	const labour = Math.floor(civilianLabour(regionPopulation(region), region.education ?? 0) * participation);
	const playerWorkers = new Map(workerCounts.map((r) => [r.factoryId, Number(r.n)]));
	const budgets = new Map(budgetRows.map((r) => [r.companyId, Number(r.balance)]));

	let available = labour;
	let employed = 0;
	let staffed = 0;
	for (const factory of factoryRows) {
		if (available <= 0) break;
		const freeSlots = Math.max(0, factory.maxWorkers - (playerWorkers.get(factory.id) ?? 0));
		if (freeSlots <= 0) continue;
		const workers = employableCivilians(
			available,
			freeSlots,
			budgets.get(factory.companyId) ?? 0,
			civilianWage(factory.workerWage),
			days
		);
		if (workers <= 0) continue;
		available -= workers;
		employed += workers;
		staffed++;
	}
	return { labour, employed, available, factories: staffed };
}

export interface CivilianWorkResult {
	factoriesStaffed: number;
	civiliansEmployed: number;
	wagesPaid: number;
	revenue: number;
	taxCollected: number;
}

/**
 * Staff every factory that can afford it from its region's civilian pool and
 * settle a week of wages, revenue and income tax. Safe to run repeatedly: each
 * tick is independent and there is no stored per-worker state.
 */
export async function runCivilianWork(
	db: Database,
	now: Date = new Date(),
	days: number = CIVILIAN_WORK.TICK_DAYS
): Promise<CivilianWorkResult> {
	const [factoryRows, workerCounts, budgetRows, regionRows, companyRows] = await Promise.all([
		db
			.select({
				id: factories.id,
				companyId: factories.companyId,
				regionId: factories.regionId,
				productionRate: factories.productionRate,
				workerWage: factories.workerWage,
				strikeSeverity: factories.strikeSeverity,
				uninterruptedShifts: factories.uninterruptedShifts,
				maxWorkers: factories.maxWorkers,
				resourceOutput: factories.resourceOutput,
				productOutput: factories.productOutput
			})
			.from(factories),
		db
			.select({ factoryId: factoryWorkers.factoryId, n: count() })
			.from(factoryWorkers)
			.groupBy(factoryWorkers.factoryId),
		db.select({ companyId: companyBudgets.companyId, balance: companyBudgets.balance }).from(companyBudgets),
		db
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
			.from(regions),
		db.select({ id: companies.id, ownerId: companies.ownerId }).from(companies)
	]);

	const pressure = await statesPressure(
		db,
		regionRows.map((r) => r.stateId).filter((id): id is number => id != null),
		now
	);
	// Draftees are not in the factories, and the sick do not work either:
	// conscription and hospital strain both shrink the effective labour pool.
	const labour = new Map<number, number>(
		regionRows.map((r) => {
			const strain = r.stateId != null ? pressure.get(r.stateId) : undefined;
			const participation =
				(strain ? conscriptionWorkforce(strain.pressure) : 1) * healthyWorkforce(strain?.hospital ?? 1);
			// A region's school level decides how much of its population can work
			// a factory shift in the first place.
			return [r.id, Math.floor(civilianLabour(regionPopulation(r), r.education ?? 0) * participation)];
		})
	);
	const stateOfRegion = new Map<number, number | null>(regionRows.map((r) => [r.id, r.stateId]));
	const playerWorkers = new Map<number, number>(workerCounts.map((r) => [r.factoryId, Number(r.n)]));
	const budgets = new Map<number, number>(budgetRows.map((r) => [r.companyId, Number(r.balance)]));
	const owners = new Map<number, string>(companyRows.map((r) => [r.id, r.ownerId]));

	const result: CivilianWorkResult = {
		factoriesStaffed: 0,
		civiliansEmployed: 0,
		wagesPaid: 0,
		revenue: 0,
		taxCollected: 0
	};

	for (const factory of factoryRows) {
		const available = labour.get(factory.regionId) ?? 0;
		if (available <= 0) continue;
		const freeSlots = Math.max(0, factory.maxWorkers - (playerWorkers.get(factory.id) ?? 0));
		if (freeSlots <= 0) continue;

		const weeklyWage = civilianWage(factory.workerWage);
		const wagePerWorker = Math.max(1, Math.round(weeklyWage * (days / 7)));
		const workers = employableCivilians(available, freeSlots, budgets.get(factory.companyId) ?? 0, weeklyWage, days);
		if (workers <= 0) continue;

		const wages = wagePerWorker * workers;
		// A walkout caps what civilian shifts produce; a long clean run lifts it.
		const revenue = Math.round(
			civilianRevenue(factory.productionRate, factory.productOutput ?? factory.resourceOutput, workers, days) *
				strikeOutputFactor(factory.strikeSeverity) *
				productivityFactor(factory.uninterruptedShifts)
		);
		const stateId = stateOfRegion.get(factory.regionId) ?? null;
		const ownerId = owners.get(factory.companyId) ?? "state";

		// The WHERE guard keeps a concurrent wage run from overdrawing the
		// budget; if the balance moved, this factory simply waits for next tick.
		const applied = await db.transaction(async (tx) => {
			const updated = await tx
				.update(companyBudgets)
				.set({
					balance: sql`${companyBudgets.balance} - ${wages} + ${revenue}`,
					totalSpent: sql`${companyBudgets.totalSpent} + ${wages}`,
					updatedAt: now
				})
				.where(and(eq(companyBudgets.companyId, factory.companyId), gte(companyBudgets.balance, wages)))
				.returning({ id: companyBudgets.id });
			if (!updated.length) return null;
			return calculateAndCollectTax(stateId ?? null, "income", wages, ownerId, tx, factory.regionId);
		});
		if (!applied) continue;

		labour.set(factory.regionId, available - workers);
		budgets.set(factory.companyId, (budgets.get(factory.companyId) ?? 0) - wages + revenue);
		result.factoriesStaffed++;
		result.civiliansEmployed += workers;
		result.wagesPaid += wages;
		result.revenue += revenue;
		result.taxCollected += applied.taxAmount;
	}

	return result;
}
