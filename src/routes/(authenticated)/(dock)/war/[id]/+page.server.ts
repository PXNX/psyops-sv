// src/routes/(authenticated)/(dock)/war/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { wars, battles, warSurrenders, states, blocs, accounts, userProfiles, regions } from "$lib/server/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { getLogoUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const warId = parseInt(params.id);

	if (isNaN(warId)) {
		throw error(400, "Invalid war ID");
	}

	// Get war details
	const [warData] = await db
		.select({
			id: wars.id,
			attackerId: wars.attackerId,
			defenderId: wars.defenderId,
			attackerBlocId: wars.attackerBlocId,
			defenderBlocId: wars.defenderBlocId,
			declaredBy: wars.declaredBy,
			declaredAt: wars.declaredAt,
			endedAt: wars.endedAt,
			status: wars.status,
			declarerName: userProfiles.name,
			declarerLogo: userProfiles.logo
		})
		.from(wars)
		.leftJoin(accounts, eq(wars.declaredBy, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(wars.id, warId))
		.limit(1);

	if (!warData) {
		throw error(404, "War not found");
	}

	// Get attacker state
	const [attackerState] = await db.select().from(states).where(eq(states.id, warData.attackerId)).limit(1);

	// Get defender state
	const [defenderState] = await db.select().from(states).where(eq(states.id, warData.defenderId)).limit(1);

	// Get attacker bloc if exists
	let attackerBloc = null;
	if (warData.attackerBlocId) {
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, warData.attackerBlocId)).limit(1);
		attackerBloc = bloc;
	}

	// Get defender bloc if exists
	let defenderBloc = null;
	if (warData.defenderBlocId) {
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, warData.defenderBlocId)).limit(1);
		defenderBloc = bloc;
	}

	// Get battles
	const battlesRaw = await db
		.select({
			id: battles.id,
			warId: battles.warId,
			regionId: battles.regionId,
			attackerStateId: battles.attackerStateId,
			defenderStateId: battles.defenderStateId,
			starterId: battles.startedBy,
			startedAt: battles.startedAt,
			endedAt: battles.endedAt,
			status: battles.status
		})
		.from(battles)
		.where(eq(battles.warId, warId))
		.orderBy(desc(battles.startedAt));

	// Get state names for battles
	const battlesWithDetails = await Promise.all(
		battlesRaw.map(async (battle) => {
			const [attackerState] = await db
				.select({ name: states.name })
				.from(states)
				.where(eq(states.id, battle.attackerStateId))
				.limit(1);

			const [defenderState] = await db
				.select({ name: states.name })
				.from(states)
				.where(eq(states.id, battle.defenderStateId))
				.limit(1);

			const [starter] = await db
				.select({ name: userProfiles.name })
				.from(userProfiles)
				.where(eq(userProfiles.accountId, battle.starterId))
				.limit(1);

			return {
				...battle,
				attackerStateName: attackerState?.name || "Unknown",
				defenderStateName: defenderState?.name || "Unknown",
				starterName: starter?.name || "Unknown"
			};
		})
	);

	// Get surrenders
	const surrendersRaw = await db
		.select({
			id: warSurrenders.id,
			warId: warSurrenders.warId,
			stateId: warSurrenders.stateId,
			surrendererId: warSurrenders.surrenderedBy,
			surrenderedAt: warSurrenders.surrenderedAt,
			reason: warSurrenders.reason,
			stateName: states.name,
			stateLogo: states.logo,
			surrendererName: userProfiles.name
		})
		.from(warSurrenders)
		.innerJoin(states, eq(warSurrenders.stateId, states.id))
		.leftJoin(accounts, eq(warSurrenders.surrenderedBy, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(warSurrenders.warId, warId))
		.orderBy(desc(warSurrenders.surrenderedAt));

	// Get battle statistics
	const battleStats = await db
		.select({
			status: battles.status,
			count: sql<number>`count(*)::int`
		})
		.from(battles)
		.where(eq(battles.warId, warId))
		.groupBy(battles.status);

	// Get region control
	const attackerRegions = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(regions)
		.where(
			warData.attackerBlocId
				? sql`${regions.stateId} IN (SELECT id FROM ${states} WHERE ${states.blocId} = ${warData.attackerBlocId})`
				: eq(regions.stateId, warData.attackerId)
		);

	const defenderRegions = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(regions)
		.where(
			warData.defenderBlocId
				? sql`${regions.stateId} IN (SELECT id FROM ${states} WHERE ${states.blocId} = ${warData.defenderBlocId})`
				: eq(regions.stateId, warData.defenderId)
		);

	// Get involved states if blocs are involved
	let attackerStates: any[] = [];
	let defenderStates: any[] = [];

	if (warData.attackerBlocId) {
		const attackerStatesRaw = await db.select().from(states).where(eq(states.blocId, warData.attackerBlocId));

		attackerStates = await Promise.all(
			attackerStatesRaw.map(async (state) => ({
				...state,
				logo: await getLogoUrl(state.logo)
			}))
		);
	}

	if (warData.defenderBlocId) {
		const defenderStatesRaw = await db.select().from(states).where(eq(states.blocId, warData.defenderBlocId));

		defenderStates = await Promise.all(
			defenderStatesRaw.map(async (state) => ({
				...state,
				logo: await getLogoUrl(state.logo)
			}))
		);
	}

	// Get capitulated states
	const capitulatedStatesRaw = await db
		.select()
		.from(states)
		.where(
			warData.defenderBlocId
				? and(eq(states.blocId, warData.defenderBlocId), eq(states.capitulated, true))
				: and(eq(states.id, warData.defenderId), eq(states.capitulated, true))
		);

	const capitulatedStates = await Promise.all(
		capitulatedStatesRaw.map(async (state) => ({
			...state,
			logo: await getLogoUrl(state.logo)
		}))
	);

	// Calculate war progress
	const totalRegions = (attackerRegions[0]?.count || 0) + (defenderRegions[0]?.count || 0);
	const attackerControl = totalRegions > 0 ? ((attackerRegions[0]?.count || 0) / totalRegions) * 100 : 0;
	const defenderControl = totalRegions > 0 ? ((defenderRegions[0]?.count || 0) / totalRegions) * 100 : 0;

	return {
		war: {
			id: warData.id,
			attackerId: warData.attackerId,
			defenderId: warData.defenderId,
			attackerBlocId: warData.attackerBlocId,
			defenderBlocId: warData.defenderBlocId,
			declaredBy: warData.declaredBy,
			declaredAt: warData.declaredAt,
			endedAt: warData.endedAt,
			status: warData.status,
			attacker: {
				id: warData.attackerId,
				name: attackerState?.name || "Unknown",
				logo: await getLogoUrl(attackerState?.logo),
				capitulated: attackerState?.capitulated || false
			},
			defender: {
				id: warData.defenderId,
				name: defenderState?.name || "Unknown",
				logo: await getLogoUrl(defenderState?.logo),
				capitulated: defenderState?.capitulated || false
			},
			attackerBloc: attackerBloc
				? {
						id: attackerBloc.id,
						name: attackerBloc.name,
						color: attackerBloc.color
					}
				: null,
			defenderBloc: defenderBloc
				? {
						id: defenderBloc.id,
						name: defenderBloc.name,
						color: defenderBloc.color
					}
				: null,
			declarer: {
				name: warData.declarerName,
				logo: await getLogoUrl(warData.declarerLogo)
			},
			battles: battlesWithDetails.map((battle) => ({
				id: battle.id,
				warId: battle.warId,
				region: {
					id: battle.regionId
				},
				attackerState: {
					id: battle.attackerStateId,
					name: battle.attackerStateName
				},
				defenderState: {
					id: battle.defenderStateId,
					name: battle.defenderStateName
				},
				startedAt: battle.startedAt,
				endedAt: battle.endedAt,
				status: battle.status,
				starter: {
					profile: {
						name: battle.starterName
					}
				}
			})),
			surrenders: await Promise.all(
				surrendersRaw.map(async (surrender) => ({
					id: surrender.id,
					warId: surrender.warId,
					state: {
						id: surrender.stateId,
						name: surrender.stateName,
						logo: await getLogoUrl(surrender.stateLogo)
					},
					surrenderedAt: surrender.surrenderedAt,
					reason: surrender.reason,
					surrenderer: {
						profile: {
							name: surrender.surrendererName
						}
					}
				}))
			)
		},
		battleStats: battleStats.reduce(
			(acc, stat) => {
				acc[stat.status] = stat.count;
				return acc;
			},
			{ ongoing: 0, attacker_won: 0, defender_won: 0 } as Record<string, number>
		),
		attackerStates,
		defenderStates,
		capitulatedStates,
		attackerControl,
		defenderControl,
		totalRegions
	};
};
