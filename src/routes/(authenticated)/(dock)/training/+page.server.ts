// src/routes/(authenticated)/(dock)/training/+page.server.ts
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

import {
	militaryUnits,
	militaryUnitTemplates,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	states,
	regions,
	blocs
} from "$lib/server/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "$lib/server/db";

type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

// NATO naming convention for battalions
const natoUnitNames: Record<string, string[]> = {
	air_defence: ["Air Defense Battalion", "SAM Battalion", "Anti-Air Battalion", "SHORAD Battalion"],
	heavy_armor: ["Armored Battalion", "Tank Battalion", "Heavy Armor Battalion", "Mechanized Battalion"],
	ifv: ["Infantry Fighting Vehicle Battalion", "IFV Battalion", "Mechanized Infantry Battalion"],
	artillery: ["Artillery Battalion", "Field Artillery Battalion", "Howitzer Battalion", "Rocket Artillery Battalion"],
	light_infantry: ["Infantry Battalion", "Light Infantry Battalion", "Rifle Battalion", "Airborne Battalion"],
	bomber_squadron: ["Bomber Squadron", "Strategic Bomber Squadron", "Heavy Bomber Squadron"],
	fighter_squadron: [
		"Fighter Squadron",
		"Air Superiority Squadron",
		"Interceptor Squadron",
		"Tactical Fighter Squadron"
	]
};

