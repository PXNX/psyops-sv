// src/routes/(authenticated)/(dock)/region/[id]/construction/+page.server.ts
import { db } from "$lib/server/db";
import { regions, governors, ministers, stateTreasury, states } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const regionId = parseInt(params.id);

	// Get region with state
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, regionId),
		with: { state: true }
	});

	if (!region) {
		error(404, "Region not found");
	}

	// Check if user is governor of this region
	const isGovernor = await db.query.governors.findFirst({
		where: and(eq(governors.regionId, regionId), eq(governors.userId, account.id))
	});

	// Check if user is infrastructure minister of this state
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

	// Must be governor or infrastructure minister
	if (!isGovernor && !isInfrastructureMinister) {
		error(403, "You must be the governor or infrastructure minister to build in this region");
	}

	// Get state treasury balance
	let treasuryBalance = 0;
	if (region.stateId) {
		const treasury = await db.query.stateTreasury.findFirst({
			where: eq(stateTreasury.stateId, region.stateId)
		});
		treasuryBalance = Number(treasury?.balance || 0);
	}

	return {
		region: {
			id: region.id,
			infrastructure: region.infrastructure || 0,
			education: region.education || 0,
			hospitals: region.hospitals || 0,
			fortifications: region.fortifications || 0,
			economy: region.economy || 0
		},
		state: region.state
			? {
					id: region.state.id,
					name: region.state.name
				}
			: null,
		isGovernor: !!isGovernor,
		isInfrastructureMinister,
		treasuryBalance
	};
};

// Building costs and limits
const BUILDING_COSTS = {
	infrastructure: 50000,
	education: 75000,
	hospitals: 100000,
	fortifications: 150000
};

const BUILDING_LIMITS = {
	infrastructure: 18,
	education: 10,
	hospitals: 8,
	fortifications: 12
};

export const actions: Actions = {
	build: async ({ params, locals, request }) => {
		const account = locals.account!;
		const regionId = parseInt(params.id);
		const formData = await request.formData();
		const buildingType = formData.get("buildingType") as string;

		// Validate building type
		if (!["infrastructure", "education", "hospitals", "fortifications"].includes(buildingType)) {
			return fail(400, { error: "Invalid building type" });
		}

		// Get region with state
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, regionId),
			with: { state: true }
		});

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		// Check authorization
		const isGovernor = await db.query.governors.findFirst({
			where: and(eq(governors.regionId, regionId), eq(governors.userId, account.id))
		});

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

		if (!isGovernor && !isInfrastructureMinister) {
			return fail(403, { error: "Unauthorized" });
		}

		// Check if state exists (required for funding)
		if (!region.stateId) {
			return fail(400, { error: "Independent regions cannot construct buildings yet" });
		}

		// Check current level vs limit
		const currentLevel = (region[buildingType as keyof typeof region] as number) || 0;
		const limit = BUILDING_LIMITS[buildingType as keyof typeof BUILDING_LIMITS];

		if (currentLevel >= limit) {
			return fail(400, { error: `Maximum level of ${limit} already reached` });
		}

		// Get cost
		const cost = BUILDING_COSTS[buildingType as keyof typeof BUILDING_COSTS];

		// Check treasury balance
		const treasury = await db.query.stateTreasury.findFirst({
			where: eq(stateTreasury.stateId, region.stateId)
		});

		if (!treasury || treasury.balance < cost) {
			return fail(400, { error: "Insufficient state treasury funds" });
		}

		// Deduct from treasury
		await db
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, region.stateId));

		// Increment building level
		await db
			.update(regions)
			.set({
				[buildingType]: sql`${regions[buildingType as keyof typeof regions]} + 1`
			})
			.where(eq(regions.id, regionId));

		return { success: true, message: `${buildingType} level increased to ${currentLevel + 1}` };
	}
};
