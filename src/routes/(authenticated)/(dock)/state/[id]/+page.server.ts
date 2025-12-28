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
	stateSanctions,
	accounts,
	files
} from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and, gte, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { getRegionName } from "$lib/utils/formatting";

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

	// Get president - manual join
	const [presidentData] = await db
		.select({
			userId: presidents.userId,
			electedAt: presidents.electedAt,
			term: presidents.term,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(presidents)
		.leftJoin(accounts, eq(presidents.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(presidents.stateId, stateId))
		.limit(1);

	// Get ministers - manual join
	const stateMinistersRaw = await db
		.select({
			userId: ministers.userId,
			ministry: ministers.ministry,
			appointedAt: ministers.appointedAt,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(ministers)
		.leftJoin(accounts, eq(ministers.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(ministers.stateId, stateId));

	// Get parliament members
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

	// Get regions with population count
	const stateRegions = await db
		.select({
			id: regions.id,
			stateId: regions.stateId,
			rating: regions.rating,
			population: sql<number>`count(${residences.id})::int`
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId))
		.groupBy(regions.id);

	// Calculate actual population from residences
	const populationResult = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId));

	const actualPopulation = populationResult[0]?.total || 0;

	// Get next or active election
	const now = new Date();
	const [nextElection] = await db
		.select()
		.from(parliamentaryElections)
		.where(and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)))
		.orderBy(parliamentaryElections.startDate)
		.limit(1);

	// Get active taxes
	const activeTaxes = await db
		.select()
		.from(stateTaxes)
		.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.isActive, true)));

	// Get energy data
	const [energyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)).limit(1);

	// Get power plants
	const plants = await db.select().from(powerPlants).where(eq(powerPlants.stateId, stateId));

	// Check if current user is president of this state
	const isPresident = presidentData?.userId === locals.account?.id;

	// Check if current user is a foreign minister of another state
	let isForeignMinister = false;
	if (locals.account?.id) {
		const [foreignMinistry] = await db
			.select()
			.from(ministers)
			.where(and(eq(ministers.userId, locals.account.id), eq(ministers.ministry, "foreign_affairs")))
			.limit(1);

		isForeignMinister = !!foreignMinistry && foreignMinistry.stateId !== stateId;
	}

	const processLogo = async (logoId: number | null) => {
		if (!logoId) return null;

		try {
			const [file] = await db.select().from(files).where(eq(files.id, logoId)).limit(1);

			if (file) {
				return await getSignedDownloadUrl(file.key);
			}
		} catch {
			return null;
		}
		return null;
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
		president: presidentData
			? {
					userId: presidentData.userId,
					name: presidentData.profileName || "Unknown",
					logo: await processLogo(presidentData.profileLogo || null),
					electedAt: presidentData.electedAt,
					term: presidentData.term
				}
			: null,
		ministers: await Promise.all(
			stateMinistersRaw.map(async (minister) => ({
				userId: minister.userId,
				name: minister.profileName || "Unknown",
				logo: await processLogo(minister.profileLogo || null),
				ministry: minister.ministry,
				appointedAt: minister.appointedAt
			}))
		),
		parliamentMembers: await Promise.all(
			parliamentMembersRaw.map(async (member) => ({
				userId: member.userId,
				name: member.profileName || "Unknown",
				logo: await processLogo(member.profileLogo || null),
				partyAffiliation: member.partyAffiliation,
				electedAt: member.electedAt,
				term: member.term
			}))
		),
		regions: stateRegions.map((region) => ({
			id: region.id,
			name: getRegionName(region.id),
			logo: "/coats/" + region.id + ".svg",
			rating: region.rating,
			population: region.population || 0
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
		const [foreignMinistry] = await db
			.select()
			.from(ministers)
			.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "foreign_affairs")))
			.limit(1);

		if (!foreignMinistry) {
			return fail(403, { message: "Only foreign ministers can impose sanctions" });
		}

		// Can't sanction own state
		if (foreignMinistry.stateId === stateId) {
			return fail(400, { message: "Cannot sanction your own state" });
		}

		// Check if sanction already exists and is active
		const [existingSanction] = await db
			.select()
			.from(stateSanctions)
			.where(
				and(
					eq(stateSanctions.targetStateId, stateId),
					eq(stateSanctions.sanctioningStateId, foreignMinistry.stateId),
					eq(stateSanctions.isActive, true)
				)
			)
			.limit(1);

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
