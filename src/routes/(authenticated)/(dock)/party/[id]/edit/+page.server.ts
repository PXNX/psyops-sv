// src/routes/party/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, userWallets, partyEditHistory } from "$lib/server/schema";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm, getSignedDownloadUrl } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createPartySchema } from "./schema";

// Configuration constants
const EDIT_COST = 5000;
const COOLDOWN_HOURS = 24;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const partyId = parseInt(params.id);

	// Get party details
	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, partyId),
		with: {
			state: true,
			founder: {
				with: {
					profile: true
				}
			}
		}
	});

	if (!party) {
		throw error(404, "Party not found");
	}

	// Check if user is the leader
	const membership = await db.query.partyMembers.findFirst({
		where: and(eq(partyMembers.userId, account.id), eq(partyMembers.partyId, partyId))
	});

	if (!membership || membership.role !== "leader") {
		throw error(403, "Only the party leader can edit the party");
	}

	// Get user's wallet balance
	let userWallet = await db.query.userWallets.findFirst({
		where: eq(userWallets.userId, account.id)
	});

	// Create wallet if it doesn't exist
	if (!userWallet) {
		const [newWallet] = await db
			.insert(userWallets)
			.values({
				userId: account.id,
				balance: 10000
			})
			.returning();
		userWallet = newWallet;
	}

	// Check if party is on cooldown
	const editHistory = await db.query.partyEditHistory.findFirst({
		where: eq(partyEditHistory.partyId, partyId)
	});

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (editHistory) {
		const cooldownEnd = new Date(editHistory.lastEditAt);
		cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

		if (cooldownEnd > new Date()) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	// Check if user can afford the edit
	const canAfford = userWallet.balance >= EDIT_COST;

	// Get logo URL if exists
	let logoUrl = null;
	if (party.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, party.logo)
		});
		if (logoFile) {
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {
				logoUrl = null;
			}
		}
	}

	// Populate form with existing data - handle null values properly
	const form = await superValidate(
		{
			name: party.name,
			abbreviation: party.abbreviation ?? "",
			color: party.color,
			ideology: party.ideology ?? "",
			description: party.description ?? ""
		},
		valibot(createPartySchema)
	);

	return {
		form,
		party: {
			id: party.id,
			name: party.name,
			abbreviation: party.abbreviation,
			color: party.color,
			logoUrl,
			ideology: party.ideology,
			description: party.description,
			memberCount: party.memberCount,
			state: {
				id: party.state.id,
				name: party.state.name
			}
		},
		isOnCooldown,
		cooldownEndsAt,
		canAfford,
		userBalance: userWallet.balance,
		editCost: EDIT_COST,
		cooldownHours: COOLDOWN_HOURS
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);
		const form = await superValidate(request, valibot(createPartySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, abbreviation, color, ideology, description, logo } = form.data;

		// Get party and verify leadership
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyId),
			with: {
				members: true
			}
		});

		if (!party) {
			return message(form, "Party not found", { status: 404 });
		}

		const membership = party.members.find((m) => m.userId === account.id);
		if (!membership || membership.role !== "leader") {
			return message(form, "Only the party leader can edit the party", { status: 403 });
		}

		// Check cooldown
		const editHistory = await db.query.partyEditHistory.findFirst({
			where: eq(partyEditHistory.partyId, partyId)
		});

		if (editHistory) {
			const cooldownEnd = new Date(editHistory.lastEditAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

			if (cooldownEnd > new Date()) {
				const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				return message(form, `Please wait ${minutesLeft} minutes before editing again`, { status: 400 });
			}
		}

		// Check user has sufficient funds
		const userWallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!userWallet || userWallet.balance < EDIT_COST) {
			return message(form, "Insufficient funds to edit party", { status: 400 });
		}

		// Check if new name conflicts with another party
		if (name !== party.name) {
			const existingParty = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.name, name)
			});

			if (existingParty) {
				return message(form, "A party with this name already exists", { status: 400 });
			}
		}

		try {
			let logoFileId: number | null = party.logo;

			// Upload new logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

				// Create file record in database
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

			// Deduct cost from user's wallet
			await db
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${EDIT_COST}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Update party
			await db
				.update(politicalParties)
				.set({
					name,
					abbreviation: abbreviation || null,
					color,
					logo: logoFileId,
					ideology: ideology || null,
					description: description || null
				})
				.where(eq(politicalParties.id, partyId));

			// Update or create edit history
			if (editHistory) {
				await db
					.update(partyEditHistory)
					.set({
						lastEditAt: new Date(),
						lastEditBy: account.id
					})
					.where(eq(partyEditHistory.partyId, partyId));
			} else {
				await db.insert(partyEditHistory).values({
					partyId,
					lastEditAt: new Date(),
					lastEditBy: account.id
				});
			}

			return message(form, "Party updated successfully!");
		} catch (err) {
			console.error("Update party error:", err);
			return message(form, "Failed to update party", { status: 500 });
		}
	},

	delete: async ({ params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);

		try {
			// Get party details
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId),
				with: {
					members: true
				}
			});

			if (!party) {
				return fail(404, { error: "Party not found" });
			}

			// Check if user is the leader
			const membership = party.members.find((m) => m.userId === account.id);
			if (!membership || membership.role !== "leader") {
				return fail(403, { error: "Only the party leader can delete the party" });
			}

			// Check if leader is the only member
			if (party.memberCount > 1) {
				return fail(400, { error: "Cannot delete party with other members. All members must leave first." });
			}

			// Delete party (cascade will handle party members and edit history)
			await db.delete(politicalParties).where(eq(politicalParties.id, partyId));
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Delete party error:", err);
			return fail(500, { error: "Failed to delete party" });
		}

		redirect(303, "/party");
	}
};
