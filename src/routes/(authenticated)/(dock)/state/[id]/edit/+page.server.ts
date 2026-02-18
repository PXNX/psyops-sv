// src/routes/(authenticated)/(dock)/state/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { states, presidents, stateEditCooldowns, files } from "$lib/server/schema";
import { error, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editStateSchema } from "./schema";
import { uploadFileFromForm, getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);

	// Get state
	const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

	if (!state) {
		error(404, "State not found");
	}

	// Check if user is president
	const [presidency] = await db.select().from(presidents).where(eq(presidents.stateId, stateId)).limit(1);

	if (!presidency || presidency.userId !== account.id) {
		error(403, "Only the state president can edit the state");
	}

	// Check cooldown
	const [cooldown] = await db
		.select()
		.from(stateEditCooldowns)
		.where(eq(stateEditCooldowns.userId, account.id))
		.limit(1);

	const now = new Date();
	const cooldownEndTime = cooldown ? new Date(cooldown.lastEditAt.getTime() + 24 * 60 * 60 * 1000) : null;
	const onCooldown = cooldownEndTime && now < cooldownEndTime;
	const timeRemaining = onCooldown ? Math.ceil((cooldownEndTime!.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
	const cooldownEndsAt = cooldownEndTime?.toISOString() || null;

	// Get logo URL if exists
	let logoUrl = null;
	if (state.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, state.logo)
		});
		if (logoFile) {
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {
				logoUrl = null;
			}
		}
	}

	const form = await superValidate(
		{
			name: state.name,
			background: state.background || "#6366f1"
		},
		valibot(editStateSchema)
	);

	return {
		form,
		state: {
			id: state.id,
			name: state.name,
			background: state.background,
			logoUrl
		},
		onCooldown,
		timeRemaining,
		cooldownEndsAt
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		const form = await superValidate(request, valibot(editStateSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		// Get current state
		const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

		if (!state) {
			return message(form, "State not found", { status: 404 });
		}

		// Verify president
		const [presidency] = await db.select().from(presidents).where(eq(presidents.stateId, stateId)).limit(1);

		if (!presidency || presidency.userId !== account.id) {
			return message(form, "Only the state president can edit the state", { status: 403 });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(stateEditCooldowns)
			.where(eq(stateEditCooldowns.userId, account.id))
			.limit(1);

		const now = new Date();
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastEditAt.getTime() + 24 * 60 * 60 * 1000);
			if (now < cooldownEnd) {
				const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
				return message(form, `Please wait ${hoursLeft} hours before editing the state again`, {
					status: 429
				});
			}
		}

		const { name, background, logo } = form.data;

		try {
			let logoFileId: number | null = state.logo;

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

			await db.transaction(async (tx) => {
				await tx
					.update(states)
					.set({
						name,
						background,
						logo: logoFileId
					})
					.where(eq(states.id, stateId));

				await tx
					.insert(stateEditCooldowns)
					.values({
						userId: account.id,
						lastEditAt: now
					})
					.onConflictDoUpdate({
						target: stateEditCooldowns.userId,
						set: { lastEditAt: now }
					});
			});

			redirect(303, `/state/${stateId}`);
		} catch (e) {
			console.error("Error updating state:", e);
			return message(form, "Failed to update state", { status: 500 });
		}
	}
};
