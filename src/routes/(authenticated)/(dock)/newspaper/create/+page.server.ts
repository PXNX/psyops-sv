// src/routes/(authenticated)/(dock)/newspaper/create/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, files } from "$lib/server/schema";
import { redirect } from "@sveltejs/kit";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { newspaperSchema } from "./schema";
import { uploadFileFromForm } from "$lib/server/backblaze";

export const load: PageServerLoad = async () => {
	const form = await superValidate(valibot(newspaperSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(newspaperSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, background, logo } = form.data;

		// Check if user already owns a newspaper
		const existingNewspaper = await db.query.journalists.findFirst({
			where: (journalists, { and, eq }) => and(eq(journalists.userId, account.id), eq(journalists.rank, "owner"))
		});

		if (existingNewspaper) {
			return message(form, "You already own a newspaper", { status: 400 });
		}

		try {
			let logoFileId: number | null = null;

			// Upload logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

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

			// Create newspaper
			const [newspaper] = await db
				.insert(newspapers)
				.values({
					name,
					logo: logoFileId,
					background: background || null
				})
				.returning();

			// Create journalist relationship (owner)
			await db.insert(journalists).values({
				userId: account.id,
				newspaperId: newspaper.id,
				rank: "owner"
			});
		} catch (err) {
			console.error("Create newspaper error:", err);
			return message(form, "Failed to create newspaper", { status: 500 });
		}

		redirect(303, `/newspaper/${newspaper.id}`);
	}
};
