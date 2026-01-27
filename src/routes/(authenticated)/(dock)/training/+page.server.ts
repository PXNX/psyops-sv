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
import { eq, and, sql } from "drizzle-orm";
import { db } from "$lib/server/db";

type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

// Standardized unit names - no NATO variety, just consistent naming
const unitTypeNames: Record<string, string> = {
	air_defence: "Air Defense Battalion",
	armor: "Armored Battalion",
	mechanzied: "Mechanized Battalion",
	artillery: "Artillery Battalion",
	infantry: "Infantry Battalion",
	bomber_squadron: "Bomber Squadron",
	fighter_squadron: "Fighter Squadron"
};

function generateUnitName(unitType: string, existingUnits: any[]): string {
	const baseName = unitTypeNames[unitType] || "Battalion";

	const usedNumbers = existingUnits
		.filter((u) => u.unitType === unitType)
		.map((u) => {
			const match = u.name.match(/^(\d+)(st|nd|rd|th)/);
			return match ? parseInt(match[1]) : 0;
		});

	let number = 1;
	while (usedNumbers.includes(number)) {
		number++;
	}

	const suffix = number === 1 ? "st" : number === 2 ? "nd" : number === 3 ? "rd" : "th";
	return `${number}${suffix} ${baseName}`;
}

async function getUserResidence(userId: string) {
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
		.where(eq(residences.userId, userId))
		.limit(1);

	if (!residence || !residence.stateId) {
		throw error(400, "You must have a primary residence to train military units");
	}

	return residence;
}

async function getUserInventory(userId: string) {
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, userId));
	const resourceMap = Object.fromEntries(resources.map((r) => [r.resourceType, r.quantity]));

	const products = await db.select().from(productInventory).where(eq(productInventory.userId, userId));
	const productMap = Object.fromEntries(products.map((p) => [p.productType, p.quantity]));

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1);

	return {
		currency: wallet?.balance || 0,
		resources: resourceMap,
		products: productMap
	};
}

