// src/lib/server/services/economy/dividends.ts
// Dividends: a public company pays money from its budget to every shareholder
// pro rata, in whole currency per share. Shares a holder has listed for sale
// are still theirs (only held in escrow), so they earn dividends too, and the
// founder's locked block is paid like any other holding.
//
// Two ways to pay:
//   - declareDividend: the owner names a rate per share on the company page.
//   - runAutomaticDividends: an hourly cron pays companies with a payout
//     policy (a % of the budget above a reserve they keep back).
// Both share one cooldown (companyShares.lastDividendAt) and the same rules
// in ECONOMY_CONFIG. Each payout is a single transaction: claim the cooldown,
// debit the budget, credit every holder, log transaction history, payout rows
// and inbox messages. Anything that fails rolls all of it back.
//
// No SvelteKit virtual modules at the top level (tests import this file);
// push notifications are loaded lazily.
import { and, desc, eq, gt, gte, inArray, isNull, lte, min, or, sql, sum } from "drizzle-orm";
import type { Database } from "../../db";
import {
	companies,
	companyBudgets,
	companyShares,
	dividendPayouts,
	inboxMessages,
	shareHoldings,
	shareListings,
	shareTransactions,
	transactionHistory,
	userWallets
} from "../../schema";
import { creditWallet } from "../../money";
import { ECONOMY_CONFIG } from "#lib/config/index.js";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** A payout that can't go through for a reason the owner should see. */
export class DividendError extends Error {}

export interface Holder {
	userId: string;
	shares: number;
}

export interface DividendSplit {
	perShare: number;
	/** What leaves the budget: perShare × all shares held. */
	total: number;
	/** Part of the pool too small to give every share another whole unit; stays in the budget. */
	remainder: number;
	payouts: Array<Holder & { amount: number }>;
}

/**
 * Split `pool` over the holders in whole currency per share. Every share earns
 * the same, so nobody is short-changed by rounding; whatever doesn't divide
 * evenly stays with the company.
 */
export function splitDividend(pool: number, holders: Holder[]): DividendSplit {
	const live = holders.filter((h) => h.shares > 0);
	const shares = live.reduce((n, h) => n + h.shares, 0);
	const safePool = Math.max(0, Math.floor(pool));
	const perShare = shares > 0 ? Math.floor(safePool / shares) : 0;
	const payouts = live.map((h) => ({ ...h, amount: perShare * h.shares }));
	const total = perShare * shares;
	return { perShare, total, remainder: safePool - total, payouts };
}

/** The pool an automatic policy pays: `ratio`% of the budget above the reserve, floored. */
export function automaticPool(balance: number, reserve: number, ratioPercent: number): number {
	const ratio = Math.min(100, Math.max(0, ratioPercent));
	return Math.floor((Math.max(0, balance - Math.max(0, reserve)) * ratio) / 100);
}

/** When the next payout is allowed, or null if one is allowed now. */
export function dividendCooldownEndsAt(lastDividendAt: Date | null, now: Date): Date | null {
	if (!lastDividendAt) return null;
	const end = new Date(lastDividendAt.getTime() + ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS * HOUR);
	return end > now ? end : null;
}

/** Why a split can't be paid, or null if it can. */
export function dividendRuleViolation(split: Pick<DividendSplit, "perShare" | "total">, budget: number): string | null {
	if (split.perShare < ECONOMY_CONFIG.DIVIDEND_MIN_PER_SHARE) {
		return `A dividend must be at least $${ECONOMY_CONFIG.DIVIDEND_MIN_PER_SHARE.toLocaleString()} per share`;
	}
	if (split.total < ECONOMY_CONFIG.DIVIDEND_MIN_TOTAL) {
		return `A dividend must pay out at least $${ECONOMY_CONFIG.DIVIDEND_MIN_TOTAL.toLocaleString()} in total`;
	}
	if (split.total > budget) {
		return `The company budget can't cover $${split.total.toLocaleString()} (has $${budget.toLocaleString()})`;
	}
	return null;
}

