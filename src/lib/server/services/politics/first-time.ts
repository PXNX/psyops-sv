// src/lib/server/services/politics/first-time.ts
// Small, one-off explainers for milestones a player reaches once: founding a
// company, taking office. A milestone is recorded server-side (so switching
// browsers can't replay it) and consumed the first time its page is loaded.
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { userFirsts } from "../../schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Pick<Database | Tx, "insert" | "update" | "select">;

export type FirstTimeKind = "company" | "president";

/** Record that a player has reached a milestone, at most once. */
export async function reachFirstTime(
	db: Db,
	userId: string,
	kind: FirstTimeKind,
	now: Date = new Date()
): Promise<void> {
	await db
		.insert(userFirsts)
		.values({ userId, kind, reachedAt: now })
		.onConflictDoNothing({ target: [userFirsts.userId, userFirsts.kind] });
}

/**
 * Return (and mark as seen) a milestone whose detail has not been shown yet.
 * The UPDATE is conditional, so concurrent page loads can't both show it.
 */
export async function takeFirstTimeDetail(
	db: Db,
	userId: string,
	kind: FirstTimeKind,
	now: Date = new Date()
): Promise<boolean> {
	const [claimed] = await db
		.update(userFirsts)
		.set({ seenAt: now })
		.where(
			sql`${userFirsts.userId} = ${userId} and ${userFirsts.kind} = ${kind} and ${userFirsts.seenAt} is null`
		)
		.returning({ id: userFirsts.id });
	return !!claimed;
}

/** Whether the milestone is still waiting to be explained (without claiming it). */
export async function hasFirstTimeDetail(db: Db, userId: string, kind: FirstTimeKind): Promise<boolean> {
	const [row] = await db
		.select({ id: userFirsts.id })
		.from(userFirsts)
		.where(and(eq(userFirsts.userId, userId), eq(userFirsts.kind, kind)))
		.limit(1);
	return !!row;
}
