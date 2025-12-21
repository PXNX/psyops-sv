// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.server.ts
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and } from "drizzle-orm";
import { states, parliamentMembers, ministers, parliamentaryProposals } from "$lib/server/schema";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProposalSchema } from "./schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	if (!account) {
		throw redirect(302, "/login");
	}

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is a parliament member
	const userMembership = await db.query.parliamentMembers.findFirst({
		where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, params.id))
	});

	if (!userMembership) {
		throw error(403, "You must be a parliament member to create proposals");
	}

	// Check if user is a minister
	const userMinistry = await db.query.ministers.findFirst({
		where: and(eq(ministers.userId, account.id), eq(ministers.stateId, params.id))
	});

	const form = await superValidate(valibot(createProposalSchema));

	return {
		state,
		userParty: userMembership.partyAffiliation || null,
		userMinistry: userMinistry?.ministry || null,
		form
	};
};

export const actions: Actions = {
	createProposal: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const form = await superValidate(request, valibot(createProposalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if user is a parliament member
		const membership = await db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, account.id), eq(parliamentMembers.stateId, params.id))
		});

		if (!membership) {
			return fail(403, { error: "You must be a parliament member to create proposals" });
		}

		const { title, description, proposalType, votingDays, requiredMajority } = form.data;

		const votingStartsAt = new Date();
		const votingEndsAt = new Date();
		votingEndsAt.setDate(votingEndsAt.getDate() + votingDays);

		await db.insert(parliamentaryProposals).values({
			stateId: params.id,
			title,
			description,
			proposalType,
			proposedBy: account.id,
			votingStartsAt,
			votingEndsAt,
			requiredMajority,
			status: "active"
		});

		throw redirect(302, `/state/${params.id}/parliament`);
	},

	executeMinisterialAction: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const form = await superValidate(request, valibot(createProposalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Check if user is a minister
		const ministry = await db.query.ministers.findFirst({
			where: and(eq(ministers.userId, account.id), eq(ministers.stateId, params.id))
		});

		if (!ministry) {
			return fail(403, { error: "You must be a minister to execute direct actions" });
		}

		const { proposalType } = form.data;

		// Define which ministries can execute which types directly
		const ministryPermissions: Record<string, string[]> = {
			finance: ["tax", "budget"],
			infrastructure: ["infrastructure"],
			education: ["education"],
			defense: ["defense"],
			health: ["healthcare"],
			environment: ["environment"],
			justice: ["justice"]
		};

		const allowedTypes = ministryPermissions[ministry.ministry] || [];

		if (!allowedTypes.includes(proposalType)) {
			return fail(403, {
				error: `Your ministry (${ministry.ministry}) cannot execute ${proposalType} actions directly`
			});
		}

		const { title, description } = form.data;

		const votingStartsAt = new Date();
		const votingEndsAt = new Date();

		await db.insert(parliamentaryProposals).values({
			stateId: params.id,
			title,
			description,
			proposalType,
			proposedBy: account.id,
			votingStartsAt,
			votingEndsAt,
			requiredMajority: 0,
			status: "passed"
		});

		throw redirect(302, `/state/${params.id}/parliament`);
	}
};