/** Dividend yield in percent: what one share was paid over the window, over its price. */
export function dividendYieldPercent(paidPerShare: number, sharePrice: number | null): number | null {
	if (!sharePrice || sharePrice <= 0) return null;
	return Math.round((paidPerShare / sharePrice) * 1000) / 10;
}

function formatWait(ms: number) {
	const minutes = Math.max(1, Math.ceil(ms / 60_000));
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Every holder of the company, counting shares they have listed for sale. */
async function holdersOf(db: Pick<Database, "select">, companyId: number): Promise<Holder[]> {
	const [held, listed] = await Promise.all([
		db
			.select({ userId: shareHoldings.userId, shares: shareHoldings.quantity })
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, companyId), gt(shareHoldings.quantity, 0))),
		db
			.select({ userId: shareListings.sellerId, shares: sum(shareListings.quantity).mapWith(Number) })
			.from(shareListings)
			.where(eq(shareListings.companyId, companyId))
			.groupBy(shareListings.sellerId)
	]);
	const byUser = new Map<string, number>();
	for (const h of [...held, ...listed]) byUser.set(h.userId, (byUser.get(h.userId) ?? 0) + Number(h.shares));
	return [...byUser]
		.map(([userId, shares]) => ({ userId, shares }))
		.filter((h) => h.shares > 0)
		.sort((a, b) => b.shares - a.shares || a.userId.localeCompare(b.userId));
}

export interface DividendResult {
	companyId: number;
	companyName: string;
	perShare: number;
	total: number;
	remainder: number;
	recipients: number;
	automatic: boolean;
	paidAt: Date;
	payouts: Array<Holder & { amount: number; balanceAfter: number }>;
}

type PayRequest = { perShare: number } | { pool: number };

