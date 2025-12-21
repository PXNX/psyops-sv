// src/routes/party/create/+page.server.ts
import { db } from "$lib/server/db";
import {
	politicalParties,
	partyMembers,
	files,
	residences,
	regions,
	states,
	parliamentaryElections
} from "$lib/server/schema";
import { redirect, error } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createPartySchema } from "./schema";

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

	const form = await superValidate(valibot(createPartySchema));

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
		isIndependentRegion
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createPartySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, abbreviation, color, ideology, description, logo } = form.data;

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
			return message(form, "You must have a primary residence before creating a party", {
				status: 400
			});
		}

		const isIndependentRegion = !userResidence.region.stateId;
		const regionId = userResidence.regionId;
		const stateId = userResidence.region.stateId;

		// Check if party name already exists
		const existingParty = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.name, name)
		});

		if (existingParty) {
			return message(form, "A party with this name already exists", { status: 400 });
		}

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return message(form, "You are already a member of a political party", { status: 400 });
		}

		// Use transaction for everything including file upload
		const newParty = await db.transaction(async (tx) => {
			let logoFileId: string | null = null;

			// Upload logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					tx.rollback();
					return null;
				}

				// Create file record in database
				const fileId = randomUUID();
				await tx.insert(files).values({
					id: fileId,
					key: logoUploadResult.key,
					fileName: logo.name,
					contentType: "image/webp", // All images are converted to WebP
					sizeBytes: logo.size,
					uploadedBy: account.id
				});
				logoFileId = fileId;
			}

			// If independent region, create state first
			let finalStateId: string | null = stateId;
			let isNewState = false;
			if (isIndependentRegion) {
				const region = await tx.query.regions.findFirst({
					where: eq(regions.id, regionId)
				});

				if (!region) {
					tx.rollback();
					return null;
				}

				// Create new state
				const [newState] = await tx
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
				await tx.update(regions).set({ stateId: newState.id }).where(eq(regions.id, regionId));

				finalStateId = newState.id;
				isNewState = true;
			}

			// Ensure finalStateId is not null
			if (!finalStateId) {
				tx.rollback();
				return null;
			}

			// Create the party
			const [party] = await tx
				.insert(politicalParties)
				.values({
					name,
					abbreviation: abbreviation || null,
					color,
					logo: logoFileId,
					ideology,
					description: description || null,
					founderId: account.id,
					stateId: finalStateId,
					memberCount: 1
				})
				.returning();

			// Add founder as party leader
			await tx.insert(partyMembers).values({
				userId: account.id,
				partyId: party.id,
				role: "leader"
			});

			// If this is a new state, automatically schedule inaugural election
			if (isNewState && finalStateId) {
				const now = new Date();

				// Election starts in 3 days (72 hours)
				const startDate = new Date(now);
				startDate.setDate(startDate.getDate() + 3);
				startDate.setHours(0, 0, 0, 0);

				// Election runs for 2 days
				const endDate = new Date(startDate);
				endDate.setDate(endDate.getDate() + 2);
				endDate.setHours(23, 59, 59, 999);

				// Create inaugural election with default 50 seats
				await tx.insert(parliamentaryElections).values({
					stateId: finalStateId,
					startDate,
					endDate,
					status: "scheduled",
					totalSeats: 50, // Default inaugural parliament size
					isInaugural: 1
				});
			}

			return party;
		});

		if (!newParty) {
			return message(form, "Failed to create party", { status: 500 });
		}

		// Redirect to the new party page
		throw redirect(303, `/party/${newParty.id}`);
	}
};
