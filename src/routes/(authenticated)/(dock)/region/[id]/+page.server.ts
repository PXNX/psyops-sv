// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	regions,
	residences,
	userTravels,
	factories,
	powerPlants,
	states,
	userWallets,
	governors,
	ministers,
	stateTaxes
} from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const regionId = parseInt(params.id);

	// Query region with all related data
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, regionId),
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

	// Count residences (population)
	const populationResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(residences)
		.where(eq(residences.regionId, regionId));
	const population = populationResult[0]?.count || 0;

	// Count factories in this region
	const factoriesResult = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(factories)
		.where(eq(factories.regionId, regionId));
	const factoryCount = factoriesResult[0]?.count || 0;

	// Count power plants in this region's state
	let powerPlantCount = 0;
	if (region.stateId) {
		const powerPlantsResult = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(powerPlants)
			.where(eq(powerPlants.stateId, region.stateId));
		powerPlantCount = powerPlantsResult[0]?.count || 0;
	}

	// Check if user already has a residence in this region
	const userResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id), eq(residences.regionId, regionId))
	});

	// Get all user's residences to check if they have a primary one
	const userResidences = await db.query.residences.findMany({
		where: eq(residences.userId, account.id)
	});
	const hasPrimaryResidence = userResidences.some((r) => r.isPrimary === 1);
	const primaryResidence = userResidences.find((r) => r.isPrimary === 1);

	// Get active travel if any
	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	// Check if user is governor of this region
	const isGovernor = region.governor?.userId === account.id;

	// Check if user is minister of infrastructure in this state
	let isInfrastructureMinister = false;
	if (region.stateId) {
		const minister = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, region.stateId),
				eq(ministers.ministry, "infrastructure")
			)
		});
		isInfrastructureMinister = !!minister;
	}

	// User can build if they're governor or infrastructure minister
	const canBuild = isGovernor || isInfrastructureMinister;

	// Get travel tax rate for this state
	let travelTaxRate = 0;
	if (region.stateId) {
		const travelTax = await db.query.stateTaxes.findFirst({
			where: and(eq(stateTaxes.stateId, region.stateId), eq(stateTaxes.taxType, "income"), eq(stateTaxes.isActive, 1))
		});
		travelTaxRate = travelTax?.taxRate || 0;
	}

	return {
		region: {
			id: region.id,
			rating: region.rating,
			infrastructure: region.infrastructure,
			economy: region.economy,
			education: region.education,
			hospitals: region.hospitals,
			fortifications: region.fortifications,
			oil: region.oil,
			aluminum: region.aluminium,
			rubber: region.rubber,
			tungsten: region.tungsten,
			steel: region.steel,
			chromium: region.chromium,
			createdAt: region.createdAt,
			population,
			factoryCount,
			powerPlantCount
		},
		state: region.state
			? {
					id: region.state.id,
					name: region.state.name,
					avatar: region.state.avatar
				}
			: null,
		governor: region.governor
			? {
					userId: region.governor.userId,
					name: region.governor.user.profile?.name,
					avatar: region.governor.user.profile?.avatar,
					appointedAt: region.governor.appointedAt,
					term: region.governor.term
				}
			: null,
		userResidence,
		hasPrimaryResidence,
		userLocation: primaryResidence ? { regionId: primaryResidence.regionId } : null,
		activeTravel,
		canBuild,
		travelTaxRate
	};
};

export const actions: Actions = {
	requestResidence: async ({ params, locals }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);

		// Check if region exists
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, regionId)
		});

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		// Check if user already has residence in this region
		const existingResidence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.regionId, regionId))
		});

		if (existingResidence) {
			return fail(400, { error: "You already have a residence in this region" });
		}

		// Check if user has any residences
		const userResidences = await db.query.residences.findMany({
			where: eq(residences.userId, account.id)
		});

		const isPrimary = userResidences.length === 0 ? 1 : 0;

		// Create new residence
		await db.insert(residences).values({
			userId: account.id,
			regionId,
			isPrimary,
			movedInAt: new Date()
		});

		return { success: true };
	},

	setPrimaryResidence: async ({ params, locals }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);

		// Check if user has residence in this region
		const residence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.regionId, regionId))
		});

		if (!residence) {
			return fail(404, { error: "You don't have a residence in this region" });
		}

		// Remove primary status from all other residences
		const allResidences = await db.query.residences.findMany({
			where: eq(residences.userId, account.id)
		});

		for (const res of allResidences) {
			await db
				.update(residences)
				.set({ isPrimary: res.id === residence.id ? 1 : 0 })
				.where(eq(residences.id, res.id));
		}

		return { success: true };
	},

	startTravel: async ({ params, locals, request }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);
		const formData = await request.formData();

		const distanceKm = parseInt(formData.get("distanceKm") as string);
		const durationMinutes = parseInt(formData.get("durationMinutes") as string);
		const fromRegionId = parseInt(formData.get("fromRegionId") as string);

		// Validate inputs
		if (!distanceKm || !durationMinutes || !fromRegionId) {
			return fail(400, { error: "Invalid travel parameters" });
		}

		// Check if user has active travel
		const existingTravel = await db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		});

		if (existingTravel) {
			return fail(400, { error: "You already have an active travel" });
		}

		// Get destination region to check for visa requirement and taxes
		const destinationRegion = await db.query.regions.findFirst({
			where: eq(regions.id, regionId),
			with: { state: true }
		});

		if (!destinationRegion) {
			return fail(404, { error: "Destination region not found" });
		}

		// Calculate travel cost (base: 100 per 100km)
		const baseCost = Math.ceil((distanceKm / 100) * 100);

		// Add state travel tax if applicable
		let travelTax = 0;
		let totalCost = baseCost;

		if (destinationRegion.stateId) {
			const stateTax = await db.query.stateTaxes.findFirst({
				where: and(
					eq(stateTaxes.stateId, destinationRegion.stateId),
					eq(stateTaxes.taxType, "income"),
					eq(stateTaxes.isActive, 1)
				)
			});

			if (stateTax) {
				travelTax = Math.ceil((baseCost * stateTax.taxRate) / 100);
				totalCost = baseCost + travelTax;
			}
		}

		// Check if user has required residence (visa)
		const hasVisa = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.regionId, regionId))
		});

		if (!hasVisa) {
			return fail(403, { error: "You need a residence permit (visa) to travel to this region" });
		}

		// Check user wallet balance
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!wallet || wallet.balance < totalCost) {
			return fail(400, { error: `Insufficient funds. Travel costs $${totalCost.toLocaleString()}` });
		}

		// Deduct travel cost
		await db
			.update(userWallets)
			.set({
				balance: sql`${userWallets.balance} - ${totalCost}`,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		// Create travel record
		const now = new Date();
		const arrivalTime = new Date(now.getTime() + durationMinutes * 60000);

		await db.insert(userTravels).values({
			userId: account.id,
			fromRegionId,
			toRegionId: regionId,
			departureTime: now,
			arrivalTime,
			travelDuration: durationMinutes,
			distanceKm,
			status: "in_progress"
		});

		return {
			success: true,
			message: `Travel started! Cost: $${baseCost.toLocaleString()} + Tax: $${travelTax.toLocaleString()}`
		};
	}
};
