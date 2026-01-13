import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, sql } from "drizzle-orm";
import {
	states,
	parliamentMembers,
	ministers,
	parliamentaryProposals,
	stateTaxes,
	stateBuildings,
	stateTreasury,
	regions,
	resourceInventory,
	userWallets
} from "$lib/server/schema";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";
import { getBuildingTemplate, BUILDING_TEMPLATES, type BuildingType } from "$lib/server/buildings";
export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get state with regions and treasury
	const state = await db.query.states.findFirst({
		where: eq(states.id, parseInt(params.id)),
		with: {
			regions: true,
			treasury: true
		}
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is a parliament member
	const userMembership = await db.query.parliamentMembers.findFirst({
		where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, parseInt(params.id)))
	});

	if (!userMembership) {
		throw error(403, "You must be a parliament member to create proposals");
	}

	// Check if user is a minister
	const userMinistry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, parseInt(params.id)))
	});

	// Get state treasury resources
	const stateResources = await db.query.resourceInventory.findMany({
		where: eq(resourceInventory.userId, state.id.toString())
	});

	// Get existing buildings grouped by region and type
	const existingBuildings = await db.query.stateBuildings.findMany({
		where: eq(stateBuildings.stateId, parseInt(params.id))
	});

	// Group buildings by region and type for easy lookup
	const buildingsByRegion = existingBuildings.reduce(
		(acc, building) => {
			if (!acc[building.regionId]) {
				acc[building.regionId] = {};
			}
			if (!acc[building.regionId][building.buildingType]) {
				acc[building.regionId][building.buildingType] = 0;
			}
			acc[building.regionId][building.buildingType]++;
			return acc;
		},
		{} as Record<number, Record<string, number>>
	);

	const form = await superValidate(valibot(createProposalSchema));

	// Serialize building templates for client
	const buildingTemplates = Object.entries(BUILDING_TEMPLATES).reduce(
		(acc, [key, template]) => {
			acc[key] = {
				type: template.type,
				costs: template.costs,
				constructionTime: template.constructionTime,
				infrastructureRequired: template.infrastructureRequired,
				powerConsumption: template.powerConsumption
			};
			return acc;
		},
		{} as Record<string, any>
	);

	return {
		state,
		regions: state.regions || [],
		treasury: state.treasury,
		stateResources: stateResources.reduce(
			(acc, r) => {
				acc[r.resourceType] = r.quantity;
				return acc;
			},
			{} as Record<string, number>
		),
		buildingsByRegion,
		userParty: userMembership.partyAffiliation || null,
		userMinistry: userMinistry?.ministry || null,
		buildingTemplates,
		form
	};
};

