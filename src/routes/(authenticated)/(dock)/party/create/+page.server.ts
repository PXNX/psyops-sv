// src/routes/party/create/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, residences, regions, states } from "$lib/server/schema";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";
import { uploadImageWithPreset } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user already has a party membership
	const existingMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (existingMembership) {
		throw redirect(302, `/party/${existingMembership.partyId}`);
	}

	// Get user's primary residence to determine their region
	const userResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	// If user has no primary residence, they need to select one first
	if (!userResidence) {
		throw redirect(302, "/regions?message=needPrimaryResidence");
	}

	const isIndependentRegion = !userResidence.region.stateId;

	return {
		userState: userResidence.region.state
			? {
					id: userResidence.region.state.id,
					name: userResidence.region.state.name,
					avatar: userResidence.region.state.avatar
				}
			: null,
		userRegion: {
			id: userResidence.region.id,
			name: userResidence.region.name
		},
		isIndependentRegion
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

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { message: "Party name is required", field: "name" });
		}

		if (name.trim().length < 3) {
			return fail(400, { message: "Party name must be at least 3 characters", field: "name" });
		}

		if (name.trim().length > 100) {
			return fail(400, { message: "Party name must be at most 100 characters", field: "name" });
		}

		if (abbreviation && abbreviation.trim().length > 10) {
			return fail(400, { message: "Abbreviation must be 10 characters or less", field: "abbreviation" });
		}

		// Validate color format
		if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
			return fail(400, { message: "Invalid color format", field: "color" });
		}

		// Get user's primary residence
		const userResidence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)),
			with: {
				region: {
					with: {
						state: true
					}
				}
			}
		});

		if (!userResidence) {
			return fail(400, { message: "You must have a primary residence before creating a party" });
		}

		const isIndependentRegion = !userResidence.region.stateId;
		const regionId = userResidence.regionId;
		const stateId = userResidence.region.stateId;

		// Check if party name already exists
		const existingParty = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.name, name.trim())
		});

		if (existingParty) {
			return fail(400, { message: "A party with this name already exists", field: "name" });
		}

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return fail(400, { message: "You are already a member of a political party" });
		}

		try {
			let logoFileId: string | null = null;

			// Upload logo if provided (optional)
			if (logoFile && logoFile.size > 0) {
				// Validate file type
				if (!logoFile.type.startsWith("image/")) {
					return fail(400, {
						message: "File must be an image",
						field: "logo"
					});
				}

				const maxSize = 5 * 1024 * 1024; // 5MB
				if (logoFile.size > maxSize) {
					return fail(400, {
						message: "Image size must be less than 5MB",
						field: "logo"
					});
				}

				// Upload with preset 'logo' (96x96)
				const logoUploadResult = await uploadImageWithPreset(logoFile, "logo");

				if (!logoUploadResult.success) {
					return fail(500, {
						message: logoUploadResult.error || "Failed to upload logo",
						field: "logo"
					});
				}

				// Create file record in database
				const fileId = randomUUID();
				try {
					await db.insert(files).values({
						id: fileId,
						key: logoUploadResult.key,
						fileName: logoFile.name,
						contentType: logoFile.type,
						sizeBytes: logoFile.size,
						uploadedBy: account.id
					});
					logoFileId = fileId;
				} catch (e) {
					console.error("Failed to create file record:", e);
					return fail(500, { message: "Failed to save logo information" });
				}
			}

			// If independent region, create state first
			let finalStateId: string | null = stateId;
			if (isIndependentRegion) {
				const region = await db.query.regions.findFirst({
					where: eq(regions.id, regionId)
				});

				if (!region) {
					return fail(404, { message: "Region not found" });
				}

				// Create new state
				const [newState] = await db
					.insert(states)
					.values({
						name: `State of ${region.name}`,
						avatar: region.avatar,
						background: region.background,
						description: `Newly formed state from ${region.name}`,
						population: region.population || 0,
						rating: 0
					})
					.returning();

				// Link region to state
				await db.update(regions).set({ stateId: newState.id }).where(eq(regions.id, regionId));

				finalStateId = newState.id;
			}

			// Ensure finalStateId is not null
			if (!finalStateId) {
				return fail(400, { message: "Could not determine state for party" });
			}

			// Create the party
			const [newParty] = await db
				.insert(politicalParties)
				.values({
					name: name.trim(),
					abbreviation: abbreviation?.trim() || null,
					color: color || "#6366f1",
					logo: logoFileId,
					ideology: ideology?.trim() || null,
					description: description?.trim() || null,
					founderId: account.id,
					stateId: finalStateId,
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
			throw redirect(303, `/party/${newParty.id}`);
		} catch (err) {
			if (err instanceof Response) {
				throw err;
			}
			console.error("Party creation error:", err);
			return fail(500, { message: "Failed to create party" });
		}
	}
};
