// src/lib/server/services/politics/regional-budget.ts
// Regional budgets. When tax is collected in a region, the state's regional
// share (or the region's override) goes into the region's own budget and the
// rest to the treasury. The governor spends that budget on public works (the
// shared construction service, paid from here instead of the treasury) and on
// short programmes that lift local opinion.
//
// Every write locks the budget row or debits with a conditional update, so two
// clicks can't spend the same money twice, and every movement is written to
// the ledger with the balance it left.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { governors, regionBudgetLedger, regionBudgets, regionProgrammes, regions, states } from "#lib/server/schema.js";
import {
	REGIONAL_PROGRAMMES,
	checkProgramme,
	clampRegionalShare,
	effectiveRegionalShare,
	programmeOpinion,
	splitTax,
	REGIONAL_SHARE,
	type RegionalProgrammeKind
} from "#lib/config/index.js";
import { canManagePortfolio, stateRoles } from "../government/authority";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const DAY = 24 * 60 * 60 * 1000;

export class RegionalBudgetError extends Error {}

/** The share of local tax that stays in `regionId`, and the state it belongs to. */
export async function regionalShareFor(
	db: Db,
	regionId: number
): Promise<{ stateId: number | null; share: number; override: number | null; stateShare: number }> {
	const [row] = await db
		.select({
			stateId: regions.stateId,
			stateShare: states.regionalTaxShare,
			override: regionBudgets.shareOverride
		})
		.from(regions)
		.leftJoin(states, eq(regions.stateId, states.id))
		.leftJoin(regionBudgets, eq(regionBudgets.regionId, regions.id))
		.where(eq(regions.id, regionId))
		.limit(1);
	const stateShare = row?.stateShare ?? REGIONAL_SHARE.DEFAULT;
	return {
		stateId: row?.stateId ?? null,
		share: effectiveRegionalShare(stateShare, row?.override),
		override: row?.override ?? null,
		stateShare
	};
}

/** Add `amount` to a region's budget (creating it) and write the ledger line. */
async function credit(
	tx: Db,
	regionId: number,
	amount: number,
	entry: { kind: string; description: string; actorId?: string | null }
): Promise<number> {
	const [row] = await tx
		.insert(regionBudgets)
		.values({ regionId, balance: amount, totalCollected: amount })
		.onConflictDoUpdate({
			target: regionBudgets.regionId,
			set: {
				balance: sql`${regionBudgets.balance} + ${amount}`,
				totalCollected: sql`${regionBudgets.totalCollected} + ${amount}`,
				updatedAt: new Date()
			}
		})
		.returning({ balance: regionBudgets.balance });
	await tx.insert(regionBudgetLedger).values({
		regionId,
		kind: entry.kind,
		amount,
		balanceAfter: row!.balance,
		description: entry.description,
		actorId: entry.actorId ?? null
	});
	return row!.balance;
}

/**
 * Take `amount` out of a region's budget, or throw if it isn't there. The
 * conditional update is the double-spend guard: two concurrent debits can't
 * both pass the balance check.
 */
export async function debitRegionBudget(
	tx: Db,
	regionId: number,
	amount: number,
	entry: { kind: string; description: string; actorId: string }
): Promise<number> {
	const needed = Math.max(0, Math.floor(amount));
	const [row] = await tx
		.update(regionBudgets)
		.set({
			balance: sql`${regionBudgets.balance} - ${needed}`,
			totalSpent: sql`${regionBudgets.totalSpent} + ${needed}`,
			updatedAt: new Date()
		})
		.where(and(eq(regionBudgets.regionId, regionId), gte(regionBudgets.balance, needed)))
		.returning({ balance: regionBudgets.balance });
	if (!row) throw new RegionalBudgetError("The regional budget can't cover that.");
	await tx.insert(regionBudgetLedger).values({
		regionId,
		kind: entry.kind,
		amount: -needed,
		balanceAfter: row.balance,
		description: entry.description,
		actorId: entry.actorId
	});
	return row.balance;
}

/**
 * Route the regional share of tax collected in `regionId` into its budget.
 * Returns what's left for the state treasury. Tax raised by a state in a
 * region it doesn't own (shouldn't happen, but borders move) all goes to the
 * state.
 */
