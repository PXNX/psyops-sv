// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { debitWallet, InsufficientFundsError } from "#lib/server/money.js";
import { db } from "#lib/server/db.js";
import {
	regions,
	residences,
	governors,
	factories,
	userVisas,
	stateVisaSettings,
	visaApplications,
	userWallets,
	stateTreasury,
	residenceApplications,
	parliamentaryElections,
	battles,
	wars,
	presidents,
	userTravels,
	stateBuildings,
	files,
	stateSanctions,
	partyMembers,
	politicalParties
} from "#lib/server/schema.js";
import { eq, and, sql, or, desc, gt, isNotNull, inArray } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getRegionName } from "#lib/utils/formatting.js";
import { getContext } from "#lib/server/context.js";
import { getSignedDownloadUrl, getLogoUrl } from "#lib/server/backblaze.js";
import { completePendingConstructions } from "#lib/server/services/politics/construction.service.js";

import { checkEntry } from "#lib/server/services/politics/entry.js";
import { battlesInRegion } from "#lib/server/services/military/history.js";
import {
	ReconError,
	launchRecon,
	picturesByRegion,
	isFresh,
	reconOptions,
	resolveReconMissions,
	sideReports
} from "#lib/server/services/military/recon.js";
import { imageryInputs } from "#lib/server/services/military/imagery.js";
import { militaryUnits } from "#lib/server/schema.js";
import {
	regionConditions,
	regionTerrain,
	type SensorId,
	SENSOR_IDS,
	TARGETS,
	WEAPONS,
	EFFECT_LABEL,
	regionPopulation,
	regionDensity,
	civilianLabour,
	labourShare,
	CIVILIAN_NEEDS,
	NEED_META,
	type StrikeTarget,
	type StrikeWeapon
} from "#lib/config/index.js";
import {
	StrikeError,
	activeEffects,
	launchStrike,
	strikeLog,
	strikeOptions
} from "#lib/server/services/military/strike.js";
import { regionCivilianNeeds } from "#lib/server/services/civilians/supply.js";
import { regionPopulationReport } from "#lib/server/services/population-report.js";
import { populationHistory } from "#lib/server/services/snapshot-history.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const regionId = parseInt(params.id);

	const regionService = getContext().services.region;
	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	// Only the region row and its buildings depend on pending constructions being
	// completed; everything else only needs the ids, so it runs concurrently.
	const [
		region,
		populationResult,
		activeTravel,
		userResidence,
		pendingResidenceApp,
		factoriesWithLogos,
		ongoingBattle,
		recentFailedBattle,
		borderingRegions,
		userWallet
	] = await Promise.all([
		// Finish any construction whose time has elapsed so the stats below (and
		// the "under construction" list) reflect the current state.
		completePendingConstructions(db, { regionId }).then(() =>
			// Get region with state; fail fast if it doesn't exist
			db.query.regions
				.findFirst({
					where: eq(regions.id, regionId),
					with: {
						state: {
							with: {
								bloc: true,
								president: {
									with: {
										user: true
									}
								}
							}
						},
						governor: {
							with: {
								user: {
									with: {
										profile: true
									}
								}
							}
						}
					}
				})
				.then((region) => region ?? error(404, "Region not found"))
		),
		// Get population
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(residences)
			.where(eq(residences.regionId, regionId)),
		// Check for active travel
		db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		}),
		// Get user's current residence
		db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: { state: { with: { bloc: true } } }
				},
				homeRegion: {
					with: { state: { with: { bloc: true } } }
				}
			}
		}),
		// Check for pending residence application
		db.query.residenceApplications.findFirst({
			where: and(
				eq(residenceApplications.userId, account.id),
				eq(residenceApplications.regionId, regionId),
				eq(residenceApplications.status, "pending")
			)
		}),
		// Get factories and resolve their company logos
		db.query.factories
			.findMany({
				where: eq(factories.regionId, regionId),
				with: { company: true },
				limit: 10
			})
			.then((regionFactories) =>
				Promise.all(
					regionFactories.map(async (factory) => {
						let companyLogoUrl: string | null = null;
						if (factory.company?.logo) {
							try {
								const logoFile = await db.query.files.findFirst({
									where: eq(files.id, factory.company.logo)
								});
								if (logoFile) {
									companyLogoUrl = await getSignedDownloadUrl(logoFile.key);
								}
							} catch {
								// ignore logo errors
							}
						}
						return { ...factory, companyLogoUrl };
					})
				)
			),
		// Check for ongoing battle
		db.query.battles.findFirst({
			where: and(eq(battles.regionId, regionId), eq(battles.status, "ongoing")),
			with: {
				war: {
					with: {
						attacker: true,
						defender: true
					}
				},
				attackerState: true,
				defenderState: true
			}
		}),
		// Check for recent failed conquest (24-hour cooldown)
		// A failed conquest is when the defender won
		db.query.battles.findFirst({
			where: and(
				eq(battles.regionId, regionId),
				eq(battles.status, "defender_won"),
				isNotNull(battles.endedAt),
				gt(battles.endedAt, twentyFourHoursAgo)
			),
			orderBy: [desc(battles.endedAt)]
		}),
		// Get bordering regions with state information
		regionService.getBorderingRegions(regionId).then((borderingRegionsData) =>
			Promise.all(
				borderingRegionsData.map(async (border) => {
					const [borderRegion, popResult] = await Promise.all([
						db.query.regions.findFirst({
							where: eq(regions.id, border.id),
							with: {
								state: true
							}
						}),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(residences)
							.where(eq(residences.regionId, border.id))
					]);

					if (!borderRegion) return null;

					return {
						id: borderRegion.id,
						name: getRegionName(borderRegion.id),
						distanceKm: Math.round(border.distanceKm * 100) / 100,
						population: popResult[0]?.count || 0,
						stateId: borderRegion.stateId,
						stateName: borderRegion.state?.name || null,
						resources: {
							oil: borderRegion.oil || 0,
							steel: borderRegion.steel || 0,
							chromium: borderRegion.chromium || 0,
							tungsten: borderRegion.tungsten || 0,
							rubber: borderRegion.rubber || 0,
							aluminium: borderRegion.aluminium || 0
						}
					};
				})
			)
		),
		// Get user wallet balance for travel cost display
		db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		})
	]);

	const population = populationResult[0]?.count || 0;

	const hasResidence = userResidence?.regionId === regionId;

	// Get user's residence (citizenship) state — used for visa/immigration checks
	// This is the permanent home state, not where the user currently is
	let userResidenceState = null;
	if (userResidence) {
		userResidenceState = userResidence.homeRegion?.state ?? userResidence.region.state;
	}

	const validBorderingRegions = borderingRegions.filter((r) => r !== null);
	const walletBalance = userWallet ? Number(userWallet.balance) : 0;

	// Second wave: lookups that depend on the region / user residence.
	const [
		regionBuildings,
		travelInfo,
		visaInfo,
		visaBlockedReason,
		warInfo,
		rulingPartyColor,
		stateLogoUrl,
		borderingRegionIdsUnderAttackByUs,
		isInParty
	] = await Promise.all([
		// Get state buildings (after pending constructions were completed above)
		db.query.stateBuildings.findMany({
			where: eq(stateBuildings.regionId, regionId),
			orderBy: [desc(stateBuildings.createdAt)]
		}),
		// Calculate travel distance and cost if user has residence elsewhere
		(async () => {
			let travelInfo = null;
			if (userResidence && userResidence.regionId !== regionId) {
				const distance = await regionService.getDistanceBetweenRegions(userResidence.regionId, regionId);
				if (distance) {
					travelInfo = {
						distanceKm: Math.round(distance * 100) / 100,
						cost: regionService.calculateTravelCost(distance),
						timeHours: regionService.calculateTravelTime(distance)
					};
				}
			}
			return travelInfo;
		})(),
		// Inaugural election check + visa logic
		(async () => {
			// Check if state has had inaugural election
			let hasInauguralElection = false;
			if (region.stateId) {
				const inauguration = await db.query.parliamentaryElections.findFirst({
					where: and(eq(parliamentaryElections.stateId, region.stateId), eq(parliamentaryElections.isInaugural, true))
				});
				hasInauguralElection = !!inauguration;
			}

			let needsVisa = false;
			let hasActiveVisa = false;
			let hasPendingApplication = false;
			let visaSettings = null;
			let activeVisa = null;
			let blocVisaFree = false;

			if (region.stateId && userResidenceState?.id !== region.stateId && hasInauguralElection) {
				// Check bloc visa-free override: if user's residence (citizenship) state and
				// destination state are in the same bloc with visaFreeForMembers enabled, no visa needed
				const userHomeState = userResidence?.homeRegion?.state;
				if (userHomeState?.blocId && region.state?.blocId) {
					const userBloc = userHomeState.bloc;
					if (userHomeState.blocId === region.state.blocId && userBloc && userBloc.visaFreeForMembers) {
						blocVisaFree = true;
					}
				}

				if (!blocVisaFree) {
					needsVisa = true;
				}

				let pendingApp;
				[visaSettings, activeVisa, pendingApp] = await Promise.all([
					db.query.stateVisaSettings.findFirst({
						where: eq(stateVisaSettings.stateId, region.stateId)
					}),
					db.query.userVisas.findFirst({
						where: and(
							eq(userVisas.userId, account.id),
							eq(userVisas.stateId, region.stateId),
							eq(userVisas.status, "active")
						)
					}),
					db.query.visaApplications.findFirst({
						where: and(
							eq(visaApplications.userId, account.id),
							eq(visaApplications.stateId, region.stateId),
							eq(visaApplications.status, "pending")
						)
					})
				]);

				hasActiveVisa = !!activeVisa && new Date(activeVisa.expiresAt) > new Date();
				hasPendingApplication = !!pendingApp;
			}

			return {
				hasInauguralElection,
				needsVisa,
				hasActiveVisa,
				hasPendingApplication,
				visaSettings,
				activeVisa,
				blocVisaFree
			};
		})(),
		// Check if visa is blocked by war or sanctions (based on residence/citizenship state)
		(async () => {
			let visaBlockedReason: string | null = null;
			if (region.stateId && userResidenceState?.id && userResidenceState.id !== region.stateId) {
				const userStateId = userResidenceState.id;
				const userBlocId = userResidence?.homeRegion?.state?.blocId ?? null;
				const destStateId = region.stateId;

				const [warAgainstDest, sanctionAgainstUser] = await Promise.all([
					// Check active wars: user's state (or bloc) vs destination state
					db.query.wars.findFirst({
						where: and(
							eq(wars.status, "active"),
							or(
								and(eq(wars.attackerId, userStateId), eq(wars.defenderId, destStateId)),
								and(eq(wars.attackerId, destStateId), eq(wars.defenderId, userStateId)),
								...(userBlocId
									? [
											and(eq(wars.attackerBlocId, userBlocId), eq(wars.defenderId, destStateId)),
											and(eq(wars.attackerId, destStateId), eq(wars.defenderBlocId, userBlocId))
										]
									: [])
							)
						)
					}),
					// Check sanctions: destination state has sanctioned user's state
					db.query.stateSanctions.findFirst({
						where: and(
							eq(stateSanctions.sanctioningStateId, destStateId),
							eq(stateSanctions.targetStateId, userStateId),
							eq(stateSanctions.isActive, true)
						)
					})
				]);

				if (warAgainstDest) {
					visaBlockedReason = "Your state is at war with this state";
				} else if (sanctionAgainstUser) {
					visaBlockedReason = "This state has sanctioned your state";
				}
			}
			return visaBlockedReason;
		})(),
		// Check for active wars
		(async () => {
			let activeWars: any[] = [];
			let attackableWars: any[] = [];
			let borderingRegionsForAttack: any[] = [];

			if (region?.stateId) {
				activeWars = await db.query.wars.findMany({
					where: and(
						eq(wars.status, "active"),
						or(
							eq(wars.defenderId, region.stateId),
							region.state?.blocId ? eq(wars.defenderBlocId, region.state.blocId) : sql`false`
						)
					),
					with: {
						attacker: true,
						defender: true
					}
				});

				// Check if user is president and can attack
				if (userResidence?.region.stateId && activeWars.length > 0) {
					const isPresident = await db.query.presidents.findFirst({
						where: and(eq(presidents.userId, account.id), eq(presidents.stateId, userResidence.region.stateId))
					});

					if (isPresident) {
						const presidentStateId = userResidence.region.stateId;
						const presidentBlocId = userResidence.region.state?.blocId ?? null;

						// Only wars where the president's own state (or bloc) is the attacker
						attackableWars = activeWars.filter(
							(war) =>
								war.attackerId === presidentStateId ||
								(presidentBlocId !== null && war.attackerBlocId === presidentBlocId)
						);

						if (attackableWars.length > 0) {
							borderingRegionsForAttack = await regionService.getStateBorderingRegions(presidentStateId, regionId);
						}
					}
				}
			}

			return { activeWars, attackableWars, borderingRegionsForAttack };
		})(),
		// Ruling party color of the region's state (the president's party), used to
		// tint the hero background — mirrors the same mechanism on the state page.
		(async () => {
			const presidentUserId = region.state?.president?.userId;
			if (!presidentUserId) return null;

			const [membership] = await db
				.select({ color: politicalParties.color })
				.from(partyMembers)
				.innerJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
				.where(eq(partyMembers.userId, presidentUserId))
				.limit(1);

			return membership?.color ?? null;
		})(),
		getLogoUrl(region.state?.logo),
		// Bordering regions this region's state is currently attacking, so the
		// bordering-regions list can flag "attack underway" without putting the
		// alarm outline on this region itself (it isn't the one under attack).
		(async () => {
			if (!region.stateId || validBorderingRegions.length === 0) return new Set<number>();

			const attacks = await db.query.battles.findMany({
				where: and(
					inArray(
						battles.regionId,
						validBorderingRegions.map((r) => r.id)
					),
					eq(battles.status, "ongoing"),
					eq(battles.attackerStateId, region.stateId)
				)
			});

			return new Set(attacks.map((b) => b.regionId));
		})(),
		db.query.partyMembers.findFirst({ where: eq(partyMembers.userId, account.id) }).then((m) => !!m)
	]);

	const {
		hasInauguralElection,
		needsVisa,
		hasActiveVisa,
		hasPendingApplication,
		visaSettings,
		activeVisa,
		blocVisaFree
	} = visaInfo;
	const allowsFreeMovement = !region.stateId || !hasInauguralElection;
	const { activeWars, attackableWars, borderingRegionsForAttack } = warInfo;

	// Reconnaissance: file any passes that have landed, then what the viewer's
	// side knows about forces here. Hostile units are only shown through
	// fresh intel (fog of war); your side's own units are always visible.
	await resolveReconMissions(db).catch((err) => console.error("Recon resolve failed:", err));
	const recon = await reconOptions(db, account.id, regionId);
	const sideStateIds = recon.side?.stateIds ?? [];
	const [friendlyUnits, picture, imagery] = await Promise.all([
		sideStateIds.length
			? db
					.select({ unitType: militaryUnits.unitType, ownerId: militaryUnits.ownerId, stateId: militaryUnits.stateId })
					.from(militaryUnits)
					.where(
						and(
							eq(militaryUnits.regionId, regionId),
							inArray(militaryUnits.stateId, sideStateIds),
							sql`${militaryUnits.health} > 0`
						)
					)
			: Promise.resolve([]),
		sideStateIds.length
			? picturesByRegion(db, sideStateIds, { regionIds: [regionId] }).then((m) => m.get(regionId) ?? null)
			: Promise.resolve(null),
		// Recon imagery: the side's latest passes over this region.
		sideReports(db, sideStateIds, { regionIds: [regionId], limit: 8 }).then(async (rs) => {
			const inputs = await imageryInputs(db, rs);
			return inputs.map((input, i) => ({ input, fresh: isFresh(rs[i]!), regionName: getRegionName(regionId) }));
		})
	]);
	const friendlyByType = new Map<string, { count: number; mine: number }>();
	for (const u of friendlyUnits) {
		const e = friendlyByType.get(u.unitType) ?? { count: 0, mine: 0 };
		e.count++;
		if (u.ownerId === account.id) e.mine++;
		friendlyByType.set(u.unitType, e);
	}
	const isHostileRegion = !!region.stateId && !!recon.side && !sideStateIds.includes(region.stateId);
	// Fog of war: an enemy's installations (a region your side can recon, i.e.
	// one you're at war with) are only known through a fresh pass that saw them.
	const hiddenBuildings = isHostileRegion && !recon.targetReason;
	const seenBuildings = hiddenBuildings ? (picture?.buildings ?? null) : region;

	// Airstrikes: the planner for leaders of a state at war with this region's
	// owner, the strikes logged here, and the effects still working on it.
	const [strikePlan, strikes, effects] = await Promise.all([
		isHostileRegion ? strikeOptions(db, account.id, regionId) : Promise.resolve(null),
		strikeLog(db, { regionId }, 15),
		activeEffects(db, [regionId])
	]);

	// What this region's civilians can actually get today: food from the land
	// and imports, power and heat from the grid, water from the local supply.
	const [civilianNeeds, populationReport, populationTrend] = await Promise.all([
		regionCivilianNeeds(db, regionId),
		regionPopulationReport(db, regionId),
		populationHistory(regionId)
	]);

	const result = {
		strike: {
			// Only offered to someone who could order it (a leader at war with the owner).
			options: strikePlan && !strikePlan.reason ? strikePlan : null,
			log: strikes,
			effects: effects.map((e) => ({
				id: e.id,
				kind: e.kind,
				label: EFFECT_LABEL[e.kind],
				magnitude: e.magnitude,
				expiresAt: e.expiresAt.toISOString()
			}))
		},
		civilians: {
			population: regionPopulation(region),
			density: Math.round(regionDensity(region)),
			report: populationReport,
			trend: populationTrend.map((p) => p.value),
			// The share of people who can work a company shift is set by the
			// region's education level (schools/universities).
			workforce: {
				available: civilianLabour(regionPopulation(region), region.education ?? 0),
				share: labourShare(region.education ?? 0),
				education: region.education ?? 0
			}
		},
		civilianNeeds: civilianNeeds
			? {
					hardship: civilianNeeds.hardship,
					shortages: civilianNeeds.shortages,
					reasons: civilianNeeds.reasons,
					supplies: CIVILIAN_NEEDS.map((key) => ({
						key,
						label: NEED_META[key].label,
						icon: NEED_META[key].icon,
						demand: civilianNeeds[key].demand,
						capacity: civilianNeeds[key].capacity,
						sufficiency: civilianNeeds[key].sufficiency
					}))
				}
			: null,
		situation: {
			conditions: regionConditions(region),
			isHostileRegion,
			friendly: [...friendlyByType].map(([unitType, e]) => ({ unitType, ...e })),
			picture,
			imagery,
			recon: {
				canTarget: !recon.targetReason,
				targetReason: recon.targetReason,
				sensors: recon.sensors,
				inFlight: recon.inFlight
			}
		},
		region: {
			id: region.id,
			name: getRegionName(region.id),
			rating: region.rating,
			infrastructure: seenBuildings ? (seenBuildings.infrastructure ?? 0) : null,
			economy: seenBuildings ? (seenBuildings.economy ?? 0) : null,
			education: seenBuildings ? (seenBuildings.education ?? 0) : null,
			hospitals: seenBuildings ? (seenBuildings.hospitals ?? 0) : null,
			fortifications: seenBuildings ? (seenBuildings.fortifications ?? 0) : null,
			radar: seenBuildings ? (seenBuildings.radar ?? 0) : null,
			oil: region.oil,
			aluminium: region.aluminium,
			rubber: region.rubber,
			tungsten: region.tungsten,
			steel: region.steel,
			chromium: region.chromium,
			stateId: region.stateId,
			stateName: region.state?.name,
			stateLogo: stateLogoUrl
		},
		rulingPartyColor,
		population,
		hasResidence,
		hasPendingResidenceApp: !!pendingResidenceApp,
		isInParty,
		allowsFreeMovement,
		hasInauguralElection,
		battleHistory: await battlesInRegion(db, regionId),
		travelInfo,
		activeTravel: activeTravel
			? {
					toRegionId: activeTravel.toRegionId,
					arrivalTime: activeTravel.arrivalTime.toISOString(),
					distanceKm: activeTravel.distanceKm
				}
			: null,
		governor: region.governor
			? {
					userId: region.governor.userId,
					name: region.governor.user.profile?.name,
					logo: await getLogoUrl(region.governor.user.profile?.logo),
					appointedAt: region.governor.appointedAt
				}
			: null,
		factories: factoriesWithLogos,
		buildings: regionBuildings,
		visa: {
			needsVisa,
			hasActiveVisa,
			hasPendingApplication,
			settings: visaSettings,
			activeVisa: activeVisa
				? {
						expiresAt: activeVisa.expiresAt.toISOString(),
						cost: Number(activeVisa.cost),
						taxPaid: Number(activeVisa.taxPaid)
					}
				: null,
			blocVisaFree,
			blockedReason: visaBlockedReason
		},
		// Whether the viewer could travel here right now, and why not.
		entry: await checkEntry(db, account.id, region.stateId),
		activeWars,
		attackableWars,
		borderingRegionsForAttack,
		ongoingBattle,
		recentFailedBattle: recentFailedBattle
			? {
					id: recentFailedBattle.id,
					endedAt: recentFailedBattle.endedAt?.toISOString(),
					cooldownEndsAt: new Date(recentFailedBattle.endedAt!.getTime() + 24 * 60 * 60 * 1000).toISOString()
				}
			: null,
		borderingRegions: validBorderingRegions.map((r) => ({
			...r,
			underAttackByUs: borderingRegionIdsUnderAttackByUs.has(r.id)
		})),
		walletBalance
	};

	return result;
};