function generateUnitName(unitType: string, existingUnits: any[]): string {
	const possibleNames = natoUnitNames[unitType] || ["Battalion"];
	const usedNumbers = existingUnits
		.filter((u) => u.unitType === unitType)
		.map((u) => {
			const match = u.name.match(/(\d+)(st|nd|rd|th)/);
			return match ? parseInt(match[1]) : 0;
		});

	let number = 1;
	while (usedNumbers.includes(number)) {
		number++;
	}

	const suffix = number === 1 ? "st" : number === 2 ? "nd" : number === 3 ? "rd" : "th";
	const baseName = possibleNames[Math.floor(Math.random() * possibleNames.length)];

	return `${number}${suffix} ${baseName}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's primary residence with state and bloc info
	const [residence] = await db
		.select({
			regionId: residences.regionId,
			stateId: states.id,
			stateName: states.name,
			blocId: blocs.id,
			blocName: blocs.name,
			blocColor: blocs.color
		})
		.from(residences)
		.leftJoin(regions, eq(residences.regionId, regions.id))
		.leftJoin(states, eq(regions.stateId, states.id))
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(and(eq(residences.userId, account.id)))
		.limit(1);

	if (!residence || !residence.stateId) {
		throw error(400, "You must have a primary residence to train military units");
	}

	// Get all user's military units
	const units = await db
		.select({
			id: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			unitSize: militaryUnits.unitSize,
			attack: militaryUnits.attack,
			defense: militaryUnits.defense,
			organization: militaryUnits.organization,
			supplyLevel: militaryUnits.supplyLevel,
			isTraining: militaryUnits.isTraining,
			trainingStartedAt: militaryUnits.trainingStartedAt,
			trainingCompletesAt: militaryUnits.trainingCompletesAt,
			createdAt: militaryUnits.createdAt
		})
		.from(militaryUnits)
		.leftJoin(regions, eq(militaryUnits.regionId, regions.id))
		.where(eq(militaryUnits.ownerId, account.id))
		.orderBy(militaryUnits.createdAt);

	// Get all unit templates
	let templates = await db.select().from(militaryUnitTemplates).orderBy(militaryUnitTemplates.displayName);

	// If no templates exist, create default ones
	if (templates.length === 0) {
		const defaultTemplates = [
			{
				unitType: "light_infantry" as const,
				displayName: "Light Infantry",
				description: "Basic infantry battalion with rifles and light equipment",
				baseAttack: 15,
				baseDefense: 20,
				trainingDuration: 6,
				currencyCost: 50000,
				ironCost: 0,
				steelCost: 50,
				gunpowderCost: 100,
				riflesCost: 500,
				ammunitionCost: 1000,
				artilleryCost: 0,
				vehiclesCost: 0,
				explosivesCost: 50
			},
			{
				unitType: "heavy_armor" as const,
				displayName: "Heavy Armor",
				description: "Tank battalion with heavy armor and firepower",
				baseAttack: 50,
				baseDefense: 40,
				trainingDuration: 12,
				currencyCost: 200000,
				ironCost: 200,
				steelCost: 500,
				gunpowderCost: 200,
				riflesCost: 200,
				ammunitionCost: 2000,
				artilleryCost: 0,
				vehiclesCost: 50,
				explosivesCost: 100
			},
			{
				unitType: "ifv" as const,
				displayName: "Infantry Fighting Vehicles",
				description: "Mechanized infantry with IFVs",
				baseAttack: 30,
				baseDefense: 30,
				trainingDuration: 10,
				currencyCost: 150000,
				ironCost: 100,
				steelCost: 300,
				gunpowderCost: 150,
				riflesCost: 400,
				ammunitionCost: 1500,
				artilleryCost: 0,
				vehiclesCost: 30,
				explosivesCost: 75
			},
			{
				unitType: "artillery" as const,
				displayName: "Artillery",
				description: "Long-range artillery battalion",
				baseAttack: 40,
				baseDefense: 15,
				trainingDuration: 8,
				currencyCost: 100000,
				ironCost: 150,
				steelCost: 200,
				gunpowderCost: 300,
				riflesCost: 100,
				ammunitionCost: 3000,
				artilleryCost: 20,
				vehiclesCost: 10,
				explosivesCost: 200
			},
			{
				unitType: "air_defence" as const,
				displayName: "Air Defense",
				description: "Anti-aircraft missile battalion",
				baseAttack: 25,
				baseDefense: 25,
				trainingDuration: 10,
				currencyCost: 175000,
				ironCost: 100,
				steelCost: 400,
				gunpowderCost: 100,
				riflesCost: 200,
				ammunitionCost: 1000,
				artilleryCost: 15,
				vehiclesCost: 20,
				explosivesCost: 150
			},
			{
				unitType: "fighter_squadron" as const,
				displayName: "Fighter Squadron",
				description: "Air superiority fighter squadron",
				baseAttack: 60,
				baseDefense: 35,
				trainingDuration: 16,
				currencyCost: 300000,
				ironCost: 200,
				steelCost: 600,
				gunpowderCost: 150,
				riflesCost: 100,
				ammunitionCost: 2500,
				artilleryCost: 0,
				vehiclesCost: 12,
				explosivesCost: 200
			},
			{
				unitType: "bomber_squadron" as const,
				displayName: "Bomber Squadron",
				description: "Strategic bomber squadron",
				baseAttack: 70,
				baseDefense: 20,
				trainingDuration: 18,
				currencyCost: 350000,
				ironCost: 250,
				steelCost: 700,
				gunpowderCost: 200,
				riflesCost: 50,
				ammunitionCost: 2000,
				artilleryCost: 0,
				vehiclesCost: 8,
				explosivesCost: 500
			}
		];

		await db.insert(militaryUnitTemplates).values(defaultTemplates);
		templates = await db.select().from(militaryUnitTemplates).orderBy(militaryUnitTemplates.displayName);
	}

	// Get user's resources
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));
	const resourceMap = Object.fromEntries(resources.map((r) => [r.resourceType, r.quantity]));

	// Get user's products
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));
	const productMap = Object.fromEntries(products.map((p) => [p.productType, p.quantity]));

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id)).limit(1);

	return {
		units,
		templates: [], //todo: add statically,,
		residence: {
			regionId: residence.regionId,
			regionName: residence.regionName,
			stateId: residence.stateId,
			stateName: residence.stateName,
			bloc: residence.blocId
				? {
						id: residence.blocId,
						name: residence.blocName,
						color: residence.blocColor
					}
				: null
		},
		inventory: {
			currency: wallet?.balance || 0,
			resources: resourceMap,
			products: productMap
		}
	};
};

export const actions: Actions = {
	train: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const templateId = parseInt(formData.get("templateId") as string);
		const unitName = formData.get("unitName") as string;
		const unitSize = formData.get("unitSize") as string;

		// Validation
		if (!templateId || !unitName || !unitSize) {
			return fail(400, { error: "Missing required fields" });
		}

		if (!["brigade", "division", "corps"].includes(unitSize)) {
			return fail(400, { error: "Invalid unit size" });
		}

		// Get user's primary residence
		const [residence] = await db
			.select({
				regionId: residences.regionId,
				stateId: states.id
			})
			.from(residences)
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.leftJoin(states, eq(regions.stateId, states.id))
			.where(and(eq(residences.userId, account.id)))
			.limit(1);

		if (!residence || !residence.stateId) {
			return fail(400, { error: "You must have a primary residence to train units" });
		}

		const stateId = residence.stateId;
		const regionId = residence.regionId;

		// Get template
		const [template] = await db
			.select()
			.from(militaryUnitTemplates)
			.where(eq(militaryUnitTemplates.id, templateId))
			.limit(1);

		if (!template) {
			return fail(404, { error: "Template not found" });
		}

		// Calculate multiplier based on unit size
		const multiplier = unitSize === "brigade" ? 1 : unitSize === "division" ? 1.5 : 2;

		// Calculate costs
		const currencyCost = Math.round(template.currencyCost * multiplier);
		const ironCost = Math.round(template.ironCost * multiplier);
		const steelCost = Math.round(template.steelCost * multiplier);
		const gunpowderCost = Math.round(template.gunpowderCost * multiplier);
		const riflesCost = Math.round(template.riflesCost * multiplier);
		const ammunitionCost = Math.round(template.ammunitionCost * multiplier);
		const artilleryCost = Math.round(template.artilleryCost * multiplier);
		const vehiclesCost = Math.round(template.vehiclesCost * multiplier);
		const explosivesCost = Math.round(template.explosivesCost * multiplier);

		// Check currency
		const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id)).limit(1);

		if (!wallet || wallet.balance < currencyCost) {
			return fail(400, { error: "Insufficient currency" });
		}

		// Check resources
		const checkResource = async (type: ResourceType, required: number) => {
			if (required === 0) return true;

			const [resource] = await db
				.select()
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, type)))
				.limit(1);

			return resource && resource.quantity >= required;
		};

		const checkProduct = async (type: ProductType, required: number) => {
			if (required === 0) return true;

			const [product] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, type)))
				.limit(1);

			return product && product.quantity >= required;
		};

		// Validate all resources
		const hasIron = await checkResource("iron", ironCost);
		const hasSteel = await checkResource("steel", steelCost);
		const hasGunpowder = await checkResource("gunpowder", gunpowderCost);
		const hasRifles = await checkProduct("rifles", riflesCost);
		const hasAmmunition = await checkProduct("ammunition", ammunitionCost);
		const hasArtillery = await checkProduct("artillery", artilleryCost);
		const hasVehicles = await checkProduct("vehicles", vehiclesCost);
		const hasExplosives = await checkProduct("explosives", explosivesCost);

		if (!hasIron) return fail(400, { error: "Insufficient iron" });
		if (!hasSteel) return fail(400, { error: "Insufficient steel" });
		if (!hasGunpowder) return fail(400, { error: "Insufficient gunpowder" });
		if (!hasRifles) return fail(400, { error: "Insufficient rifles" });
		if (!hasAmmunition) return fail(400, { error: "Insufficient ammunition" });
		if (!hasArtillery) return fail(400, { error: "Insufficient artillery" });
		if (!hasVehicles) return fail(400, { error: "Insufficient vehicles" });
		if (!hasExplosives) return fail(400, { error: "Insufficient explosives" });

		try {
			await db.transaction(async (tx) => {
				// Deduct currency
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} - ${currencyCost}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));

				// Deduct resources
				const deductResource = async (type: ResourceType, amount: number) => {
					if (amount === 0) return;
					await tx
						.update(resourceInventory)
						.set({
							quantity: sql`${resourceInventory.quantity} - ${amount}`,
							updatedAt: new Date()
						})
						.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, type)));
				};

				const deductProduct = async (type: ProductType, amount: number) => {
					if (amount === 0) return;
					await tx
						.update(productInventory)
						.set({
							quantity: sql`${productInventory.quantity} - ${amount}`,
							updatedAt: new Date()
						})
						.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, type)));
				};

				await deductResource("iron", ironCost);
				await deductResource("steel", steelCost);
				await deductResource("gunpowder", gunpowderCost);
				await deductProduct("rifles", riflesCost);
				await deductProduct("ammunition", ammunitionCost);
				await deductProduct("artillery", artilleryCost);
				await deductProduct("vehicles", vehiclesCost);
				await deductProduct("explosives", explosivesCost);

				// Calculate training completion time
				const trainingStartedAt = new Date();
				const trainingDuration = Math.round(template.trainingDuration * multiplier);
				const trainingCompletesAt = new Date(trainingStartedAt.getTime() + trainingDuration * 3600000);

				// Calculate stats
				const attack = Math.round(template.baseAttack * multiplier);
				const defense = Math.round(template.baseDefense * multiplier);

				// Create military unit
				await tx.insert(militaryUnits).values({
					name: unitName,
					ownerId: account.id,
					stateId: stateId,
					regionId: regionId,
					unitType: template.unitType,
					unitSize: unitSize as "brigade" | "division" | "corps",
					attack,
					defense,
					organization: 100,
					supplyLevel: 100,
					isTraining: true,
					trainingStartedAt,
					trainingCompletesAt
				});
			});

			return { success: true, message: `Training started for ${unitName}!` };
		} catch (e) {
			console.error("Training error:", e);
			return fail(500, { error: "Failed to start training" });
		}
	},

	completeTraining: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const unitId = parseInt(formData.get("unitId") as string);

		if (!unitId) {
			return fail(400, { error: "Missing unit ID" });
		}

		const [unit] = await db
			.select()
			.from(militaryUnits)
			.where(and(eq(militaryUnits.id, unitId), eq(militaryUnits.ownerId, account.id)))
			.limit(1);

		if (!unit) {
			return fail(404, { error: "Unit not found" });
		}

		if (!unit.isTraining) {
			return fail(400, { error: "Unit is not training" });
		}

		if (unit.trainingCompletesAt && unit.trainingCompletesAt > new Date()) {
			return fail(400, { error: "Training not yet complete" });
		}

		await db
			.update(militaryUnits)
			.set({
				isTraining: false,
				trainingStartedAt: null,
				trainingCompletesAt: null,
				updatedAt: new Date()
			})
			.where(eq(militaryUnits.id, unitId));

		return { success: true, message: "Training completed!" };
	},

	disbandUnit: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const unitId = parseInt(formData.get("unitId") as string);

		if (!unitId) {
			return fail(400, { error: "Missing unit ID" });
		}

		const [unit] = await db
			.select()
			.from(militaryUnits)
			.where(and(eq(militaryUnits.id, unitId), eq(militaryUnits.ownerId, account.id)))
			.limit(1);

		if (!unit) {
			return fail(404, { error: "Unit not found" });
		}

		await db.delete(militaryUnits).where(eq(militaryUnits.id, unitId));

		return { success: true, message: "Unit disbanded" };
	}
};
