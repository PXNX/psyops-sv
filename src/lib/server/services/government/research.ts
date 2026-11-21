// Research in the database: who may fund it, what it costs, and where the
// completed levels live. The rules and prices come from research.config.ts;
// this file only checks authority, moves the treasury and records the ledger.

import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { governmentBudgetTransactions, stateResearch, stateTreasury } from "../../schema";
import {
	RESEARCH_AREAS,
	canResearch,
	levelOf,
	researchArea,
	researchCost,
	type ResearchAreaId,
	type ResearchLevels
} from "#lib/config/index.js";
import { canManagePortfolio, stateRoles } from "./authority";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export class ResearchError extends Error {}

export interface FundResearchInput {
	stateId: number;
	area: string;
	fundedBy: string;
}

export interface ResearchResult {
	area: ResearchAreaId;
	level: number;
	cost: number;
}

/** Current research levels of a state, clamped and without unknown areas. */
export async function researchLevels(db: Db, stateId: number): Promise<ResearchLevels> {
	const rows = await db
		.select({ area: stateResearch.area, level: stateResearch.level })
		.from(stateResearch)
		.where(eq(stateResearch.stateId, stateId));
	const levels: ResearchLevels = {};
	for (const row of rows) {
		if (!(row.area in RESEARCH_AREAS)) continue;
		const id = row.area as ResearchAreaId;
		levels[id] = Math.min(RESEARCH_AREAS[id].maxLevel, Math.max(0, Math.floor(row.level)));
	}
	return levels;
}

/** Advance one area by a level, paid for from the state treasury. */
export async function fundResearch(db: Database, input: FundResearchInput): Promise<ResearchResult> {
	const spec = researchArea(input.area);
	if (!spec) throw new ResearchError("Unknown research area.");
	const area = input.area as ResearchAreaId;

	const offices = await stateRoles(db, input.fundedBy);
	if (!canManagePortfolio(offices, input.stateId, spec.portfolio))
		throw new ResearchError("Only the president or the minister responsible for this field can fund research.");

	const levels = await researchLevels(db, input.stateId);
	if (!canResearch(area, levels))
		throw new ResearchError(
			levelOf(levels, area) >= spec.maxLevel ? "This field is fully researched." : "Prerequisite research is missing."
		);

	const current = levelOf(levels, area);
	const cost = researchCost(area, current)!;
	const next = current + 1;

	return db.transaction(async (tx) => {
		const [treasury] = await tx
			.select()
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new ResearchError(`The treasury needs ${cost.toLocaleString()} to fund this research.`);
		const balanceAfter = Number(treasury.balance) - cost;
		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, input.stateId));
		await tx
			.insert(stateResearch)
			.values({ stateId: input.stateId, area, level: next, points: 0 })
			.onConflictDoUpdate({
				target: [stateResearch.stateId, stateResearch.area],
				set: { level: next, points: 0, updatedAt: new Date() }
			});
		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "research",
			amount: cost,
			balanceAfter,
			description: `Advanced ${spec.label} research to level ${next}`,
			authorizedBy: input.fundedBy
		});
		return { area, level: next, cost };
	});
}

/** Bank research points accrued from labs and AI (the daily cron's job). */
export async function creditResearchPoints(db: Db, stateId: number, points: number): Promise<void> {
	const gained = Math.max(0, Math.floor(points));
	if (gained === 0) return;
	await db
		.insert(stateResearch)
		.values({ stateId, area: "points", level: 0, points: gained })
		.onConflictDoUpdate({
			target: [stateResearch.stateId, stateResearch.area],
			set: { points: sql`${stateResearch.points} + ${gained}`, updatedAt: new Date() }
		});
}

/** Banked, unspent research points of a state. */
export async function researchPoints(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ points: stateResearch.points })
		.from(stateResearch)
		.where(and(eq(stateResearch.stateId, stateId), eq(stateResearch.area, "points")))
		.limit(1);
	return row?.points ?? 0;
}