export const actions: Actions = {
	launchStrike: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const target = String(formData.get("target") ?? "") as StrikeTarget;
		const weapon = String(formData.get("weapon") ?? "") as StrikeWeapon;
		if (!TARGETS[target] || !WEAPONS[weapon]) return fail(400, { error: "Choose a target and a weapon." });
		try {
			const { strike, violations } = await launchStrike(db, {
				userId: locals.account!.id,
				regionId: parseInt(params.id),
				target,
				weapon
			});
			const d = strike.damage;
			const summary = [
				...Object.entries(d.levels ?? {}).map(
					([stat, n]) => `${n} ${stat === "economy" ? "power" : stat} level${n === 1 ? "" : "s"} destroyed`
				),
				...(d.effect
					? [`${EFFECT_LABEL[d.effect.kind as keyof typeof EFFECT_LABEL]} −${Math.round(d.effect.magnitude * 100)}%`]
					: []),
				...(d.units ?? []).map((u) => `${u.name} −${u.damage}${u.destroyed ? " (destroyed)" : ""}`),
				...(d.aircraftLost ? [`${d.aircraftLost.name} hit by air defence`] : []),
				...(d.reparations ? [`$${d.reparations.toLocaleString("en-US")} reparations paid`] : [])
			];
			return {
				success: true,
				strikeResult: {
					id: strike.id,
					outcome: strike.outcome,
					civilianCasualties: strike.civilianCasualties,
					expectedCasualties: strike.expectedCasualties,
					cost: strike.cost,
					summary,
					violations
				}
			};
		} catch (err) {
			if (err instanceof StrikeError) return fail(400, { error: err.message });
			throw err;
		}
	},
	launchRecon: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const sensor = String(formData.get("sensor") ?? "") as SensorId;
		if (!SENSOR_IDS.includes(sensor)) return fail(400, { error: "Choose a sensor." });
		try {
			await launchRecon(db, { userId: locals.account!.id, regionId: parseInt(params.id), sensor });
		} catch (err) {
			if (err instanceof ReconError) return fail(400, { error: err.message });
			throw err;
		}
		return { success: true, recon: true };
	},
	startTravel: async ({ params, locals }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);

		// Check if user already has active travel
		const existingTravel = await db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		});

		if (existingTravel) {
			return fail(400, { error: "You are already traveling" });
		}

		const targetRegion = await db.query.regions.findFirst({
			where: eq(regions.id, regionId),
			with: { state: true }
		});

		if (!targetRegion) {
			return fail(404, { error: "Region not found" });
		}

		// Borders, visas, wars and sanctions decide who gets in.
		const entry = await checkEntry(db, account.id, targetRegion.stateId);
		if (!entry.allowed) return fail(403, { error: entry.reason });

		const currentResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		});

		if (!currentResidence) {
			return fail(400, { error: "You must have a residence to travel" });
		}

		if (currentResidence.regionId === regionId) {
			return fail(400, { error: "You already live in this region" });
		}

		// Calculate travel distance and cost
		const regionService = getContext().services.region;
		const distance = await regionService.getDistanceBetweenRegions(currentResidence.regionId, regionId);

		if (!distance) {
			return fail(400, { error: "Unable to calculate travel distance" });
		}

		const cost = regionService.calculateTravelCost(distance);
		const travelTimeHours = regionService.calculateTravelTime(distance);

		// Check wallet
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!wallet || Number(wallet.balance) < cost) {
			return fail(400, {
				error: `Insufficient funds. Travel costs $${cost.toLocaleString()} (${Math.round(distance)} km)`
			});
		}

		// Check for pending application if needed
		let hasInauguralElection = false;
		if (targetRegion.stateId) {
			const inauguration = await db.query.parliamentaryElections.findFirst({
				where: and(
					eq(parliamentaryElections.stateId, targetRegion.stateId),
					eq(parliamentaryElections.isInaugural, true)
				)
			});
			hasInauguralElection = !!inauguration;
		}

		// For established states, check if residence application exists
		let needsResidenceApplication = false;
		if (targetRegion.stateId && hasInauguralElection) {
			const pendingApp = await db.query.residenceApplications.findFirst({
				where: and(
					eq(residenceApplications.userId, account.id),
					eq(residenceApplications.regionId, regionId),
					eq(residenceApplications.status, "pending")
				)
			});

			if (pendingApp) {
				return fail(400, { error: "You already have a pending residence application for this region" });
			}

			needsResidenceApplication = true;
		}

		// Payment, application and travel commit together: a failed step must
		// never leave the fare paid without the journey (or the reverse).
		const departureTime = new Date();
		const arrivalTime = new Date(departureTime.getTime() + travelTimeHours * 60 * 60 * 1000);
		try {
			await db.transaction(async (tx) => {
				await debitWallet(tx, account.id, cost);

				if (needsResidenceApplication) {
					await tx.insert(residenceApplications).values({ userId: account.id, regionId, status: "pending" });
				}

				// Delete any old completed travel record (userId has UNIQUE constraint)
				await tx
					.delete(userTravels)
					.where(and(eq(userTravels.userId, account.id), eq(userTravels.status, "completed")));

				await tx.insert(userTravels).values({
					userId: account.id,
					fromRegionId: currentResidence.regionId,
					toRegionId: regionId,
					departureTime,
					arrivalTime,
					travelDuration: travelTimeHours,
					status: "in_progress",
					distanceKm: Math.round(distance)
				});
			});
		} catch (err) {
			if (err instanceof InsufficientFundsError) {
				return fail(400, {
					error: `Insufficient funds. Travel costs $${cost.toLocaleString()} (${Math.round(distance)} km)`
				});
			}
			throw err;
		}

		return {
			success: true,
			message: `Started traveling to ${getRegionName(regionId)}. Arrival in ${travelTimeHours} hour${travelTimeHours === 1 ? "" : "s"}.`
		};
	},

	purchaseVisa: async ({ params, request, locals }) => {
		const account = locals.account!;

		const region = await db.query.regions.findFirst({
			where: eq(regions.id, parseInt(params.id)),
			with: { state: true }
		});

		if (!region || !region.stateId) {
			return fail(400, { error: "Region has no state" });
		}

		const stateId = region.stateId;

		const inauguration = await db.query.parliamentaryElections.findFirst({
			where: and(eq(parliamentaryElections.stateId, stateId), eq(parliamentaryElections.isInaugural, true))
		});

		if (!inauguration) {
			return fail(400, { error: "This state has not held its inaugural election yet. Visas are not required." });
		}

		const residence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: { state: { with: { bloc: true } } }
				},
				homeRegion: {
					with: { state: { with: { bloc: true } } }
				}
			}
		});

		// Check citizenship (residence) state, not current region
		const citizenshipStateId = residence?.homeRegion?.stateId ?? residence?.region.stateId;
		if (citizenshipStateId === stateId) {
			return fail(400, { error: "You are already a citizen of this state" });
		}

		// Block visa if at war or sanctioned (based on citizenship state)
		if (citizenshipStateId) {
			const userStateId = citizenshipStateId;
			const userBlocId = residence?.homeRegion?.state?.blocId ?? residence?.region.state?.blocId ?? null;

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

		let visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		if (!visaSettings) {
			[visaSettings] = await db
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

		if (!visaSettings.visaRequired) {
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

			return {
				success: true,
				message: "Free visa granted for open borders state"
			};
		}

		const existingVisa = await db.query.userVisas.findFirst({
			where: and(eq(userVisas.userId, account.id), eq(userVisas.stateId, stateId), eq(userVisas.status, "active"))
		});

		if (existingVisa && new Date(existingVisa.expiresAt) > new Date()) {
			return fail(400, { error: "You already have an active visa for this state" });
		}

		const pendingApplication = await db.query.visaApplications.findFirst({
			where: and(
				eq(visaApplications.userId, account.id),
				eq(visaApplications.stateId, stateId),
				eq(visaApplications.status, "pending")
			)
		});

		if (pendingApplication) {
			return fail(400, { error: "You already have a pending visa application" });
		}

		if (!visaSettings.autoApprove) {
			await db.insert(visaApplications).values({
				userId: account.id,
				stateId,
				status: "pending",
				purpose: "Visit and work"
			});

			return {
				success: true,
				message: "Visa application submitted for review by Foreign Minister"
			};
		}

		const visaCost = Number(visaSettings.visaCost);
		const taxRate = visaSettings.visaTaxRate;
		const taxAmount = Math.floor(visaCost * (taxRate / 100));

		let wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!wallet) {
			[wallet] = await db
				.insert(userWallets)
				.values({
					userId: account.id,
					balance: 10000
				})
				.returning();
		}

		const walletBalance = Number(wallet.balance);

		if (walletBalance < visaCost) {
			return fail(400, {
				error: `Insufficient funds. Need $${visaCost.toLocaleString()}, have $${walletBalance.toLocaleString()}`
			});
		}

		await db
			.update(userWallets)
			.set({
				balance: walletBalance - visaCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		let treasury = await db.query.stateTreasury.findFirst({
			where: eq(stateTreasury.stateId, stateId)
		});

		if (!treasury) {
			[treasury] = await db
				.insert(stateTreasury)
				.values({
					stateId,
					balance: 0,
					totalCollected: 0,
					totalSpent: 0
				})
				.returning();
		}

		const treasuryBalance = Number(treasury.balance);
		const totalCollected = Number(treasury.totalCollected);

		await db
			.update(stateTreasury)
			.set({
				balance: treasuryBalance + taxAmount,
				totalCollected: totalCollected + taxAmount,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 14);

		await db.insert(userVisas).values({
			userId: account.id,
			stateId,
			status: "active",
			expiresAt,
			cost: visaCost,
			taxPaid: taxAmount,
			approvedAt: new Date()
		});

		return {
			success: true,
			message: `Visa purchased for $${visaCost.toLocaleString()} (tax: $${taxAmount.toLocaleString()})`
		};
	},

	startBattle: async ({ request, params, locals }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);
		const formData = await request.formData();
		const warId = parseInt(formData.get("warId") as string);
		const attackFromRegionId = parseInt(formData.get("attackFromRegionId") as string);

		// Prevent attacking from the same region as the target
		if (attackFromRegionId === regionId) {
			return fail(400, { error: "Cannot attack a region from itself" });
		}

		const war = await db.query.wars.findFirst({
			where: eq(wars.id, warId),
			with: {
				attacker: true,
				defender: true
			}
		});

		if (!war || war.status !== "active") {
			return fail(400, { error: "War is not active" });
		}

		const userResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: { with: { state: true } }
			}
		});

		if (!userResidence?.region.stateId) {
			return fail(403, { error: "No state residence found" });
		}

		const isPresident = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, userResidence.region.stateId))
		});

		if (!isPresident) {
			return fail(403, { error: "Only the president can start battles" });
		}

		const presidentStateId = userResidence.region.stateId;
		const presidentBlocId = userResidence.region.state?.blocId ?? null;

		// The caller's state (or bloc) must actually be the attacker in this war
		const isAttackerForThisWar =
			war.attackerId === presidentStateId || (presidentBlocId !== null && war.attackerBlocId === presidentBlocId);

		if (!isAttackerForThisWar) {
			return fail(403, { error: "Your state is not the attacker in this war" });
		}

		const attackingRegion = await db.query.regions.findFirst({
			where: eq(regions.id, attackFromRegionId)
		});

		if (attackingRegion?.stateId !== presidentStateId) {
			return fail(403, { error: "Selected region does not belong to your state" });
		}

		const regionService = getContext().services.region;
		const isAdjacent = await regionService.areRegionsAdjacent(attackFromRegionId, regionId);
		if (!isAdjacent) {
			return fail(400, { error: "Regions must be adjacent to start a battle" });
		}

		// Check for existing ongoing battle
		const existingBattle = await db.query.battles.findFirst({
			where: and(eq(battles.warId, warId), eq(battles.regionId, regionId), eq(battles.status, "ongoing"))
		});

		if (existingBattle) {
			return fail(400, { error: "Battle already ongoing" });
		}

		// Check for 24-hour cooldown after failed conquest
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentFailedBattle = await db.query.battles.findFirst({
			where: and(
				eq(battles.regionId, regionId),
				eq(battles.status, "defender_won"),
				isNotNull(battles.endedAt),
				gt(battles.endedAt, twentyFourHoursAgo)
			),
			orderBy: [desc(battles.endedAt)]
		});

		if (recentFailedBattle) {
			const cooldownEnds = new Date(recentFailedBattle.endedAt!.getTime() + 24 * 60 * 60 * 1000);
			const hoursRemaining = Math.ceil((cooldownEnds.getTime() - Date.now()) / (1000 * 60 * 60));
			return fail(400, {
				error: `This region successfully defended against an attack recently. You must wait ${hoursRemaining} more hour${hoursRemaining === 1 ? "" : "s"} before attacking again.`
			});
		}

		const region = await db.query.regions.findFirst({
			where: eq(regions.id, regionId),
			with: { state: true }
		});

		if (!region?.stateId) {
			return fail(400, { error: "Region has no defending state" });
		}

		// The region's state (or bloc) must actually be the defender in this war
		const isDefenderForThisWar =
			war.defenderId === region.stateId || (region.state?.blocId != null && war.defenderBlocId === region.state.blocId);

		if (!isDefenderForThisWar) {
			return fail(400, { error: "This region's state is not the defender in this war" });
		}

		await db.insert(battles).values({
			warId,
			regionId,
			terrain: regionTerrain(region) as typeof battles.$inferInsert.terrain,
			attackerStateId: presidentStateId,
			defenderStateId: region.stateId,
			startedBy: account.id
		});

		return { success: true, message: "Attack launched!" };
	}
};
