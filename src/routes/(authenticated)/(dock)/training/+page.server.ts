// src/routes/(authenticated)/(dock)/training/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

import {
	militaryUnits,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	states,
	regions,
	blocs,
	militaryUnitTypeEnum,
	userTravels,
	battles,
	battleParticipants
} from "$lib/server/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
	MILITARY_UNIT_TEMPLATES,
	type MilitaryUnitTemplate,
	EXERCISE_CONFIG,
	calculateExerciseExperienceGain
} from "$lib/config";

type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

// Standardized unit names - no NATO variety, just consistent naming
const unitTypeNames: Record<string, string> = {
	air_defence: "Air Defence Battalion",
	armor: "Armored Battalion",
	mechanized: "Mechanized Battalion",
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

	if (!residence) {
		throw redirect(303, "/welcome/region");
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

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const residence = await getUserResidence(account.id);
	const inventory = await getUserInventory(account.id);

	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	const isIndependentRegion = !residence.stateId;
	const isTraveling = !!activeTravel;

	const units = await db
		.select({
			id: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			organization: militaryUnits.organization,
			health: militaryUnits.health,
			supplyLevel: militaryUnits.supplyLevel,
			experience: militaryUnits.experience,
			isTraining: militaryUnits.isTraining,
			trainingStartedAt: militaryUnits.trainingStartedAt,
			trainingCompletesAt: militaryUnits.trainingCompletesAt,
			isExercising: militaryUnits.isExercising,
			exerciseStartedAt: militaryUnits.exerciseStartedAt,
			exerciseCompletesAt: militaryUnits.exerciseCompletesAt,
			createdAt: militaryUnits.createdAt
		})
		.from(militaryUnits)
		.where(eq(militaryUnits.ownerId, account.id))
		.orderBy(militaryUnits.createdAt);

	return {
		units,
		templates: MILITARY_UNIT_TEMPLATES,
		exerciseConfig: EXERCISE_CONFIG,
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
		inventory,
		isIndependentRegion,
		isTraveling
	};
};

// Equipment worn out during an exercise costs a fraction of the unit's build cost.
type EquipmentCost = {
	currencyCost: number;
	ironCost: number;
	steelCost: number;
	gunpowderCost: number;
	riflesCost: number;
	ammunitionCost: number;
	artilleryCost: number;
	vehiclesCost: number;
	explosivesCost: number;
};

function getExerciseEquipmentCost(template: MilitaryUnitTemplate): EquipmentCost {
	const factor = EXERCISE_CONFIG.EQUIPMENT_COST_FACTOR;
	const scale = (value: number | undefined) => Math.floor((value ?? 0) * factor);
	return {
		currencyCost: scale(template.currencyCost),
		ironCost: scale(template.ironCost),
		steelCost: scale(template.steelCost),
		gunpowderCost: scale(template.gunpowderCost),
		riflesCost: scale(template.riflesCost),
		ammunitionCost: scale(template.ammunitionCost),
		artilleryCost: scale(template.artilleryCost),
		vehiclesCost: scale(template.vehiclesCost),
		explosivesCost: scale(template.explosivesCost)
	};
}

async function checkResourceAvailability(userId: string, template: MilitaryUnitTemplate) {
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

		if (required && (!item || item.quantity < required)) {
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
		const unitType = formData.get("unitType") as (typeof militaryUnitTypeEnum.enumValues)[number];

		if (!unitType) {
			return fail(400, { error: "Missing unitType" });
		}

		const residence = await getUserResidence(account.id);

		if (!residence.stateId) {
			return fail(400, {
				error:
					"You live in an independent region. Join or create a state through a political party before training military units."
			});
		}

		const activeTravel = await db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		});
		if (activeTravel) {
			return fail(400, { error: "You cannot train units while traveling." });
		}

		const template = MILITARY_UNIT_TEMPLATES[unitType];

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

	startExercise: async ({ request, locals }) => {
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

		if (unit.isTraining) {
			return fail(400, { error: "Unit is still training" });
		}

		if (unit.isExercising) {
			return fail(400, { error: "Unit is already exercising" });
		}

		if (unit.organization < EXERCISE_CONFIG.MIN_ORG_TO_START) {
			return fail(400, {
				error: `Unit needs at least ${EXERCISE_CONFIG.MIN_ORG_TO_START}% organization to exercise`
			});
		}

		// Units currently deployed in an ongoing battle cannot exercise.
		const activeParticipation = await db
			.select({ id: battleParticipants.id })
			.from(battleParticipants)
			.innerJoin(battles, eq(battleParticipants.battleId, battles.id))
			.where(and(eq(battleParticipants.unitId, unitId), sql`${battles.phase} != 'ended'`))
			.limit(1);

		if (activeParticipation.length > 0) {
			return fail(400, { error: "Unit is deployed in an active battle" });
		}

		const template = MILITARY_UNIT_TEMPLATES[unit.unitType];
		const equipmentCost = getExerciseEquipmentCost(template);

		// Verify the owner can afford the equipment that will be worn out.
		const availability = await checkResourceAvailability(account.id, equipmentCost as unknown as MilitaryUnitTemplate);
		if (!availability.valid) {
			return fail(400, { error: `Cannot replace exercise equipment: ${availability.error}` });
		}

		try {
			await db.transaction(async (tx) => {
				await deductResources(tx, account.id, equipmentCost);

				const exerciseStartedAt = new Date();
				const exerciseCompletesAt = new Date(exerciseStartedAt.getTime() + EXERCISE_CONFIG.DURATION_HOURS * 3600000);

				await tx
					.update(militaryUnits)
					.set({
						isExercising: true,
						exerciseStartedAt,
						exerciseCompletesAt,
						updatedAt: new Date()
					})
					.where(eq(militaryUnits.id, unitId));
			});

			return { success: true, message: `${unit.name} sent to exercises` };
		} catch (e) {
			console.error("Start exercise error:", e);
			return fail(500, { error: "Failed to start exercise" });
		}
	},

	completeExercise: async ({ request, locals }) => {
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

		if (!unit.isExercising) {
			return fail(400, { error: "Unit is not exercising" });
		}

		if (unit.exerciseCompletesAt && unit.exerciseCompletesAt > new Date()) {
			return fail(400, { error: "Exercise not yet complete" });
		}

		const newExperience = calculateExerciseExperienceGain(unit.experience);

		await db
			.update(militaryUnits)
			.set({
				experience: newExperience,
				organization: Math.max(0, unit.organization - EXERCISE_CONFIG.ORG_COST),
				supplyLevel: Math.max(0, unit.supplyLevel - EXERCISE_CONFIG.SUPPLY_COST),
				isExercising: false,
				exerciseStartedAt: null,
				exerciseCompletesAt: null,
				updatedAt: new Date()
			})
			.where(eq(militaryUnits.id, unitId));

		return { success: true, message: "Exercise complete!" };
	},

	cancelExercise: async ({ request, locals }) => {
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

		if (!unit.isExercising) {
			return fail(400, { error: "Unit is not exercising" });
		}

		// Cancelling forfeits the experience but stops further organization/supply drain.
		// Equipment already spent to start the exercise is not refunded.
		await db
			.update(militaryUnits)
			.set({
				isExercising: false,
				exerciseStartedAt: null,
				exerciseCompletesAt: null,
				updatedAt: new Date()
			})
			.where(eq(militaryUnits.id, unitId));

		return { success: true, message: "Exercise cancelled" };
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
