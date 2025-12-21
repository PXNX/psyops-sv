// src/routes/factory/create/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	factories,
	factoryCreationCooldown,
	regions,
	regionalResources,
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

	// Get all regions with their states and available resources
	const allRegions = await db
		.select({
			id: regions.id,
			name: regions.name,
			stateName: states.name,
			stateId: regions.stateId,
			population: regions.population,
			development: regions.development
		})
		.from(regions)
		.innerJoin(states, eq(regions.stateId, states.id));

	// Get regional resources
	const resources = await db.select().from(regionalResources);

	const regionsWithResources = allRegions.map((region) => ({
		...region,
		resources: resources.filter((r) => r.regionId === region.id)
	}));

	// Get user's company (or create one if they don't have one)
	let [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

	if (!company) {
		// Auto-create a personal company
		[company] = await db
			.insert(companies)
			.values({
				name: `${account.email.split("@")[0]}'s Company`,
				ownerId: account.id,
				description: "Personal company"
			})
			.returning();
	}

	// Get state energy (assuming user's first region's state for now)
	// In a real app, you'd select based on the chosen region
	const [energy] = await db.select().from(stateEnergy).limit(1);

	return {
		userBalance: wallet?.balance || 0,
		isOnCooldown,
		cooldownEndsAt,
		regions: regionsWithResources,
		companyId: company.id,
		stateEnergy: energy || { totalProduction: 1000, usedProduction: 0 }
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const data = await request.formData();

		const name = data.get("name") as string;
		const regionId = parseInt(data.get("regionId") as string);
		const factoryType = data.get("factoryType") as string;
		const output = data.get("output") as string;
		const maxWorkers = parseInt(data.get("maxWorkers") as string);
		const workerWage = parseInt(data.get("workerWage") as string);

		// Validation
		if (!name || !regionId || !factoryType || !output || !maxWorkers || !workerWage) {
			return fail(400, { error: "All fields are required" });
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

		// Get region's state
		const [region] = await db
			.select({
				id: regions.id,
				stateId: regions.stateId
			})
			.from(regions)
			.where(eq(regions.id, regionId));

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		// Check state energy
		const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, region.stateId!));

		if (!energy || energy.totalProduction - energy.usedProduction < ENERGY_REQUIRED) {
			return fail(400, { error: "Insufficient state energy capacity" });
		}

		// If mining, check regional resources
		if (factoryType === "mine") {
			const [resource] = await db
				.select()
				.from(regionalResources)
				.where(and(eq(regionalResources.regionId, regionId), eq(regionalResources.resourceType, output as any)));

			if (!resource || resource.remainingReserves <= 0) {
				return fail(400, { error: "This resource is not available in the selected region" });
			}
		}

		// Get or create company
		let [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

		if (!company) {
			[company] = await db
				.insert(companies)
				.values({
					name: `${account.email.split("@")[0]}'s Company`,
					ownerId: account.id
				})
				.returning();
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

			// Create factory
			const factoryData: any = {
				name,
				companyId: company.id,
				regionId,
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