export const actions: Actions = {
	createProposal: async ({ request, locals, params }) => {
		const account = locals.account!;

		const form = await superValidate(request, valibot(createProposalSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		// Check parliament membership
		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, parseInt(params.id)))
		});

		if (!membership) {
			return fail(403, { error: "You must be a parliament member to create proposals" });
		}

		const { proposalType, taxType, taxRate, regionId, buildingName, quantity } = form.data;

		if (proposalType === "tax") {
			if (!taxType || !taxRate) {
				return fail(400, { form, error: "Tax proposals require tax type, rate, and name" });
			}
		} else {
			// Building proposal
			if (!regionId || !buildingName || !quantity) {
				return fail(400, { form, error: "Construction proposals require region, building name, and quantity" });
			}

			// Verify region belongs to state
			const region = await db.query.regions.findFirst({
				where: and(eq(regions.id, parseInt(regionId)), eq(regions.stateId, parseInt(params.id)))
			});

			if (!region) {
				return fail(400, { form, error: "Invalid region selected" });
			}
		}

		// Create proposal (1 day voting, 60% majority)
		const votingEndsAt = new Date();
		votingEndsAt.setDate(votingEndsAt.getDate() + 1);

		await db.insert(parliamentaryProposals).values({
			stateId: parseInt(params.id),
			proposalType: proposalType as any,
			proposedBy: account.id,
			votingEndsAt,
			requiredMajority: 60,
			status: "active"
		});

		throw redirect(302, `/state/${params.id}/parliament`);
	},

	executeMinisterialAction: async ({ request, locals, params }) => {
		const account = locals.account!;

		const form = await superValidate(request, valibot(createProposalSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		// Check ministry
		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, parseInt(params.id)))
		});

		if (!ministry) {
			return fail(403, { error: "You must be a minister to execute direct actions" });
		}

		// Define ministry permissions
		const ministryPermissions: Record<string, string[]> = {
			finance: ["tax"],
			infrastructure: ["infrastructure"],
			education: ["school"],
			health: ["hospital"]
		};

		const { proposalType, taxType, taxRate, regionId, buildingName, quantity } = form.data;

		if (!ministryPermissions[ministry.ministry]?.includes(proposalType)) {
			return fail(403, {
				error: `Your ministry (${ministry.ministry}) cannot execute ${proposalType} actions directly`
			});
		}

		// Create passed proposal record
		const [proposal] = await db
			.insert(parliamentaryProposals)
			.values({
				stateId: parseInt(params.id),
				proposalType: proposalType as any,
				proposedBy: account.id,
				votingEndsAt: new Date(),
				requiredMajority: 0,
				status: "passed"
			})
			.returning();

		// Execute action
		if (proposalType === "tax") {
			if (!taxType || !taxRate) {
				return fail(400, { form, error: "Tax actions require tax type, rate, and name" });
			}

			await db.insert(stateTaxes).values({
				stateId: parseInt(params.id),
				taxType: taxType as any,
				taxRate,

				proposalId: proposal.id,
				isActive: true
			});
		} else {
			// Building construction
			if (!regionId || !buildingName || !quantity) {
				return fail(400, { form, error: "Construction actions require region, building name, and quantity" });
			}

			// Verify region
			const region = await db.query.regions.findFirst({
				where: and(eq(regions.id, parseInt(regionId)), eq(regions.stateId, parseInt(params.id)))
			});

			if (!region) {
				return fail(400, { form, error: "Invalid region selected" });
			}

			const template = getBuildingTemplate(proposalType as BuildingType);
			const buildQuantity = quantity || 1;

			// Check infrastructure requirement
			if ((region.infrastructure ?? 0) < template.infrastructureRequired) {
				return fail(400, {
					form,
					error: `Region infrastructure too low. Required: ${template.infrastructureRequired}, Current: ${region.infrastructure ?? 0}`
				});
			}

			// Check treasury funds
			const treasury = await db.query.stateTreasury.findFirst({
				where: eq(stateTreasury.stateId, parseInt(params.id))
			});

			const totalCurrencyCost = template.costs.currency * buildQuantity;

			if (!treasury || treasury.balance < totalCurrencyCost) {
				return fail(400, {
					form,
					error: `Insufficient treasury funds. Available: ${treasury?.balance || 0}, Required: ${totalCurrencyCost}`
				});
			}

			// Check resource requirements from STATE inventory (not user inventory)
			const stateId = params.id;
			const resourceCosts = Object.entries(template.costs).filter(([key]) => key !== "currency");

			for (const [resource, amountPerUnit] of resourceCosts) {
				const totalRequired = (amountPerUnit as number) * buildQuantity;
				const inventory = await db.query.resourceInventory.findFirst({
					where: and(
						eq(resourceInventory.userId, stateId), // State's resource inventory
						eq(resourceInventory.resourceType, resource as any)
					)
				});

				if (!inventory || inventory.quantity < totalRequired) {
					return fail(400, {
						form,
						error: `Insufficient state ${resource}. Required: ${totalRequired}, Available: ${inventory?.quantity || 0}`
					});
				}
			}

			// Deduct costs from treasury
			await db
				.update(stateTreasury)
				.set({
					balance: treasury.balance - totalCurrencyCost,
					totalSpent: treasury.totalSpent + totalCurrencyCost,
					updatedAt: new Date()
				})
				.where(eq(stateTreasury.stateId, parseInt(params.id)));

			// Deduct resources from STATE inventory
			for (const [resource, amountPerUnit] of resourceCosts) {
				const totalAmount = (amountPerUnit as number) * buildQuantity;
				await db
					.update(resourceInventory)
					.set({
						quantity: sql`${resourceInventory.quantity} - ${totalAmount}`,
						updatedAt: new Date()
					})
					.where(and(eq(resourceInventory.userId, stateId), eq(resourceInventory.resourceType, resource as any)));
			}

			// Create buildings (multiple if quantity > 1)
			for (let i = 0; i < buildQuantity; i++) {
				await db.insert(stateBuildings).values({
					name: buildQuantity > 1 ? `${buildingName} ${i + 1}` : buildingName,
					buildingType: proposalType as any,
					regionId: parseInt(regionId),
					stateId: parseInt(params.id),
					proposalId: proposal.id,
					builtBy: account.id
				});
			}

			// Update region stats
			const statUpdates: any = {};
			switch (proposalType) {
				case "hospital":
					statUpdates.hospitals = (region.hospitals ?? 0) + buildQuantity;
					break;
				case "school":
					statUpdates.education = (region.education ?? 0) + 10 * buildQuantity;
					break;
				case "power_plant":
					statUpdates.economy = (region.economy ?? 0) + buildQuantity;
					break;
				case "infrastructure":
					statUpdates.infrastructure = (region.infrastructure ?? 0) + 10 * buildQuantity;
					break;
			}

			if (Object.keys(statUpdates).length > 0) {
				await db
					.update(regions)
					.set(statUpdates)
					.where(eq(regions.id, parseInt(regionId)));
			}
		}

		throw redirect(302, `/state/${params.id}/parliament`);
	}
};
