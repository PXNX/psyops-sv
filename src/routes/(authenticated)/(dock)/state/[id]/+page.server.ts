// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { creditTreasury, debitWallet, InsufficientFundsError } from "#lib/server/money.js";
import { db } from "#lib/server/db.js";
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
	files,
	wars,
	stateVisaSettings,
	userVisas,
	userWallets,
	stateTreasury,
	visaApplications,
	residenceApplications,
	partyMembers,
	politicalParties,
	stateEditCooldowns,
	stateBailouts
} from "#lib/server/schema.js";
import { error, fail } from "@sveltejs/kit";
import { eq, and, gte, sql, or, inArray } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getLogoUrl, getSignedDownloadUrl, uploadFileFromForm } from "#lib/server/backblaze.js";
import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters/valibot";
import { editStateSchema } from "./schema";

/** The user's pending residence application for any region of this state. */
async function pendingApplicationIn(userId: string, stateId: number) {
	const [row] = await db
		.select({ id: residenceApplications.id })
		.from(residenceApplications)
		.innerJoin(regions, eq(residenceApplications.regionId, regions.id))
		.where(
			and(
				eq(residenceApplications.userId, userId),
				eq(residenceApplications.status, "pending"),
				eq(regions.stateId, stateId)
			)
		)
		.limit(1);
	return row ?? null;
}

import { declareWar, WarDeclarationError } from "#lib/server/services/military/declare-war.js";
import { warsOfState } from "#lib/server/services/military/history.js";
import { ihlRecord } from "#lib/server/services/military/ihl.js";
import { statePopulation } from "#lib/server/services/population.js";
import { knownEffects, opsAuthority } from "#lib/server/services/military/covert-ops.js";
import { sideOf, viewerSide } from "#lib/server/services/military/recon.js";
import { effectiveEnergy } from "#lib/server/services/military/state-effects.js";
import { stancesHeldBy, stancesToward } from "#lib/server/services/politics/civilian-stance.js";
import { stateDebt, bailoutState, BailoutError } from "#lib/server/services/economy/bailout.js";
import { stateDebtCreditors, stateGdp, statePowerReport } from "#lib/server/services/economy/state-metrics.js";
import { takeFirstTimeDetail } from "#lib/server/services/politics/first-time.js";
import { ECONOMY_CONFIG } from "#lib/config/index.js";