async function payDividend(
	db: Database,
	companyId: number,
	request: PayRequest,
	opts: { now: Date; automatic: boolean; notify: boolean }
): Promise<DividendResult> {
	const { now, automatic } = opts;
	const cutoff = new Date(now.getTime() - ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS * HOUR);

	const result = await db.transaction(async (tx: Tx) => {
		const [company] = await tx
			.select({ id: companies.id, name: companies.name, ownerId: companies.ownerId })
			.from(companies)
			.where(eq(companies.id, companyId));
		if (!company) throw new DividendError("Company not found");

		// Claim the cooldown first: the conditional update is the lock that keeps
		// two payouts (a double click, the cron racing the owner) from both going out.
		const [claimed] = await tx
			.update(companyShares)
			.set({ lastDividendAt: now })
			.where(
				and(
					eq(companyShares.companyId, companyId),
					or(isNull(companyShares.lastDividendAt), lte(companyShares.lastDividendAt, cutoff))
				)
			)
			.returning({ id: companyShares.id });
		if (!claimed) {
			const [shares] = await tx.select().from(companyShares).where(eq(companyShares.companyId, companyId));
			if (!shares) throw new DividendError("Only public companies pay dividends");
			const ends = dividendCooldownEndsAt(shares.lastDividendAt, now);
			throw new DividendError(
				`Dividends are paid at most once every ${ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS}h. Next one in ${formatWait(
					(ends?.getTime() ?? now.getTime()) - now.getTime()
				)}`
			);
		}

		const holders = await holdersOf(tx, companyId);
		const heldShares = holders.reduce((n, h) => n + h.shares, 0);
		const pool = "pool" in request ? request.pool : Math.floor(request.perShare) * heldShares;
		const split = splitDividend(pool, holders);

		const [budget] = await tx
			.select({ balance: companyBudgets.balance })
			.from(companyBudgets)
			.where(eq(companyBudgets.companyId, companyId));
		const violation = dividendRuleViolation(split, Number(budget?.balance ?? 0));
		if (violation) throw new DividendError(violation);

		// The balance check rides in the WHERE clause, so a concurrent wage run can't overdraw it.
		const [debited] = await tx
			.update(companyBudgets)
			.set({
				balance: sql`${companyBudgets.balance} - ${split.total}`,
				totalSpent: sql`${companyBudgets.totalSpent} + ${split.total}`,
				updatedAt: now
			})
			.where(and(eq(companyBudgets.companyId, companyId), gte(companyBudgets.balance, split.total)))
			.returning({ balance: companyBudgets.balance });
		if (!debited) throw new DividendError("The company budget can't cover this dividend");

		// Holders without a wallet yet get one, the same way the wallet service opens them.
		await tx
			.insert(userWallets)
			.values(split.payouts.map((p) => ({ userId: p.userId, balance: ECONOMY_CONFIG.INITIAL_USER_WALLET })))
			.onConflictDoNothing({ target: userWallets.userId });

		const payouts: DividendResult["payouts"] = [];
		for (const p of split.payouts) {
			const balanceAfter = Number(await creditWallet(tx, p.userId, p.amount));
			payouts.push({ ...p, balanceAfter });
		}

		const description = `Dividend: ${company.name}`;
		await tx.insert(transactionHistory).values(
			payouts.map((p) => ({
				userId: p.userId,
				transactionType: "dividend_payout" as const,
				amount: p.amount,
				balanceAfter: p.balanceAfter,
				description,
				relatedUserId: company.ownerId,
				relatedEntityType: "company",
				relatedEntityId: companyId,
				metadata: JSON.stringify({ perShare: split.perShare, shares: p.shares, automatic }),
				createdAt: now
			}))
		);

		await tx.insert(dividendPayouts).values(
			payouts.map((p) => ({
				companyId,
				userId: p.userId,
				amount: p.amount,
				sharesHeld: p.shares,
				perShare: split.perShare,
				automatic,
				paidAt: now
			}))
		);

		// The owner pressed the button themselves; an automatic payout tells them too.
		const told = payouts.filter((p) => automatic || p.userId !== company.ownerId);
		if (told.length) {
			await tx.insert(inboxMessages).values(
				told.map((p) => ({
					recipientId: p.userId,
					senderId: company.ownerId,
					messageType: "system" as const,
					subject: `Dividend from ${company.name}`.slice(0, 200),
					content: `${company.name} paid a dividend of $${split.perShare.toLocaleString()} per share. Your ${p.shares.toLocaleString()} share${
						p.shares === 1 ? "" : "s"
					} earned $${p.amount.toLocaleString()}, now in your wallet.`,
					sentAt: now
				}))
			);
		}

		return {
			companyId,
			companyName: company.name,
			ownerId: company.ownerId,
			perShare: split.perShare,
			total: split.total,
			remainder: split.remainder,
			recipients: payouts.length,
			automatic,
			paidAt: now,
			payouts
		};
	});

	const { ownerId, ...out } = result;
	if (opts.notify) {
		const recipients = out.payouts.filter((p) => automatic || p.userId !== ownerId);
		void (async () => {
			const { sendNotificationIfEnabled } = await import("../push-notification.service");
			await Promise.allSettled(
				recipients.map((p) =>
					sendNotificationIfEnabled(p.userId, "notifyMarketSales", {
						title: `Dividend from ${out.companyName}`,
						body: `Your ${p.shares.toLocaleString()} shares earned $${p.amount.toLocaleString()}.`,
						icon: "/favicon.png",
						badge: "/badge.png",
						data: { url: `/company/${companyId}`, tag: `dividend-${companyId}-${now.getTime()}` }
					})
				)
			);
		})().catch((err) => console.error("Failed to send dividend notifications:", err));
	}

	return out;
}

/** The owner declares a dividend of `perShare` (whole currency) on every share. */
export async function declareDividend(
	db: Database,
	opts: { companyId: number; userId: string; perShare: number; now?: Date; notify?: boolean }
): Promise<DividendResult> {
	if (!Number.isSafeInteger(opts.perShare) || opts.perShare < 1) {
		throw new DividendError("The dividend per share must be a whole amount of at least 1");
	}
	const [company] = await db
		.select({ ownerId: companies.ownerId })
		.from(companies)
		.where(eq(companies.id, opts.companyId));
	if (!company) throw new DividendError("Company not found");
	if (company.ownerId !== opts.userId) throw new DividendError("Only the company owner can declare a dividend");
	return payDividend(
		db,
		opts.companyId,
		{ perShare: opts.perShare },
		{ now: opts.now ?? new Date(), automatic: false, notify: opts.notify ?? true }
	);
}

