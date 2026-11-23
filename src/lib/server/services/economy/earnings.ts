// src/lib/server/services/economy/earnings.ts
// Company earnings, published every two weeks alongside the bond coupon run.
// The report is a snapshot of what the company's factories produced and paid
// in the period, plus the dividends that actually reached shareholders.
//
// No SvelteKit virtual modules at the top level: tests import this directly.

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Database } from "../../db";
import { companies, companyShares, dividendPayouts, factories, factoryWorkers } from "../../schema";
import { companyEarningsReports } from "../../schema-investments";
import { INVESTMENTS_CONFIG } from "#lib/config/game/investments.config.js";
import { SHIFT_RECIPES, goodValue, productivityFactor, strikeOutputFactor } from "#lib/config/index.js";

const DAY = 86_400_000;
const { EARNINGS_PERIOD_DAYS, BIWEEKLY_ANCHOR } = INVESTMENTS_CONFIG;

/** Material cost of one unit of a product, from its shift recipe. */
function inputCostPerUnit(good: string | null | undefined): number {
	const recipe = good ? SHIFT_RECIPES[good] : undefined;
	if (!recipe?.output) return 0;
	const cost = Object.entries(recipe.inputs).reduce((sum, [input, qty]) => sum + goodValue(input) * (qty ?? 0), 0);
	return cost / recipe.output;
}

/**
 * True on every other Monday since the anchor. The Vercel schedule fires
 * weekly; this guard makes the work fortnightly without an extra state table
 * (and stays correct if a weekly run is missed).
 */
export function isBiweeklyDue(now: Date = new Date(), anchor: Date | string = BIWEEKLY_ANCHOR): boolean {
	const weeks = Math.floor((now.getTime() - new Date(anchor).getTime()) / (7 * DAY));
	return weeks >= 0 && weeks % 2 === 0;
}

/** The 14-day window a report covers, ending at `now`. */
export function earningsWindow(now: Date = new Date()) {
	return { periodStart: new Date(now.getTime() - EARNINGS_PERIOD_DAYS * DAY), periodEnd: now };
}

/**
 * Publish one report per listed company for the period ending now. Existing
 * reports for the same period are left alone, so a re-run is harmless.
 */
export async function generateEarningsReports(db: Database, now = new Date()) {
	const { periodStart, periodEnd } = earningsWindow(now);
	const listed = await db
		.select({ companyId: companyShares.companyId, totalShares: companyShares.totalShares })
		.from(companyShares);
	if (!listed.length) return { published: 0, periodEnd };

	const companyIds = listed.map((r) => r.companyId);
	const sharesByCompany = new Map(listed.map((r) => [r.companyId, r.totalShares]));
	const [allFactories, allWorkers, allDividends] = await Promise.all([
		db.select().from(factories).where(inArray(factories.companyId, companyIds)),
		db.select().from(factoryWorkers),
		db
			.select({ companyId: dividendPayouts.companyId, amount: dividendPayouts.amount })
			.from(dividendPayouts)
			.where(and(gte(dividendPayouts.paidAt, periodStart), lte(dividendPayouts.paidAt, periodEnd)))
	]);

	const factoryIds = new Map(allFactories.map((f) => [f.id, f]));
	const workersByFactory = new Map<number, typeof allWorkers>();
	for (const worker of allWorkers) {
		const list = workersByFactory.get(worker.factoryId) ?? [];
		list.push(worker);
		workersByFactory.set(worker.factoryId, list);
	}
	const dividendsByCompany = new Map<number, number>();
	for (const payout of allDividends) {
		dividendsByCompany.set(payout.companyId, (dividendsByCompany.get(payout.companyId) ?? 0) + payout.amount);
	}

	const rows = companyIds.map((companyId) => {
		let revenue = 0;
		let expenses = 0;
		let materials = 0;
		for (const factory of allFactories.filter((f) => f.companyId === companyId)) {
			const workers = workersByFactory.get(factory.id) ?? [];
			// A worker on the payroll for the window runs one shift a day.
			const shifts = workers.filter((w) => new Date(w.hiredAt) <= periodEnd).length * EARNINGS_PERIOD_DAYS;
			// A walkout caps output; an uninterrupted run lifts it.
			const output =
				factory.productionRate *
				shifts *
				strikeOutputFactor(factory.strikeSeverity) *
				productivityFactor(factory.uninterruptedShifts);
			const good = factory.productOutput ?? factory.resourceOutput;
			revenue += goodValue(good) * output;
			materials += inputCostPerUnit(good) * output;
			for (const worker of workers) expenses += (worker.wageAtShiftStart ?? 0) * EARNINGS_PERIOD_DAYS;
		}
		const roundedRevenue = Math.round(revenue);
		const operatingCosts = Math.round(expenses + materials);
		return {
			companyId,
			periodStart,
			periodEnd,
			revenue: roundedRevenue,
			expenses: Math.round(expenses),
			profit: roundedRevenue - Math.round(expenses),
			// EBITDA: operating earnings before financing, tax and depreciation.
			ebitda: roundedRevenue - operatingCosts,
			dividendsPaid: dividendsByCompany.get(companyId) ?? 0,
			sharesOutstanding: sharesByCompany.get(companyId) ?? 0
		};
	});

	const published = await db
		.insert(companyEarningsReports)
		.values(rows)
		.onConflictDoNothing({ target: [companyEarningsReports.companyId, companyEarningsReports.periodEnd] })
		.returning({ id: companyEarningsReports.id });
	return { published: published.length, periodEnd };
}

/** Latest reports across the market, with company names, newest first. */
export async function earningsPulse(db: Database, limit = 8) {
	return db
		.select({
			id: companyEarningsReports.id,
			companyId: companyEarningsReports.companyId,
			companyName: companies.name,
			periodStart: companyEarningsReports.periodStart,
			periodEnd: companyEarningsReports.periodEnd,
			revenue: companyEarningsReports.revenue,
			expenses: companyEarningsReports.expenses,
			profit: companyEarningsReports.profit,
			ebitda: companyEarningsReports.ebitda,
			dividendsPaid: companyEarningsReports.dividendsPaid,
			sharesOutstanding: companyEarningsReports.sharesOutstanding
		})
		.from(companyEarningsReports)
		.innerJoin(companies, eq(companyEarningsReports.companyId, companies.id))
		.orderBy(desc(companyEarningsReports.periodEnd), desc(companyEarningsReports.id))
		.limit(limit);
}

/** One company's report history, newest first. */
export async function companyEarnings(db: Database, companyId: number, limit = 6) {
	return db
		.select()
		.from(companyEarningsReports)
		.where(eq(companyEarningsReports.companyId, companyId))
		.orderBy(desc(companyEarningsReports.periodEnd))
		.limit(limit);
}
