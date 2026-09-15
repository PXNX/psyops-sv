// src/lib/server/embargo.ts
import { db } from "$lib/server/db";
import { residences, stateSanctions } from "$lib/server/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Returns a human-readable reason if an active state sanction blocks trade or
 * employment between a company's headquarters state and the given user's
 * current citizenship (residence) state. Returns null if there's no embargo
 * (e.g. the company has no headquarters, or neither state has sanctioned the other).
 */
export async function getEmbargoReason(companyStateId: number | null, userId: string): Promise<string | null> {
	if (!companyStateId) return null;

	const userResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, userId),
		with: { region: true }
	});
	const userStateId = userResidence?.region.stateId ?? null;

	if (!userStateId || userStateId === companyStateId) return null;

	const sanction = await db.query.stateSanctions.findFirst({
		where: and(
			eq(stateSanctions.isActive, true),
			or(
				and(eq(stateSanctions.sanctioningStateId, companyStateId), eq(stateSanctions.targetStateId, userStateId)),
				and(eq(stateSanctions.sanctioningStateId, userStateId), eq(stateSanctions.targetStateId, companyStateId))
			)
		)
	});

	if (!sanction) return null;

	return sanction.sanctioningStateId === companyStateId
		? "This company's headquarters state has sanctioned your state — trade and employment are blocked."
		: "Your state has sanctioned this company's headquarters state — trade and employment are blocked.";
}