/** Set the automatic payout policy (owner only). Ratio 0 turns it off. */
export async function setDividendPolicy(
	db: Database,
	opts: { companyId: number; userId: string; ratioPercent: number; reserve: number }
) {
	const ratio = Math.round(opts.ratioPercent);
	const reserve = Math.floor(opts.reserve);
	if (!(ratio >= 0 && ratio <= 100)) throw new DividendError("The payout ratio must be between 0% and 100%");
	if (!Number.isSafeInteger(reserve) || reserve < 0) throw new DividendError("The reserve can't be negative");

	const [company] = await db
		.select({ ownerId: companies.ownerId })
		.from(companies)
		.where(eq(companies.id, opts.companyId));
	if (!company) throw new DividendError("Company not found");
	if (company.ownerId !== opts.userId) throw new DividendError("Only the company owner can set the dividend policy");

	const [row] = await db
		.update(companyShares)
		.set({ dividendPayoutRatio: ratio, dividendReserve: reserve })
		.where(eq(companyShares.companyId, opts.companyId))
		.returning({ id: companyShares.id });
	if (!row) throw new DividendError("Only public companies pay dividends");
}

export interface AutomaticDividendRun {
	paid: DividendResult[];
	/** Policies that had nothing (or too little) to pay this time. */
	skipped: number;
	failures: number;
}

/**
 * Pay every company whose policy is on and whose cooldown has run out. Called
 * from an existing hourly cron; one company failing doesn't stop the others.
 */
export async function runAutomaticDividends(
	db: Database,
	opts: { now?: Date; notify?: boolean } = {}
): Promise<AutomaticDividendRun> {
	const now = opts.now ?? new Date();
	const cutoff = new Date(now.getTime() - ECONOMY_CONFIG.DIVIDEND_COOLDOWN_HOURS * HOUR);
	const due = await db
		.select({
			companyId: companyShares.companyId,
			ratio: companyShares.dividendPayoutRatio,
			reserve: companyShares.dividendReserve,
			balance: companyBudgets.balance
		})
		.from(companyShares)
		.innerJoin(companyBudgets, eq(companyBudgets.companyId, companyShares.companyId))
		.where(
			and(
				gt(companyShares.dividendPayoutRatio, 0),
				or(isNull(companyShares.lastDividendAt), lte(companyShares.lastDividendAt, cutoff))
			)
		);

	const run: AutomaticDividendRun = { paid: [], skipped: 0, failures: 0 };
	for (const c of due) {
		const pool = automaticPool(Number(c.balance), Number(c.reserve), c.ratio);
		if (pool < ECONOMY_CONFIG.DIVIDEND_MIN_TOTAL) {
			run.skipped++;
			continue;
		}
		try {
			run.paid.push(
				await payDividend(db, c.companyId, { pool }, { now, automatic: true, notify: opts.notify ?? true })
			);
		} catch (err) {
			if (err instanceof DividendError) {
				run.skipped++;
			} else {
				run.failures++;
				console.error(`[dividends] company ${c.companyId} failed:`, err);
			}
		}
	}
	return run;
}

// ============ Reading ============

/** Current quote per share: the lowest live offer, else the last trade, else the IPO price. */
async function sharePrices(db: Database, companyIds: number[]) {
	if (!companyIds.length) return new Map<number, number>();
	const [shares, asks, trades] = await Promise.all([
		db
			.select({ companyId: companyShares.companyId, ipoPrice: companyShares.ipoPrice })
			.from(companyShares)
			.where(inArray(companyShares.companyId, companyIds)),
		db
			.select({ companyId: shareListings.companyId, lowest: min(shareListings.pricePerUnit).as("lowest") })
			.from(shareListings)
			.where(and(inArray(shareListings.companyId, companyIds), gt(shareListings.quantity, 0)))
			.groupBy(shareListings.companyId),
		db
			.selectDistinctOn([shareTransactions.companyId], {
				companyId: shareTransactions.companyId,
				quantity: shareTransactions.quantity,
				totalPrice: shareTransactions.totalPrice
			})
			.from(shareTransactions)
			.where(inArray(shareTransactions.companyId, companyIds))
			.orderBy(shareTransactions.companyId, desc(shareTransactions.completedAt), desc(shareTransactions.id))
	]);
	const prices = new Map(shares.map((s) => [s.companyId, Number(s.ipoPrice)]));
	for (const t of trades) {
		if (t.quantity > 0) prices.set(t.companyId, Math.round(Number(t.totalPrice) / t.quantity));
	}
	// A share is worth what you can buy it for right now, not what someone paid earlier.
	for (const ask of asks) {
		if (ask.lowest !== null) prices.set(ask.companyId, Number(ask.lowest));
	}
	return prices;
}

