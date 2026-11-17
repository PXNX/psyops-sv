// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "#lib/server/db.js";
import { eq, and } from "drizzle-orm";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
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
	proposalBuildingDetails,
	regions
} from "#lib/server/schema.js";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";
import { BUILDING_TEMPLATES, BORDER_MAINTENANCE, isBuildingType } from "#lib/config/index.js";
import { proposalExploitationDetails } from "#lib/server/schema.js";
import { executeProposal } from "#lib/server/services/politics/execute-proposal.js";
import {
	checkConstruction,
	completePendingConstructions,
	pendingByType
} from "#lib/server/services/politics/construction.service.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Finish any construction whose time has elapsed before reading region
	// stats below, so infrastructure/cost checks use up-to-date numbers.
	await completePendingConstructions(db, { stateId: parseInt(params.id) });

	// Get state with relations; fail fast if it doesn't exist
	const statePromise = db.query.states
		.findFirst({
			where: eq(states.id, parseInt(params.id)),
			with: {
				regions: true,
				treasury: true,
				border: true
			}
		})
		.then((state) => state ?? error(404, "State not found"));

	// All of these are independent reads keyed by the state id, so fetch them in parallel
	const [state, { userMembership, userMinistry, userPresidency }, stateResources, existingBuildings] =
		await Promise.all([
			statePromise,
			// Check if user is a parliament member, minister, or president (404 wins over 403)
			Promise.all([
				db.query.parliamentMembers.findFirst({
					where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, parseInt(params.id)))
				}),
				db.query.ministers.findFirst({
					where: and(eq(ministers.userId, account.id), eq(ministers.stateId, parseInt(params.id)))
				}),
				db.query.presidents.findFirst({
					where: and(eq(presidents.userId, account.id), eq(presidents.stateId, parseInt(params.id)))
				}),
				statePromise
			]).then(([userMembership, userMinistry, userPresidency]) => {
				// User must be either parliament member, minister, or president
				if (!userMembership && !userMinistry && !userPresidency) {
					error(403, "You must be a parliament member, minister, or president to create proposals");
				}
				return { userMembership, userMinistry, userPresidency };
			}),
			// Get state resources. These live in stateResourceInventory (keyed by
			// stateId) — not resourceInventory, which holds per-player resources
			// keyed by userId and would never match a state here.
			db.query.stateResourceInventory.findMany({
				where: eq(stateResourceInventory.stateId, parseInt(params.id))
			}),
			// Get existing buildings
			db.query.stateBuildings.findMany({
				where: eq(stateBuildings.stateId, parseInt(params.id))
			})
		]);

	// Buildings still going up, per region and type: they count towards the
	// region's maximum level.
	const pendingByRegion: Record<number, Record<string, number>> = {};
	for (const b of existingBuildings) {
		if (!b.isUnderConstruction) continue;
		(pendingByRegion[b.regionId] ??= {})[b.buildingType] = (pendingByRegion[b.regionId]?.[b.buildingType] ?? 0) + 1;
	}

	const form = await superValidate(valibot(createProposalSchema));

	return {
		state,
		regions: state.regions || [],
		treasury: state.treasury,
		border: state.border,
		exploitationPolicy: state.exploitationPolicy,
		stateResources: stateResources.reduce(
			(acc, r) => {
				acc[r.resourceType] = r.quantity;
				return acc;
			},
			{} as Record<string, number>
		),
		pendingByRegion,
		userParty: userMembership?.partyAffiliation || null,
		userMinistry: userMinistry?.ministry || null,
		isPresident: !!userPresidency,
		buildingTemplates: BUILDING_TEMPLATES,
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

	// Ministers enact their own portfolio directly.
	const ministryPermissions: Record<string, string[]> = {
		economy: ["tax", "exploitation", "infrastructure", "school", "hospital", "power_plant"],
		foreign_affairs: ["border_control"],
		defense: ["fortifications"]
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
		const stateId = parseInt(params.id);

		// Catch impossible proposals before parliament spends a day on them.
		if (proposalType === "exploitation" && !form.data.exploitationPolicy) {
			return fail(400, { form, error: "Choose an exploitation policy." });
		}
		if (isBuildingType(proposalType)) {
			const regionId = Number(form.data.regionId);
			const region = Number.isInteger(regionId)
				? await db.query.regions.findFirst({ where: and(eq(regions.id, regionId), eq(regions.stateId, stateId)) })
				: undefined;
			if (!region) return fail(400, { form, error: "Choose one of your state's regions to build in." });
			const check = checkConstruction({
				type: proposalType,
				quantity: 1,
				region,
				pending: (await pendingByType(db, region.id))[proposalType] ?? 0,
				// Money and resources are only checked when it's built.
				treasury: Number.MAX_SAFE_INTEGER,
				stockpile: new Proxy({}, { get: () => Number.MAX_SAFE_INTEGER })
			});
			if (!check.ok) return fail(400, { form, error: check.problems.join(" ") });
		}

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
		} else if (proposalType === "exploitation") {
			await db.insert(proposalExploitationDetails).values({
				proposalId: proposal.id,
				policy: form.data.exploitationPolicy!
			});
		} else if (proposalType === "border_control") {
			await db.insert(proposalBorderDetails).values({
				proposalId: proposal.id,
				borderStatus: form.data.borderStatus as any
			});
		} else if (isBuildingType(proposalType)) {
			await db.insert(proposalBuildingDetails).values({
				proposalId: proposal.id,
				regionId: parseInt(form.data.regionId!),
				quantity: 1
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
