// src/routes/(authenticated)/(dock)/war/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { wars, battles, warSurrenders, states, blocs, accounts, userProfiles, regions } from "$lib/server/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { PageServerLoad } from "../$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const warId = parseInt(params.id);

	if (isNaN(warId)) {
		throw error(400, "Invalid war ID");
	}

	// Get war details with all relations
	const war = await db.query.wars.findFirst({
		where: eq(wars.id, warId),
		with: {
			attacker: {
				with: {
					logoFile: true
				}
			},
			defender: {
				with: {
					logoFile: true
				}
			},
			attackerBloc: true,
			defenderBloc: true,
			declarer: {
				with: {
					profile: {
						with: {
							logoFile: true
						}
					}
				}
			},
			battles: {
				with: {
					region: true,
					attackerState: true,
					defenderState: true,
					starter: {
						with: {
							profile: true
						}
					}
				},
				orderBy: desc(battles.startedAt)
			},
			surrenders: {
				with: {
					state: true,
					surrenderer: {
						with: {
							profile: true
						}
					}
				},
				orderBy: desc(warSurrenders.surrenderedAt)
			}
		}
	});

	if (!war) {
		throw error(404, "War not found");
	}

	// Get battle statistics
	const battleStats = await db
		.select({
			status: battles.status,
			count: sql<number>`count(*)::int`
		})
		.from(battles)
		.where(eq(battles.warId, warId))
		.groupBy(battles.status);

	// Get region control - count regions controlled by each side
	const attackerRegions = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(regions)
		.where(
			war.attackerBlocId
				? sql`${regions.stateId} IN (SELECT id FROM ${states} WHERE ${states.blocId} = ${war.attackerBlocId})`
				: eq(regions.stateId, war.attackerId)
		);

	const defenderRegions = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(regions)
		.where(
			war.defenderBlocId
				? sql`${regions.stateId} IN (SELECT id FROM ${states} WHERE ${states.blocId} = ${war.defenderBlocId})`
				: eq(regions.stateId, war.defenderId)
		);

	// Get involved states if blocs are involved
	let attackerStates: any[] = [];
	let defenderStates: any[] = [];

	if (war.attackerBlocId) {
		attackerStates = await db.query.states.findMany({
			where: eq(states.blocId, war.attackerBlocId),
			with: {
				logoFile: true
			}
		});
	}

	if (war.defenderBlocId) {
		defenderStates = await db.query.states.findMany({
			where: eq(states.blocId, war.defenderBlocId),
			with: {
				logoFile: true
			}
		});
	}

	// Get capitulated states from both defender bloc and defender state
	const capitulatedStates = await db.query.states.findMany({
		where: war.defenderBlocId
			? and(eq(states.blocId, war.defenderBlocId), eq(states.capitulated, true))
			: and(eq(states.id, war.defenderId), eq(states.capitulated, true)),
		with: {
			logoFile: true
		}
	});

	// Calculate war progress
	const totalRegions = (attackerRegions[0]?.count || 0) + (defenderRegions[0]?.count || 0);
	const attackerControl = totalRegions > 0 ? ((attackerRegions[0]?.count || 0) / totalRegions) * 100 : 0;
	const defenderControl = totalRegions > 0 ? ((defenderRegions[0]?.count || 0) / totalRegions) * 100 : 0;

	return {
		war,
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
