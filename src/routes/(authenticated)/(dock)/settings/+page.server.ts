// src/routes/(authenticated)/(dock)/settings/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles, userWallets } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm, getSignedDownloadUrl } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { updateProfileSchema } from "./schema";
import { PROFILE_EDIT_CONFIG } from "$lib/config/party";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user profile
	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	// Get logo URL if it's stored in profile
	let logoUrl = profile?.logo || null;
	if (logoUrl && !logoUrl.startsWith("http")) {
		try {
			logoUrl = await getSignedDownloadUrl(logoUrl);
		} catch {
			logoUrl = null;
		}
	}

	// Get user's wallet
	const wallet = await db.query.userWallets.findFirst({
		where: eq(userWallets.userId, account.id)
	});

	const userBalance = Number(wallet?.balance ?? 0);
	const canAfford = userBalance >= PROFILE_EDIT_CONFIG.COST;

	// Check edit cooldown using updatedAt from profile
	let cooldownEndsAt: Date | null = null;
	let isOnCooldown = false;

	if (profile?.updatedAt) {
		const cooldownEnd = new Date(profile.updatedAt);
		cooldownEnd.setHours(cooldownEnd.getHours() + PROFILE_EDIT_CONFIG.COOLDOWN_HOURS);

		if (new Date() < cooldownEnd) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd;
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
			logo: logoUrl
		},
		userBalance,
		editCost: PROFILE_EDIT_CONFIG.COST,
		canAfford,
		isOnCooldown,
		cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
		cooldownHours: PROFILE_EDIT_CONFIG.COOLDOWN_HOURS
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(updateProfileSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, bio, logo } = form.data;

		// Get user's wallet
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		const userBalance = Number(wallet?.balance ?? 0);

		// Check if user can afford
		if (userBalance < PROFILE_EDIT_CONFIG.COST) {
			return message(
				form,
				`Insufficient funds. You need ${PROFILE_EDIT_CONFIG.COST.toLocaleString()} currency to edit your profile.`,
				{ status: 400 }
			);
		}

		// Check cooldown using profile's updatedAt
		const existingProfile = await db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		});

		if (existingProfile?.updatedAt) {
			const cooldownEnd = new Date(existingProfile.updatedAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + PROFILE_EDIT_CONFIG.COOLDOWN_HOURS);

			if (new Date() < cooldownEnd) {
				const minutesRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				return message(form, `You must wait ${minutesRemaining} more minute(s) before editing your profile again.`, {
					status: 400
				});
			}
		}

		try {
			await db.transaction(async (tx) => {
				// Deduct cost from wallet
				await tx
					.update(userWallets)
					.set({
						balance: userBalance - PROFILE_EDIT_CONFIG.COST,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));

				let logoKey: string | undefined;

				// Upload new logo if provided
				if (logo && logo.size > 0) {
					const uploadResult = await uploadFileFromForm(logo);

					if (!uploadResult.success) {
						tx.rollback();
						throw new Error("Failed to upload logo");
					}

					logoKey = uploadResult.key;
				}

				if (existingProfile) {
					// Update existing profile
					await tx
						.update(userProfiles)
						.set({
							name,
							bio: bio || null,
							...(logoKey ? { logo: logoKey } : {}),
							updatedAt: new Date()
						})
						.where(eq(userProfiles.accountId, account.id));
				} else {
					// Create new profile
					await tx.insert(userProfiles).values({
						accountId: account.id,
						name,
						bio: bio || null,
						logo: logoKey || null
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
