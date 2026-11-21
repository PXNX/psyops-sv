// Regional energy: siting, construction, grids, storage and fuel allocation.
//
// Plants are no longer a line item bought with treasury. They are built in a
// region, over days, from domestic materials and imported components bought on
// the world market. A region's grid-network level decides how much of that
// output can actually leave the site; battery storage smooths the renewables.
// Every day this service burns plant fuel, charges upkeep and splits refined
// fuel between civilians, the military and export according to state policy.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	powerPlants,
	presidents,
	regions,
	stateEnergy,
	stateResourceInventory,
	stateTreasury,
	states
} from "../../schema";
import {
	ALLOCATION,
	DEFAULT_FUEL_SHARES,
	POWER_PLANTS,
	PLANT_CONSTRUCTION,
	PLANT_GRID_REQUIRED,
	allocateFuel,
	dailyFuelUse,
	dailyUpkeep,
	energyDiversityFactor,
	exportRevenue,
	importedPartsCost,
	partPrice,
	plantOutput,
	plantSiting,
	sitingProblems,
	validShares,
	type FuelShares,
	type PowerPlantType
} from "#lib/config/index.js";
import { blockadeEffectsOn } from "../military/naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const DAY = 24 * 60 * 60 * 1000;
const ECONOMY_ROLE = new Set(["economy"]);

export class EnergyError extends Error {}

export type EnergyRole = "president" | "economy";

/** Who may run the energy desk (the economy portfolio). */
export async function energyAuthority(db: Db, userId: string): Promise<{ stateId: number; role: EnergyRole } | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId, ministry: ministers.ministry })
		.from(ministers)
		.where(eq(ministers.userId, userId))
		.limit(1);
	if (minister && ECONOMY_ROLE.has(minister.ministry)) return { stateId: minister.stateId, role: "economy" };
	return null;
}

/** Read (or lazily create) a state's energy row. */
export async function ensureEnergyRow(db: Db, stateId: number) {
	const [row] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)).limit(1);
	if (row) return row;
	const [created] = await db
		.insert(stateEnergy)
		.values({ stateId, totalProduction: 1000, usedProduction: 0, ...DEFAULT_FUEL_SHARES })
		.returning();
	return created!;
}

export interface PlantQuote {
	plantType: PowerPlantType;
	regionId: number;
	spec: (typeof POWER_PLANTS)[PowerPlantType];
	siting: { factor: number; notes: string[] };
	output: number;
	problems: string[];
	/** Treasury cost of imported components (already blockade-adjusted). */
	partsCost: number;
	parts: Partial<Record<string, number>>;
	domestic: Partial<Record<string, number>>;
	days: number;
	/** What the state holds for each domestic material. */
	available: Record<string, number>;
	treasury: number;
}

/**
 * Price and validate a new plant on a specific site. Pure read: the caller can
 * show the quote before anyone spends anything.
 */
export async function quotePlant(
	db: Db,
	input: { stateId: number; regionId: number; plantType: PowerPlantType },
	now = new Date()
): Promise<PlantQuote> {
	const spec = POWER_PLANTS[input.plantType];
	const recipe = PLANT_CONSTRUCTION[input.plantType];
	if (!spec || !recipe) throw new EnergyError("Unknown plant type.");

	const [region] = await db.select().from(regions).where(eq(regions.id, input.regionId)).limit(1);
	if (!region || region.stateId !== input.stateId) throw new EnergyError("That region doesn't belong to this state.");

	const [treasury] = await db
		.select({ balance: stateTreasury.balance })
		.from(stateTreasury)
		.where(eq(stateTreasury.stateId, input.stateId))
		.limit(1);
	const blockaded = (await blockadeEffectsOn(db, input.stateId, now)).tradeFactor < 1;
	const stockpile = await db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, input.stateId));
	const available = Object.fromEntries(stockpile.map((r) => [r.resourceType, r.quantity]));

	const site = {
		latitude: Number(region.latitude),
		terrain: region.terrain,
		grid: region.grid ?? 0,
		storage: region.storage ?? 0
	};
	const problems: string[] = [];
	const pending = await db
		.select({ id: powerPlants.id })
		.from(powerPlants)
		.where(
			and(
				eq(powerPlants.stateId, input.stateId),
				eq(powerPlants.regionId, input.regionId),
				eq(powerPlants.isUnderConstruction, true)
			)
		)
		.limit(1);
	if (pending.length) problems.push("This region already has a plant under construction.");
	problems.push(...sitingProblems(input.plantType, site));

	const partsCost = importedPartsCost(input.plantType, blockaded);
	const balance = Number(treasury?.balance ?? 0);
	if (balance < partsCost) problems.push(`The treasury is ${(partsCost - balance).toLocaleString()} short of the imported components.`);
	for (const [resource, needed] of Object.entries(recipe.domestic)) {
		if ((available[resource] ?? 0) < (needed ?? 0))
			problems.push(`The stockpile is ${(needed ?? 0) - (available[resource] ?? 0)} ${resource} short.`);
	}

	return {
		plantType: input.plantType,
		regionId: input.regionId,
		spec,
		siting: plantSiting(input.plantType, site),
		output: plantOutput(input.plantType, site),
		problems,
		partsCost,
		parts: recipe.imported,
		domestic: recipe.domestic,
		days: recipe.days,
		available,
		treasury: balance
	};
}

