// src/lib/server/embargo.ts
import { db } from "#lib/server/db.js";
import { blocEmbargoes, residences, states, stateSanctions } from "#lib/server/schema.js";
import { eq, and, or } from "drizzle-orm";

/**
 * Returns a human-readable reason if an active state sanction or a bloc
 * embargo blocks trade or employment between a company's headquarters state
 * and the given user's current citizenship (residence) state.
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

	if (sanction) {
		return sanction.sanctioningStateId === companyStateId
			? "This company's headquarters state has sanctioned your state — trade and employment are blocked."
			: "Your state has sanctioned this company's headquarters state — trade and employment are blocked.";
	}

	// Bloc embargoes work the same way: a bloc bans trade with a target state.
	const [companyState, userState] = await Promise.all([
		db.select({ blocId: states.blocId }).from(states).where(eq(states.id, companyStateId)).limit(1),
		db.select({ blocId: states.blocId }).from(states).where(eq(states.id, userStateId)).limit(1)
	]);
	const companyBlocId = companyState[0]?.blocId;
	const userBlocId = userState[0]?.blocId;
	const clauses = [];
	if (companyBlocId) clauses.push(and(eq(blocEmbargoes.blocId, companyBlocId), eq(blocEmbargoes.targetStateId, userStateId)));
	if (userBlocId) clauses.push(and(eq(blocEmbargoes.blocId, userBlocId), eq(blocEmbargoes.targetStateId, companyStateId)));
	if (!clauses.length) return null;

	const embargo = await db.query.blocEmbargoes.findFirst({ where: or(...clauses) });
	if (!embargo) return null;
	return embargo.blocId === companyBlocId
		? "A bloc your company's state belongs to has embargoed your state — trade and employment are blocked."
		: "A bloc your state belongs to has embargoed this company's headquarters state — trade and employment are blocked.";
}
