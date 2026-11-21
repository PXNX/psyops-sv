// src/routes/(authenticated)/(dock)/state/[id]/economy/+page.server.ts - WITH PRESIDENT ACCESS
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "#lib/server/db.js";
import { eq, and } from "drizzle-orm";
import {
	states,
	ministers,
	presidents,
	powerPlants,
	stateTreasury,
	stateEnergy,
	stateResourceInventory
} from "#lib/server/schema.js";
import { POWER_PLANTS, type PowerPlantType } from "#lib/config/index.js";
import { stateDebt } from "#lib/server/services/economy/bailout.js";
import { stancesHeldBy } from "#lib/server/services/politics/civilian-stance.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	const stateId = parseInt(params.id);

	// Get state; fail fast if it doesn't exist
	const statePromise = db.query.states
		.findFirst({
			where: eq(states.id, stateId)
		})
		.then((state) => state ?? error(404, "State not found"));

	const [state, presidency] = await Promise.all([
		statePromise,
		// Check if user is economy minister OR president (404 wins over 403)
		Promise.all([
			db.query.ministers.findFirst({
				where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"))
			}),
			db.query.presidents.findFirst({
				where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
			}),
			statePromise
		]).then(([ministry, presidency]) => {
			if (!ministry && !presidency) {
				error(403, "You must be the Economy Minister or President to access this page");
			}
			return presidency;
		})
	]);

	const [treasury, statePowerPlants, energyInfo, stateResources] = await Promise.all([
		// Get state treasury
		(async () => {
			const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));
			if (treasury) return treasury;

			// Create treasury if doesn't exist
			const [created] = await db
				.insert(stateTreasury)
				.values({
					stateId: stateId,
					balance: 0,
					totalCollected: 0,
					totalSpent: 0
				})
				.returning();
			return created;
		})(),
		// Get power plants
		db.query.powerPlants.findMany({
			where: eq(powerPlants.stateId, stateId)
		}),
		// Get state energy info
		(async () => {
			const [energyInfo] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId));
			if (energyInfo) return energyInfo;

			// Create energy record if doesn't exist
			const [created] = await db
				.insert(stateEnergy)
				.values({
					stateId: stateId,
					totalProduction: 1000,
					usedProduction: 0
				})
				.returning();
			return created;
		})(),
		// Get state resources and products
		db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, stateId))
	]);

	return {
		state,
		treasury: {
			...treasury,
			balance: Number(treasury.balance),
			totalCollected: Number(treasury.totalCollected),
			totalSpent: Number(treasury.totalSpent)
		},
		debt: await stateDebt(db, stateId),
		// How this state's civilians view foreign governments: aid and warfare
		// move these numbers, so the finance desk shows them next to the books.
		stances: await stancesHeldBy(db, stateId),
		powerPlants: statePowerPlants,
		energyInfo,
		resources: stateResources.map((r) => ({
			resourceType: r.resourceType,
			quantity: r.quantity
		})),
		isPresident: !!presidency
	};
};

export const actions: Actions = {
	buildPowerPlant: async ({ request, locals, params }) => {
		const account = locals.account!;

		const stateId = parseInt(params.id);

		// Check authorization - economy minister OR president
		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"))
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Economy Minister or President can build power plants" });
		}

		const formData = await request.formData();
		const plantType = formData.get("plantType") as string;
		const name = formData.get("name") as string;

		// Validate
		if (!plantType || !name || name.trim().length < 3) {
			return fail(400, { error: "Invalid plant data" });
		}

		// Get plant costs and output
		const specs = POWER_PLANTS[plantType as PowerPlantType];
		if (!specs) {
			return fail(400, { error: "Invalid plant type" });
		}
		const plantCost = specs.cost;
		const plantOutput = specs.output;

		// Check treasury balance
		const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

		if (!treasury || Number(treasury.balance) < plantCost) {
			return fail(400, { error: "Insufficient treasury funds" });
		}

		const treasuryBalance = Number(treasury.balance);
		const totalSpent = Number(treasury.totalSpent);

		// Deduct from treasury
		await db
			.update(stateTreasury)
			.set({
				balance: treasuryBalance - plantCost,
				totalSpent: totalSpent + plantCost,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		// Create power plant
		await db.insert(powerPlants).values({
			stateId: stateId,
			name: name.trim(),
			plantType: plantType as PowerPlantType,
			powerOutput: plantOutput,
			constructionCost: plantCost,
			isOperational: true,
			builtBy: account.id
		});

		// Update state energy production
		const [energyInfo] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId));

		if (energyInfo) {
			await db
				.update(stateEnergy)
				.set({
					totalProduction: energyInfo.totalProduction + plantOutput,
					updatedAt: new Date()
				})
				.where(eq(stateEnergy.stateId, stateId));
		} else {
			await db.insert(stateEnergy).values({
				stateId: stateId,
				totalProduction: plantOutput,
				usedProduction: 0
			});
		}

		return { success: true, message: `${name} constructed successfully!` };
	}
};
