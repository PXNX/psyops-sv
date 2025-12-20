import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, residences } from "$lib/server/schema";
import { uploadImageWithPreset } from "$lib/server/backblaze";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user already has a party membership
	const existingMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (existingMembership) {
		redirect(302, `/party/${existingMembership.partyId}`);
	}

	// Get user's primary residence to determine their state
	const userResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	// If user has no residence, they need to select one first
	if (!userResidence) {
		redirect(302, "/regions?selectResidence=true");
	}

	return {
		userState: {
			id: userResidence.region.state.id,
			name: userResidence.region.state.name,
			avatar: userResidence.region.state.avatar
		},
		userRegion: {
			id: userResidence.region.id,
			name: userResidence.region.name
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const name = formData.get("name") as string;
		const abbreviation = formData.get("abbreviation") as string;
		const color = formData.get("color") as string;
		const ideology = formData.get("ideology") as string;
		const description = formData.get("description") as string;
		const logoFile = formData.get("logo") as File;

		// Get user's state from their residence
		const userResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: {
						state: true
					}
				}
			}
		});

		if (!userResidence) {
			return fail(400, { error: "You must have a residence before creating a party" });
		}

		const stateId = userResidence.region.state.id;

		// Validation
		if (!name || name.length < 3 || name.length > 100) {
			return fail(400, { error: "Party name must be between 3 and 100 characters" });
		}

		if (abbreviation && abbreviation.length > 10) {
			return fail(400, { error: "Abbreviation must be 10 characters or less" });
		}

		// Validate logo file if provided
		if (logoFile && logoFile.size > 0) {
			if (logoFile.size > 5 * 1024 * 1024) {
				return fail(400, { error: "Logo file size must be less than 5MB" });
			}
			if (!logoFile.type.startsWith("image/")) {
				return fail(400, { error: "Logo must be an image file" });
			}
		}

		// Check if party name already exists in this state
		const existingParty = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.name, name)
		});

		if (existingParty) {
			return fail(400, { error: "A party with this name already exists" });
		}

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return fail(400, { error: "You are already a member of a political party" });
		}

		try {
			let logoFileId = null;

			// Upload logo if provided
			if (logoFile && logoFile.size > 0) {
				const uploadResult = await uploadImageWithPreset(logoFile, "logo");

				if (!uploadResult.success) {
					return fail(400, { error: uploadResult.error || "Logo upload failed" });
				}

				// Store file metadata in database with correct field names
				const fileId = randomUUID();
				await db.insert(files).values({
					id: fileId,
					key: uploadResult.key,
					fileName: logoFile.name,
					contentType: logoFile.type,
					sizeBytes: logoFile.size,
					uploadedBy: account.id
				});

				logoFileId = fileId;
			}

			// Create the party
			const [newParty] = await db
				.insert(politicalParties)
				.values({
					name,
					abbreviation: abbreviation || null,
					color: color || "#6366f1",
					logo: logoFileId,
					ideology: ideology || null,
					description: description || null,
					founderId: account.id,
					stateId,
					memberCount: 1
				})
				.returning();

			// Add founder as party leader
			await db.insert(partyMembers).values({
				userId: account.id,
				partyId: newParty.id,
				role: "leader"
			});

			// Redirect to the new party page
			redirect(303, `/party/${newParty.id}`);
		} catch (error) {
			console.error("Party creation error:", error);
			return fail(500, { error: "Failed to create party" });
		}
	}
};
