// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and } from "drizzle-orm";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";
import {
	states,
	parliamentMembers,
	ministers,
	presidents,
	parliamentaryProposals,
	parliamentaryVotes,
	stateBuildings,
	stateResourceInventory,
	userWallets,
	proposalTaxDetails,
	proposalBorderDetails,
	proposalBuildingDetails
} from "$lib/server/schema";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";
import { BUILDING_TEMPLATES, BORDER_MAINTENANCE } from "$lib/config";
import { executeProposal } from "$lib/server/services/politics/execute-proposal";
import { completePendingConstructions } from "$lib/server/services/politics/construction.service";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Finish any construction whose time has elapsed before reading region
	// stats below, so infrastructure/cost checks use up-to-date numbers.
	await completePendingConstructions({ stateId: parseInt(params.id) });

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

	// Get state resources. These live in stateResourceInventory (keyed by
	// stateId) — not resourceInventory, which holds per-player resources
	// keyed by userId and would never match a state here.
	const stateResources = await db.query.stateResourceInventory.findMany({
		where: eq(stateResourceInventory.stateId, state.id)
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
		// Presidents can auto-execute any proposal type
		return true;
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
			// Construction is just about raising the region's building-type
			// level by `quantity` — there's no per-building name to collect.
			await db.insert(proposalBuildingDetails).values({
				proposalId: proposal.id,
				regionId: parseInt(form.data.regionId!),
				quantity: form.data.quantity!
			});
		}

		// The proposer automatically votes "for" their own proposal.
		await db.insert(parliamentaryVotes).values({
			proposalId: proposal.id,
			voterId: account.id,
			voteType: "for"
		});

		// Notify parliament members about the new proposal (only if it needs voting)
		if (!shouldAutoExecute) {
			const stateIdNum = parseInt(params.id);
			db.select({ userId: parliamentMembers.userId })
				.from(parliamentMembers)
				.where(eq(parliamentMembers.stateId, stateIdNum))
				.then((members) => {
					Promise.allSettled(
						members.map((m) =>
							sendNotificationIfEnabled(m.userId, "notifyNewProposals", {
								title: "📜 New Proposal",
								body: `A new ${proposalType.replace("_", " ")} proposal needs your vote in parliament.`,
								icon: "/favicon.png",
								badge: "/badge.png",
								data: { url: `/state/${stateIdNum}/proposal`, tag: `proposal-${proposal.id}` }
							})
						)
					);
				})
				.catch((err) => console.error("Proposal notification error:", err));
		}

		// Auto-execute if minister/president
		if (shouldAutoExecute) {
			try {
				await executeProposal(parseInt(params.id), proposalType, account.id, proposal.id);
			} catch (err: any) {
				// Delete the proposal and details if execution fails
				await db.delete(parliamentaryProposals).where(eq(parliamentaryProposals.id, proposal.id));
				return fail(400, { form, error: err.message });
			}
		}

		throw redirect(302, `/state/${params.id}/parliament`);
	}
};
