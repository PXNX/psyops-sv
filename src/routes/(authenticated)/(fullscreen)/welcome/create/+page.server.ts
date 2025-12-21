// src/routes/(authenticated)/(fullscreen)/welcome/create/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles, userWallets, files, profileEditHistory } from "$lib/server/schema";
import { redirect, error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createProfileSchema } from "./schema";

const STARTING_BALANCE = 1000;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user already has a profile set up
	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	//todo: check if user has a residence aswell. if not, redirect to welcome/region, if yes, redirect to /

	// If profile already has a name, redirect to main app
	if (existingProfile?.name) {
		throw redirect(302, "/");
	}

	const form = await superValidate(valibot(createProfileSchema));

	return {
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createProfileSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, bio, avatar, politicalViews } = form.data;

		// Check if profile already exists
		const existingProfile = await db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		});

		if (existingProfile?.name) {
			return message(form, "Profile already completed", { status: 400 });
		}

		try {
			// Use transaction for everything
			await db.transaction(async (tx) => {
				let avatarFileId: string | null = null;

				// Upload avatar if provided
				if (avatar) {
					const avatarUploadResult = await uploadFileFromForm(avatar);

					if (!avatarUploadResult.success) {
						tx.rollback();
						throw new Error("Failed to upload avatar");
					}

					// Create file record in database
					const fileId = randomUUID();
					await tx.insert(files).values({
						id: fileId,
						key: avatarUploadResult.key,
						fileName: avatar.name,
						contentType: "image/webp",
						sizeBytes: avatar.size,
						uploadedBy: account.id
					});
					avatarFileId = fileId;
				}

				// Build bio with political views if provided
				let fullBio = bio || "";
				if (politicalViews && politicalViews.trim()) {
					const viewsCapitalized = politicalViews.charAt(0).toUpperCase() + politicalViews.slice(1);
					fullBio = fullBio
						? `Political Views: ${viewsCapitalized}\n\n${fullBio}`
						: `Political Views: ${viewsCapitalized}`;
				}

				// Update or create user profile
				if (existingProfile) {
					await tx
						.update(userProfiles)
						.set({
							name,
							bio: fullBio || null,
							avatar: avatarFileId,
							updatedAt: new Date()
						})
						.where(eq(userProfiles.accountId, account.id));
				} else {
					await tx.insert(userProfiles).values({
						accountId: account.id,
						name,
						bio: fullBio || null,
						avatar: avatarFileId
					});
				}

				// todo : dont set a user updat history record for the first time
				// Create profile edit history record
				await tx.insert(profileEditHistory).values({
					userId: account.id,
					lastEditAt: new Date()
				});

				// Check if user already has a wallet
				const existingWallet = await tx.query.userWallets.findFirst({
					where: eq(userWallets.userId, account.id)
				});

				// Create wallet with starting balance if it doesn't exist
				if (!existingWallet) {
					await tx.insert(userWallets).values({
						userId: account.id,
						balance: STARTING_BALANCE,
						updatedAt: new Date()
					});
				}
			});

			// Redirect to region selection or main app
		} catch (err) {
			console.error("Error creating profile:", err);
			return message(form, "Failed to create profile. Please try again.", { status: 500 });
		}

		redirect(303, "/welcome/region");
	}
};
