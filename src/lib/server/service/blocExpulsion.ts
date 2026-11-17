// src/lib/server/service/blocExpulsion.ts
// Expelling a member state from a bloc. A president of another member state,
// or the bloc leader, opens the vote; every member state except the targeted
// one votes pro or contra (one vote per state, changeable while open). It
// passes once more than half of the voting states are pro, fails once that
// can't happen any more, and when the window closes the cast votes decide
// (ties keep the state in).
import { and, eq, inArray, lte, ne } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import {
	blocExpulsions,
	blocExpulsionVotes,
	blocLeaders,
	blocs,
	inboxMessages,
	presidents,
	states
} from "#lib/server/schema.js";

export const BLOC_EXPULSION_DAYS = 3;

export type ExpulsionOutcome = "pending" | "expelled" | "rejected" | "cancelled";

export class ExpulsionError extends Error {}

/** The decision for a tally, or null while it's still open. Pure. */
export function decideExpulsion(t: { pro: number; contra: number; voters: number; expired: boolean }) {
	if (t.voters > 0 && t.pro * 2 > t.voters) return "expelled" as const;
	if (t.voters === 0 || t.contra * 2 >= t.voters) return "rejected" as const;
	if (t.expired) return t.pro > t.contra ? ("expelled" as const) : ("rejected" as const);
	return null;
}

/** Member states of the bloc that may vote on expelling `targetStateId`. */
async function voterStates(db: Database, blocId: number, targetStateId: number) {
	const rows = await db
		.select({ id: states.id })
		.from(states)
		.where(and(eq(states.blocId, blocId), ne(states.id, targetStateId)));
	return rows.map((r) => r.id);
}

export async function expulsionTally(db: Database, expulsionId: number, blocId: number, targetStateId: number) {
	const voterIds = await voterStates(db, blocId, targetStateId);
	const votes = voterIds.length
		? await db
				.select({ inFavor: blocExpulsionVotes.inFavor })
				.from(blocExpulsionVotes)
				.where(and(eq(blocExpulsionVotes.expulsionId, expulsionId), inArray(blocExpulsionVotes.voterStateId, voterIds)))
		: [];
	const pro = votes.filter((v) => v.inFavor).length;
	return { pro, contra: votes.length - pro, voters: voterIds.length };
}

/** The state a user presides over, if it's a member of this bloc. */
async function memberPresidency(db: Database, userId: string, blocId: number) {
	const [row] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.innerJoin(states, eq(presidents.stateId, states.id))
		.where(and(eq(presidents.userId, userId), eq(states.blocId, blocId)))
		.limit(1);
	return row?.stateId ?? null;
}

export async function proposeExpulsion(
	db: Database,
	input: { blocId: number; targetStateId: number; userId: string; reason?: string | null }
): Promise<ExpulsionOutcome> {
	const [target] = await db
		.select({ id: states.id })
		.from(states)
		.where(and(eq(states.id, input.targetStateId), eq(states.blocId, input.blocId)));
	if (!target) throw new ExpulsionError("That state isn't a member of this bloc.");

	const myStateId = await memberPresidency(db, input.userId, input.blocId);
	const [leader] = await db
		.select({ id: blocLeaders.id })
		.from(blocLeaders)
		.where(and(eq(blocLeaders.blocId, input.blocId), eq(blocLeaders.userId, input.userId)));
	if (!myStateId && !leader) {
		throw new ExpulsionError("Only presidents of member states and the bloc leader can propose an expulsion.");
	}
	if (myStateId === input.targetStateId) throw new ExpulsionError("You can't vote your own state out; leave instead.");

	const expiresAt = new Date(Date.now() + BLOC_EXPULSION_DAYS * 24 * 60 * 60 * 1000);
	const created = await db
		.insert(blocExpulsions)
		.values({
			blocId: input.blocId,
			stateId: input.targetStateId,
			proposedBy: input.userId,
			reason: input.reason?.trim().slice(0, 300) || null,
			expiresAt
		})
		.onConflictDoNothing()
		.returning({ id: blocExpulsions.id });
	if (!created.length) throw new ExpulsionError("There's already an expulsion vote on that state.");

	// Proposing counts as a vote for it.
	if (myStateId) {
		await db.insert(blocExpulsionVotes).values({
			expulsionId: created[0].id,
			voterStateId: myStateId,
			voterId: input.userId,
			inFavor: true
		});
	}
	await notifyTarget(db, created[0].id, "opened");
	return resolveExpulsion(db, created[0].id);
}

