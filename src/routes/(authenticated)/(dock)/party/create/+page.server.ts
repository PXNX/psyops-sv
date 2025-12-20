import { db } from "$lib/server/db";
import {
	politicalParties,
	partyMembers,
	files,
	residences,
	stateFormationPeriods,
	stateFormationProposals
} from "$lib/server/schema";
import { uploadImageWithPreset } from "$lib/server/backblaze";
import { fail, redirect } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";

const partySchema = z.object({
	name: z
		.string()
		.min(3, "Party name must be at least 3 characters")
		.max(100, "Party name must be at most 100 characters"),
	abbreviation: z.string().max(10, "Abbreviation must be 10 characters or less").optional(),
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
		.default("#6366f1"),
	ideology: z.string().optional(),
	description: z.string().optional(),
	// State formation fields
	proposedStateName: z.string().min(3, "State name must be at least 3 characters").max(100).optional(),
	stateDescription: z.string().optional(),
	stateMapColor: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
		.default("#3b82f6")
});

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user already has a party membership
	const existingMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (existingMembership) {
		redirect(302, `/party/${existingMembership.partyId}`);
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
		redirect(302, "/regions?message=needPrimaryResidence");
	}

	const isIndependentRegion = !userResidence.region.stateId;

	// If independent region, check for existing formation period
	let formationPeriod = null;
	if (isIndependentRegion) {
		formationPeriod = await db.query.stateFormationPeriods.findFirst({
			where: eq(stateFormationPeriods.regionId, userResidence.regionId)
		});
	}

	const form = await superValidate(zod(partySchema));

	return {
		form,
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
		isIndependentRegion,
		formationPeriod: formationPeriod
			? {
					id: formationPeriod.id,
					status: formationPeriod.status,
					endsAt: formationPeriod.endsAt
				}
			: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const form = await superValidate(formData, zod(partySchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const logoFile = formData.get("logo") as File;

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
			return fail(400, {
				form,
				message: "You must have a primary residence before creating a party"
			});
		}

		const isIndependentRegion = !userResidence.region.stateId;
		const regionId = userResidence.regionId;
		const stateId = userResidence.region.stateId;

		// Validate state name if creating in independent region
		if (isIndependentRegion && !form.data.proposedStateName) {
			return fail(400, {
				form,
				message: "Proposed state name is required for independent regions"
			});
		}

		// Validate logo file if provided
		if (logoFile && logoFile.size > 0) {
			if (logoFile.size > 5 * 1024 * 1024) {
				return fail(400, {
					form,
					message: "Logo file size must be less than 5MB"
				});
			}
			if (!logoFile.type.startsWith("image/")) {
				return fail(400, {
					form,
					message: "Logo must be an image file"
				});
			}
		}

		// Check if party name already exists
		const existingParty = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.name, form.data.name)
		});

		if (existingParty) {
			return fail(400, {
				form,
				message: "A party with this name already exists"
			});
		}

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return fail(400, {
				form,
				message: "You are already a member of a political party"
			});
		}

		try {
			let logoFileId = null;

			// Upload logo if provided
			if (logoFile && logoFile.size > 0) {
				const uploadResult = await uploadImageWithPreset(logoFile, "logo");

				if (!uploadResult.success) {
					return fail(400, {
						form,
						message: uploadResult.error || "Logo upload failed"
					});
				}

				// Store file metadata in database
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
					name: form.data.name,
					abbreviation: form.data.abbreviation || null,
					color: form.data.color,
					logo: logoFileId,
					ideology: form.data.ideology || null,
					description: form.data.description || null,
					founderId: account.id,
					stateId: isIndependentRegion ? null : stateId,
					memberCount: 1
				})
				.returning();

			// Add founder as party leader
			await db.insert(partyMembers).values({
				userId: account.id,
				partyId: newParty.id,
				role: "leader"
			});

			// If independent region, handle state formation
			if (isIndependentRegion) {
				// Check if formation period already exists
				let formationPeriod = await db.query.stateFormationPeriods.findFirst({
					where: eq(stateFormationPeriods.regionId, regionId)
				});

				// Create formation period if it doesn't exist
				if (!formationPeriod) {
					const endsAt = new Date();
					endsAt.setDate(endsAt.getDate() + 3); // 3 days from now

					[formationPeriod] = await db
						.insert(stateFormationPeriods)
						.values({
							regionId,
							status: "active",
							endsAt
						})
						.returning();
				}

				// Create state formation proposal
				await db.insert(stateFormationProposals).values({
					formationPeriodId: formationPeriod.id,
					proposedBy: account.id,
					stateName: form.data.proposedStateName!,
					description: form.data.stateDescription || null,
					mapColor: form.data.stateMapColor,
					logo: logoFileId,
					voteCount: 0
				});

				// Redirect to state formation page
				redirect(303, `/region/${regionId}/state-formation`);
			}

			// Redirect to the new party page
			redirect(303, `/party/${newParty.id}`);
		} catch (error) {
			console.error("Party creation error:", error);
			return fail(500, {
				form,
				message: "Failed to create party"
			});
		}
	}
};
