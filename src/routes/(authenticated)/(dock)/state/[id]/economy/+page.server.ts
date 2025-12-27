// src/routes/(authenticated)/(dock)/state/[id]/economy/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and } from "drizzle-orm";
import { states, ministers, powerPlants, stateTreasury, stateEnergy } from "$lib/server/schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	const stateId = parseInt(params.id);

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, stateId)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is economy minister
	const ministry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId), eq(ministers.ministry, "finance"))
	});

	if (!ministry) {
		throw error(403, "You must be the Economy Minister to access this page");
	}

	// Get state treasury
	let [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

	if (!treasury) {
		// Create treasury if doesn't exist
		[treasury] = await db
			.insert(stateTreasury)
			.values({
				stateId: stateId,
				balance: 0,
				totalCollected: 0,
				totalSpent: 0
			})
			.returning();
	}

	// Get power plants
	const statePowerPlants = await db.query.powerPlants.findMany({
		where: eq(powerPlants.stateId, stateId)
	});

	// Get state energy info
	let [energyInfo] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId));

	if (!energyInfo) {
		// Create energy record if doesn't exist
		[energyInfo] = await db
			.insert(stateEnergy)
			.values({
				stateId: stateId,
				totalProduction: 1000,
				usedProduction: 0
			})
			.returning();
	}

	return {
		state,
		treasury: {
			...treasury,
			balance: Number(treasury.balance),
			totalCollected: Number(treasury.totalCollected),
			totalSpent: Number(treasury.totalSpent)
		},
		powerPlants: statePowerPlants,
		energyInfo
	};
};

export const actions: Actions = {
	buildPowerPlant: async ({ request, locals, params }) => {
		const account = locals.account!;

		const stateId = parseInt(params.id);

		// Verify economy minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, stateId), eq(ministers.ministry, "finance"))
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
		const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

		if (!treasury || Number(treasury.balance) < specs.cost) {
			return fail(400, { error: "Insufficient treasury funds" });
		}

		const treasuryBalance = Number(treasury.balance);
		const totalSpent = Number(treasury.totalSpent);

		// Deduct from treasury
		await db
			.update(stateTreasury)
			.set({
				balance: treasuryBalance - specs.cost,
				totalSpent: totalSpent + specs.cost,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		// Create power plant
		await db.insert(powerPlants).values({
			stateId: stateId,
			name: name.trim(),
			plantType: plantType as any,
			powerOutput: specs.output,
			constructionCost: specs.cost,
			isOperational: true,
			builtBy: account.id
		});

		// Update state energy production
		const [energyInfo] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId));

		if (energyInfo) {
			await db
				.update(stateEnergy)
				.set({
					totalProduction: energyInfo.totalProduction + specs.output,
					updatedAt: new Date()
				})
				.where(eq(stateEnergy.stateId, stateId));
		} else {
			await db.insert(stateEnergy).values({
				stateId: stateId,
				totalProduction: specs.output,
				usedProduction: 0
			});
		}

		return { success: true, message: `${name} constructed successfully!` };
	}
};