/** Pay for a plant and put it under construction. All or nothing. */
export async function startPlantConstruction(
	db: Database,
	input: { stateId: number; regionId: number; plantType: PowerPlantType; name: string; builtBy: string },
	now = new Date()
): Promise<{ completesAt: Date; output: number }> {
	const quote = await quotePlant(db, input, now);
	if (quote.problems.length) throw new EnergyError(quote.problems.join(" "));
	if (input.name.trim().length < 3) throw new EnergyError("Give the plant a name of at least three characters.");

	return db.transaction(async (tx) => {
		const [region] = await tx.select().from(regions).where(eq(regions.id, input.regionId)).for("update");
		if (!region || region.stateId !== input.stateId) throw new EnergyError("That region doesn't belong to this state.");

		const paidTreasury = await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${quote.partsCost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${quote.partsCost}`,
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, input.stateId), gte(stateTreasury.balance, quote.partsCost)))
			.returning({ id: stateTreasury.id });
		if (!paidTreasury.length) throw new EnergyError("The treasury can no longer cover the imported components.");

		for (const [resource, units] of Object.entries(quote.domestic)) {
			const paid = await tx
				.update(stateResourceInventory)
				.set({ quantity: sql`${stateResourceInventory.quantity} - ${units}`, updatedAt: now })
				.where(
					and(
						eq(stateResourceInventory.stateId, input.stateId),
						eq(stateResourceInventory.resourceType, resource as never),
						gte(stateResourceInventory.quantity, units ?? 0)
					)
				)
				.returning({ id: stateResourceInventory.id });
			if (!paid.length) throw new EnergyError(`Not enough ${resource} any more.`);
		}

		const completesAt = new Date(now.getTime() + quote.days * DAY);
		await tx.insert(powerPlants).values({
			stateId: input.stateId,
			regionId: input.regionId,
			name: input.name.trim(),
			plantType: input.plantType,
			powerOutput: 0,
			constructionCost: quote.partsCost,
			sitingFactor: Math.round(quote.siting.factor * 1000),
			isUnderConstruction: true,
			isOperational: false,
			constructionCompletesAt: completesAt,
			builtBy: input.builtBy,
			builtAt: now
		});
		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "construction",
			amount: quote.partsCost,
			balanceAfter: quote.treasury - quote.partsCost,
			description: `Imported components for ${input.name.trim()} (${input.plantType})`,
			authorizedBy: input.builtBy,
			createdAt: now
		});
		return { completesAt, output: quote.output };
	});
}

/** Sum the operational plants of a state into its grid record. */
export async function recomputeGrid(db: Db, stateId: number, now = new Date()): Promise<number> {
	const plants = await db
		.select({ plantType: powerPlants.plantType, powerOutput: powerPlants.powerOutput })
		.from(powerPlants)
		.where(and(eq(powerPlants.stateId, stateId), eq(powerPlants.isOperational, true)));
	const byType: Partial<Record<PowerPlantType, number>> = {};
	let total = 0;
	for (const plant of plants) {
		total += Math.max(0, plant.powerOutput);
		byType[plant.plantType] = (byType[plant.plantType] ?? 0) + 1;
	}
	const production = Math.floor(total * energyDiversityFactor(Object.keys(byType).length));
	const row = await ensureEnergyRow(db, stateId);
	await db
		.update(stateEnergy)
		.set({ totalProduction: production, updatedAt: now })
		.where(eq(stateEnergy.stateId, row.stateId));
	return production;
}

/** Finish every plant whose build time is up, using the region's live levels. */
export async function completePendingPlants(
	db: Database,
	filter: { stateId?: number; regionId?: number } = {},
	now = new Date()
): Promise<number> {
	const conditions = [
		eq(powerPlants.isUnderConstruction, true),
		lte(powerPlants.constructionCompletesAt, now)
	];
	if (filter.stateId !== undefined) conditions.push(eq(powerPlants.stateId, filter.stateId));
	if (filter.regionId !== undefined) conditions.push(eq(powerPlants.regionId, filter.regionId));

	const due = await db
		.select({ id: powerPlants.id })
		.from(powerPlants)
		.where(and(...conditions));
	if (!due.length) return 0;

	const touched = new Set<number>();
	await db.transaction(async (tx) => {
		const claimed = await tx
			.update(powerPlants)
			.set({ isUnderConstruction: false, isOperational: true })
			.where(
				and(
					inArray(powerPlants.id, due.map((d) => d.id)),
					eq(powerPlants.isUnderConstruction, true)
				)
			)
			.returning({ id: powerPlants.id, stateId: powerPlants.stateId, regionId: powerPlants.regionId, plantType: powerPlants.plantType });
		const regionIds = [...new Set(claimed.map((p) => p.regionId).filter((id): id is number => id != null))];
		const regionRows = regionIds.length
			? await tx.select().from(regions).where(inArray(regions.id, regionIds))
			: [];
		const byId = new Map(regionRows.map((r) => [r.id, r]));
		for (const plant of claimed) {
			touched.add(plant.stateId);
			const region = plant.regionId != null ? byId.get(plant.regionId) : undefined;
			const output = region
				? plantOutput(plant.plantType, {
						latitude: Number(region.latitude),
						terrain: region.terrain,
						grid: region.grid ?? 0,
						storage: region.storage ?? 0
					})
				: 0;
			await tx
				.update(powerPlants)
				.set({
					powerOutput: output,
					sitingFactor: region ? Math.round(plantSiting(plant.plantType, { latitude: Number(region.latitude), terrain: region.terrain }).factor * 1000) : 1000
				})
				.where(eq(powerPlants.id, plant.id));
		}
	});
	for (const stateId of touched) await recomputeGrid(db, stateId, now);
	return due.length;
}

/** Change a state's refined-fuel policy. */
export async function setFuelShares(db: Database, stateId: number, shares: FuelShares): Promise<void> {
	if (!validShares(shares)) throw new EnergyError("Civilian, military and export shares must add up to 100.");
	const row = await ensureEnergyRow(db, stateId);
	await db
		.update(stateEnergy)
		.set({
			civilianShare: shares.civilian,
			militaryShare: shares.military,
			exportShare: shares.export,
			updatedAt: new Date()
		})
		.where(eq(stateEnergy.stateId, row.stateId));
}

export interface EnergyTickResult {
	states: number;
	plantsCompleted: number;
	fuelBurned: number;
	fuelExported: number;
	exportRevenue: number;
}

/**
 * Daily energy tick: finish construction, recompute every grid from live
 * regional siting, burn plant fuel, charge upkeep, and divide refined fuel
 * between the three policy pools.
 */
export async function dailyEnergyTick(db: Database, now = new Date()): Promise<EnergyTickResult> {
	const plantsCompleted = await completePendingPlants(db, {}, now);
	const result: EnergyTickResult = {
		states: 0,
		plantsCompleted,
		fuelBurned: 0,
		fuelExported: 0,
		exportRevenue: 0
	};

	const stateRows = await db.select({ stateId: states.id }).from(states);
	for (const { stateId } of stateRows) {
		const plants = await db.select().from(powerPlants).where(eq(powerPlants.stateId, stateId));
		const active = plants.filter((p) => p.isOperational && !p.isUnderConstruction);
		const energy = await ensureEnergyRow(db, stateId);
		let production = energy.totalProduction;
		let fuelFactor = 100;
		let maintenanceFactor = 100;

		if (active.length) {
		// --- output from live regional siting, grid and storage ---
		const regionIds = [...new Set(active.map((p) => p.regionId).filter((id): id is number => id != null))];
		const regionRows = regionIds.length ? await db.select().from(regions).where(inArray(regions.id, regionIds)) : [];
		const byId = new Map(regionRows.map((r) => [r.id, r]));

		// --- fuel and upkeep ---
		const needs = dailyFuelUse(active.map((p) => ({ plantType: p.plantType, count: 1 })));
		let required = 0;
		let supplied = 0;
		for (const [resource, amount] of Object.entries(needs)) {
			const units = amount ?? 0;
			required += units;
			const [stock] = await db
				.select()
				.from(stateResourceInventory)
				.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resource as never)))
				.limit(1);
			const burned = Math.min(stock?.quantity ?? 0, units);
			if (burned > 0) {
				await db
					.update(stateResourceInventory)
					.set({ quantity: sql`${stateResourceInventory.quantity} - ${burned}`, updatedAt: now })
					.where(eq(stateResourceInventory.id, stock!.id));
				result.fuelBurned += burned;
			}
			supplied += burned;
		}
		fuelFactor = required > 0 ? Math.max(0, Math.min(100, Math.round((supplied / required) * 100))) : 100;

		const upkeep = dailyUpkeep(active.map((p) => ({ plantType: p.plantType, count: 1 })));
		const [treasury] = await db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.limit(1);
		const balance = Number(treasury?.balance ?? 0);
		const paid = Math.min(balance, upkeep);
		if (paid > 0) {
			await db
				.update(stateTreasury)
				.set({ balance: sql`${stateTreasury.balance} - ${paid}`, totalSpent: sql`${stateTreasury.totalSpent} + ${paid}`, updatedAt: now })
				.where(eq(stateTreasury.stateId, stateId));
		}
		maintenanceFactor = upkeep > 0 ? Math.max(0, Math.min(100, Math.round((paid / upkeep) * 100))) : 100;

		let total = 0;
		const byType: Partial<Record<PowerPlantType, number>> = {};
		for (const plant of active) {
			const region = plant.regionId != null ? byId.get(plant.regionId) : undefined;
			let output = region
				? plantOutput(plant.plantType, {
						latitude: Number(region.latitude),
						terrain: region.terrain,
						grid: region.grid ?? 0,
						storage: region.storage ?? 0
					})
				: plant.powerOutput;
			if (POWER_PLANTS[plant.plantType].fuel) output = Math.floor((output * fuelFactor) / 100);
			output = Math.floor((output * maintenanceFactor) / 100);
			await db.update(powerPlants).set({ powerOutput: output }).where(eq(powerPlants.id, plant.id));
			total += output;
			byType[plant.plantType] = (byType[plant.plantType] ?? 0) + 1;
		}
		production = Math.floor(total * energyDiversityFactor(Object.keys(byType).length));
		}

		// --- refined fuel -> civilian / military / export ---
		const [fuelRow] = await db
			.select()
			.from(stateResourceInventory)
			.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, "fuel")))
			.limit(1);
		const shares: FuelShares = {
			civilian: energy.civilianShare,
			military: energy.militaryShare,
			export: energy.exportShare
		};
		const pools = allocateFuel(fuelRow?.quantity ?? 0, shares);
		if (pools.civilian + pools.military + pools.export > 0 && fuelRow) {
			await db
				.update(stateResourceInventory)
				.set({ quantity: sql`${stateResourceInventory.quantity} - ${fuelRow.quantity}`, updatedAt: now })
				.where(eq(stateResourceInventory.id, fuelRow.id));
		}
		const blockaded = (await blockadeEffectsOn(db, stateId, now)).tradeFactor < 1;
		const earned = exportRevenue(pools.export, blockaded);
		if (earned > 0) {
			await db
				.update(stateTreasury)
				.set({
					balance: sql`${stateTreasury.balance} + ${earned}`,
					totalCollected: sql`${stateTreasury.totalCollected} + ${earned}`,
					updatedAt: now
				})
				.where(eq(stateTreasury.stateId, stateId));
		}

		await db
			.update(stateEnergy)
			.set({
				totalProduction: production,
				fuelFactor,
				maintenanceFactor,
				civilianFuel: Math.floor(energy.civilianFuel * (1 - ALLOCATION.CIVILIAN_FUEL_DECAY)) + pools.civilian,
				militaryFuel: Math.min(ALLOCATION.MAX_MILITARY_FUEL, energy.militaryFuel + pools.military),
				exportedFuel: energy.exportedFuel + pools.export,
				lastEnergyTickAt: now,
				updatedAt: now
			})
			.where(eq(stateEnergy.stateId, stateId));

		result.states++;
		result.fuelExported += pools.export;
		result.exportRevenue += earned;
	}
	return result;
}

/** Price label for the energy desk: one imported component under blockade. */
export function partPriceLabel(part: Parameters<typeof partPrice>[0], blockaded = false): number {
	return partPrice(part, blockaded);
}

/** Grid level each plant type needs (re-exported for the UI). */
export const PLANT_GRID_LEVELS = PLANT_GRID_REQUIRED;
