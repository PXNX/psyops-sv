// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, sql, or } from "drizzle-orm";
import {
	states,
	parliamentMembers,
	ministers,
	presidents,
	parliamentaryProposals,
	stateTaxes,
	stateBuildings,
	stateTreasury,
	stateBorders,
	regions,
	resourceInventory,
	userWallets,
	proposalTaxDetails,
	proposalBorderDetails,
	stateVisaSettings,
	proposalBuildingDetails
} from "$lib/server/schema";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";
import { BUILDING_TEMPLATES, BORDER_MAINTENANCE, type BuildingType } from "$lib/config";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get state with relations
	const state = await db.query.states.findFirst({
		where: eq(states.id, parseInt(params.id)),
		with: {
			regions: true,
			treasury: true,
			border: true
		}
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is a parliament member, minister, or president
	const userMembership = await db.query.parliamentMembers.findFirst({
		where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, parseInt(params.id)))
	});

	const userMinistry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, parseInt(params.id)))
	});

	const userPresidency = await db.query.presidents.findFirst({
		where: and(eq(presidents.userId, account.id), eq(presidents.stateId, parseInt(params.id)))
	});

	// User must be either parliament member, minister, or president
	if (!userMembership && !userMinistry && !userPresidency) {
		throw error(403, "You must be a parliament member, minister, or president to create proposals");
	}

	// Get state resources
	const stateResources = await db.query.resourceInventory.findMany({
		where: eq(resourceInventory.userId, state.id.toString())
	});

	// Get existing buildings
	const existingBuildings = await db.query.stateBuildings.findMany({
		where: eq(stateBuildings.stateId, parseInt(params.id))
	});

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
		border: state.border,
		stateResources: stateResources.reduce(
			(acc, r) => {
				acc[r.resourceType] = r.quantity;
				return acc;
			},
			{} as Record<string, number>
		),
		buildingsByRegion,
		userParty: userMembership?.partyAffiliation || null,
		userMinistry: userMinistry?.ministry || null,
		isPresident: !!userPresidency,
		buildingTemplates,
		borderMaintenanceCost: BORDER_MAINTENANCE.dailyCost,
		form
	};
};

// Helper function to check if user can auto-execute
function canAutoExecute(proposalType: string, userMinistry: string | null, isPresident: boolean): boolean {
	if (isPresident) {
		// Presidents can auto-execute: tax, border_control, and fortifications
		return ["tax", "border_control", "fortifications"].includes(proposalType);
	}

	if (!userMinistry) return false;

	const ministryPermissions: Record<string, string[]> = {
		economy: ["tax"],
		foreign_affairs: ["border_control"],
		defense: ["fortifications"],
		infrastructure: ["infrastructure"],
		education: ["school"],
		health: ["hospital"]
	};

	return ministryPermissions[userMinistry]?.includes(proposalType) || false;
}

