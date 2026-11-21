// src/lib/server/services/economy/bailout.ts
// A state bailout: the donor's treasury pays another state's bills. The aid
// lands in the recipient's treasury, pays down whatever it owes, and buys
// goodwill with the recipient's civilians. Every step runs in one transaction
// so a failed debit can never leave a half-funded rescue behind.
//
// No SvelteKit virtual modules other than the config alias, so integration
// tests import this directly.
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	stateBailouts,
	stateTreasury,
	states,
	userProfiles
} from "../../schema";
import { creditTreasury, type Executor } from "../../money";
import { ECONOMY_CONFIG } from "#lib/config/game/economy.config.js";
import { STANCE_CONFIG } from "#lib/config/game/civic.config.js";
import { adjustCivilianStance } from "../politics/civilian-stance.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "insert" | "update" | "select">;

/** A bailout that can't go through for a reason the player should see. */
export class BailoutError extends Error {}

/** What the state still owes, or 0 when it has no treasury yet. */
export async function stateDebt(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ debt: stateTreasury.debt })
		.from(stateTreasury)
		.where(eq(stateTreasury.stateId, stateId))
		.limit(1);
	return Number(row?.debt ?? 0);
}

/** Goodwill a bailout of `amount` earns with the rescued state's civilians. */
export function bailoutStanceGain(amount: number): number {
	const base = STANCE_CONFIG.BAILOUT;
	const extra =
		Math.floor(Math.max(0, amount - ECONOMY_CONFIG.BAILOUT_MIN_AMOUNT) / 10_000) * STANCE_CONFIG.BAILOUT_PER_10K;
	return Math.min(STANCE_CONFIG.BAILOUT_MAX, base + extra);
}

export interface BailoutResult {
	amount: number;
	debtRelieved: number;
	stanceGain: number;
	recipientBalance: number;
	donorBalance: number;
}

/** Transfer `amount` from the donor state to the recipient and record the goodwill. */
export async function bailoutState(
	db: Database,
	{
		donorStateId,
		recipientStateId,
		amount,
		authorizedBy,
		now = new Date()
	}: {
		donorStateId: number;
		recipientStateId: number;
		amount: number;
		authorizedBy: string;
		now?: Date;
	}
): Promise<BailoutResult> {
	if (donorStateId === recipientStateId) throw new BailoutError("A state cannot bail itself out.");
	if (!Number.isSafeInteger(amount) || amount < ECONOMY_CONFIG.BAILOUT_MIN_AMOUNT) {
		throw new BailoutError(`A bailout must be at least ${ECONOMY_CONFIG.BAILOUT_MIN_AMOUNT.toLocaleString()} currency.`);
	}

	const [donorState, recipientState] = await Promise.all([
		db.select({ name: states.name }).from(states).where(eq(states.id, donorStateId)).limit(1),
		db.select({ name: states.name }).from(states).where(eq(states.id, recipientStateId)).limit(1)
	]);
	if (!donorState[0] || !recipientState[0]) throw new BailoutError("That state does not exist.");

	const author = await db
		.select({ name: userProfiles.name })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, authorizedBy))
		.limit(1);
	const by = author[0]?.name ?? "a state official";

	return db.transaction(async (tx) => {
		// The balance check lives in the UPDATE, so two bailouts can't both spend
		// the same coins and neither treasury can go negative.
		const [debited] = await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${amount}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${amount}`,
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, donorStateId), gte(stateTreasury.balance, amount)))
			.returning({ balance: stateTreasury.balance });
		if (!debited) throw new BailoutError("Your treasury cannot cover this bailout.");

		const recipientBalance = await creditTreasury(tx, recipientStateId, amount);
		const [owed] = await tx
			.select({ debt: stateTreasury.debt })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, recipientStateId))
			.limit(1);
		const debtRelieved = Math.min(Number(owed?.debt ?? 0), amount);
		if (debtRelieved > 0) {
			await tx
				.update(stateTreasury)
				.set({ debt: sql`${stateTreasury.debt} - ${debtRelieved}`, updatedAt: now })
				.where(eq(stateTreasury.stateId, recipientStateId));
		}

		const stanceGain = bailoutStanceGain(amount);
		await adjustCivilianStance(tx, recipientStateId, donorStateId, stanceGain, now);

		await tx.insert(stateBailouts).values({
			donorStateId,
			recipientStateId,
			amount,
			debtRelieved,
			authorizedBy,
			createdAt: now
		});
		await recordLedger(tx, donorStateId, -amount, debited.balance, by, recipientState[0]!.name, authorizedBy, now);
		await recordLedger(tx, recipientStateId, amount, recipientBalance, by, donorState[0]!.name, authorizedBy, now);

		return { amount, debtRelieved, stanceGain, recipientBalance, donorBalance: debited.balance };
	});
}

async function recordLedger(
	tx: Executor,
	stateId: number,
	amount: number,
	balanceAfter: number,
	by: string,
	other: string,
	authorizedById: string,
	now: Date
) {
	await tx.insert(governmentBudgetTransactions).values({
		stateId,
		transactionType: "other",
		amount,
		balanceAfter,
		description: amount < 0 ? `Bailout to ${other}, authorised by ${by}` : `Bailout from ${other}, authorised by ${by}`,
		authorizedBy: authorizedById,
		metadata: JSON.stringify({ kind: "bailout", counterpartState: other }),
		createdAt: now
	});
}
