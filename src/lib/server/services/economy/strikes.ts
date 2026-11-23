// src/lib/server/services/economy/strikes.ts
// Weekly fair-pay cycle. A crew can walk out at most once a week when its wage
// is unfair judged against a living wage, local peers, regional hardship and
// what the company can afford. The harder the unfairness, the deeper the
// output cut. A strike ends only when the owner pays the demanded wage, which
// then becomes the factory's minimum. Safe to re-run.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { companies, companyBudgets, factories, factoryWorkers, regions } from "../../schema";
import { regionsCivilianNeeds } from "../civilians/supply";
import { FACTORY_FINANCE, canStrike, fairWage, strikeSeverity } from "#lib/config/index.js";

export interface StrikeCycleResult {
	evaluated: number;
	started: number;
	resolved: number;
}

/** Evaluate every factory once and start or resolve strikes as warranted. */
export async function runStrikeCycle(db: Database, now: Date = new Date()): Promise<StrikeCycleResult> {
	const [rows, budgets, workerCounts, needs] = await Promise.all([
		db
			.select({
				id: factories.id,
				regionId: factories.regionId,
				companyId: factories.companyId,
				wage: factories.workerWage,
				active: factories.strikeActive,
				demanded: factories.demandedWage,
				lastStrikeAt: factories.lastStrikeAt
			})
			.from(factories),
		db.select({ companyId: companyBudgets.companyId, balance: companyBudgets.balance }).from(companyBudgets),
		db
			.select({ companyId: factories.companyId, n: factoryWorkers.userId })
			.from(factoryWorkers)
			.innerJoin(factories, eq(factoryWorkers.factoryId, factories.id)),
		(async () => {
			const regionIds = await db.select({ id: regions.id }).from(regions);
			return regionsCivilianNeeds(db, regionIds.map((r) => r.id));
		})()
	]);

	const budgetByCompany = new Map(budgets.map((b) => [b.companyId, Number(b.balance)]));
	const workersByCompany = new Map<number, number>();
	for (const w of workerCounts) workersByCompany.set(w.companyId, (workersByCompany.get(w.companyId) ?? 0) + 1);

	// Regional peer wages: the local labour market a worker compares against.
	const peers = new Map<number, { sum: number; n: number }>();
	for (const row of rows) {
		const p = peers.get(row.regionId) ?? { sum: 0, n: 0 };
		p.sum += Number(row.wage);
		p.n++;
		peers.set(row.regionId, p);
	}

	const result: StrikeCycleResult = { evaluated: rows.length, started: 0, resolved: 0 };
	for (const row of rows) {
		const paid = Number(row.wage);
		if (row.active) {
			// Paying the demand ends the strike and fixes the new wage floor.
			if (row.demanded !== null && paid >= row.demanded) {
				const updated = await db
					.update(factories)
					.set({
						strikeActive: false,
						strikeSeverity: 0,
						demandedWage: null,
						minimumWage: row.demanded,
						uninterruptedShifts: 0
					})
					.where(and(eq(factories.id, row.id), eq(factories.strikeActive, true)))
					.returning({ id: factories.id });
				if (updated.length) result.resolved++;
			}
			continue;
		}

		if (!canStrike(row.lastStrikeAt, now)) continue;
		const peer = peers.get(row.regionId);
		const peerWage = peer && peer.n > 1 ? (peer.sum - paid) / (peer.n - 1) : null;
		const demand = fairWage({
			paidWage: paid,
			peerWage,
			hardship: needs.get(row.regionId)?.hardship ?? 0,
			companyBudget: budgetByCompany.get(row.companyId) ?? 0,
			workerCount: workersByCompany.get(row.companyId) ?? 0
		});
		const severity = strikeSeverity(paid, demand);
		if (severity <= 0) continue;

		const updated = await db
			.update(factories)
			.set({
				strikeActive: true,
				strikeSeverity: severity,
				demandedWage: demand,
				lastStrikeAt: now,
				// A walkout breaks the clean run.
				uninterruptedShifts: 0
			})
			.where(and(eq(factories.id, row.id), eq(factories.strikeActive, false)))
			.returning({ id: factories.id });
		if (updated.length) result.started++;
	}

	return result;
}

/** Apply a wage change: a strike resolves as soon as the demand is met. */
export function wageUpdateFields(
	newWage: number,
	options: { strikeActive: boolean; demandedWage: number | null; minimumWage: number | null }
) {
	const floor = Math.max(options.minimumWage ?? 0, options.demandedWage ?? 0);
	if (newWage < floor) return null;
	if (options.strikeActive && options.demandedWage !== null && newWage >= options.demandedWage) {
		return {
			strikeActive: false,
			strikeSeverity: 0,
			demandedWage: null,
			minimumWage: options.demandedWage,
			uninterruptedShifts: 0
		};
	}
	return {};
}

export { FACTORY_FINANCE };
