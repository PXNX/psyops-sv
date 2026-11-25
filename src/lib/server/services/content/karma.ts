// src/lib/server/services/content/karma.ts
// Community karma = the stored upvote counter plus the medals a player holds.
// Medals are summed on read so older decorations count too and revoking one
// (or awarding a new one) needs no separate counter migration.
import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { userMedals } from "../../schema";
import { medalKarma } from "#lib/config/index.js";

export interface KarmaWithMedals {
	total: number;
	base: number;
	medalPoints: number;
	medalCount: number;
}

export async function karmaWithMedals(db: Database, userId: string, storedKarma: number): Promise<KarmaWithMedals> {
	const medals = await db.select({ type: userMedals.medalType }).from(userMedals).where(eq(userMedals.userId, userId));
	const medalPoints = medals.reduce((sum, m) => sum + medalKarma(m.type), 0);
	return {
		total: Math.max(0, storedKarma + medalPoints),
		base: storedKarma,
		medalPoints,
		medalCount: medals.length
	};
}
