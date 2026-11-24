// src/routes/(authenticated)/(dock)/newspaper/create/+page.server.ts
import { db } from "#lib/server/db.js";
import { journalists, newspapers, files } from "#lib/server/schema.js";
import { redirect } from "@sveltejs/kit";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters/valibot";
import type { Actions, PageServerLoad } from "./$types";
import { newspaperSchema } from "./schema";
import { uploadFileFromForm } from "#lib/server/backblaze.js";

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

		const nameTaken = await db.query.newspapers.findFirst({ where: (n, { eq }) => eq(n.name, name) });
		if (nameTaken) {
			return message(form, "A newspaper with this name already exists", { status: 400 });
		}

		let newspaperId: number;
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

			// Newspaper and its owner are created together.
			newspaperId = await db.transaction(async (tx) => {
				const [newspaper] = await tx
					.insert(newspapers)
					.values({ name, logo: logoFileId, background: background || null })
					.returning({ id: newspapers.id });
				await tx.insert(journalists).values({ userId: account.id, newspaperId: newspaper.id, rank: "owner" });
				return newspaper.id;
			});
		} catch (err) {
			console.error("Create newspaper error:", err);
			return message(form, "Failed to create newspaper", { status: 500 });
		}

		redirect(303, `/newspaper/${newspaperId}`);
	}
};