export async function creditRegionalShare(
	tx: Db,
	input: { stateId: number; regionId: number; taxAmount: number; label: string; payerId?: string | null }
): Promise<{ regional: number; state: number }> {
	const { stateId, share } = await regionalShareFor(tx, input.regionId);
	if (stateId !== input.stateId) return { regional: 0, state: Math.max(0, Math.floor(input.taxAmount)) };
	const split = splitTax(input.taxAmount, share);
	if (split.regional > 0) {
		await credit(tx, input.regionId, split.regional, {
			kind: "tax_share",
			description: `${share}% of ${input.label.toLowerCase()}`,
			actorId: input.payerId ?? null
		});
	}
	return split;
}

export async function isGovernorOf(db: Db, userId: string, regionId: number): Promise<boolean> {
	const [row] = await db
		.select({ id: governors.id })
		.from(governors)
		.where(and(eq(governors.userId, userId), eq(governors.regionId, regionId)))
		.limit(1);
	return !!row;
}

/** Programmes still running in the given regions. */
export async function runningProgrammes(db: Db, regionIds: number[], now = new Date()) {
	if (!regionIds.length) return [];
	return db
		.select()
		.from(regionProgrammes)
		.where(and(inArray(regionProgrammes.regionId, regionIds), gt(regionProgrammes.endsAt, now)))
		.orderBy(regionProgrammes.endsAt);
}

/** Opinion points the running programmes add in one region (capped). */
export async function regionProgrammeOpinion(db: Db, regionId: number, now = new Date()): Promise<number> {
	return programmeOpinion(await runningProgrammes(db, [regionId], now));
}

/** The governor starts a programme, paid from the regional budget. */
export async function startProgramme(
	db: Database,
	input: { regionId: number; userId: string; kind: string },
	now = new Date()
): Promise<{ endsAt: Date; balance: number }> {
	return db.transaction(async (tx) => {
		// Lock the budget row so the balance and the "already running" check
		// can't change underneath us.
		const [budget] = await tx
			.select({ balance: regionBudgets.balance })
			.from(regionBudgets)
			.where(eq(regionBudgets.regionId, input.regionId))
			.for("update");
		const running = await runningProgrammes(tx, [input.regionId], now);
		const check = checkProgramme({
			kind: input.kind,
			balance: budget?.balance ?? 0,
			running: running.map((p) => p.kind),
			isGovernor: await isGovernorOf(tx, input.userId, input.regionId)
		});
		if (!check.ok) throw new RegionalBudgetError(check.problems.join(" "));

		const programme = REGIONAL_PROGRAMMES[input.kind as RegionalProgrammeKind];
		const balance = await debitRegionBudget(tx, input.regionId, programme.cost, {
			kind: "programme",
			description: `${programme.icon} ${programme.name} (${programme.days} days)`,
			actorId: input.userId
		});
		const endsAt = new Date(now.getTime() + programme.days * DAY);
		await tx.insert(regionProgrammes).values({
			regionId: input.regionId,
			kind: programme.kind,
			opinion: programme.opinion,
			cost: programme.cost,
			startedBy: input.userId,
			startedAt: now,
			endsAt
		});
		return { endsAt, balance };
	});
}

/** President or economy minister of the state. */
export async function canSetRegionalShare(db: Db, userId: string, stateId: number): Promise<boolean> {
	return canManagePortfolio(await stateRoles(db, userId), stateId, "economy_energy");
}

/** Set the state's default regional share. */
export async function setStateRegionalShare(
	db: Database,
	input: { stateId: number; userId: string; share: number }
): Promise<number> {
	if (!(await canSetRegionalShare(db, input.userId, input.stateId))) {
		throw new RegionalBudgetError("Only the president or the economy minister can set the regional share.");
	}
	if (!Number.isFinite(input.share)) throw new RegionalBudgetError("Enter a share in percent.");
	const share = clampRegionalShare(input.share);
	await db.update(states).set({ regionalTaxShare: share }).where(eq(states.id, input.stateId));
	return share;
}

