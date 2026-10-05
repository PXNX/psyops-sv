// src/routes/bloc/[id]/edit/+page.server.ts
import { db } from "#lib/server/db.js";
import { blocs, states, presidents, files } from "#lib/server/schema.js";
import { error, fail, redirect } from "@sveltejs/kit";
import { eq, and, inArray } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editBlocSchema } from "./schema";
import { uploadFileFromForm, getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const blocId = parseInt(params.id);

	// Get bloc details; fail fast if it doesn't exist
	const blocPromise = db
		.select()
		.from(blocs)
		.where(eq(blocs.id, blocId))
		.limit(1)
		.then(([bloc]) => bloc ?? error(404, "Bloc not found"));

	// Bloc and member state lookups run in parallel; 404 still wins over 403
	const [bloc] = await Promise.all([
		blocPromise,
		// Get member states to find bloc leader
		db
			.select({
				stateId: states.id,
				presidentUserId: presidents.userId
			})
			.from(states)
			.leftJoin(presidents, eq(states.id, presidents.stateId))
			.where(eq(states.blocId, blocId))
			.then(async (memberStates) => {
				await blocPromise;
				// Check if user is president of any member state (eligible to be leader)
				if (!memberStates.some((s) => s.presidentUserId === account.id)) {
					error(403, "Only presidents of member states can edit the bloc");
				}
			})
	]);

	const [logoUrl, form] = await Promise.all([
		// Get logo URL if exists
		getLogoUrl(bloc.logo),
		// Initialize form with current values
		superValidate(
			{
				name: bloc.name,
				color: bloc.color,
				description: bloc.description || "",
				visaFreeForMembers: bloc.visaFreeForMembers
			},
			valibot(editBlocSchema)
		)
	]);

	return {
		form,
		bloc: {
			id: bloc.id,
			name: bloc.name,
			color: bloc.color,
			description: bloc.description,
			logoUrl,
			visaFreeForMembers: bloc.visaFreeForMembers
		}
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

		// Get current bloc
		const [bloc] = await db.select().from(blocs).where(eq(blocs.id, blocId)).limit(1);

		if (!bloc) {
			return message(form, "Bloc not found", { status: 404 });
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

		const { name, color, description, logo, visaFreeForMembers } = form.data;

		// Check if name is already taken by another bloc
		const existingBloc = await db.select().from(blocs).where(eq(blocs.name, name)).limit(1);

		if (existingBloc.length > 0 && existingBloc[0].id !== blocId) {
			return message(form, "A bloc with this name already exists", { status: 400 });
		}

		try {
			let logoFileId: number | null = bloc.logo;

			// Upload new logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

				// Create file record in database
				const [fileRecord] = await db
					.insert(files)
					.values({
						key: logoUploadResult.key,
						fileName: logo.name,
						contentType: "image/webp",
						sizeBytes: logo.size,
						uploadedBy: account.id
					})
					.returning();
				logoFileId = fileRecord.id;
			}

			// Update bloc
			await db
				.update(blocs)
				.set({
					name,
					color,
					description: description || null,
					logo: logoFileId,
					visaFreeForMembers: visaFreeForMembers ?? false
				})
				.where(eq(blocs.id, blocId));

			return message(form, "Bloc updated successfully");
		} catch (e) {
			console.error("Error updating bloc:", e);
			return message(form, "Failed to update bloc", { status: 500 });
		}
	}
};