async function getOrCreateTemplates() {
	let templates = await db.select().from(militaryUnitTemplates).orderBy(militaryUnitTemplates.displayName);

	if (templates.length === 0) {
		const defaultTemplates = [
			{
				unitType: "infantry" as const,
				displayName: "Infantry Battalion",
				description: "Standard infantry unit",
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
				unitType: "armor" as const,
				displayName: "Armored Battalion",
				description: "Heavy tank unit",
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
				unitType: "mechanzied" as const,
				displayName: "Mechanized Battalion",
				description: "Infantry fighting vehicles",
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
				displayName: "Artillery Battalion",
				description: "Long-range artillery",
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
				displayName: "Air Defense Battalion",
				description: "Anti-aircraft unit",
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
				description: "Air superiority fighters",
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
				description: "Strategic bombers",
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

	return templates;
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const residence = await getUserResidence(account.id);
	const inventory = await getUserInventory(account.id);
	const templates = await getOrCreateTemplates();

	const units = await db
		.select({
			id: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			attack: militaryUnits.attack,
			defense: militaryUnits.defense,
			organization: militaryUnits.organization,
			health: militaryUnits.health,
			supplyLevel: militaryUnits.supplyLevel,
			isTraining: militaryUnits.isTraining,
			trainingStartedAt: militaryUnits.trainingStartedAt,
			trainingCompletesAt: militaryUnits.trainingCompletesAt,
			createdAt: militaryUnits.createdAt
		})
		.from(militaryUnits)
		.where(eq(militaryUnits.ownerId, account.id))
		.orderBy(militaryUnits.createdAt);

	return {
		units,
		templates,
		residence: {
			regionId: residence.regionId,
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
		inventory
	};
};

async function checkResourceAvailability(
	userId: string,
	template: {
		currencyCost: number;
		ironCost: number;
		steelCost: number;
		gunpowderCost: number;
		riflesCost: number;
		ammunitionCost: number;
		artilleryCost: number;
		vehiclesCost: number;
		explosivesCost: number;
	}
) {
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1);

	if (!wallet || wallet.balance < template.currencyCost) {
		return { valid: false, error: "Insufficient currency" };
	}

	const resourceChecks = [
		{
			type: "iron" as ResourceType,
			required: template.ironCost,
			table: resourceInventory,
			typeCol: resourceInventory.resourceType
		},
		{
			type: "steel" as ResourceType,
			required: template.steelCost,
			table: resourceInventory,
			typeCol: resourceInventory.resourceType
		},
		{
			type: "gunpowder" as ResourceType,
			required: template.gunpowderCost,
			table: resourceInventory,
			typeCol: resourceInventory.resourceType
		}
	];

	const productChecks = [
		{
			type: "rifles" as ProductType,
			required: template.riflesCost,
			table: productInventory,
			typeCol: productInventory.productType
		},
		{
			type: "ammunition" as ProductType,
			required: template.ammunitionCost,
			table: productInventory,
			typeCol: productInventory.productType
		},
		{
			type: "artillery" as ProductType,
			required: template.artilleryCost,
			table: productInventory,
			typeCol: productInventory.productType
		},
		{
			type: "vehicles" as ProductType,
			required: template.vehiclesCost,
			table: productInventory,
			typeCol: productInventory.productType
		},
		{
			type: "explosives" as ProductType,
			required: template.explosivesCost,
			table: productInventory,
			typeCol: productInventory.productType
		}
	];

	for (const { type, required, table, typeCol } of [...resourceChecks, ...productChecks]) {
		if (required === 0) continue;

		const [item] = await db
			.select()
			.from(table)
			.where(and(eq(table.userId, userId), eq(typeCol, type)))
			.limit(1);

		if (!item || item.quantity < required) {
			return { valid: false, error: `Insufficient ${type}` };
		}
	}

	return { valid: true };
}

async function deductResources(
	tx: any,
	userId: string,
	template: {
		currencyCost: number;
		ironCost: number;
		steelCost: number;
		gunpowderCost: number;
		riflesCost: number;
		ammunitionCost: number;
		artilleryCost: number;
		vehiclesCost: number;
		explosivesCost: number;
	}
) {
	// Deduct currency
	await tx
		.update(userWallets)
		.set({
			balance: sql`${userWallets.balance} - ${template.currencyCost}`,
			updatedAt: new Date()
		})
		.where(eq(userWallets.userId, userId));

	// Deduct resources
	const deductions = [
		{ table: resourceInventory, type: "iron", amount: template.ironCost, typeCol: resourceInventory.resourceType },
		{ table: resourceInventory, type: "steel", amount: template.steelCost, typeCol: resourceInventory.resourceType },
		{
			table: resourceInventory,
			type: "gunpowder",
			amount: template.gunpowderCost,
			typeCol: resourceInventory.resourceType
		},
		{ table: productInventory, type: "rifles", amount: template.riflesCost, typeCol: productInventory.productType },
		{
			table: productInventory,
			type: "ammunition",
			amount: template.ammunitionCost,
			typeCol: productInventory.productType
		},
		{
			table: productInventory,
			type: "artillery",
			amount: template.artilleryCost,
			typeCol: productInventory.productType
		},
		{ table: productInventory, type: "vehicles", amount: template.vehiclesCost, typeCol: productInventory.productType },
		{
			table: productInventory,
			type: "explosives",
			amount: template.explosivesCost,
			typeCol: productInventory.productType
		}
	];

	for (const { table, type, amount, typeCol } of deductions) {
		if (amount === 0) continue;

		await tx
			.update(table)
			.set({
				quantity: sql`${table.quantity} - ${amount}`,
				updatedAt: new Date()
			})
			.where(and(eq(table.userId, userId), eq(typeCol, type)));
	}
}

export const actions: Actions = {
	train: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const templateId = parseInt(formData.get("templateId") as string);

		if (!templateId) {
			return fail(400, { error: "Missing template ID" });
		}

		const residence = await getUserResidence(account.id);
		const [template] = await db
			.select()
			.from(militaryUnitTemplates)
			.where(eq(militaryUnitTemplates.id, templateId))
			.limit(1);

		if (!template) {
			return fail(404, { error: "Template not found" });
		}

		// Check if user can afford the unit
		const availabilityCheck = await checkResourceAvailability(account.id, template);
		if (!availabilityCheck.valid) {
			return fail(400, { error: availabilityCheck.error });
		}

		// Get existing units for name generation
		const existingUnits = await db.select().from(militaryUnits).where(eq(militaryUnits.ownerId, account.id));
		const unitName = generateUnitName(template.unitType, existingUnits);

		try {
			await db.transaction(async (tx) => {
				await deductResources(tx, account.id, template);

				const trainingStartedAt = new Date();
				const trainingCompletesAt = new Date(trainingStartedAt.getTime() + template.trainingDuration * 3600000);

				await tx.insert(militaryUnits).values({
					name: unitName,
					ownerId: account.id,
					stateId: residence.stateId,
					regionId: residence.regionId,
					unitType: template.unitType,
					unitSize: "brigade",
					attack: template.baseAttack,
					defense: template.baseDefense,
					organization: 100,
					health: 100,
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
