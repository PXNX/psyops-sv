// src/routes/factory/create/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	factories,
	factoryCreationCooldown,
	regions,
	residences,
	resourceInventory,
	stateEnergy,
	states,
	userWallets
} from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const FACTORY_COST = 50000;
const COOLDOWN_DAYS = 7;
const ENERGY_REQUIRED = 50;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's company (must own a company to create factories)
	const [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

	if (!company) {
		return {
			error: "You must own a company to create factories. Please create a company first.",
			userBalance: 0,
			isOnCooldown: false,
			cooldownEndsAt: null,
			region: null,
			companyId: null,
			stateEnergy: null
		};
	}

	// Get user's residence (must have a residence to create factories)
	const [residence] = await db
		.select({
			id: residences.id,
			regionId: residences.regionId,
			userId: residences.userId
		})
		.from(residences)
		.where(eq(residences.userId, account.id));

	if (!residence) {
		return {
			error: "You must have a residence to create factories. Please establish a residence first.",
			userBalance: 0,
			isOnCooldown: false,
			cooldownEndsAt: null,
			region: null,
			companyId: company.id,
			stateEnergy: null
		};
	}

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Check cooldown
	const [cooldown] = await db
		.select()
		.from(factoryCreationCooldown)
		.where(eq(factoryCreationCooldown.userId, account.id));

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastCreationAt);
		cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

		if (new Date() < cooldownEnd) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	// Get the user's current region with details
	const [region] = await db
		.select({
			id: regions.id,
			name: states.name,
			stateName: states.name,
			stateId: regions.stateId,
			rating: regions.rating,
			infrastructure: regions.infrastructure,
			economy: regions.economy,
			education: regions.education,
			hospitals: regions.hospitals,
			fortifications: regions.fortifications,
			oil: regions.oil,
			aluminium: regions.aluminium,
			rubber: regions.rubber,
			tungsten: regions.tungsten,
			steel: regions.steel,
			chromium: regions.chromium
		})
		.from(regions)
		.innerJoin(states, eq(regions.stateId, states.id))
		.where(eq(regions.id, residence.regionId));

	if (!region) {
		return {
			error: "Your current residence region could not be found.",
			userBalance: wallet?.balance || 0,
			isOnCooldown,
			cooldownEndsAt,
			region: null,
			companyId: company.id,
			stateEnergy: null
		};
	}

	// Format region with available resources
	const regionWithResources = {
		...region,
		population: 0,
		development: 0,
		resources: [
			{
				type: "oil",
				amount: region.oil,
				resourceType: "oil",
				remainingReserves: region.oil || 0,
				totalReserves: region.oil || 0
			},
			{
				type: "aluminium",
				amount: region.aluminium,
				resourceType: "aluminium",
				remainingReserves: region.aluminium || 0,
				totalReserves: region.aluminium || 0
			},
			{
				type: "rubber",
				amount: region.rubber,
				resourceType: "rubber",
				remainingReserves: region.rubber || 0,
				totalReserves: region.rubber || 0
			},
			{
				type: "tungsten",
				amount: region.tungsten,
				resourceType: "tungsten",
				remainingReserves: region.tungsten || 0,
				totalReserves: region.tungsten || 0
			},
			{
				type: "steel",
				amount: region.steel,
				resourceType: "steel",
				remainingReserves: region.steel || 0,
				totalReserves: region.steel || 0
			},
			{
				type: "chromium",
				amount: region.chromium,
				resourceType: "chromium",
				remainingReserves: region.chromium || 0,
				totalReserves: region.chromium || 0
			}
		].filter((r) => (r.amount ?? 0) > 0)
	};

	// Get state energy
	const [stateEnergyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, region.stateId!));

	return {
		userBalance: wallet?.balance || 0,
		isOnCooldown,
		cooldownEndsAt,
		region: regionWithResources,
		companyId: company.id,
		stateEnergy: stateEnergyData || {
			totalProduction: 0,
			usedProduction: 0
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const data = await request.formData();

		const name = data.get("name") as string;
		const factoryType = data.get("factoryType") as string;
		const output = data.get("output") as string;
		const maxWorkers = parseInt(data.get("maxWorkers") as string);
		const workerWage = parseInt(data.get("workerWage") as string);

		// Validation
		if (!name || !factoryType || !output || !maxWorkers || !workerWage) {
			return fail(400, { error: "All fields are required" });
		}

		// Check if user owns a company
		const [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

		if (!company) {
			return fail(400, {
				error: "You must own a company to create factories. Please create a company first."
			});
		}

		// Get user's residence
		const [residence] = await db.select().from(residences).where(eq(residences.userId, account.id));

		if (!residence) {
			return fail(400, {
				error: "You must have a residence to create factories. Please establish a residence first."
			});
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(factoryCreationCooldown)
			.where(eq(factoryCreationCooldown.userId, account.id));

		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastCreationAt);
			cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

			if (new Date() < cooldownEnd) {
				return fail(400, {
					error: `Factory creation is on cooldown. Try again after ${cooldownEnd.toLocaleDateString()}`
				});
			}
		}

		// Check balance
		const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!wallet || wallet.balance < FACTORY_COST) {
			return fail(400, { error: "Insufficient funds" });
		}

		// Check resource requirements for armaments factory
		if (factoryType === "armaments") {
			const requiredResources = [
				{ type: "iron", amount: 100 },
				{ type: "steel", amount: 50 },
				{ type: "gunpowder", amount: 25 }
			];

			for (const required of requiredResources) {
				const [inventory] = await db
					.select()
					.from(resourceInventory)
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, required.type as any))
					);

				if (!inventory || inventory.quantity < required.amount) {
					return fail(400, {
						error: `Insufficient ${required.type}. You need ${required.amount} but have ${inventory?.quantity || 0}.`
					});
				}
			}
		}

		// Get region's state (using the residence region)
		const [region] = await db
			.select({
				id: regions.id,
				stateId: regions.stateId
			})
			.from(regions)
			.where(eq(regions.id, residence.regionId));

		if (!region || !region.stateId) {
			return fail(404, { error: "Region not found" });
		}

		// Check state energy
		const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, region.stateId));

		if (!energy || energy.totalProduction - energy.usedProduction < ENERGY_REQUIRED) {
			return fail(400, { error: "Insufficient state energy capacity" });
		}

		// Create factory
		await db.transaction(async (tx) => {
			// Deduct cost
			await tx
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${FACTORY_COST}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Deduct resources for armaments factory
			if (factoryType === "armaments") {
				const requiredResources = [
					{ type: "iron", amount: 100 },
					{ type: "steel", amount: 50 },
					{ type: "gunpowder", amount: 25 }
				];

				for (const required of requiredResources) {
					await tx
						.update(resourceInventory)
						.set({
							quantity: sql`${resourceInventory.quantity} - ${required.amount}`,
							updatedAt: new Date()
						})
						.where(
							and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, required.type as any))
						);
				}
			}

			// Create factory in user's residence region
			const factoryData: any = {
				name,
				companyId: company.id,
				regionId: residence.regionId, // Always use residence region
				factoryType,
				maxWorkers,
				workerWage,
				productionRate: 10
			};

			if (factoryType === "mine") {
				factoryData.resourceOutput = output;
			} else if (factoryType === "armaments") {
				factoryData.productOutput = output;
			} else {
				factoryData.resourceOutput = output; // For refinery
			}

			await tx.insert(factories).values(factoryData);

			// Update state energy
			await tx
				.update(stateEnergy)
				.set({
					usedProduction: sql`${stateEnergy.usedProduction} + ${ENERGY_REQUIRED}`,
					updatedAt: new Date()
				})
				.where(eq(stateEnergy.stateId, region.stateId!));

			// Update or create cooldown
			if (cooldown) {
				await tx
					.update(factoryCreationCooldown)
					.set({ lastCreationAt: new Date() })
					.where(eq(factoryCreationCooldown.userId, account.id));
			} else {
				await tx.insert(factoryCreationCooldown).values({
					userId: account.id,
					lastCreationAt: new Date()
				});
			}
		});

		throw redirect(303, "/production");
	}
};
