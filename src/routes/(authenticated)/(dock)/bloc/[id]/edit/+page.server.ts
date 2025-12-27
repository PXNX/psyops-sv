// src/routes/bloc/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, presidents, militaryUnitTemplates, blocRecommendedTemplates } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, inArray } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editBlocSchema } from "./schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const blocId = parseInt(params.id);

	// Get bloc details
	const [bloc] = await db.select().from(blocs).where(eq(blocs.id, blocId)).limit(1);

	if (!bloc) {
		error(404, "Bloc not found");
	}

	// Get member states to find bloc leader
	const memberStates = await db
		.select({
			stateId: states.id,
			presidentUserId: presidents.userId
		})
		.from(states)
		.leftJoin(presidents, eq(states.id, presidents.stateId))
		.where(eq(states.blocId, blocId));

	// Check if user is president of any member state (eligible to be leader)
	const isPresidentOfMemberState = memberStates.some((s) => s.presidentUserId === account.id);

	if (!isPresidentOfMemberState) {
		error(403, "Only presidents of member states can edit the bloc");
	}

	// Get all available unit templates
	const allTemplates = await db.select().from(militaryUnitTemplates).orderBy(militaryUnitTemplates.displayName);

	// Get currently recommended templates
	const currentRecommendations = await db
		.select({ templateId: blocRecommendedTemplates.templateId })
		.from(blocRecommendedTemplates)
		.where(eq(blocRecommendedTemplates.blocId, blocId));

	const recommendedTemplateIds = currentRecommendations.map((r) => r.templateId);

	// Initialize form with current values
	const form = await superValidate(
		{
			name: bloc.name,
			color: bloc.color,
			description: bloc.description || ""
		},
		valibot(editBlocSchema)
	);

	return {
		form,
		bloc: {
			id: bloc.id,
			name: bloc.name,
			color: bloc.color,
			description: bloc.description
		},
		allTemplates: allTemplates.map((t) => ({
			id: t.id,
			unitType: t.unitType,
			displayName: t.displayName,
			description: t.description
		})),
		recommendedTemplateIds
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);
		const form = await superValidate(request, valibot(editBlocSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		// Verify user is president of a member state
		const memberStates = await db
			.select({
				stateId: states.id,
				presidentUserId: presidents.userId
			})
			.from(states)
			.leftJoin(presidents, eq(states.id, presidents.stateId))
			.where(eq(states.blocId, blocId));

		const isPresidentOfMemberState = memberStates.some((s) => s.presidentUserId === account.id);

		if (!isPresidentOfMemberState) {
			return message(form, "Only presidents of member states can edit the bloc", { status: 403 });
		}

		const { name, color, description } = form.data;

		// Check if name is already taken by another bloc
		const existingBloc = await db
			.select()
			.from(blocs)
			.where(and(eq(blocs.name, name), eq(blocs.id, blocId)))
			.limit(1);

		if (existingBloc.length > 0 && existingBloc[0].id !== blocId) {
			return message(form, "A bloc with this name already exists", { status: 400 });
		}

		try {
			// Update bloc
			await db
				.update(blocs)
				.set({
					name,
					color,
					description: description || null
				})
				.where(eq(blocs.id, blocId));

			return message(form, "Bloc updated successfully");
		} catch (e) {
			console.error("Error updating bloc:", e);
			return message(form, "Failed to update bloc", { status: 500 });
		}
	},

	updateRecommendations: async ({ request, params, locals }) => {
		const account = locals.account!;
		const blocId = parseInt(params.id);
		const formData = await request.formData();
		const templateIds = formData.getAll("templateIds").map((id) => parseInt(id as string));

		// Verify user is president of a member state
		const memberStates = await db
			.select({
				stateId: states.id,
				presidentUserId: presidents.userId
			})
			.from(states)
			.leftJoin(presidents, eq(states.id, presidents.stateId))
			.where(eq(states.blocId, blocId));

		const isPresidentOfMemberState = memberStates.some((s) => s.presidentUserId === account.id);

		if (!isPresidentOfMemberState) {
			return fail(403, { error: "Only presidents of member states can manage recommendations" });
		}

		try {
			await db.transaction(async (tx) => {
				// Remove all existing recommendations
				await tx.delete(blocRecommendedTemplates).where(eq(blocRecommendedTemplates.blocId, blocId));

				// Add new recommendations
				if (templateIds.length > 0) {
					await tx.insert(blocRecommendedTemplates).values(
						templateIds.map((templateId) => ({
							blocId,
							templateId
						}))
					);
				}
			});

			return { success: true, message: "Recommended units updated successfully" };
		} catch (e) {
			console.error("Error updating recommendations:", e);
			return fail(500, { error: "Failed to update recommendations" });
		}
	}
};
