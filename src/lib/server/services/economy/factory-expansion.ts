// src/lib/server/services/economy/factory-expansion.ts
// A filed factory expansion adds posts only after the works period is over.
// The conditional claim makes the hourly cron safe to re-run.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { factories } from "../../schema";

export interface ExpansionResult {
	due: number;
	expanded: number;
	postsAdded: number;
}

/** Bring every expansion whose works period has elapsed online. */
export async function completeFactoryExpansions(db: Database, now: Date = new Date()): Promise<ExpansionResult> {
	const due = await db
		.select({ id: factories.id, posts: factories.expansionPosts })
		.from(factories)
		.where(and(isNotNull(factories.expansionPosts), lte(factories.expansionCompletesAt, now)));

	const result: ExpansionResult = { due: due.length, expanded: 0, postsAdded: 0 };
	for (const row of due) {
		const posts = Math.max(0, row.posts ?? 0);
		const applied = await db
			.update(factories)
			.set({
				maxWorkers: sql`${factories.maxWorkers} + ${posts}`,
				expansionPosts: null,
				expansionCompletesAt: null
			})
			.where(and(eq(factories.id, row.id), lte(factories.expansionCompletesAt, now)))
			.returning({ id: factories.id });
		if (!applied.length) continue;
		result.expanded++;
		result.postsAdded += posts;
	}
	return result;
}
