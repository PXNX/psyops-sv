// src/routes/(authenticated)/(dock)/settings/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles, files } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm, getSignedDownloadUrl } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { updateProfileSchema } from "./schema";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user profile
	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	// Get avatar URL if it's a file ID
	let avatarUrl = profile?.avatar || null;
	if (avatarUrl && !avatarUrl.startsWith("http")) {
		const avatarFile = await db.query.files.findFirst({
			where: eq(files.id, avatarUrl)
		});
		if (avatarFile) {
			avatarUrl = await getSignedDownloadUrl(avatarFile.key);
		}
	}

	const form = await superValidate(
		{
			name: profile?.name || account.email.split("@")[0],
			bio: profile?.bio || ""
		},
		valibot(updateProfileSchema)
	);

	return {
		form,
		profile: {
			name: profile?.name,
			bio: profile?.bio,
			avatar: avatarUrl
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(updateProfileSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, bio, avatar } = form.data;

		try {
			await db.transaction(async (tx) => {
				let avatarFileId: string | undefined;

				// Upload new avatar if provided
				if (avatar && avatar.size > 0) {
					const uploadResult = await uploadFileFromForm(avatar);

					if (!uploadResult.success) {
						tx.rollback();
						throw new Error("Failed to upload avatar");
					}

					// Create file record
					const fileId = randomUUID();
					await tx.insert(files).values({
						id: fileId,
						key: uploadResult.key,
						fileName: avatar.name,
						contentType: "image/webp",
						sizeBytes: avatar.size,
						uploadedBy: account.id
					});
					avatarFileId = fileId;
				}

				// Check if profile exists
				const existingProfile = await tx.query.userProfiles.findFirst({
					where: eq(userProfiles.accountId, account.id)
				});

				if (existingProfile) {
					// Update existing profile
					await tx
						.update(userProfiles)
						.set({
							name,
							bio: bio || null,
							...(avatarFileId ? { avatar: avatarFileId } : {}),
							updatedAt: new Date()
						})
						.where(eq(userProfiles.accountId, account.id));
				} else {
					// Create new profile
					await tx.insert(userProfiles).values({
						accountId: account.id,
						name,
						bio: bio || null,
						avatar: avatarFileId || null
					});
				}
			});

			return message(form, "Profile updated successfully");
		} catch (error) {
			console.error("Profile update error:", error);
			return message(form, "Failed to update profile", { status: 500 });
		}
	},

	logout: async ({ locals }) => {
		return redirect(302, "/auth/logout");
	}
};
