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
	parliamentaryElections
} from "$lib/server/schema";
import { eq, and, sql } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getRegionName } from "$lib/utils/formatting";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get region with state
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, parseInt(params.id)),
		with: {
			state: true,
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
		.where(eq(residences.regionId, parseInt(params.id)));

	const population = populationResult[0]?.count || 0;

	// Check if user has residence here
	const userResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	const hasResidence = userResidence?.regionId === parseInt(params.id);

	// Check for pending residence application
	const pendingResidenceApp = await db.query.residenceApplications.findFirst({
		where: and(
			eq(residenceApplications.userId, account.id),
			eq(residenceApplications.regionId, parseInt(params.id)),
			eq(residenceApplications.status, "pending")
		)
	});

	// Get user's residence state
	let userResidenceState = null;
	if (userResidence) {
		const userRegion = await db.query.regions.findFirst({
			where: eq(regions.id, userResidence.regionId),
			with: { state: true }
		});
		userResidenceState = userRegion?.state;
	}

	// Check if state has had inaugural election
	let hasInauguralElection = false;
	if (region.stateId) {
		const inauguration = await db.query.parliamentaryElections.findFirst({
			where: and(eq(parliamentaryElections.stateId, region.stateId), eq(parliamentaryElections.isInaugural, true))
		});
		hasInauguralElection = !!inauguration;
	}

	// Determine if this region allows free movement
	const allowsFreeMovement = !region.stateId || !hasInauguralElection;

	// Check if user needs a visa for this state
	let needsVisa = false;
	let hasActiveVisa = false;
	let hasPendingApplication = false;
	let visaSettings = null;
	let activeVisa = null;

	if (region.stateId && userResidenceState?.id !== region.stateId && hasInauguralElection) {
		needsVisa = true;

		// Get visa settings
		visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, region.stateId)
		});

		// Check for active visa
		activeVisa = await db.query.userVisas.findFirst({
			where: and(
				eq(userVisas.userId, account.id),
				eq(userVisas.stateId, region.stateId),
				eq(userVisas.status, "active")
			)
		});

		hasActiveVisa = !!activeVisa && new Date(activeVisa.expiresAt) > new Date();

		// Check for pending application
		const pendingApp = await db.query.visaApplications.findFirst({
			where: and(
				eq(visaApplications.userId, account.id),
				eq(visaApplications.stateId, region.stateId),
				eq(visaApplications.status, "pending")
			)
		});

		hasPendingApplication = !!pendingApp;
	}

	// Get factories in region
	const regionFactories = await db.query.factories.findMany({
		where: eq(factories.regionId, parseInt(params.id)),
		with: {
			company: true
		},
		limit: 10
	});

	return {
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
		}
	};
};

export const actions: Actions = {
	changeResidence: async ({ params, locals }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);

		// Get target region
		const targetRegion = await db.query.regions.findFirst({
			where: eq(regions.id, regionId),
			with: { state: true }
		});

		if (!targetRegion) {
			return fail(404, { error: "Region not found" });
		}

		// Get current residence
		const currentResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		});

		// Check if already living here
		if (currentResidence?.regionId === regionId) {
			return fail(400, { error: "You already live in this region" });
		}

		// Check for pending application
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

		// Check if state has had inaugural election
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

		// Independent regions or regions before inaugural election allow free movement
		if (!targetRegion.stateId || !hasInauguralElection) {
			// Direct move - no approval needed
			if (currentResidence) {
				await db
					.update(residences)
					.set({
						regionId: regionId,
						movedInAt: new Date()
					})
					.where(eq(residences.userId, account.id));
			} else {
				await db.insert(residences).values({
					userId: account.id,
					regionId: regionId
				});
			}

			return {
				success: true,
				message: hasInauguralElection
					? "Successfully moved to region!"
					: "Successfully moved! (Free movement before inaugural election)"
			};
		}

		// For regions with established states, create application (governor approval required)
		await db.insert(residenceApplications).values({
			userId: account.id,
			regionId: regionId,
			status: "pending"
		});

		return {
			success: true,
			message: "Residence application submitted. Awaiting governor approval."
		};
	},

	purchaseVisa: async ({ params, request, locals }) => {
		const account = locals.account!;

		// Get region to find state
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, parseInt(params.id)),
			with: { state: true }
		});

		if (!region || !region.stateId) {
			return fail(400, { error: "Region has no state" });
		}

		const stateId = region.stateId;

		// Check if state has had inaugural election
		const inauguration = await db.query.parliamentaryElections.findFirst({
			where: and(eq(parliamentaryElections.stateId, stateId), eq(parliamentaryElections.isInaugural, true))
		});

		if (!inauguration) {
			return fail(400, { error: "This state has not held its inaugural election yet. Visas are not required." });
		}

		// Get user's residence
		const residence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: { state: true }
				}
			}
		});

		// Check if user is already a resident of this state
		if (residence?.region.stateId === stateId) {
			return fail(400, { error: "You are already a resident of this state" });
		}

		// Get visa settings
		let visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		// Create default if doesn't exist
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

		// Check if visa is required
		if (!visaSettings.visaRequired) {
			// Grant free visa
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

		// Check if user already has an active visa
		const existingVisa = await db.query.userVisas.findFirst({
			where: and(eq(userVisas.userId, account.id), eq(userVisas.stateId, stateId), eq(userVisas.status, "active"))
		});

		if (existingVisa && new Date(existingVisa.expiresAt) > new Date()) {
			return fail(400, { error: "You already have an active visa for this state" });
		}

		// Check for pending application
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

		// If manual approval required, create application
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

		// Auto-approve: Process payment
		const visaCost = Number(visaSettings.visaCost);
		const taxRate = visaSettings.visaTaxRate;
		const taxAmount = Math.floor(visaCost * (taxRate / 100));

		// Get user wallet
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

		// Check if user has enough money
		if (walletBalance < visaCost) {
			return fail(400, {
				error: `Insufficient funds. Need $${visaCost.toLocaleString()}, have $${walletBalance.toLocaleString()}`
			});
		}

		// Deduct from user wallet
		await db
			.update(userWallets)
			.set({
				balance: walletBalance - visaCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		// Add tax to state treasury
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

		// Create visa
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
	}
};
