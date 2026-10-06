import { db } from "#lib/server/db.js";
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
} from "#lib/server/schema.js";
import { eq, and, or, desc } from "drizzle-orm";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { getBirthdayInfo, collectBirthdayRewards } from "#lib/server/service/birthday.js";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Every lookup below only depends on the account or on one earlier lookup,
	// so independent chains run concurrently instead of as one long waterfall
	// of sequential DB round trips.
	const residenceChain = (async () => {
		const primaryResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
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
		return { primaryResidence, region, homeState };
	})();

	// Party broadcast (visible to members of the user's party)
	const partyBroadcastPromise = (async () => {
		const membership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});
		if (!membership) return null;
		return db.query.broadcasts.findFirst({
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
	})();

	const [
		profile,
		birthdayInfo,
		activeTravel,
		systemBroadcast,
		{ primaryResidence, region, homeState },
		partyBroadcast
	] = await Promise.all([
		db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		}),
		// Account birthday (creation anniversary) reward status.
		getBirthdayInfo(account.id, account.createdAt),
		db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		}),
		// System broadcast (visible to everyone)
		db.query.broadcasts.findFirst({
			where: and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true)),
			orderBy: [desc(broadcasts.createdAt)],
			with: { issuer: { with: { profile: true } } }
		}),
		residenceChain,
		partyBroadcastPromise
	]);

	// State broadcast (visible to residents of the user's state)
	const stateBroadcastPromise = homeState
		? db.query.broadcasts.findFirst({
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
			})
		: Promise.resolve(null);

	// Bloc broadcast (visible to residents of a state belonging to a bloc)
	const blocBroadcastPromise = homeState?.blocId
		? db.query.broadcasts.findFirst({
				where: and(
					eq(broadcasts.broadcastType, "bloc"),
					eq(broadcasts.blocId, homeState.blocId),
					eq(broadcasts.isActive, true)
				),
				orderBy: [desc(broadcasts.createdAt)],
				with: {
					issuer: { with: { profile: true } },
					bloc: true
				}
			})
		: Promise.resolve(null);

	// --- Ongoing battles in user's region ---
	const ongoingBattlesPromise = (async () => {
		if (!primaryResidence) return [];

		const regionBattles = await db.query.battles.findMany({
			where: and(eq(battles.regionId, primaryResidence.regionId), eq(battles.status, "ongoing")),
			with: {
				attackerState: true,
				defenderState: true
			},
			orderBy: [desc(battles.startedAt)]
		});

		return regionBattles.map((b) => ({
			id: b.id,
			regionId: b.regionId,
			attackerState: { id: b.attackerStateId, name: b.attackerState.name },
			defenderState: { id: b.defenderStateId, name: b.defenderState.name },
			phase: b.phase,
			terrain: b.terrain,
			startedAt: b.startedAt
		}));
	})();

	// --- Active wars involving the region's controlling state (or its bloc) ---
	const activeWarsPromise = (async () => {
		if (!homeState) return [];

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

		return Promise.all(
			warRows.map(async (w) => {
				const isDefending = w.defenderId === stateId || (blocId != null && w.defenderBlocId === blocId);
				const [attackerLogo, defenderLogo] = await Promise.all([
					getLogoUrl(w.attacker.logo),
					getLogoUrl(w.defender.logo)
				]);
				return {
					id: w.id,
					declaredAt: w.declaredAt,
					side: (isDefending ? "defender" : "attacker") as "attacker" | "defender",
					attacker: {
						id: w.attacker.id,
						name: w.attacker.name,
						logo: attackerLogo
					},
					defender: {
						id: w.defender.id,
						name: w.defender.name,
						logo: defenderLogo
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
	})();

	// --- State snapshot for the current region ---
	const stateSnapshotPromise = (async () => {
		if (!homeState) return null;
		return {
			id: homeState.id,
			name: homeState.name,
			logo: await getLogoUrl(homeState.logo),
			population: homeState.population ?? 0,
			rating: homeState.rating ?? 0,
			capitulated: homeState.capitulated,
			blocId: homeState.blocId
		};
	})();

	const [stateBroadcast, blocBroadcast, ongoingBattles, activeWars, stateSnapshot] = await Promise.all([
		stateBroadcastPromise,
		blocBroadcastPromise,
		ongoingBattlesPromise,
		activeWarsPromise,
		stateSnapshotPromise
	]);

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
		blocBroadcast,
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
