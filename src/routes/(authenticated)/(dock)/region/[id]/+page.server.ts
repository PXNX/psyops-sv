// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { db } from "$lib/server/db";
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
	stateSanctions
} from "$lib/server/schema";
import { eq, and, sql, or, desc, gt, isNotNull } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getRegionName } from "$lib/utils/formatting";
import { getContext } from "$lib/server/context";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const regionId = parseInt(params.id);

	// Get region with state
	const region = await db.query.regions.findFirst({
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
	});

	if (!region) {
		error(404, "Region not found");
	}

	// Get population
	const populationResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(residences)
		.where(eq(residences.regionId, regionId));

	const population = populationResult[0]?.count || 0;

	// Check for active travel
	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	// Get user's current residence
	const userResidence = await db.query.residences.findFirst({
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

	const hasResidence = userResidence?.regionId === regionId;

	// Calculate travel distance and cost if user has residence elsewhere
	const regionService = getContext().services.region;
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

	// Check for pending residence application
	const pendingResidenceApp = await db.query.residenceApplications.findFirst({
		where: and(
			eq(residenceApplications.userId, account.id),
			eq(residenceApplications.regionId, regionId),
			eq(residenceApplications.status, "pending")
		)
	});

	// Get user's residence (citizenship) state — used for visa/immigration checks
	// This is the permanent home state, not where the user currently is
	let userResidenceState = null;
	if (userResidence) {
		userResidenceState = userResidence.homeRegion?.state ?? userResidence.region.state;
	}

	// Check if state has had inaugural election
	let hasInauguralElection = false;
	if (region.stateId) {
		const inauguration = await db.query.parliamentaryElections.findFirst({
			where: and(eq(parliamentaryElections.stateId, region.stateId), eq(parliamentaryElections.isInaugural, true))
		});
		hasInauguralElection = !!inauguration;
	}

	const allowsFreeMovement = !region.stateId || !hasInauguralElection;

	// Visa logic
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
			if (
				userHomeState.blocId === region.state.blocId &&
				userBloc &&
				userBloc.visaFreeForMembers
			) {
				blocVisaFree = true;
			}
		}

		if (!blocVisaFree) {
			needsVisa = true;
		}

		visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, region.stateId)
		});

		activeVisa = await db.query.userVisas.findFirst({
			where: and(
				eq(userVisas.userId, account.id),
				eq(userVisas.stateId, region.stateId),
				eq(userVisas.status, "active")
			)
		});

		hasActiveVisa = !!activeVisa && new Date(activeVisa.expiresAt) > new Date();

		const pendingApp = await db.query.visaApplications.findFirst({
			where: and(
				eq(visaApplications.userId, account.id),
				eq(visaApplications.stateId, region.stateId),
				eq(visaApplications.status, "pending")
			)
		});

		hasPendingApplication = !!pendingApp;
		}

		// Check if visa is blocked by war or sanctions (based on residence/citizenship state)
		let visaBlockedReason: string | null = null;
		if (region.stateId && userResidenceState?.id && userResidenceState.id !== region.stateId) {
		const userStateId = userResidenceState.id;
		const userBlocId = userResidence?.homeRegion?.state?.blocId ?? null;
		const destStateId = region.stateId;

		// Check active wars: user's state (or bloc) vs destination state
		const warAgainstDest = await db.query.wars.findFirst({
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
		});

		if (warAgainstDest) {
			visaBlockedReason = "Your state is at war with this state";
		}

		// Check sanctions: destination state has sanctioned user's state
		if (!visaBlockedReason) {
			const sanctionAgainstUser = await db.query.stateSanctions.findFirst({
				where: and(
					eq(stateSanctions.sanctioningStateId, destStateId),
					eq(stateSanctions.targetStateId, userStateId),
					eq(stateSanctions.isActive, true)
				)
			});

			if (sanctionAgainstUser) {
				visaBlockedReason = "This state has sanctioned your state";
			}
		}
		}

		// Get factories
	const regionFactories = await db.query.factories.findMany({
		where: eq(factories.regionId, regionId),
		with: { company: true },
		limit: 10
	});

	// Get state buildings
	const regionBuildings = await db.query.stateBuildings.findMany({
		where: eq(stateBuildings.regionId, regionId),
		orderBy: [desc(stateBuildings.createdAt)]
	});

	// Check for active wars
	let activeWars: any[] = [];
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
				borderingRegionsForAttack = await regionService.getStateBorderingRegions(userResidence.region.stateId, regionId);
			}
		}
	}

	// Check for ongoing battle
	const ongoingBattle = await db.query.battles.findFirst({
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
	});

	// Check for recent failed conquest (24-hour cooldown)
	// A failed conquest is when the defender won
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

	// Get bordering regions with state information
	const borderingRegionsData = await regionService.getBorderingRegions(regionId);
	const borderingRegions = await Promise.all(
		borderingRegionsData.map(async (border) => {
			const borderRegion = await db.query.regions.findFirst({
				where: eq(regions.id, border.id),
				with: {
					state: true
				}
			});

			if (!borderRegion) return null;

			const popResult = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(residences)
				.where(eq(residences.regionId, border.id));

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
	);

	const validBorderingRegions = borderingRegions.filter((r) => r !== null);

	// Get user wallet balance for travel cost display
	const userWallet = await db.query.userWallets.findFirst({
		where: eq(userWallets.userId, account.id)
	});
	const walletBalance = userWallet ? Number(userWallet.balance) : 0;

	// Resolve company logos for factories
	const factoriesWithLogos = await Promise.all(
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
	);

	const result = {
		region: {
			id: region.id,
			name: getRegionName(region.id),
			rating: region.rating,
			infrastructure: region.infrastructure,
			economy: region.economy,
			education: region.education,
			hospitals: region.hospitals,
			fortifications: region.fortifications,
			oil: region.oil,
			aluminium: region.aluminium,
			rubber: region.rubber,
			tungsten: region.tungsten,
			steel: region.steel,
			chromium: region.chromium,
			stateId: region.stateId,
			stateName: region.state?.name,
			stateLogo: region.state?.logo
		},
		population,
		hasResidence,
		hasPendingResidenceApp: !!pendingResidenceApp,
		allowsFreeMovement,
		hasInauguralElection,
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
		activeWars,
		borderingRegionsForAttack,
		ongoingBattle,
		recentFailedBattle: recentFailedBattle
			? {
				id: recentFailedBattle.id,
				endedAt: recentFailedBattle.endedAt?.toISOString(),
				cooldownEndsAt: new Date(recentFailedBattle.endedAt!.getTime() + 24 * 60 * 60 * 1000).toISOString()
			}
			: null,
		borderingRegions: validBorderingRegions,
		walletBalance
	};

	console.log(JSON.stringify(result, null, 2));

	return result;
};

export const actions: Actions = {
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

			// Create residence application
			await db.insert(residenceApplications).values({
				userId: account.id,
				regionId: regionId,
				status: "pending"
			});
		}

		// Deduct cost from wallet
		await db
			.update(userWallets)
			.set({
				balance: Number(wallet.balance) - cost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		// Delete any old completed travel record (userId has UNIQUE constraint)
		await db.delete(userTravels).where(
			and(eq(userTravels.userId, account.id), eq(userTravels.status, "completed"))
		);

		// Create travel record
		const departureTime = new Date();
		const arrivalTime = new Date(departureTime.getTime() + travelTimeHours * 60 * 60 * 1000);

		await db.insert(userTravels).values({
			userId: account.id,
			fromRegionId: currentResidence.regionId,
			toRegionId: regionId,
			departureTime,
			arrivalTime,
			travelDuration: travelTimeHours,
			status: "in_progress",
			distanceKm: Math.round(distance)
		});

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

		const attackingRegion = await db.query.regions.findFirst({
			where: eq(regions.id, attackFromRegionId)
		});

		if (attackingRegion?.stateId !== userResidence.region.stateId) {
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
			where: eq(regions.id, regionId)
		});

		if (!region?.stateId) {
			return fail(400, { error: "Region has no defending state" });
		}

		await db.insert(battles).values({
			warId,
			regionId,
			attackerStateId: userResidence.region.stateId,
			defenderStateId: region.stateId,
			startedBy: account.id
		});

		return { success: true };
	}
};
