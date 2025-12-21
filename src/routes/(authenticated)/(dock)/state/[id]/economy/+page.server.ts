// src/routes/(authenticated)/(dock)/state/[id]/economy/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and } from "drizzle-orm";
import {
	states,
	ministers,
	stateResourceInventory,
	stateExportListings,
	powerPlants,
	stateTreasury,
	stateEnergy
} from "$lib/server/schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	if (!account) {
		throw redirect(302, "/login");
	}

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is economy minister
	const ministry = await db.query.ministers.findFirst({
		where: and(
			eq(ministers.userId, account.id),
			eq(ministers.stateId, params.id),
			eq(ministers.ministry, "finance") // Economy/Finance minister
		)
	});

	if (!ministry) {
		throw error(403, "You must be the Economy Minister to access this page");
	}

	// Get state treasury
	let [treasury] = await db
		.select()
		.from(stateTreasury)
		.where(eq(stateTreasury.stateId, params.id));

	if (!treasury) {
		// Create treasury if doesn't exist
		[treasury] = await db
			.insert(stateTreasury)
			.values({
				stateId: params.id,
				balance: 0
			})
			.returning();
	}

	// Get state resources
	const stateResources = await db.query.stateResourceInventory.findMany({
		where: eq(stateResourceInventory.stateId, params.id)
	});

	// Get active state exports
	const stateExports = await db.query.stateExportListings.findMany({
		where: eq(stateExportListings.stateId, params.id)
	});

	// Get power plants
	const statePowerPlants = await db.query.powerPlants.findMany({
		where: eq(powerPlants.stateId, params.id)
	});

	// Get state energy info
	let [energyInfo] = await db
		.select()
		.from(stateEnergy)
		.where(eq(stateEnergy.stateId, params.id));

	if (!energyInfo) {
		// Create energy record if doesn't exist
		[energyInfo] = await db
			.insert(stateEnergy)
			.values({
				stateId: params.id,
				totalProduction: 0,
				usedProduction: 0
			})
			.returning();
	}

	return {
		state,
		treasury,
		stateResources,
		stateExports,
		powerPlants: statePowerPlants,
		energyInfo
	};
};

export const actions: Actions = {
	createExport: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify economy minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "finance")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Economy Minister can create exports" });
		}

		const formData = await request.formData();
		const resourceType = formData.get("resourceType") as string;
		const quantity = parseInt(formData.get("quantity") as string);
		const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

		// Validate inputs
		if (!resourceType || quantity < 1 || pricePerUnit < 100) {
			return fail(400, { error: "Invalid export data" });
		}

		// Only allow raw resources, not products
		const allowedResources = ["iron", "copper", "wood", "coal"];
		if (!allowedResources.includes(resourceType)) {
			return fail(400, { error: "Only raw resources can be exported (no manufactured products)" });
		}

		// Check state has enough resources
		const [resource] = await db
			.select()
			.from(stateResourceInventory)
			.where(
				and(
					eq(stateResourceInventory.stateId, params.id),
					eq(stateResourceInventory.resourceType, resourceType as any)
				)
			);

		if (!resource || resource.quantity < quantity) {
			return fail(400, { error: "Insufficient state resources" });
		}

		// Deduct from state inventory
		await db
			.update(stateResourceInventory)
			.set({
				quantity: resource.quantity - quantity,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(stateResourceInventory.stateId, params.id),
					eq(stateResourceInventory.resourceType, resourceType as any)
				)
			);

		// Create export listing
		await db.insert(stateExportListings).values({
			stateId: params.id,
			resourceType: resourceType as any,
			quantity,
			pricePerUnit,
			listedBy: account.id
		});

		return { success: true, message: "Export listing created successfully" };
	},

	cancelExport: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify economy minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "finance")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Economy Minister can cancel exports" });
		}

		const formData = await request.formData();
		const listingId = formData.get("listingId") as string;

		// Get listing
		const [listing] = await db
			.select()
			.from(stateExportListings)
			.where(eq(stateExportListings.id, listingId));

		if (!listing) {
			return fail(404, { error: "Listing not found" });
		}

		if (listing.stateId !== params.id) {
			return fail(403, { error: "This listing does not belong to your state" });
		}

		// Return resources to state inventory
		const [existing] = await db
			.select()
			.from(stateResourceInventory)
			.where(
				and(
					eq(stateResourceInventory.stateId, params.id),
					eq(stateResourceInventory.resourceType, listing.resourceType)
				)
			);

		if (existing) {
			await db
				.update(stateResourceInventory)
				.set({
					quantity: existing.quantity + listing.quantity,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(stateResourceInventory.stateId, params.id),
						eq(stateResourceInventory.resourceType, listing.resourceType)
					)
				);
		} else {
			await db.insert(stateResourceInventory).values({
				stateId: params.id,
				resourceType: listing.resourceType,
				quantity: listing.quantity
			});
		}

		// Delete listing
		await db.delete(stateExportListings).where(eq(stateExportListings.id, listingId));

		return { success: true, message: "Export listing cancelled" };
	},

	buildPowerPlant: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify economy minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "finance")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Economy Minister can build power plants" });
		}

		const formData = await request.formData();
		const plantType = formData.get("plantType") as string;
		const name = formData.get("name") as string;

		// Validate
		if (!plantType || !name || name.trim().length < 3) {
			return fail(400, { error: "Invalid plant data" });
		}

		// Get plant costs and output
		const plantSpecs: Record<string, { output: number; cost: number }> = {
			coal: { output: 100, cost: 500000 },
			gas: { output: 150, cost: 750000 },
			nuclear: { output: 500, cost: 2500000 },
			solar: { output: 50, cost: 400000 },
			wind: { output: 75, cost: 600000 },
			hydro: { output: 200, cost: 1000000 }
		};

		const specs = plantSpecs[plantType];
		if (!specs) {
			return fail(400, { error: "Invalid plant type" });
		}

		// Check treasury balance
		const [treasury] = await db
			.select()
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, params.id));

		if (!treasury || treasury.balance < specs.cost) {
			return fail(400, { error: "Insufficient treasury funds" });
		}

		// Deduct from treasury
		await db
			.update(stateTreasury)
			.set({
				balance: treasury.balance - specs.cost,
				totalSpent: treasury.totalSpent + specs.cost,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, params.id));

		// Create power plant
		await db.insert(powerPlants).values({
			stateId: params.id,
			name: name.trim(),
			plantType: plantType as any,
			powerOutput: specs.output,
			constructionCost: specs.cost,
			isOperational: 1,
			builtBy: account.id
		});

		// Update state energy production
		const [energyInfo] = await db
			.select()
			.from(stateEnergy)
			.where(eq(stateEnergy.stateId, params.id));

		if (energyInfo) {
			await db
				.update(stateEnergy)
				.set({
					totalProduction: energyInfo.totalProduction + specs.output,
					updatedAt: new Date()
				})
				.where(eq(stateEnergy.stateId, params.id));
		} else {
			await db.insert(stateEnergy).values({
				stateId: params.id,
				totalProduction: specs.output,
				usedProduction: 0
			});
		}

		return { success: true, message: `${name} constructed successfully!` };
	}
};