/** The state an account can spend on: its president, else its economy minister. */
async function bailoutAuthority(userId: string, targetStateId: number) {
	const [presidency] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	const ministry = presidency
		? null
		: await db
				.select({ stateId: ministers.stateId })
				.from(ministers)
				.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "economy")))
				.limit(1)
				.then((rows) => rows[0] ?? null);
	const stateId = presidency?.stateId ?? ministry?.stateId;
	if (!stateId || stateId === targetStateId) return null;
	const [[state], [treasury]] = await Promise.all([
		db.select({ name: states.name }).from(states).where(eq(states.id, stateId)).limit(1),
		db.select({ balance: stateTreasury.balance }).from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1)
	]);
	return { stateId, name: state?.name ?? "your state", balance: Number(treasury?.balance ?? 0) };
}
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
			martialLawUntil: states.martialLawUntil,
			createdAt: states.createdAt,
			blocId: blocs.id,
			blocName: blocs.name,
			blocLogo: blocs.logo,
			blocColor: blocs.color,
			blocDescription: blocs.description,
			blocCreatedAt: blocs.createdAt
		})
		.from(states)
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(eq(states.id, stateId))
		.limit(1);

	if (!state) {
		error(404, "State not found");
	}

	const accountId = locals.account?.id;
	const now = new Date();

	// Everything below only depends on the state / viewer, so it all runs concurrently.
	// Dependent lookups are chained onto the promises they need.

	// Get president - manual join
	const presidentPromise = db
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
		.limit(1)
		.then(([presidentData]) => presidentData);

	// Get ministers - manual join
	const ministersPromise = db
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

	// Current party (abbreviation + color) for the president and ministers,
	// so their names can carry a party tag like on the company/parliament pages.
	const partyByUserIdPromise = Promise.all([presidentPromise, ministersPromise]).then(
		async ([presidentData, stateMinistersRaw]) => {
			const governmentUserIds = [presidentData?.userId, ...stateMinistersRaw.map((m) => m.userId)].filter(
				(id): id is string => !!id
			);
			const partyByUserId = new Map<string, { abbreviation: string | null; color: string }>();
			if (governmentUserIds.length > 0) {
				const membershipRows = await db
					.select({
						userId: partyMembers.userId,
						abbreviation: politicalParties.abbreviation,
						color: politicalParties.color
					})
					.from(partyMembers)
					.innerJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
					.where(inArray(partyMembers.userId, governmentUserIds));

				for (const row of membershipRows) {
					partyByUserId.set(row.userId, { abbreviation: row.abbreviation, color: row.color });
				}
			}
			return partyByUserId;
		}
	);

	// Get regions with population count
	const stateRegionsPromise = db
		.select({
			id: regions.id,
			stateId: regions.stateId,
			rating: regions.rating,
			population: sql<number>`count(${residences.id})::int`,
			oil: regions.oil,
			steel: regions.steel,
			chromium: regions.chromium,
			tungsten: regions.tungsten,
			rubber: regions.rubber,
			aluminium: regions.aluminium
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId))
		.groupBy(regions.id);

	const [
		presidentData,
		stateMinistersRaw,
		partyByUserId,
		presidentLogo,
		ministerLogos,
		parliamentMembersWithLogos,
		stateRegions,
		populationResult,
		[nextElection],
		activeTaxes,
		[energyData],
		plants,
		isForeignMinister,
		canDeclareWar,
		activeWars,
		visaSettings,
		userActiveVisa,
		residenceInfo,
		walletBalance,
		stateLogo,
		blocLogo,
		editFormData
	] = await Promise.all([
		presidentPromise,
		ministersPromise,
		partyByUserIdPromise,
		presidentPromise.then((presidentData) => (presidentData ? getLogoUrl(presidentData.profileLogo) : null)),
		ministersPromise.then((stateMinistersRaw) =>
			Promise.all(stateMinistersRaw.map((minister) => getLogoUrl(minister.profileLogo)))
		),
		// Get parliament members
		db
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
			.limit(20)
			.then((parliamentMembersRaw) =>
				Promise.all(
					parliamentMembersRaw.map(async (member) => ({
						userId: member.userId,
						name: member.profileName,
						logo: await getLogoUrl(member.profileLogo),
						partyAffiliation: member.partyAffiliation,
						electedAt: member.electedAt,
						term: member.term
					}))
				)
			),
		stateRegionsPromise,
		// Calculate actual population from residences
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(regions.stateId, stateId)),
		// Get next or active election
		db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)))
			.orderBy(parliamentaryElections.startDate)
			.limit(1),
		// Get active taxes
		db
			.select()
			.from(stateTaxes)
			.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.isActive, true))),
		// Get energy data
		db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)).limit(1),
		// Get power plants
		db.select().from(powerPlants).where(eq(powerPlants.stateId, stateId)),
		// Check if current user is a foreign minister of another state
		(async () => {
			if (!accountId) return false;
			const [foreignMinistry] = await db
				.select()
				.from(ministers)
				.where(and(eq(ministers.userId, accountId), eq(ministers.ministry, "foreign_affairs")))
				.limit(1);

			return !!foreignMinistry && foreignMinistry.stateId !== stateId;
		})(),
		// Check if current user is president of ANOTHER state
		(async () => {
			if (!accountId) return false;
			const [userPres] = await db
				.select({
					stateId: presidents.stateId,
					stateBlocId: states.blocId
				})
				.from(presidents)
				.leftJoin(states, eq(presidents.stateId, states.id))
				.where(eq(presidents.userId, accountId))
				.limit(1);

			if (!userPres || userPres.stateId === stateId) return false;

			// Can declare war if: not in same bloc (or either has no bloc)
			const notSameBloc = userPres.stateBlocId !== state.blocId || !userPres.stateBlocId || !state.blocId;

			// ...and not already at war with this state
			const [existingWar] = await db
				.select({ id: wars.id })
				.from(wars)
				.where(
					and(
						eq(wars.status, "active"),
						or(
							and(eq(wars.attackerId, userPres.stateId), eq(wars.defenderId, stateId)),
							and(eq(wars.attackerId, stateId), eq(wars.defenderId, userPres.stateId))
						)
					)
				)
				.limit(1);

			return notSameBloc && !existingWar;
		})(),
		// Get active wars involving this state
		db
			.select({
				id: wars.id,
				attackerId: wars.attackerId,
				defenderId: wars.defenderId,
				declaredBy: wars.declaredBy,
				declaredAt: wars.declaredAt,
				status: wars.status,
				attackerName: sql<string>`attacker.name`,
				attackerLogo: sql<number>`attacker.logo`,
				defenderName: sql<string>`defender.name`,
				defenderLogo: sql<number>`defender.logo`,
				declarerName: userProfiles.name
			})
			.from(wars)
			.innerJoin(sql`states AS attacker`, sql`attacker.id = ${wars.attackerId}`)
			.innerJoin(sql`states AS defender`, sql`defender.id = ${wars.defenderId}`)
			.leftJoin(accounts, eq(wars.declaredBy, accounts.id))
			.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
			.where(and(or(eq(wars.attackerId, stateId), eq(wars.defenderId, stateId)), eq(wars.status, "active")))
			.then((activeWarsRaw) =>
				Promise.all(
					activeWarsRaw.map(async (war) => {
						const [attackerLogo, defenderLogo] = await Promise.all([
							getLogoUrl(war.attackerLogo),
							getLogoUrl(war.defenderLogo)
						]);
						return {
							id: war.id,
							attackerId: war.attackerId,
							defenderId: war.defenderId,
							declaredBy: war.declaredBy,
							declaredAt: war.declaredAt,
							status: war.status,
							attacker: {
								id: war.attackerId,
								name: war.attackerName,
								logo: attackerLogo
							},
							defender: {
								id: war.defenderId,
								name: war.defenderName,
								logo: defenderLogo
							},
							declarer: {
								name: war.declarerName
							},
							isAttacker: war.attackerId === stateId
						};
					})
				)
			),
		// Get visa settings for this state
		db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		}),
		// Check if user has active visa for this state
		accountId
			? db.query.userVisas.findFirst({
					where: and(eq(userVisas.userId, accountId), eq(userVisas.stateId, stateId), eq(userVisas.status, "active"))
				})
			: null,
		// Check if user is a resident of this state (and whether a visa would be blocked)
		(async () => {
			let isResident = false;
			let userResidenceBloc = null;
			let canApplyForResidence = false;
			let pendingResidenceAppPromise: Promise<boolean> = Promise.resolve(false);
			let userCurrentRegionName: string | null = null;
			let visaBlockedPromise: Promise<string | null> = Promise.resolve(null);

			if (accountId) {
				const userRes = await db.query.residences.findFirst({
					where: eq(residences.userId, accountId),
					with: {
						region: {
							with: { state: { with: { bloc: true } } }
						},
						homeRegion: {
							with: { state: true }
						}
					}
				});
				if (userRes) {
					isResident = userRes.region.stateId === stateId;
					userResidenceBloc = userRes.region.state?.bloc ?? null;

					// User can apply for residence if:
					// 1. Currently physically in a region of this state
					// 2. Their home region is NOT in this state (different citizenship)
					const homeStateId = userRes.homeRegion?.stateId;
					if (userRes.region.stateId === stateId && homeStateId !== stateId) {
						canApplyForResidence = true;
						userCurrentRegionName = getRegionName(userRes.regionId);

						// Check for pending residence application in any region of this state
						pendingResidenceAppPromise = pendingApplicationIn(accountId, stateId).then(Boolean);
					}
				}

				// Check if visa is blocked by war or sanctions (reuses the residence loaded above)
				if (!isResident) {
					const userStateId = userRes?.region?.stateId;
					const userBlocId = userResidenceBloc?.id ?? null;

					if (userStateId && userStateId !== stateId) {
						visaBlockedPromise = Promise.all([
							// Check active wars
							db.query.wars.findFirst({
								where: and(
									eq(wars.status, "active"),
									or(
										and(eq(wars.attackerId, userStateId), eq(wars.defenderId, stateId)),
										and(eq(wars.attackerId, stateId), eq(wars.defenderId, userStateId)),
										...(userBlocId
											? [
													and(eq(wars.attackerBlocId, userBlocId), eq(wars.defenderId, stateId)),
													and(eq(wars.attackerId, stateId), eq(wars.defenderBlocId, userBlocId))
												]
											: [])
									)
								)
							}),
							// Check sanctions
							db.query.stateSanctions.findFirst({
								where: and(
									eq(stateSanctions.sanctioningStateId, stateId),
									eq(stateSanctions.targetStateId, userStateId),
									eq(stateSanctions.isActive, true)
								)
							})
						]).then(([warBlock, sanctionBlock]) => {
							if (warBlock) return "Your state is at war with this state";
							if (sanctionBlock) return "This state has sanctioned your state";
							return null;
						});
					}
				}
			}

			const [hasPendingResidenceApp, visaBlockedReason] = await Promise.all([
				pendingResidenceAppPromise,
				visaBlockedPromise
			]);

			return {
				isResident,
				userResidenceBloc,
				canApplyForResidence,
				hasPendingResidenceApp,
				userCurrentRegionName,
				visaBlockedReason
			};
		})(),
		// Get wallet balance
		accountId
			? db.query.userWallets
					.findFirst({
						where: eq(userWallets.userId, accountId)
					})
					.then((wallet) => (wallet ? Number(wallet.balance) : 0))
			: 0,
		getLogoUrl(state.logo),
		state.blocId ? getLogoUrl(state.blocLogo) : null,
		// Edit form + cooldown status for the "Edit State" sheet — only the sitting
		// president needs this, so skip the cooldown lookup/superValidate otherwise.
		presidentPromise.then(async (presidentData) => {
			if (!accountId || presidentData?.userId !== accountId) {
				return { editForm: null, onCooldown: false, cooldownEndsAt: null };
			}

			const [cooldown] = await db
				.select()
				.from(stateEditCooldowns)
				.where(eq(stateEditCooldowns.userId, accountId))
				.limit(1);

			const editNow = new Date();
			const cooldownEndTime = cooldown ? new Date(cooldown.lastEditAt.getTime() + 24 * 60 * 60 * 1000) : null;
			const onCooldown = !!cooldownEndTime && editNow < cooldownEndTime;
			const cooldownEndsAt = cooldownEndTime?.toISOString() || null;

			const editForm = await superValidate(
				{ name: state.name, background: state.background || "#6366f1" },
				valibot(editStateSchema)
			);

			return { editForm, onCooldown, cooldownEndsAt };
		})
	]);

	// Covert operations: the effects on this state the viewer knows about
	// (attributed to the world, detected to the state, its own to the culprit).
	const covertEffectsPromise = (async () => {
		const [side, authority] = accountId
			? await Promise.all([viewerSide(db, accountId), opsAuthority(db, accountId)])
			: [null, null];
		const viewerIds = new Set(side?.stateIds ?? []);
		if (authority) for (const id of (await sideOf(db, authority.stateId)).stateIds) viewerIds.add(id);
		const effects = await knownEffects(db, stateId, [...viewerIds]);
		const sourceIds = [...new Set(effects.map((e) => e.sourceStateId).filter((id): id is number => !!id))];
		const names = sourceIds.length
			? await db.select({ id: states.id, name: states.name }).from(states).where(inArray(states.id, sourceIds))
			: [];
		return effects.map((e) => ({
			...e,
			source: names.find((n) => n.id === e.sourceStateId)?.name ?? null,
			region: e.regionId ? getRegionName(e.regionId) : null
		}));
	})();
	// A grid attack takes part of the capacity offline for a while.
	const [covertEffects, liveEnergy] = await Promise.all([
		covertEffectsPromise,
		energyData ? effectiveEnergy(db, stateId, energyData) : null
	]);

	const actualPopulation = populationResult[0]?.total || 0;

	// Civilians (sum over the state's regions) and its public IHL record.
	const [civilians, ihl] = await Promise.all([statePopulation(db, stateId), ihlRecord(db, stateId)]);

	// Civilian sentiment toward this state, this state's own view of others,
	// its debt and the last few rescues it received. The viewer's own treasury
	// decides whether a bailout button belongs on the dossier at all.
	const debtPromise = stateDebt(db, stateId);
	const [stancesAbout, stancesHeld, debt, bailoutHistory, donor, powerReport, creditors] = await Promise.all([
		stancesToward(db, stateId),
		stancesHeldBy(db, stateId),
		debtPromise,
		db
			.select({
				amount: stateBailouts.amount,
				donorStateId: stateBailouts.donorStateId,
				createdAt: stateBailouts.createdAt
			})
			.from(stateBailouts)
			.where(eq(stateBailouts.recipientStateId, stateId))
			.orderBy(sql`${stateBailouts.createdAt} desc`)
			.limit(5)
			.then(async (rows) =>
				Promise.all(
					rows.map(async (row) => {
						const [donorState] = await db
							.select({ name: states.name })
							.from(states)
							.where(eq(states.id, row.donorStateId))
							.limit(1);
						return {
							amount: Number(row.amount),
							from: donorState?.name ?? "another state",
							date: row.createdAt.toISOString()
						};
					})
				)
			),
		accountId ? bailoutAuthority(accountId, stateId) : null,
		statePowerReport(db, stateId),
		stateDebtCreditors(db, stateId)
	]);

	// GDP depends on the outstanding debt figure computed above.
	const gdpReport = await stateGdp(db, stateId, debt);

	// Check if current user is president of this state
	const isPresident = presidentData?.userId === locals.account?.id;
	const firstPresidentDetail = isPresident && accountId ? await takeFirstTimeDetail(db, accountId, "president") : false;

	const hasActiveVisa = !!userActiveVisa && new Date(userActiveVisa.expiresAt) > new Date();

	const {
		isResident,
		userResidenceBloc,
		canApplyForResidence,
		hasPendingResidenceApp,
		userCurrentRegionName,
		visaBlockedReason
	} = residenceInfo;

	// Check bloc visa-free override
	let blocVisaFree = false;
	if (
		!isResident &&
		userResidenceBloc &&
		state.blocId &&
		userResidenceBloc.id === state.blocId &&
		userResidenceBloc.visaFreeForMembers
	) {
		blocVisaFree = true;
	}

	return {
		warHistory: await warsOfState(db, stateId),
		state: {
			id: state.id,
			name: state.name,
			logo: stateLogo,
			background: state.background,
			description: state.description,
			population: actualPopulation,
			rating: state.rating,
			martialLawUntil: state.martialLawUntil?.toISOString() ?? null,
			createdAt: state.createdAt
		},
		editForm: editFormData.editForm,
		editOnCooldown: editFormData.onCooldown,
		editCooldownEndsAt: editFormData.cooldownEndsAt,
		walletBalance,
		visa: {
			isResident,
			visaRequired: visaSettings?.visaRequired ?? false,
			visaCost: visaSettings ? Number(visaSettings.visaCost) : 5000,
			visaTaxRate: visaSettings?.visaTaxRate ?? 20,
			autoApprove: visaSettings?.autoApprove ?? true,
			hasActiveVisa,
			activeVisa: userActiveVisa
				? {
						expiresAt: userActiveVisa.expiresAt.toISOString(),
						cost: Number(userActiveVisa.cost)
					}
				: null,
			blocVisaFree,
			blockedReason: visaBlockedReason
		},
		bloc: state.blocId
			? {
					id: state.blocId,
					name: state.blocName,
					logo: blocLogo,
					color: state.blocColor,
					description: state.blocDescription,
					createdAt: state.blocCreatedAt
				}
			: null,
		president: presidentData
			? {
					userId: presidentData.userId,
					name: presidentData.profileName,
					logo: presidentLogo,
					electedAt: presidentData.electedAt,
					term: presidentData.term,
					partyAbbreviation: partyByUserId.get(presidentData.userId)?.abbreviation ?? null,
					partyColor: partyByUserId.get(presidentData.userId)?.color ?? null
				}
			: null,
		ministers: stateMinistersRaw.map((minister, i) => ({
			userId: minister.userId,
			name: minister.profileName,
			logo: ministerLogos[i],
			ministry: minister.ministry,
			appointedAt: minister.appointedAt,
			partyAbbreviation: partyByUserId.get(minister.userId)?.abbreviation ?? null,
			partyColor: partyByUserId.get(minister.userId)?.color ?? null
		})),
		parliamentMembers: parliamentMembersWithLogos,
		regions: stateRegions.map((region) => ({
			id: region.id,
			name: getRegionName(region.id),
			logo: regionCoatUrl(region.id),
			rating: region.rating,
			population: region.population || 0
		})),
		resources: {
			oil: stateRegions.reduce((sum, r) => sum + (r.oil || 0), 0),
			steel: stateRegions.reduce((sum, r) => sum + (r.steel || 0), 0),
			chromium: stateRegions.reduce((sum, r) => sum + (r.chromium || 0), 0),
			tungsten: stateRegions.reduce((sum, r) => sum + (r.tungsten || 0), 0),
			rubber: stateRegions.reduce((sum, r) => sum + (r.rubber || 0), 0),
			aluminium: stateRegions.reduce((sum, r) => sum + (r.aluminium || 0), 0)
		},
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
			taxType: tax.taxType,
			taxRate: tax.taxRate,
			implementedAt: tax.implementedAt
		})),
		energy: liveEnergy
			? {
					totalProduction: liveEnergy.totalProduction,
					usedProduction: liveEnergy.usedProduction,
					available: liveEnergy.totalProduction - liveEnergy.usedProduction,
					gridDegraded: liveEnergy.gridDegraded
				}
			: null,
		covertEffects,
		civilians,
		ihl,
		debt,
		power: powerReport.focus,
		powerRanking: powerReport.ranking,
		gdp: gdpReport,
		creditors,
		stancesAbout,
		stancesHeld,
		bailoutHistory,
		bailoutDonor: donor,
		bailoutMinimum: ECONOMY_CONFIG.BAILOUT_MIN_AMOUNT,
		firstPresidentDetail,
		powerPlants: plants.length,
		isPresident,
		isForeignMinister,
		// This state's own foreign minister (isForeignMinister is another state's).
		isOwnEconomyMinister:
			!!accountId && stateMinistersRaw.some((m) => m.userId === accountId && m.ministry === "economy"),
		isOwnForeignMinister:
			!!accountId && stateMinistersRaw.some((m) => m.userId === accountId && m.ministry === "foreign_affairs"),
		canDeclareWar,
		activeWars,
		residencePermit: {
			canApply: canApplyForResidence,
			// Officials are approved on the spot, so they always get the button.
			hasPendingApp:
				hasPendingResidenceApp &&
				!isPresident &&
				!(!!accountId && stateMinistersRaw.some((m) => m.userId === accountId)),
			currentRegionName: userCurrentRegionName
		}
	};
};

