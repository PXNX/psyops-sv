import { db } from "$lib/server/db";
import {
	residences,
	userTravels,
	regions,
	userProfiles,
	broadcasts,
	partyMembers,
	battles
} from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	const primaryResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	// --- Active broadcasts ---

	// System broadcast (visible to everyone)
	const systemBroadcast = await db.query.broadcasts.findFirst({
		where: and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true)),
		orderBy: [desc(broadcasts.createdAt)],
		with: { issuer: { with: { profile: true } } }
	});

	// State broadcast (visible to residents of the user's state)
	let stateBroadcast = null;
	if (primaryResidence) {
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, primaryResidence.regionId)
		});
		if (region?.stateId) {
			stateBroadcast = await db.query.broadcasts.findFirst({
				where: and(
					eq(broadcasts.broadcastType, "state"),
					eq(broadcasts.stateId, region.stateId),
					eq(broadcasts.isActive, true)
				),
				orderBy: [desc(broadcasts.createdAt)],
				with: {
					issuer: { with: { profile: true } },
					state: true
				}
			});
		}
	}

	// Party broadcast (visible to members of the user's party)
	let partyBroadcast = null;
	const membership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});
	if (membership) {
		partyBroadcast = await db.query.broadcasts.findFirst({
			where: and(
				eq(broadcasts.broadcastType, "party"),
				eq(broadcasts.partyId, membership.partyId),
				eq(broadcasts.isActive, true)
			),
			orderBy: [desc(broadcasts.createdAt)],
			with: {
				issuer: { with: { profile: true } },
				party: true
			}
		});
	}

	// --- Ongoing battles in user's region ---
	let ongoingBattles: {
		id: number;
		regionId: number;
		attackerState: { id: number; name: string };
		defenderState: { id: number; name: string };
		phase: string;
		terrain: string;
		startedAt: Date;
	}[] = [];

	if (primaryResidence) {
		const regionBattles = await db.query.battles.findMany({
			where: and(
				eq(battles.regionId, primaryResidence.regionId),
				eq(battles.status, "ongoing")
			),
			with: {
				attackerState: true,
				defenderState: true
			},
			orderBy: [desc(battles.startedAt)]
		});

		ongoingBattles = regionBattles.map((b) => ({
			id: b.id,
			regionId: b.regionId,
			attackerState: { id: b.attackerStateId, name: b.attackerState.name },
			defenderState: { id: b.defenderStateId, name: b.defenderState.name },
			phase: b.phase,
			terrain: b.terrain,
			startedAt: b.startedAt
		}));
	}

	return {
		account: {
			id: account.id,
			email: account.email,
			role: account.role,
			profile
		},
		userLocation: primaryResidence ? { regionId: primaryResidence.regionId } : null,
		activeTravel,
		systemBroadcast,
		stateBroadcast,
		partyBroadcast,
		ongoingBattles
	};
	};
