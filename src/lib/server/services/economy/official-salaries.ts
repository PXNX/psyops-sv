// Weekly pay for a state's office holders. Parliament sets one base amount;
// ministers earn three times it and the president five times. Each payment
// moves money from the state treasury to the official's wallet and is recorded
// in both the player's transactions and the state's budget ledger.
import { and, eq, gt, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
	governmentBudgetTransactions,
	ministers,
	parliamentMembers,
	presidents,
	stateTreasury,
	states,
	transactionHistory,
	userWallets
} from "../../schema.js";
import { OFFICIALS_CONFIG, officialSalary } from "#lib/config/index.js";

const DAY = 86_400_000;

export class SalaryError extends Error {}

export interface SalaryRun {
	statesPaid: number;
	officialsPaid: number;
	totalPaid: number;
	skipped: number;
}

type Recipient = { userId: string; role: "member" | "minister" | "president"; amount: number };

/**
 * Pay every state that is due a weekly salary run. The period claim and the
 * treasury debit are both conditional updates, so a repeated cron tick (or a
 * manual retry) cannot pay the same period twice or overdraw the treasury.
 */
export async function payOfficialSalaries(db: Database, now: Date = new Date()): Promise<SalaryRun> {
	const cutoff = new Date(now.getTime() - OFFICIALS_CONFIG.PAY_PERIOD_DAYS * DAY);
	const due = await db
		.select({ id: states.id, salary: states.officialSalary })
		.from(states)
		.where(
			and(
				gt(states.officialSalary, 0),
				or(isNull(states.lastSalaryPaidAt), lte(states.lastSalaryPaidAt, cutoff))
			)
		);

	const run: SalaryRun = { statesPaid: 0, officialsPaid: 0, totalPaid: 0, skipped: 0 };

	for (const state of due) {
		const [presidentRows, ministerRows, memberRows] = await Promise.all([
			db.select({ userId: presidents.userId }).from(presidents).where(eq(presidents.stateId, state.id)),
			db.select({ userId: ministers.userId }).from(ministers).where(eq(ministers.stateId, state.id)),
			db.select({ userId: parliamentMembers.userId }).from(parliamentMembers).where(eq(parliamentMembers.stateId, state.id))
		]);

		const recipients: Recipient[] = [
			...presidentRows.map((p) => ({ userId: p.userId, role: "president" as const, amount: officialSalary(state.salary, "president") })),
			...ministerRows.map((m) => ({ userId: m.userId, role: "minister" as const, amount: officialSalary(state.salary, "minister") })),
			...memberRows.map((m) => ({ userId: m.userId, role: "member" as const, amount: officialSalary(state.salary, "member") }))
		];
		const total = recipients.reduce((sum, r) => sum + r.amount, 0);
		if (!total) continue;
		const authorisedBy = recipients.find((r) => r.role === "president")?.userId ?? recipients[0]!.userId;

		try {
			await db.transaction(async (tx) => {
				// Claim this week's run first; a concurrent run will not get a row.
				const [claimed] = await tx
					.update(states)
					.set({ lastSalaryPaidAt: now })
					.where(
						and(
							eq(states.id, state.id),
							or(isNull(states.lastSalaryPaidAt), lte(states.lastSalaryPaidAt, cutoff))
						)
					)
					.returning({ id: states.id });
				if (!claimed) throw new SalaryError("This pay period was already claimed.");

				const [treasury] = await tx
					.update(stateTreasury)
					.set({
						balance: sql`${stateTreasury.balance} - ${total}`,
						totalSpent: sql`${stateTreasury.totalSpent} + ${total}`,
						updatedAt: now
					})
					.where(and(eq(stateTreasury.stateId, state.id), gte(stateTreasury.balance, total)))
					.returning({ balance: stateTreasury.balance });
				if (!treasury) throw new SalaryError("The treasury cannot cover this salary run.");
				let balance = Number(treasury.balance);

				for (const r of recipients) {
					const [wallet] = await tx
						.insert(userWallets)
						.values({ userId: r.userId, balance: r.amount, updatedAt: now })
						.onConflictDoUpdate({
							target: userWallets.userId,
							set: { balance: sql`${userWallets.balance} + ${r.amount}`, updatedAt: now }
						})
						.returning({ balance: userWallets.balance });
					await tx.insert(transactionHistory).values({
						userId: r.userId,
						transactionType: "official_salary",
						amount: r.amount,
						balanceAfter: Number(wallet!.balance),
						description: `Weekly ${r.role} salary`,
						relatedEntityType: "state",
						relatedEntityId: state.id,
						metadata: JSON.stringify({ role: r.role, base: state.salary, periodEndsAt: now.toISOString() }),
						createdAt: now
					});
					balance -= r.amount;
					await tx.insert(governmentBudgetTransactions).values({
						stateId: state.id,
						transactionType: "salary",
						amount: -r.amount,
						balanceAfter: balance,
						description: `Salary: ${r.role}`,
						authorizedBy: authorisedBy,
						metadata: JSON.stringify({ role: r.role, base: state.salary }),
						createdAt: now
					});
				}
			});
			run.statesPaid++;
			run.officialsPaid += recipients.length;
			run.totalPaid += total;
		} catch {
			run.skipped++;
		}
	}

	return run;
}