export const actions: Actions = {
	updateState: async ({ request, params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const form = await superValidate(request, valibot(editStateSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

		if (!state) {
			return message(form, "State not found", { status: 404 });
		}

		const [presidency] = await db.select().from(presidents).where(eq(presidents.stateId, stateId)).limit(1);

		if (!presidency || presidency.userId !== account.id) {
			return message(form, "Only the state president can edit the state", { status: 403 });
		}

		const [cooldown] = await db
			.select()
			.from(stateEditCooldowns)
			.where(eq(stateEditCooldowns.userId, account.id))
			.limit(1);

		const now = new Date();
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastEditAt.getTime() + 24 * 60 * 60 * 1000);
			if (now < cooldownEnd) {
				const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
				return message(form, `Please wait ${hoursLeft} hours before editing the state again`, {
					status: 429
				});
			}
		}

		const { name, background, logo } = form.data;

		try {
			let logoFileId: number | null = state.logo;

			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

				const [fileRecord] = await db
					.insert(files)
					.values({
						key: logoUploadResult.key,
						fileName: logo.name,
						contentType: "image/webp",
						sizeBytes: logo.size,
						uploadedBy: account.id
					})
					.returning();
				logoFileId = fileRecord.id;
			}

			await db.transaction(async (tx) => {
				await tx
					.update(states)
					.set({
						name,
						background,
						logo: logoFileId
					})
					.where(eq(states.id, stateId));

				await tx
					.insert(stateEditCooldowns)
					.values({
						userId: account.id,
						lastEditAt: now
					})
					.onConflictDoUpdate({
						target: stateEditCooldowns.userId,
						set: { lastEditAt: now }
					});
			});

			return message(form, "State updated successfully");
		} catch (e) {
			console.error("Error updating state:", e);
			return message(form, "Failed to update state", { status: 500 });
		}
	},

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
	},

	bailout: async ({ request, params, locals }) => {
		const account = locals.account!;
		const recipientStateId = parseInt(params.id);
		const donor = await bailoutAuthority(account.id, recipientStateId);
		if (!donor) return fail(403, { error: "Only a president or economy minister of another state can bail it out." });

		const formData = await request.formData();
		const amount = Number(formData.get("amount"));
		try {
			const result = await bailoutState(db, {
				donorStateId: donor.stateId,
				recipientStateId,
				amount,
				authorizedBy: account.id
			});
			return {
				success: true,
				message: `Bailout sent: ${result.amount.toLocaleString()} transferred, ${result.debtRelieved.toLocaleString()} of debt cleared. Civilians now see ${donor.name} more favourably.`
			};
		} catch (err) {
			if (err instanceof BailoutError) return fail(400, { error: err.message });
			throw err;
		}
	},

	declareWar: async ({ params, locals }) => {
		const account = locals.account!;
		const targetStateId = parseInt(params.id);

		// Verify user is a president
		const [presidency] = await db
			.select({
				stateId: presidents.stateId,
				stateBlocId: states.blocId
			})
			.from(presidents)
			.leftJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { message: "Only presidents can declare war" });
		}

		try {
			const { warId } = await declareWar(db, {
				attackerStateId: presidency.stateId,
				targetStateId,
				declaredBy: account.id
			});
			return { success: true, message: "War declared!", warId };
		} catch (err) {
			if (err instanceof WarDeclarationError) return fail(400, { message: err.message, error: err.message });
			throw err;
		}
	},

	purchaseVisa: async ({ params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		const residence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: { state: { with: { bloc: true } } }
				}
			}
		});

		if (residence?.region.stateId === stateId) {
			return fail(400, { error: "You are already a resident of this state" });
		}

		// Block visa if at war or sanctioned
		if (residence?.region.stateId) {
			const userStateId = residence.region.stateId;
			const userBlocId = residence.region.state?.blocId ?? null;

			const warBlock = await db.query.wars.findFirst({
				where: and(
					eq(wars.status, "active"),
					or(
						and(eq(wars.attackerId, userStateId), eq(wars.defenderId, stateId)),
						and(eq(wars.attackerId, stateId), eq(wars.defenderId, userStateId)),
						...(userBlocId
							? [
									and(eq(wars.attackerBlocId, userBlocId), eq(wars.defenderId, stateId)),
									and(eq(wars.attackerId, stateId), eq(wars.defenderBlocId, userBlocId))
								]
							: [])
					)
				)
			});

			if (warBlock) {
				return fail(400, { error: "Cannot apply for visa — your state is at war with this state" });
			}

			const sanctionBlock = await db.query.stateSanctions.findFirst({
				where: and(
					eq(stateSanctions.sanctioningStateId, stateId),
					eq(stateSanctions.targetStateId, userStateId),
					eq(stateSanctions.isActive, true)
				)
			});

			if (sanctionBlock) {
				return fail(400, { error: "Cannot apply for visa — this state has sanctioned your state" });
			}
		}

		let visaSettingsData = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		if (!visaSettingsData) {
			[visaSettingsData] = await db
				.insert(stateVisaSettings)
				.values({
					stateId,
					visaRequired: false,
					visaCost: 5000,
					visaTaxRate: 20,
					autoApprove: true
				})
				.returning();
		}

		if (!visaSettingsData.visaRequired) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 14);

			await db.insert(userVisas).values({
				userId: account.id,
				stateId,
				status: "active",
				expiresAt,
				cost: 0,
				taxPaid: 0,
				approvedAt: new Date()
			});

			return { success: true, message: "Free visa granted for open borders state" };
		}

		const existingVisa = await db.query.userVisas.findFirst({
			where: and(eq(userVisas.userId, account.id), eq(userVisas.stateId, stateId), eq(userVisas.status, "active"))
		});

		if (existingVisa && new Date(existingVisa.expiresAt) > new Date()) {
			return fail(400, { error: "You already have an active visa for this state" });
		}

		const pendingApp = await db.query.visaApplications.findFirst({
			where: and(
				eq(visaApplications.userId, account.id),
				eq(visaApplications.stateId, stateId),
				eq(visaApplications.status, "pending")
			)
		});

		if (pendingApp) {
			return fail(400, { error: "You already have a pending visa application" });
		}

		if (!visaSettingsData.autoApprove) {
			await db.insert(visaApplications).values({
				userId: account.id,
				stateId,
				status: "pending",
				purpose: "Visit and work"
			});

			return { success: true, message: "Visa application submitted for review by Foreign Minister" };
		}

		const visaCost = Number(visaSettingsData.visaCost);
		const taxRate = visaSettingsData.visaTaxRate;
		const taxAmount = Math.floor(visaCost * (taxRate / 100));

		// Starter wallet for accounts that never had one.
		await db
			.insert(userWallets)
			.values({ userId: account.id, balance: 10000 })
			.onConflictDoNothing({ target: userWallets.userId });

		try {
			await db.transaction(async (tx) => {
				await debitWallet(tx, account.id, visaCost);
				await creditTreasury(tx, stateId, taxAmount);

				const expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + 14);

				await tx.insert(userVisas).values({
					userId: account.id,
					stateId,
					status: "active",
					expiresAt,
					cost: visaCost,
					taxPaid: taxAmount,
					approvedAt: new Date()
				});
			});
		} catch (err) {
			if (err instanceof InsufficientFundsError) {
				return fail(400, { error: `Insufficient funds. You need $${visaCost.toLocaleString()}.` });
			}
			throw err;
		}

		return {
			success: true,
			message: `Visa purchased for $${visaCost.toLocaleString()} (tax: $${taxAmount.toLocaleString()})`
		};
	},

	applyResidence: async ({ params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Get user's residence with region info
		const userRes = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: { with: { state: true } },
				homeRegion: { with: { state: true } }
			}
		});

		if (!userRes) {
			return fail(400, { error: "You must have a residence to apply" });
		}

		// Must be physically in a region of this state
		if (userRes.region.stateId !== stateId) {
			return fail(400, { error: "You must be physically present in this state to apply for residence" });
		}

		// Home region must NOT already be in this state
		if (userRes.homeRegion?.stateId === stateId) {
			return fail(400, { error: "You are already a citizen of this state" });
		}

		// The state's own government needs no permit from itself: the president
		// and its ministers are approved right away.
		const [presidency, ministry] = await Promise.all([
			db.query.presidents.findFirst({
				where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
			}),
			db.query.ministers.findFirst({
				where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId))
			})
		]);
		if (presidency || ministry) {
			await db.transaction(async (tx) => {
				await tx
					.update(residences)
					.set({ homeRegionId: userRes.regionId, homeRegionChangedAt: new Date() })
					.where(eq(residences.userId, account.id));
				await tx
					.update(residenceApplications)
					.set({ status: "approved", reviewedAt: new Date(), reviewedBy: account.id })
					.where(
						and(
							eq(residenceApplications.userId, account.id),
							eq(residenceApplications.status, "pending"),
							inArray(
								residenceApplications.regionId,
								tx.select({ id: regions.id }).from(regions).where(eq(regions.stateId, stateId))
							)
						)
					);
			});
			return {
				success: true,
				message: `As ${presidency ? "president" : "a minister"}, you are now a citizen of this state.`
			};
		}

		// One pending application per state (checked against this state's
		// regions, not whichever pending application happens to come first).
		if (await pendingApplicationIn(account.id, stateId)) {
			return fail(400, { error: "You already have a pending residence application for this state" });
		}

		await db.insert(residenceApplications).values({
			userId: account.id,
			regionId: userRes.regionId,
			status: "pending"
		});

		return {
			success: true,
			message: "Residence permit application submitted. It will be reviewed by the government."
		};
	}
};
