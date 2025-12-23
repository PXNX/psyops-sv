// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, userTravels, factories, powerPlants } from "$lib/server/schema";
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

	return {
		region: {
			id: region.id,
			rating: region.rating,

			infrastructure: region.infrastructure,
			powerplants: region.powerplants,
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
		activeTravel
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
	}
};