export async function voteOnExpulsion(
	db: Database,
	input: { blocId: number; expulsionId: number; userId: string; inFavor: boolean }
): Promise<ExpulsionOutcome> {
	const [expulsion] = await db
		.select()
		.from(blocExpulsions)
		.where(and(eq(blocExpulsions.id, input.expulsionId), eq(blocExpulsions.blocId, input.blocId)));
	if (!expulsion || expulsion.status !== "pending") throw new ExpulsionError("This vote is closed.");

	const myStateId = await memberPresidency(db, input.userId, input.blocId);
	if (!myStateId) throw new ExpulsionError("Only presidents of member states can vote.");
	if (myStateId === expulsion.stateId) throw new ExpulsionError("Your state can't vote on its own expulsion.");

	if (expulsion.expiresAt > new Date()) {
		await db
			.insert(blocExpulsionVotes)
			.values({
				expulsionId: expulsion.id,
				voterStateId: myStateId,
				voterId: input.userId,
				inFavor: input.inFavor
			})
			.onConflictDoUpdate({
				target: [blocExpulsionVotes.expulsionId, blocExpulsionVotes.voterStateId],
				set: { inFavor: input.inFavor, voterId: input.userId, votedAt: new Date() }
			});
	}
	return resolveExpulsion(db, expulsion.id);
}

/** Closes the vote if it's decided. Safe to call repeatedly. */
export async function resolveExpulsion(db: Database, expulsionId: number): Promise<ExpulsionOutcome> {
	const [expulsion] = await db.select().from(blocExpulsions).where(eq(blocExpulsions.id, expulsionId));
	if (!expulsion) return "cancelled";
	if (expulsion.status !== "pending") return expulsion.status;

	const now = new Date();
	const [stillMember] = await db
		.select({ id: states.id })
		.from(states)
		.where(and(eq(states.id, expulsion.stateId), eq(states.blocId, expulsion.blocId)));

	const tally = await expulsionTally(db, expulsion.id, expulsion.blocId, expulsion.stateId);
	const decision = stillMember ? decideExpulsion({ ...tally, expired: expulsion.expiresAt <= now }) : "cancelled";
	if (!decision) return "pending";

	const applied = await db.transaction(async (tx) => {
		const [closed] = await tx
			.update(blocExpulsions)
			.set({ status: decision, resolvedAt: now })
			.where(and(eq(blocExpulsions.id, expulsion.id), eq(blocExpulsions.status, "pending")))
			.returning({ id: blocExpulsions.id });
		if (!closed) return false;
		if (decision === "expelled") {
			await tx
				.update(states)
				.set({ blocId: null })
				.where(and(eq(states.id, expulsion.stateId), eq(states.blocId, expulsion.blocId)));
			// A leader whose state was thrown out no longer leads the bloc.
			const [president] = await tx
				.select({ userId: presidents.userId })
				.from(presidents)
				.where(eq(presidents.stateId, expulsion.stateId));
			if (president) {
				await tx
					.delete(blocLeaders)
					.where(and(eq(blocLeaders.blocId, expulsion.blocId), eq(blocLeaders.userId, president.userId)));
			}
		}
		return true;
	});

	if (applied && decision !== "cancelled") await notifyTarget(db, expulsion.id, decision);
	if (!applied) {
		const [current] = await db
			.select({ status: blocExpulsions.status })
			.from(blocExpulsions)
			.where(eq(blocExpulsions.id, expulsion.id));
		return current?.status ?? "cancelled";
	}
	return decision;
}

/** Closes every expulsion vote whose window has run out. */
export async function resolveExpiredExpulsions(db: Database, blocId?: number) {
	const due = await db
		.select({ id: blocExpulsions.id })
		.from(blocExpulsions)
		.where(
			and(
				eq(blocExpulsions.status, "pending"),
				lte(blocExpulsions.expiresAt, new Date()),
				blocId ? eq(blocExpulsions.blocId, blocId) : undefined
			)
		);
	for (const e of due) await resolveExpulsion(db, e.id);
	return due.length;
}

async function notifyTarget(db: Database, expulsionId: number, event: "opened" | "expelled" | "rejected") {
	const [row] = await db
		.select({
			stateId: blocExpulsions.stateId,
			proposedBy: blocExpulsions.proposedBy,
			reason: blocExpulsions.reason,
			blocName: blocs.name
		})
		.from(blocExpulsions)
		.innerJoin(blocs, eq(blocExpulsions.blocId, blocs.id))
		.where(eq(blocExpulsions.id, expulsionId));
	if (!row) return;
	const [president] = await db
		.select({ userId: presidents.userId })
		.from(presidents)
		.where(eq(presidents.stateId, row.stateId));
	if (!president) return;

	const text = {
		opened: {
			subject: `⚠️ ${row.blocName} is voting on expelling your state`,
			content: `The member states of ${row.blocName} are voting on expelling your state for ${BLOC_EXPULSION_DAYS} days.${row.reason ? ` Reason given: ${row.reason}` : ""} Your state has no vote.`
		},
		expelled: {
			subject: `❌ Your state was expelled from ${row.blocName}`,
			content: `The member states of ${row.blocName} voted to expel your state.`
		},
		rejected: {
			subject: `✅ Your state stays in ${row.blocName}`,
			content: `The vote to expel your state from ${row.blocName} failed.`
		}
	}[event];

	await db.insert(inboxMessages).values({
		recipientId: president.userId,
		senderId: row.proposedBy ?? president.userId,
		messageType: "system",
		stateId: row.stateId,
		...text
	});
}
