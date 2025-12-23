// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	states,
	parliamentaryElections,
	residences,
	stateTaxes,
	stateEnergy,
	powerPlants,
	ministers,
	regions
} from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq, and, gte, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id),
		with: {
			president: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			},
			ministers: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			},
			parliamentMembers: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				},
				limit: 20
			},
			regions: true
		}
	});

	if (!state) {
		error(404, "State not found");
	}

	// Calculate actual population from residences
	const populationResult = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, params.id));

	const actualPopulation = populationResult[0]?.total || 0;

	// Get next or active election
	const now = new Date();
	const nextElection = await db.query.parliamentaryElections.findFirst({
		where: and(eq(parliamentaryElections.stateId, params.id), gte(parliamentaryElections.endDate, now)),
		orderBy: parliamentaryElections.startDate
	});

	// Get active taxes
	const activeTaxes = await db.query.stateTaxes.findMany({
		where: and(eq(stateTaxes.stateId, params.id), eq(stateTaxes.isActive, 1))
	});

	// Get energy data
	const energyData = await db.query.stateEnergy.findFirst({
		where: eq(stateEnergy.stateId, params.id)
	});

	// Get power plants
	const plants = await db.query.powerPlants.findMany({
		where: eq(powerPlants.stateId, params.id)
	});

	// Check if current user is president of this state
	const isPresident = state.president?.userId === locals.user?.id;

	// Check if current user is a foreign minister of another state
	let isForeignMinister = false;
	if (locals.user?.id) {
		const foreignMinistry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, locals.user.id), eq(ministers.ministry, "foreign_affairs"))
		});
		isForeignMinister = !!foreignMinistry && foreignMinistry.stateId !== params.id;
	}

	const processAvatar = async (avatar: string | null) => {
		if (avatar && !avatar.startsWith("http")) {
			try {
				return await getSignedDownloadUrl(avatar);
			} catch {
				return null;
			}
		}
		return avatar;
	};

	return {
		state: {
			id: state.id,
			name: state.name,
			avatar: state.avatar,
			background: state.background,
			description: state.description,
			population: actualPopulation,
			rating: state.rating,
			createdAt: state.createdAt
		},
		president: state.president
			? {
					userId: state.president.userId,
					name: state.president.user.profile?.name,
					avatar: await processAvatar(state.president.user.profile?.avatar || null),
					electedAt: state.president.electedAt,
					term: state.president.term
				}
			: null,
		ministers: await Promise.all(
			state.ministers.map(async (minister) => ({
				userId: minister.userId,
				name: minister.user.profile?.name,
				avatar: await processAvatar(minister.user.profile?.avatar || null),
				ministry: minister.ministry,
				appointedAt: minister.appointedAt
			}))
		),
		parliamentMembers: await Promise.all(
			state.parliamentMembers.map(async (member) => ({
				userId: member.userId,
				name: member.user.profile?.name,
				avatar: await processAvatar(member.user.profile?.avatar || null),
				partyAffiliation: member.partyAffiliation,
				electedAt: member.electedAt,
				term: member.term
			}))
		),
		regions: state.regions.map((region) => ({
			id: region.id,
			name: region.name,
			population: region.population
		})),
		nextElection: nextElection
			? {
					id: nextElection.id,
					startDate: nextElection.startDate,
					endDate: nextElection.endDate,
					status: nextElection.status,
					totalSeats: nextElection.totalSeats,
					isInaugural: nextElection.isInaugural === 1
				}
			: null,
		taxes: activeTaxes.map((tax) => ({
			id: tax.id,
			taxName: tax.taxName,
			taxType: tax.taxType,
			taxRate: tax.taxRate
		})),
		energy: energyData
			? {
					totalProduction: energyData.totalProduction,
					usedProduction: energyData.usedProduction,
					available: energyData.totalProduction - energyData.usedProduction
				}
			: null,
		powerPlants: plants.length,
		isPresident,
		isForeignMinister
	};
};

export const actions: Actions = {
	sanction: async ({ params, locals }) => {
		const account = locals.account!;

		// Verify user is a foreign minister
		const foreignMinistry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.ministry, "foreign_affairs"))
		});

		if (!foreignMinistry) {
			return fail(403, { message: "Only foreign ministers can impose sanctions" });
		}

		// Can't sanction own state
		if (foreignMinistry.stateId === params.id) {
			return fail(400, { message: "Cannot sanction your own state" });
		}

		// Check if sanction already exists and is active
		const existingSanction = await db.query.stateSanctions.findFirst({
			where: and(
				eq(stateSanctions.targetStateId, params.id),
				eq(stateSanctions.sanctioningStateId, foreignMinistry.stateId),
				eq(stateSanctions.isActive, 1)
			)
		});

		if (existingSanction) {
			return fail(400, { message: "This state is already sanctioned by your state" });
		}

		// Apply sanction
		await db.insert(stateSanctions).values({
			targetStateId: params.id,
			sanctioningStateId: foreignMinistry.stateId,
			sanctionedBy: account.id,
			reason: "Diplomatic sanction imposed",
			isActive: 1
		});

		return { success: true, message: "Sanction applied successfully" };
	}
};