/** Set (or with `share: null`, clear) one region's override of the state share. */
export async function setRegionShareOverride(
	db: Database,
	input: { stateId: number; regionId: number; userId: string; share: number | null }
): Promise<number | null> {
	if (!(await canSetRegionalShare(db, input.userId, input.stateId))) {
		throw new RegionalBudgetError("Only the president or the economy minister can set the regional share.");
	}
	const [region] = await db
		.select({ stateId: regions.stateId })
		.from(regions)
		.where(eq(regions.id, input.regionId))
		.limit(1);
	if (!region || region.stateId !== input.stateId) throw new RegionalBudgetError("That region isn't in this state.");
	if (input.share !== null && !Number.isFinite(input.share)) throw new RegionalBudgetError("Enter a share in percent.");
	const share = input.share === null ? null : clampRegionalShare(input.share);
	await db
		.insert(regionBudgets)
		.values({ regionId: input.regionId, shareOverride: share })
		.onConflictDoUpdate({ target: regionBudgets.regionId, set: { shareOverride: share, updatedAt: new Date() } });
	return share;
}

/** Regions of a state that override its share. */
export async function regionShareOverrides(db: Db, stateId: number) {
	return db
		.select({ regionId: regions.id, share: regionBudgets.shareOverride })
		.from(regionBudgets)
		.innerJoin(regions, eq(regionBudgets.regionId, regions.id))
		.where(and(eq(regions.stateId, stateId), sql`${regionBudgets.shareOverride} is not null`));
}

/** Everything the region page shows about the budget. */
export async function regionBudgetSummary(db: Db, regionId: number, userId: string, now = new Date()) {
	const dayAgo = new Date(now.getTime() - DAY);
	const [[budget], shareInfo, [income], ledger, running, governor] = await Promise.all([
		db.select().from(regionBudgets).where(eq(regionBudgets.regionId, regionId)).limit(1),
		regionalShareFor(db, regionId),
		db
			.select({ total: sql<number>`coalesce(sum(${regionBudgetLedger.amount}), 0)`.mapWith(Number) })
			.from(regionBudgetLedger)
			.where(
				and(
					eq(regionBudgetLedger.regionId, regionId),
					eq(regionBudgetLedger.kind, "tax_share"),
					gte(regionBudgetLedger.createdAt, dayAgo)
				)
			),
		db
			.select()
			.from(regionBudgetLedger)
			.where(eq(regionBudgetLedger.regionId, regionId))
			.orderBy(desc(regionBudgetLedger.createdAt), desc(regionBudgetLedger.id))
			.limit(8),
		runningProgrammes(db, [regionId], now),
		isGovernorOf(db, userId, regionId)
	]);
	return {
		balance: budget?.balance ?? 0,
		totalCollected: budget?.totalCollected ?? 0,
		totalSpent: budget?.totalSpent ?? 0,
		incomeLastDay: income?.total ?? 0,
		share: shareInfo.share,
		stateShare: shareInfo.stateShare,
		override: shareInfo.override,
		isGovernor: governor,
		ledger: ledger.map((l) => ({
			id: l.id,
			kind: l.kind,
			amount: l.amount,
			balanceAfter: l.balanceAfter,
			description: l.description,
			at: l.createdAt.toISOString()
		})),
		programmes: running.map((p) => ({
			id: p.id,
			kind: p.kind,
			opinion: p.opinion,
			endsAt: p.endsAt.toISOString()
		})),
		programmeOpinion: programmeOpinion(running)
	};
}

/** The state's split: its share, each region's budget and override, and who may change it. */
export async function stateRegionalShares(db: Db, stateId: number, userId: string) {
	const [[state], rows, canEdit] = await Promise.all([
		db.select({ share: states.regionalTaxShare }).from(states).where(eq(states.id, stateId)).limit(1),
		db
			.select({
				regionId: regions.id,
				balance: regionBudgets.balance,
				override: regionBudgets.shareOverride
			})
			.from(regions)
			.leftJoin(regionBudgets, eq(regionBudgets.regionId, regions.id))
			.where(eq(regions.stateId, stateId))
			.orderBy(regions.id),
		canSetRegionalShare(db, userId, stateId)
	]);
	const share = state?.share ?? REGIONAL_SHARE.DEFAULT;
	return {
		share,
		min: REGIONAL_SHARE.MIN,
		max: REGIONAL_SHARE.MAX,
		canEdit,
		regions: rows.map((r) => ({
			id: r.regionId,
			balance: r.balance ?? 0,
			override: r.override ?? null,
			effective: effectiveRegionalShare(share, r.override)
		}))
	};
}
