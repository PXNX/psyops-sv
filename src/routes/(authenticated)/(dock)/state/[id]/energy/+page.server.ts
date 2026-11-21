// The energy desk: site new plants, read the regional grid and set the
// refined-fuel policy. All rules live in config/services; this file only
// checks authority, assembles the view and forwards the two forms.
import { error, fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { powerPlants, regions, stateResourceInventory, stateTreasury, states } from "#lib/server/schema.js";
import {
	PLANT_CONSTRUCTION,
	PLANT_GRID_REQUIRED,
	POWER_PLANT_TYPES,
	POWER_PLANTS,
	importedPartsCost,
	plantOutput,
	plantSiting,
	regionTerrain,
	sitingProblems,
	type PowerPlantType
} from "#lib/config/index.js";
import { getRegionName } from "#lib/utils/formatting.js";
import {
	completePendingPlants,
	EnergyError,
	energyAuthority,
	ensureEnergyRow,
	startPlantConstruction,
	setFuelShares
} from "#lib/server/services/economy/energy.js";
import { blockadeEffectsOn } from "#lib/server/services/military/naval.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);
	const authority = await energyAuthority(db, account.id);
	if (!authority || authority.stateId !== stateId) error(403, "Only the president or economy minister can run the energy desk.");

	const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);
	if (!state) error(404, "State not found");

	// A visit also matures any plant whose construction time has elapsed.
	await completePendingPlants(db, { stateId });

	const regionRows = await db
		.select()
		.from(regions)
		.where(eq(regions.stateId, stateId));
	const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);
	const [energy, resources, plants, blockade] = await Promise.all([
		ensureEnergyRow(db, stateId),
		db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, stateId)),
		db.select().from(powerPlants).where(eq(powerPlants.stateId, stateId)),
		blockadeEffectsOn(db, stateId)
	]);
	const stockpile = Object.fromEntries(resources.map((r) => [r.resourceType, r.quantity]));
	const blockaded = blockade.tradeFactor < 1;
	const balance = Number(treasury?.balance ?? 0);

	const regionViews = regionRows.map((r) => {
		// The shared deterministic derivation covers the 1,038 map regions,
		// which are seeded with coordinates but no explicit ground cover.
		const siteTerrain = regionTerrain({ id: r.id, terrain: r.terrain, infrastructure: r.infrastructure });
		const site = {
			latitude: Number(r.latitude),
			terrain: siteTerrain,
			grid: r.grid ?? 0,
			storage: r.storage ?? 0
		};
		const previews = POWER_PLANT_TYPES.map((type) => {
			const recipe = PLANT_CONSTRUCTION[type];
			const partsCost = importedPartsCost(type, blockaded);
			const problems = sitingProblems(type, site);
			if (balance < partsCost) problems.push(`Treasury short by ${(partsCost - balance).toLocaleString()}.`);
			for (const [resource, units] of Object.entries(recipe.domestic)) {
				if ((stockpile[resource] ?? 0) < (units ?? 0))
					problems.push(`${(units ?? 0) - (stockpile[resource] ?? 0)} more ${resource} needed.`);
			}
			return {
				type,
				label: POWER_PLANTS[type].label,
				icon: POWER_PLANTS[type].icon,
				output: plantOutput(type, site),
				factor: plantSiting(type, site).factor,
				notes: plantSiting(type, site).notes,
				days: recipe.days,
				partsCost,
				gridRequired: PLANT_GRID_REQUIRED[type],
				problems
			};
		});
		return {
			id: r.id,
			name: getRegionName(r.id),
			latitude: Number(r.latitude),
			terrain: siteTerrain,
			grid: r.grid ?? 0,
			storage: r.storage ?? 0,
			previews
		};
	});

	const regionById = new Map(regionRows.map((r) => [r.id, r]));
	return {
		state: { id: state.id, name: state.name },
		role: authority.role,
		blockaded,
		treasury: balance,
		energy: {
			totalProduction: energy.totalProduction,
			usedProduction: energy.usedProduction,
			civilianShare: energy.civilianShare,
			militaryShare: energy.militaryShare,
			exportShare: energy.exportShare,
			civilianFuel: energy.civilianFuel,
			militaryFuel: energy.militaryFuel,
			exportedFuel: energy.exportedFuel,
			fuelFactor: energy.fuelFactor,
			maintenanceFactor: energy.maintenanceFactor,
			lastEnergyTickAt: energy.lastEnergyTickAt
		},
		regions: regionViews,
		plants: plants.map((p) => ({
			id: p.id,
			name: p.name,
			plantType: p.plantType,
			label: POWER_PLANTS[p.plantType]?.label ?? p.plantType,
			icon: POWER_PLANTS[p.plantType]?.icon ?? "⚡",
			output: p.powerOutput,
			regionId: p.regionId,
			regionName: p.regionId ? getRegionName(p.regionId) : null,
			underConstruction: p.isUnderConstruction,
			operational: p.isOperational,
			completesAt: p.constructionCompletesAt
		})),
		resources: resources.map((r) => ({ resourceType: r.resourceType, quantity: r.quantity })),
		siteCount: regionById.size
	};
};

export const actions: Actions = {
	buildPlant: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const authority = await energyAuthority(db, account.id);
		if (!authority || authority.stateId !== stateId) return fail(403, { error: "Not authorised." });

		const form = await request.formData();
		const regionId = Number(form.get("regionId"));
		const plantType = String(form.get("plantType")) as PowerPlantType;
		const name = String(form.get("name") ?? "");
		if (!POWER_PLANT_TYPES.includes(plantType)) return fail(400, { error: "Unknown plant type." });

		try {
			const result = await startPlantConstruction(
				db,
				{ stateId, regionId, plantType, name, builtBy: account.id },
				new Date()
			);
			return { success: true, message: `${name.trim()} is under construction (~${result.output} MW when finished).` };
		} catch (e) {
			return fail(400, { error: e instanceof EnergyError ? e.message : "Could not start construction." });
		}
	},

	setPolicy: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const authority = await energyAuthority(db, account.id);
		if (!authority || authority.stateId !== stateId) return fail(403, { error: "Not authorised." });

		const form = await request.formData();
		const shares = {
			civilian: Number(form.get("civilian")),
			military: Number(form.get("military")),
			export: Number(form.get("export"))
		};
		try {
			await setFuelShares(db, stateId, shares);
			return { success: true, message: "Refined-fuel policy updated." };
		} catch (e) {
			return fail(400, { error: e instanceof EnergyError ? e.message : "Could not change the policy." });
		}
	}
};