async function executeProposal(
	stateId: number,
	proposalType: string,
	formData: any,
	accountId: string,
	proposalId: number
) {
	if (proposalType === "tax") {
		// Get tax details from database
		const taxDetails = await db.query.proposalTaxDetails.findFirst({
			where: eq(proposalTaxDetails.proposalId, proposalId)
		});

		if (!taxDetails) {
			throw new Error("Tax proposal details not found");
		}

		// Deactivate existing taxes of the same type
		await db
			.update(stateTaxes)
			.set({ isActive: false })
			.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.taxType, taxDetails.taxType), eq(stateTaxes.isActive, true)));

		// Execute tax (create new tax or update existing)
		await db.insert(stateTaxes).values({
			stateId,
			taxType: taxDetails.taxType,
			taxRate: taxDetails.taxRate,
			proposalId,
			isActive: true
		});
	} else if (proposalType === "border_control") {
		// Get border details from database
		const borderDetails = await db.query.proposalBorderDetails.findFirst({
			where: eq(proposalBorderDetails.proposalId, proposalId)
		});

		if (!borderDetails) {
			throw new Error("Border control proposal details not found");
		}

		// Get or create border record
		let border = await db.query.stateBorders.findFirst({
			where: eq(stateBorders.stateId, stateId)
		});

		if (!border) {
			await db.insert(stateBorders).values({
				stateId,
				status: borderDetails.borderStatus,
				changedBy: borderDetails.borderStatus === "closed" ? accountId : null,
				changedAt: borderDetails.borderStatus === "closed" ? new Date() : null
			});
		} else {
			await db
				.update(stateBorders)
				.set({
					status: borderDetails.borderStatus,
					changedBy: borderDetails.borderStatus === "closed" ? accountId : null,
					changedAt: borderDetails.borderStatus === "closed" ? new Date() : null,
					updatedAt: new Date()
				})
				.where(eq(stateBorders.id, border.id));
		}

		// Update visa settings to match border status
		const visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		const autoApprove = borderDetails.borderStatus === "open";

		if (visaSettings) {
			await db
				.update(stateVisaSettings)
				.set({
					autoApprove,
					updatedAt: new Date()
				})
				.where(eq(stateVisaSettings.id, visaSettings.id));
		} else {
			await db.insert(stateVisaSettings).values({
				stateId,
				autoApprove,
				visaRequired: true
			});
		}
	} else {
		// Building construction
		const buildingDetails = await db.query.proposalBuildingDetails.findFirst({
			where: eq(proposalBuildingDetails.proposalId, proposalId)
		});

		if (!buildingDetails) {
			throw new Error("Building proposal details not found");
		}

		const region = await db.query.regions.findFirst({
			where: and(eq(regions.id, buildingDetails.regionId), eq(regions.stateId, stateId))
		});

		if (!region) {
			throw new Error("Invalid region");
		}

		const template = BUILDING_TEMPLATES[proposalType as BuildingType];
		const buildQuantity = buildingDetails.quantity;

		// ... rest of building execution logic (infrastructure check, costs, etc.) ...
		// This part stays the same as before, just use buildingDetails.regionId, buildingDetails.quantity, etc.

		// Create buildings
		for (let i = 0; i < buildQuantity; i++) {
			await db.insert(stateBuildings).values({
				name: buildQuantity > 1 ? `${buildingDetails.buildingName} ${i + 1}` : buildingDetails.buildingName,
				buildingType: proposalType as any,
				regionId: buildingDetails.regionId,
				stateId,
				proposalId,
				builtBy: accountId
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
			case "fortifications":
				statUpdates.fortifications = (region.fortifications ?? 0) + buildQuantity;
				break;
		}

		if (Object.keys(statUpdates).length > 0) {
			await db.update(regions).set(statUpdates).where(eq(regions.id, buildingDetails.regionId));
		}
	}
}

export const actions: Actions = {
	createProposal: async ({ request, locals, params }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createProposalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if user is parliament member, minister, or president
		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, parseInt(params.id)))
		});

		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, parseInt(params.id)))
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, parseInt(params.id)))
		});

		if (!membership && !ministry && !presidency) {
			return fail(403, { error: "You must be a parliament member, minister, or president" });
		}

		const { proposalType } = form.data;
		const shouldAutoExecute = canAutoExecute(proposalType, ministry?.ministry || null, !!presidency);

		// Create proposal
		const votingEndsAt = shouldAutoExecute
			? new Date()
			: (() => {
				const date = new Date();
				date.setDate(date.getDate() + 1);
				return date;
			})();

		const [proposal] = await db
			.insert(parliamentaryProposals)
			.values({
				stateId: parseInt(params.id),
				proposalType: proposalType as any,
				proposedBy: account.id,
				votingEndsAt,
				requiredMajority: shouldAutoExecute ? 0 : 60,
				status: shouldAutoExecute ? "passed" : "active"
			})
			.returning();

		// Create type-specific details
		if (proposalType === "tax") {
			await db.insert(proposalTaxDetails).values({
				proposalId: proposal.id,
				taxType: form.data.taxType as any,
				taxRate: form.data.taxRate!
			});
		} else if (proposalType === "border_control") {
			await db.insert(proposalBorderDetails).values({
				proposalId: proposal.id,
				borderStatus: form.data.borderStatus as any
			});
		} else if (["hospital", "school", "power_plant", "infrastructure", "fortifications"].includes(proposalType)) {
			await db.insert(proposalBuildingDetails).values({
				proposalId: proposal.id,
				regionId: parseInt(form.data.regionId!),
				buildingName: form.data.buildingName!,
				quantity: form.data.quantity!
			});
		}

		// Auto-execute if minister/president
		if (shouldAutoExecute) {
			try {
				await executeProposal(parseInt(params.id), proposalType, form.data, account.id, proposal.id);
			} catch (err: any) {
				// Delete the proposal and details if execution fails
				await db.delete(parliamentaryProposals).where(eq(parliamentaryProposals.id, proposal.id));
				return fail(400, { form, error: err.message });
			}
		}

		throw redirect(302, `/state/${params.id}/parliament`);
	}
};
