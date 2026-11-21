// src/routes/factory/create/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	companies,
	factories,
	factoryCreationCooldown,
	regions,
	residences,
	resourceInventory,
	stateEnergy,
	states,
	regionDeposits,
	userWallets
} from "#lib/server/schema.js";
import { ECONOMY_CONFIG, MINEABLE_RESOURCES } from "#lib/config/index.js";
import { getRegionName, formatDateTime } from "#lib/utils/formatting.js";
import { effectiveEnergy } from "#lib/server/services/military/state-effects.js";
import { withStrikeEnergy } from "#lib/server/services/military/strike.js";
import { fail, redirect } from "@sveltejs/kit";
import { and, eq, gte, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const FACTORY_COST = ECONOMY_CONFIG.FACTORY_CREATION_COST;
const OUTPUTS: Record<string, readonly string[]> = {
	mine: MINEABLE_RESOURCES,
	refinery: ["steel", "gunpowder", "fuel", "enriched_uranium"],
	armaments: ["rifles", "ammunition", "artillery", "vehicles", "explosives"],
	fabrication: ["chips", "electronics"]
};
/** Factory types whose output is a manufactured product rather than a resource. */
const PRODUCT_FACTORY_TYPES = new Set(["armaments", "fabrication"]);
const COOLDOWN_DAYS = 7;
const ENERGY_REQUIRED = 50;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// All lookups are harmless reads keyed by the account, so run them in parallel;
	// the checks below still apply in their original order.
	const [[company], { residence, region }, [wallet], [cooldown], userInventory] = await Promise.all([
		// Get user's company (must own a company to create factories)
		db.select().from(companies).where(eq(companies.ownerId, account.id)),
		(async () => {
			// Get user's residence (must have a residence to create factories)
			const [residence] = await db
				.select({
					id: residences.id,
					regionId: residences.regionId,
					userId: residences.userId
				})
				.from(residences)
				.where(eq(residences.userId, account.id));
			if (!residence) return { residence, region: undefined };

			// Get the user's current region
			const [region] = await db
				.select({
					id: regions.id,
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
				.where(eq(regions.id, residence.regionId));
			return { residence, region };
		})(),
		// Get user's wallet
		db.select().from(userWallets).where(eq(userWallets.userId, account.id)),
		// Check cooldown
		db.select().from(factoryCreationCooldown).where(eq(factoryCreationCooldown.userId, account.id)),
		// Get user's resource inventory for material requirements
		db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id))
	]);

	if (!company) {
		return {
			error: "You must own a company to create factories. Please create a company first.",
			userBalance: 0,
			isOnCooldown: false,
			cooldownEndsAt: null,
			region: null,
			companyId: null,
			stateEnergy: null,
			regionalTaxes: null,
			userInventory: {},
			factoryCost: FACTORY_COST
		};
	}

	if (!residence) {
		return {
			error: "You must have a residence to create factories. Please establish a residence first.",
			userBalance: 0,
			isOnCooldown: false,
			cooldownEndsAt: null,
			region: null,
			companyId: company.id,
			stateEnergy: null,
			regionalTaxes: null,
			userInventory: {},
			factoryCost: FACTORY_COST
		};
	}

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

	if (!region) {
		return {
			error: "Your current residence region could not be found.",
			userBalance: wallet?.balance || 0,
			isOnCooldown,
			cooldownEndsAt,
			region: null,
			companyId: company.id,
			stateEnergy: null,
			regionalTaxes: null,
			userInventory: {},
			factoryCost: FACTORY_COST
		};
	}

	// Check if region is independent (no state)
	if (!region.stateId) {
		return {
			error:
				"Cannot create factories in independent regions. Factories require state infrastructure and energy supply.",
			userBalance: wallet?.balance || 0,
			isOnCooldown,
			cooldownEndsAt,
			region: null,
			companyId: company.id,
			stateEnergy: null,
			regionalTaxes: null,
			userInventory: {},
			factoryCost: FACTORY_COST
		};
	}

	const [[state], [stateEnergyData], deposits] = await Promise.all([
		// Get state name for display
		db.select({ name: states.name }).from(states).where(eq(states.id, region.stateId)),
		// Get state energy
		db.select().from(stateEnergy).where(eq(stateEnergy.stateId, region.stateId)),
		db.select().from(regionDeposits).where(eq(regionDeposits.regionId, region.id))
	]);

	const regionName = getRegionName(region.id);

	// Format region with available resources
	const regionWithResources = {
		...region,
		name: regionName,
		stateName: state?.name || regionName,
		population: 0,
		development: 0,
		// Mines dig into the region's deposits; `amount` is how full a deposit
		// still is, which sets how much each shift yields.
		resources: deposits
			.filter((d) => d.remaining > 0)
			.map((d) => ({
				resourceType: d.resourceType,
				amount: Math.round((d.remaining / d.capacity) * 100),
				remaining: d.remaining,
				capacity: d.capacity
			}))
	};

	// Calculate regional taxes based on region stats
	// These are example calculations - adjust based on your game's economy
	const regionalTaxes = {
		incomeTax: Math.min(Math.floor((region.infrastructure || 0) / 10), 25), // 0-25% based on infrastructure
		salesTax: Math.min(Math.floor((region.economy || 0) / 15), 20), // 0-20% based on economy
		propertyTax: Math.min(Math.floor((region.rating || 0) / 20), 15) // 0-15% based on rating
	};

	const inventoryMap: Record<string, number> = {};
	userInventory.forEach((item) => {
		inventoryMap[item.resourceType] = item.quantity;
	});

	return {
		userBalance: wallet?.balance || 0,
		isOnCooldown,
		cooldownEndsAt,
		region: regionWithResources,
		companyId: company.id,
		// A grid attack takes part of the capacity offline for a while.
		stateEnergy: await withStrikeEnergy(
			db,
			region.stateId,
			await effectiveEnergy(db, region.stateId, stateEnergyData || { totalProduction: 0, usedProduction: 0 })
		),
		regionalTaxes,
		userInventory: inventoryMap,
		factoryCost: FACTORY_COST
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const factoryType = String(data.get("factoryType") ?? "");
		const output = String(data.get("output") ?? "");
		const maxWorkers = Number(data.get("maxWorkers"));
		const workerWage = Number(data.get("workerWage"));

		// Validation
		if (!name || name.length > 50) return fail(400, { error: "Give the factory a name (up to 50 characters)." });
		if (!OUTPUTS[factoryType]?.includes(output)) return fail(400, { error: "Choose what the factory makes." });
		if (!Number.isInteger(maxWorkers) || maxWorkers < 1 || maxWorkers > 100) {
			return fail(400, { error: "A factory employs 1 to 100 workers." });
		}
		if (!Number.isInteger(workerWage) || workerWage < 1 || workerWage > 1_000_000) {
			return fail(400, { error: "Set a wage of at least $1." });
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
					error: `Factory creation is on cooldown. Try again after ${formatDateTime(cooldownEnd)}`
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

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		if (!region.stateId) {
			return fail(400, {
				error:
					"Cannot create factories in independent regions. Factories require state infrastructure and energy supply."
			});
		}

		// A mine needs something to dig: a deposit of that resource here.
		if (factoryType === "mine") {
			const [deposit] = await db
				.select({ remaining: regionDeposits.remaining })
				.from(regionDeposits)
				.where(and(eq(regionDeposits.regionId, region.id), eq(regionDeposits.resourceType, output as never)));
			if (!deposit || deposit.remaining <= 0) {
				return fail(400, { error: `There is no ${output} to mine in this region.` });
			}
		}

		// Check state energy
		const [storedEnergy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, region.stateId));
		const energy =
			storedEnergy &&
			(await withStrikeEnergy(db, region.stateId, await effectiveEnergy(db, region.stateId, storedEnergy)));

		if (!energy || energy.totalProduction - energy.usedProduction < ENERGY_REQUIRED) {
			return fail(400, {
				error: energy?.gridDegraded
					? `Insufficient state energy capacity: the grid is down ${energy.gridDegraded}% after a cyber attack.`
					: energy?.strikeDamaged
						? `Insufficient state energy capacity: airstrikes knocked out ${energy.strikeDamaged}% of the grid.`
						: "Insufficient state energy capacity"
			});
		}

		// Create factory
		const created = await db.transaction(async (tx) => {
			// Deduct cost, only if the money is still there.
			const [paid] = await tx
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${FACTORY_COST}`,
					updatedAt: new Date()
				})
				.where(and(eq(userWallets.userId, account.id), gte(userWallets.balance, FACTORY_COST)))
				.returning({ id: userWallets.id });
			if (!paid) return false;

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
				regionId: residence.regionId,
				factoryType,
				maxWorkers,
				workerWage,
				productionRate: 10
			};

			if (factoryType === "mine") {
				factoryData.resourceOutput = output;
			} else if (PRODUCT_FACTORY_TYPES.has(factoryType)) {
				factoryData.productOutput = output;
			} else {
				factoryData.resourceOutput = output; // Refinery
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
			return true;
		});
		if (!created) return fail(400, { error: "Insufficient funds" });

		throw redirect(303, "/production");
	}
};
