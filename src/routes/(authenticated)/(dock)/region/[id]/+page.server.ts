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
	userTravels
} from "$lib/server/schema";
import { eq, and, sql, or } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getRegionName } from "$lib/utils/formatting";
import {
	getBorderingRegions,
	areRegionsAdjacent,
	getBorderDistance,
	getStateBorderingRegions,
	getDistanceBetweenRegions,
	calculateTravelCost,
	calculateTravelTime
} from "$lib/utils/regionBorders";

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
				with: { state: true }
			}
		}
	});

	const hasResidence = userResidence?.regionId === regionId;

	// Calculate travel distance and cost if user has residence elsewhere
	let travelInfo = null;
	if (userResidence && userResidence.regionId !== regionId) {
		const distance = await getDistanceBetweenRegions(userResidence.regionId, regionId);
		if (distance) {
			travelInfo = {
				distanceKm: Math.round(distance * 100) / 100,
				cost: calculateTravelCost(distance),
				timeHours: calculateTravelTime(distance)
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

	// Get user's residence state
	let userResidenceState = null;
	if (userResidence) {
		userResidenceState = userResidence.region.state;
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

	if (region.stateId && userResidenceState?.id !== region.stateId && hasInauguralElection) {
		needsVisa = true;
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

	// Get factories
	const regionFactories = await db.query.factories.findMany({
		where: eq(factories.regionId, regionId),
		with: { company: true },
		limit: 10
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
				borderingRegionsForAttack = await getStateBorderingRegions(userResidence.region.stateId, regionId);
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

	// Get bordering regions with state information
	const borderingRegionsData = await getBorderingRegions(regionId);
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
		factories: regionFactories,
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
				: null
		},
		activeWars,
		borderingRegionsForAttack,
		ongoingBattle,
		borderingRegions: validBorderingRegions
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
		const distance = await getDistanceBetweenRegions(currentResidence.regionId, regionId);

		if (!distance) {
			return fail(400, { error: "Unable to calculate travel distance" });
		}

		const cost = calculateTravelCost(distance);
		const travelTimeHours = calculateTravelTime(distance);

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
					with: { state: true }
				}
			}
		});

		if (residence?.region.stateId === stateId) {
			return fail(400, { error: "You are already a resident of this state" });
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

		const isAdjacent = await areRegionsAdjacent(attackFromRegionId, regionId);
		if (!isAdjacent) {
			return fail(400, { error: "Regions must be adjacent to start a battle" });
		}

		const existingBattle = await db.query.battles.findFirst({
			where: and(eq(battles.warId, warId), eq(battles.regionId, regionId), eq(battles.status, "ongoing"))
		});

		if (existingBattle) {
			return fail(400, { error: "Battle already ongoing" });
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