/** Per company: what one share was paid within the yield window, and the last payout. */
export async function dividendYields(db: Database, companyIds: number[], now = new Date()) {
	const out = new Map<
		number,
		{ paidPerShare: number; yieldPercent: number | null; lastPaidAt: Date | null; lastPerShare: number | null }
	>();
	if (!companyIds.length) return out;
	const since = new Date(now.getTime() - ECONOMY_CONFIG.DIVIDEND_YIELD_WINDOW_DAYS * DAY);
	const [prices, payouts] = await Promise.all([
		sharePrices(db, companyIds),
		// One row per payout (all rows of a payout share companyId, paidAt and perShare).
		db
			.selectDistinct({
				companyId: dividendPayouts.companyId,
				paidAt: dividendPayouts.paidAt,
				perShare: dividendPayouts.perShare
			})
			.from(dividendPayouts)
			.where(inArray(dividendPayouts.companyId, companyIds))
	]);
	for (const id of companyIds) {
		const mine = payouts.filter((p) => p.companyId === id);
		const last = mine.reduce<(typeof mine)[number] | null>((a, p) => (!a || p.paidAt > a.paidAt ? p : a), null);
		const paidPerShare = mine.filter((p) => p.paidAt >= since).reduce((n, p) => n + Number(p.perShare), 0);
		out.set(id, {
			paidPerShare,
			yieldPercent: prices.has(id) ? dividendYieldPercent(paidPerShare, prices.get(id)!) : null,
			lastPaidAt: last?.paidAt ?? null,
			lastPerShare: last ? Number(last.perShare) : null
		});
	}
	return out;
}

/** Everything the company page's Dividends panel shows. */
export async function dividendOverview(db: Database, companyId: number, viewerId: string, now = new Date()) {
	const [historyRows, mine, yields, prices] = await Promise.all([
		db
			.select({
				paidAt: dividendPayouts.paidAt,
				perShare: dividendPayouts.perShare,
				automatic: dividendPayouts.automatic,
				total: sql<number>`sum(${dividendPayouts.amount})`.mapWith(Number),
				recipients: sql<number>`count(*)`.mapWith(Number)
			})
			.from(dividendPayouts)
			.where(eq(dividendPayouts.companyId, companyId))
			.groupBy(dividendPayouts.paidAt, dividendPayouts.perShare, dividendPayouts.automatic)
			.orderBy(desc(dividendPayouts.paidAt))
			.limit(24),
		db
			.select({ total: sum(dividendPayouts.amount).mapWith(Number) })
			.from(dividendPayouts)
			.where(and(eq(dividendPayouts.companyId, companyId), eq(dividendPayouts.userId, viewerId))),
		dividendYields(db, [companyId], now),
		sharePrices(db, [companyId])
	]);
	const y = yields.get(companyId)!;
	return {
		history: historyRows.map((r) => ({ ...r, perShare: Number(r.perShare), paidAt: r.paidAt.toISOString() })),
		myTotalReceived: mine[0]?.total ?? 0,
		sharePrice: prices.get(companyId) ?? null,
		paidPerShare30d: y.paidPerShare,
		yieldPercent: y.yieldPercent,
		lastPaidAt: y.lastPaidAt?.toISOString() ?? null,
		lastPerShare: y.lastPerShare
	};
}

/** Holders as the payout would see them (for the declare form's preview). */
export { holdersOf as dividendHolders };
