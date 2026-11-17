// src/lib/server/money.ts
// The only way route code should change a balance. Every helper does its
// arithmetic inside a single UPDATE, so concurrent requests can't overwrite
// each other's result, and debits carry the balance check in the WHERE clause
// so a wallet can never go negative. Pass the transaction (`tx`) when the
// money movement is one step of a larger change, so it all commits together.
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "./db";
import { stateTreasury, userWallets } from "./schema";

/** The database itself or an open transaction on it. */
export type Executor = Pick<Database, "insert" | "update" | "select">;

/** A money movement that can't go through for a reason the user should see. */
export class InsufficientFundsError extends Error {
	constructor(message = "Insufficient funds") {
		super(message);
	}
}

function assertAmount(amount: number) {
	if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`Invalid amount: ${amount}`);
}

/** Take `amount` from a wallet. Throws InsufficientFundsError if it can't cover it. */
export async function debitWallet(db: Executor, userId: string, amount: number): Promise<number> {
	assertAmount(amount);
	const [row] = await db
		.update(userWallets)
		.set({ balance: sql`${userWallets.balance} - ${amount}`, updatedAt: new Date() })
		.where(and(eq(userWallets.userId, userId), gte(userWallets.balance, amount)))
		.returning({ balance: userWallets.balance });
	if (!row) throw new InsufficientFundsError();
	return row.balance;
}

/** Add `amount` to an existing wallet and return the new balance. */
export async function creditWallet(db: Executor, userId: string, amount: number): Promise<number> {
	assertAmount(amount);
	const [row] = await db
		.update(userWallets)
		.set({ balance: sql`${userWallets.balance} + ${amount}`, updatedAt: new Date() })
		.where(eq(userWallets.userId, userId))
		.returning({ balance: userWallets.balance });
	if (!row) throw new Error(`No wallet for user ${userId}`);
	return row.balance;
}

/** Pay `amount` into a state's treasury, creating the treasury on first use. */
export async function creditTreasury(db: Executor, stateId: number, amount: number): Promise<number> {
	assertAmount(amount);
	const [row] = await db
		.insert(stateTreasury)
		.values({ stateId, balance: amount, totalCollected: amount, totalSpent: 0 })
		.onConflictDoUpdate({
			target: stateTreasury.stateId,
			set: {
				balance: sql`${stateTreasury.balance} + ${amount}`,
				totalCollected: sql`${stateTreasury.totalCollected} + ${amount}`,
				updatedAt: new Date()
			}
		})
		.returning({ balance: stateTreasury.balance });
	return row!.balance;
}
