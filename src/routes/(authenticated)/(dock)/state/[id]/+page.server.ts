// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	states,
	blocs,
	parliamentaryElections,
	residences,
	stateTaxes,
	stateEnergy,
	powerPlants,
	ministers,
	regions,
	presidents,
	userProfiles,
	parliamentMembers,
	stateSanctions
} from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and, gte, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = parseInt(params.id);

	// Get state with bloc information
	const [state] = await db
		.select({
			id: states.id,
			name: states.name,
			logo: states.logo,
			background: states.background,
			description: states.description,
			rating: states.rating,
			createdAt: states.createdAt,
			blocId: blocs.id,
			blocName: blocs.name,
			blocColor: blocs.color,
			blocDescription: blocs.description
		})
		.from(states)
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(eq(states.id, stateId))
		.limit(1);

	if (!state) {
		error(404, "State not found");
	}

	// Get president
	const president = await db.query.presidents.findFirst({
		where: eq(presidents.stateId, stateId),
		with: {
			user: {
				with: {
					profile: true
				}
			}
		}
	});

	// Get ministers
	const stateMinisters = await db.query.ministers.findMany({
		where: eq(ministers.stateId, stateId),
		with: {
			user: {
				with: {
					profile: true
				}
			}
		}
	});

	// Get parliament members - manual query since relations aren't fully defined
	const parliamentMembersRaw = await db
		.select({
			userId: parliamentMembers.userId,
			partyAffiliation: parliamentMembers.partyAffiliation,
			electedAt: parliamentMembers.electedAt,
			term: parliamentMembers.term,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(parliamentMembers)
		.leftJoin(userProfiles, eq(parliamentMembers.userId, userProfiles.accountId))
		.where(eq(parliamentMembers.stateId, stateId))
		.limit(20);

	// Get regions
	const stateRegions = await db.query.regions.findMany({
		where: eq(regions.stateId, stateId)
	});

	// Calculate actual population from residences
	const populationResult = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId));

	const actualPopulation = populationResult[0]?.total || 0;

	// Get next or active election
	const now = new Date();
	const nextElection = await db.query.parliamentaryElections.findFirst({
		where: and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)),
		orderBy: (elections, { asc }) => [asc(elections.startDate)]
	});

	// Get active taxes
	const activeTaxes = await db.query.stateTaxes.findMany({
		where: and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.isActive, true))
	});

	// Get energy data
	const energyData = await db.query.stateEnergy.findFirst({
		where: eq(stateEnergy.stateId, stateId)
	});

	// Get power plants
	const plants = await db.query.powerPlants.findMany({
		where: eq(powerPlants.stateId, stateId)
	});

	// Check if current user is president of this state
	const isPresident = president?.userId === locals.account?.id;

	// Check if current user is a foreign minister of another state
	let isForeignMinister = false;
	if (locals.account?.id) {
		const foreignMinistry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, locals.account.id), eq(ministers.ministry, "foreign_affairs"))
		});
		isForeignMinister = !!foreignMinistry && foreignMinistry.stateId !== stateId;
	}

	const processLogo = async (logo: string | null) => {
		if (logo && !logo.startsWith("http")) {
			try {
				return await getSignedDownloadUrl(logo);
			} catch {
				return null;
			}
		}
		return logo;
	};

	return {
		state: {
			id: state.id,
			name: state.name,
			logo: state.logo,
			background: state.background,
			description: state.description,
			population: actualPopulation,
			rating: state.rating,
			createdAt: state.createdAt
		},
		bloc: state.blocId
			? {
					id: state.blocId,
					name: state.blocName,
					color: state.blocColor,
					description: state.blocDescription
				}
			: null,
		president: president
			? {
					userId: president.userId,
					name: president.user.profile?.name,
					logo: await processLogo(president.user.profile?.logo || null),
					electedAt: president.electedAt,
					term: president.term
				}
			: null,
		ministers: await Promise.all(
			stateMinisters.map(async (minister) => ({
				userId: minister.userId,
				name: minister.user.profile?.name,
				logo: await processLogo(minister.user.profile?.logo || null),
				ministry: minister.ministry,
				appointedAt: minister.appointedAt
			}))
		),
		parliamentMembers: await Promise.all(
			parliamentMembersRaw.map(async (member) => ({
				userId: member.userId,
				name: member.profileName,
				logo: await processLogo(member.profileLogo || null),
				partyAffiliation: member.partyAffiliation,
				electedAt: member.electedAt,
				term: member.term
			}))
		),
		regions: stateRegions.map((region) => ({
			id: region.id,
			rating: region.rating
		})),
		nextElection: nextElection
			? {
					id: nextElection.id,
					startDate: nextElection.startDate,
					endDate: nextElection.endDate,
					status: nextElection.status,
					totalSeats: nextElection.totalSeats,
					isInaugural: nextElection.isInaugural
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
		const stateId = parseInt(params.id);

		// Verify user is a foreign minister
		const foreignMinistry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.ministry, "foreign_affairs"))
		});

		if (!foreignMinistry) {
			return fail(403, { message: "Only foreign ministers can impose sanctions" });
		}

		// Can't sanction own state
		if (foreignMinistry.stateId === stateId) {
			return fail(400, { message: "Cannot sanction your own state" });
		}

		// Check if sanction already exists and is active
		const existingSanction = await db.query.stateSanctions.findFirst({
			where: and(
				eq(stateSanctions.targetStateId, stateId),
				eq(stateSanctions.sanctioningStateId, foreignMinistry.stateId),
				eq(stateSanctions.isActive, true)
			)
		});

		if (existingSanction) {
			return fail(400, { message: "This state is already sanctioned by your state" });
		}

		// Apply sanction
		await db.insert(stateSanctions).values({
			targetStateId: stateId,
			sanctioningStateId: foreignMinistry.stateId,
			sanctionedBy: account.id,
			reason: "Diplomatic sanction imposed",
			isActive: true
		});

		return { success: true, message: "Sanction applied successfully" };
	}
};
