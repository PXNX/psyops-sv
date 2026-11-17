// Whether a player may travel into a state. Citizens always may. Others are
// turned away while their state is at war with it or sanctioned by it, or
// while it has closed its borders, and need a valid visa when the state
// requires one (unless both states share a visa-free bloc). States that
// haven't held their inaugural election yet have free movement.
import { and, eq, gt, or } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import {
	blocs,
	parliamentaryElections,
	regions,
	residences,
	stateBorders,
	stateSanctions,
	states,
	stateVisaSettings,
	userVisas,
	wars
} from "#lib/server/schema.js";

export interface EntryCheck {
	allowed: boolean;
	/** Why entry is refused, in player language. */
	reason: string | null;
	/** True when a visa would let the player in. */
	visaWouldHelp: boolean;
}

const OPEN: EntryCheck = { allowed: true, reason: null, visaWouldHelp: false };

export async function checkEntry(db: Database, userId: string, destStateId: number | null): Promise<EntryCheck> {
	if (!destStateId) return OPEN; // unclaimed land

	const [inaugural] = await db
		.select({ id: parliamentaryElections.id })
		.from(parliamentaryElections)
		.where(and(eq(parliamentaryElections.stateId, destStateId), eq(parliamentaryElections.isInaugural, true)))
		.limit(1);
	if (!inaugural) return OPEN;

	// Citizenship is the home region's state.
	const [home] = await db
		.select({ stateId: regions.stateId, blocId: states.blocId })
		.from(residences)
		.innerJoin(regions, eq(residences.homeRegionId, regions.id))
		.leftJoin(states, eq(regions.stateId, states.id))
		.where(eq(residences.userId, userId));
	const homeStateId = home?.stateId ?? null;
	if (homeStateId === destStateId) return OPEN;

	const [dest] = await db
		.select({ blocId: states.blocId, visaFree: blocs.visaFreeForMembers })
		.from(states)
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(eq(states.id, destStateId));

	if (homeStateId) {
		const [war] = await db
			.select({ id: wars.id })
			.from(wars)
			.where(
				and(
					eq(wars.status, "active"),
					or(
						and(eq(wars.attackerId, homeStateId), eq(wars.defenderId, destStateId)),
						and(eq(wars.attackerId, destStateId), eq(wars.defenderId, homeStateId)),
						...(home?.blocId
							? [
									and(eq(wars.attackerBlocId, home.blocId), eq(wars.defenderId, destStateId)),
									and(eq(wars.attackerId, destStateId), eq(wars.defenderBlocId, home.blocId))
								]
							: [])
					)
				)
			)
			.limit(1);
		if (war) return { allowed: false, reason: "Your state is at war with this state.", visaWouldHelp: false };

		const [sanction] = await db
			.select({ id: stateSanctions.id })
			.from(stateSanctions)
			.where(
				and(
					eq(stateSanctions.sanctioningStateId, destStateId),
					eq(stateSanctions.targetStateId, homeStateId),
					eq(stateSanctions.isActive, true)
				)
			)
			.limit(1);
		if (sanction) return { allowed: false, reason: "This state has sanctioned your state.", visaWouldHelp: false };
	}

	const [border] = await db
		.select({ status: stateBorders.status })
		.from(stateBorders)
		.where(eq(stateBorders.stateId, destStateId));
	if (border?.status === "closed") {
		return { allowed: false, reason: "This state has closed its borders.", visaWouldHelp: false };
	}

	const [settings] = await db
		.select({ visaRequired: stateVisaSettings.visaRequired })
		.from(stateVisaSettings)
		.where(eq(stateVisaSettings.stateId, destStateId));
	if (!settings?.visaRequired) return OPEN;
	if (home?.blocId && dest?.blocId === home.blocId && dest.visaFree) return OPEN;

	const [visa] = await db
		.select({ id: userVisas.id })
		.from(userVisas)
		.where(
			and(
				eq(userVisas.userId, userId),
				eq(userVisas.stateId, destStateId),
				eq(userVisas.status, "active"),
				gt(userVisas.expiresAt, new Date())
			)
		)
		.limit(1);
	if (visa) return OPEN;
	return { allowed: false, reason: "You need a visa to enter this state.", visaWouldHelp: true };
}
