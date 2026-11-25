// src/lib/server/embargo.ts
import { db } from "#lib/server/db.js";
import { blocEmbargoes, residences, states, stateSanctions } from "#lib/server/schema.js";
import { eq, and, inArray, or } from "drizzle-orm";

type Db = typeof db;

/** The user's current citizenship (residence) state, or null if they have none. */
async function residenceStateId(database: Db, userId: string): Promise<number | null> {
	const residence = await database.query.residences.findFirst({
		where: eq(residences.userId, userId),
		with: { region: true }
	});
	return residence?.region.stateId ?? null;
}

/**
 * Human-readable reasons why trade or employment with each of these states is
 * blocked for the user, keyed by company state id. A state is blocked by an
 * active state sanction (either direction) or a bloc embargo (either bloc).
 *
 * Batched so a board of many companies costs a fixed number of queries.
 */
export async function getEmbargoReasons(
	companyStateIds: Array<number | null>,
	userId: string
): Promise<Map<number, string>> {
	const reasons = new Map<number, string>();
	const userStateId = await residenceStateId(db, userId);
	if (!userStateId) return reasons;

	const companyStateIdsToCheck = [...new Set(companyStateIds.filter((id): id is number => !!id && id !== userStateId))];
	if (!companyStateIdsToCheck.length) return reasons;

	const [sanctions, stateRows] = await Promise.all([
		db
			.select({
				sanctioningStateId: stateSanctions.sanctioningStateId,
				targetStateId: stateSanctions.targetStateId
			})
			.from(stateSanctions)
			.where(
				and(
					eq(stateSanctions.isActive, true),
					or(
						and(
							eq(stateSanctions.sanctioningStateId, userStateId),
							inArray(stateSanctions.targetStateId, companyStateIdsToCheck)
						),
						and(
							eq(stateSanctions.targetStateId, userStateId),
							inArray(stateSanctions.sanctioningStateId, companyStateIdsToCheck)
						)
					)
				)
			),
		db
			.select({ id: states.id, blocId: states.blocId })
			.from(states)
			.where(inArray(states.id, [userStateId, ...companyStateIdsToCheck]))
	]);

	// Active state sanctions, both directions. The company's state is whichever
	// side of the sanction isn't the user's state.
	for (const sanction of sanctions) {
		const companyStateId =
			sanction.sanctioningStateId === userStateId ? sanction.targetStateId : sanction.sanctioningStateId;
		reasons.set(
			companyStateId,
			sanction.sanctioningStateId === companyStateId
				? "This company's headquarters state has sanctioned your state — trade and employment are blocked."
				: "Your state has sanctioned this company's headquarters state — trade and employment are blocked."
		);
	}

	// Bloc embargoes work the same way: a bloc bans trade with a target state.
	const blocById = new Map(stateRows.map((s) => [s.id, s.blocId]));
	const userBlocId = blocById.get(userStateId) ?? null;
	const companyBlocs = [
		...new Set(companyStateIdsToCheck.map((id) => blocById.get(id)).filter((blocId): blocId is number => !!blocId))
	];
	const clauses = [];
	if (companyBlocs.length) {
		clauses.push(and(inArray(blocEmbargoes.blocId, companyBlocs), eq(blocEmbargoes.targetStateId, userStateId)));
	}
	if (userBlocId) {
		clauses.push(
			and(eq(blocEmbargoes.blocId, userBlocId), inArray(blocEmbargoes.targetStateId, companyStateIdsToCheck))
		);
	}
	if (clauses.length) {
		const embargoes = await db
			.select({ blocId: blocEmbargoes.blocId, targetStateId: blocEmbargoes.targetStateId })
			.from(blocEmbargoes)
			.where(or(...clauses));
		for (const embargo of embargoes) {
			if (embargo.targetStateId === userStateId) {
				for (const companyStateId of companyStateIdsToCheck) {
					if (blocById.get(companyStateId) !== embargo.blocId || reasons.has(companyStateId)) continue;
					reasons.set(
						companyStateId,
						"A bloc your company's state belongs to has embargoed your state — trade and employment are blocked."
					);
				}
			} else if (userBlocId === embargo.blocId && !reasons.has(embargo.targetStateId)) {
				reasons.set(
					embargo.targetStateId,
					"A bloc your state belongs to has embargoed this company's headquarters state — trade and employment are blocked."
				);
			}
		}
	}

	return reasons;
}

/**
 * Returns a human-readable reason if an active state sanction or a bloc
 * embargo blocks trade or employment between a company's headquarters state
 * and the given user's current citizenship (residence) state.
 */
export async function getEmbargoReason(companyStateId: number | null, userId: string): Promise<string | null> {
	if (!companyStateId) return null;
	return (await getEmbargoReasons([companyStateId], userId)).get(companyStateId) ?? null;
}
