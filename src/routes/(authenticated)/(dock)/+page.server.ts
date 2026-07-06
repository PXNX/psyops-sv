import { db } from "$lib/server/db";
import {
	residences,
	userTravels,
	regions,
	states,
	userProfiles,
	broadcasts,
	partyMembers,
	battles,
	wars
} from "$lib/server/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getLogoUrl } from "$lib/server/backblaze";
import { getBirthdayInfo, collectBirthdayRewards } from "$lib/server/service/birthday";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	// Account birthday (creation anniversary) reward status.
	const birthdayInfo = await getBirthdayInfo(account.id, account.createdAt);

	const primaryResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	// Resolve the region the user currently lives in and its controlling state.
	let region: typeof regions.$inferSelect | undefined;
	let homeState: typeof states.$inferSelect | undefined;
	if (primaryResidence) {
		region = await db.query.regions.findFirst({
			where: eq(regions.id, primaryResidence.regionId)
		});
		if (region?.stateId) {
			homeState = await db.query.states.findFirst({
				where: eq(states.id, region.stateId)
			});
		}
	}

	// --- Active broadcasts ---

	// System broadcast (visible to everyone)
	const systemBroadcast = await db.query.broadcasts.findFirst({
		where: and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true)),
		orderBy: [desc(broadcasts.createdAt)],
		with: { issuer: { with: { profile: true } } }
	});

	// State broadcast (visible to residents of the user's state)
	let stateBroadcast = null;
	if (homeState) {
		stateBroadcast = await db.query.broadcasts.findFirst({
			where: and(
				eq(broadcasts.broadcastType, "state"),
				eq(broadcasts.stateId, homeState.id),
				eq(broadcasts.isActive, true)
			),
			orderBy: [desc(broadcasts.createdAt)],
			with: {
				issuer: { with: { profile: true } },
				state: true
			}
		});
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
			where: and(eq(battles.regionId, primaryResidence.regionId), eq(battles.status, "ongoing")),
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

	// --- Active wars involving the region's controlling state (or its bloc) ---
	let activeWars: {
		id: number;
		declaredAt: Date;
		side: "attacker" | "defender";
		attacker: { id: number; name: string; logo: string | null };
		defender: { id: number; name: string; logo: string | null };
		attackerBloc: { id: number; name: string; color: string } | null;
		defenderBloc: { id: number; name: string; color: string } | null;
		totalBattles: number;
		ongoingBattles: number;
	}[] = [];

	if (homeState) {
		const stateId = homeState.id;
		const blocId = homeState.blocId;

		const warConditions = [eq(wars.attackerId, stateId), eq(wars.defenderId, stateId)];
		if (blocId) {
			warConditions.push(eq(wars.attackerBlocId, blocId), eq(wars.defenderBlocId, blocId));
		}

		const warRows = await db.query.wars.findMany({
			where: and(eq(wars.status, "active"), or(...warConditions)),
			with: {
				attacker: true,
				defender: true,
				attackerBloc: true,
				defenderBloc: true,
				battles: true
			},
			orderBy: [desc(wars.declaredAt)]
		});

		activeWars = await Promise.all(
			warRows.map(async (w) => {
				const isDefending = w.defenderId === stateId || (blocId != null && w.defenderBlocId === blocId);
				return {
					id: w.id,
					declaredAt: w.declaredAt,
					side: (isDefending ? "defender" : "attacker") as "attacker" | "defender",
					attacker: {
						id: w.attacker.id,
						name: w.attacker.name,
						logo: await getLogoUrl(w.attacker.logo)
					},
					defender: {
						id: w.defender.id,
						name: w.defender.name,
						logo: await getLogoUrl(w.defender.logo)
					},
					attackerBloc: w.attackerBloc
						? { id: w.attackerBloc.id, name: w.attackerBloc.name, color: w.attackerBloc.color }
						: null,
					defenderBloc: w.defenderBloc
						? { id: w.defenderBloc.id, name: w.defenderBloc.name, color: w.defenderBloc.color }
						: null,
					totalBattles: w.battles.length,
					ongoingBattles: w.battles.filter((b) => b.status === "ongoing").length
				};
			})
		);
	}

	// --- State snapshot for the current region ---
	const stateSnapshot = homeState
		? {
				id: homeState.id,
				name: homeState.name,
				logo: await getLogoUrl(homeState.logo),
				population: homeState.population ?? 0,
				rating: homeState.rating ?? 0,
				capitulated: homeState.capitulated,
				blocId: homeState.blocId
			}
		: null;

	return {
		account: {
			id: account.id,
			email: account.email,
			role: account.role,
			profile
		},
		userLocation: region ? { regionId: region.id, stateId: region.stateId } : null,
		stateSnapshot,
		activeTravel,
		systemBroadcast,
		stateBroadcast,
		partyBroadcast,
		ongoingBattles,
		activeWars,
		birthdayInfo
	};
};

export const actions: Actions = {
	collectBirthday: async ({ locals }) => {
		const account = locals.account!;
		try {
			const result = await collectBirthdayRewards(account.id, account.createdAt);
			if (!result.ok) {
				return fail(400, { error: "No birthday reward available to collect" });
			}
			return {
				success: true,
				message: `Happy Birthday! You collected ${result.totalReward.toLocaleString()} currency!`
			};
		} catch (err) {
			console.error("Error collecting birthday reward:", err);
			return fail(500, { error: "Failed to collect birthday reward" });
		}
	}
};
