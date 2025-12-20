import { db } from "$lib/server/db";
import { politicalParties, partyMembers, states, files } from "$lib/server/schema";
import { uploadImageWithPreset, getSignedDownloadUrl } from "$lib/server/backblaze";
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

	// Get available states for party registration
	const availableStates = await db.query.states.findMany({
		orderBy: (states, { asc }) => [asc(states.name)]
	});

	return {
		states: availableStates.map((state) => ({
			id: state.id,
			name: state.name,
			avatar: state.avatar
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const name = formData.get("name") as string;
		const abbreviation = formData.get("abbreviation") as string;
		const color = formData.get("color") as string;
		const ideology = formData.get("ideology") as string;
		const description = formData.get("description") as string;
		const stateId = formData.get("stateId") as string;
		const logoFileId = formData.get("logoFileId") as string;

		// Validation
		if (!name || name.length < 3 || name.length > 100) {
			return fail(400, { error: "Party name must be between 3 and 100 characters" });
		}

		if (abbreviation && abbreviation.length > 10) {
			return fail(400, { error: "Abbreviation must be 10 characters or less" });
		}

		if (!stateId) {
			return fail(400, { error: "Please select a state" });
		}

		// Check if party name already exists
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
			// Create the party
			const [newParty] = await db
				.insert(politicalParties)
				.values({
					name,
					abbreviation: abbreviation || null,
					color: color || "#6366f1",
					logo: logoFileId || null,
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
	},

	uploadLogo: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file || file.size === 0) {
			return fail(400, { error: "No file provided" });
		}

		try {
			// Upload logo with preset dimensions (96x96)
			const uploadResult = await uploadImageWithPreset(file, "logo");

			if (!uploadResult.success) {
				return fail(400, { error: uploadResult.error || "Upload failed" });
			}

			// Store file metadata in database
			const fileId = randomUUID();
			await db.insert(files).values({
				id: fileId,
				key: uploadResult.key,
				fileName: file.name,
				mimeType: file.type,
				size: file.size,
				uploadedBy: account.id
			});

			// Get signed URL for preview
			const signedUrl = await getSignedDownloadUrl(uploadResult.key);

			return {
				success: true,
				fileId,
				url: signedUrl,
				fileName: file.name
			};
		} catch (error) {
			console.error("Logo upload error:", error);
			return fail(500, { error: "Failed to upload logo" });
		}
	}
};
