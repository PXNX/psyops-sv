// src/routes/(authenticated)/(dock)/newspaper/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { newspapers, journalists, files, userWallets } from "$lib/server/schema";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm, getSignedDownloadUrl } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { newspaperSchema } from "../../create/schema";

// Configuration constants
const EDIT_COST = 2500;
const COOLDOWN_HOURS = 12;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const newspaperId = parseInt(params.id);

	// Get newspaper details
	const newspaper = await db.query.newspapers.findFirst({
		where: eq(newspapers.id, newspaperId)
	});

	if (!newspaper) {
		throw error(404, "Newspaper not found");
	}

	// Check if user is the owner
	const ownership = await db.query.journalists.findFirst({
		where: and(
			eq(journalists.userId, account.id),
			eq(journalists.newspaperId, newspaperId),
			eq(journalists.rank, "owner")
		)
	});

	if (!ownership) {
		throw error(403, "Only the newspaper owner can edit it");
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

	// Check if newspaper is on cooldown (simplified - you may want a separate edit history table)
	const canAfford = userWallet.balance >= EDIT_COST;

	// Get logo URL if exists
	let logoUrl = null;
	if (newspaper.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, newspaper.logo)
		});
		if (logoFile) {
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {
				logoUrl = null;
			}
		}
	}

	// Populate form with existing data
	const form = await superValidate(
		{
			name: newspaper.name,
			background: newspaper.background ?? ""
		},
		valibot(newspaperSchema)
	);

	return {
		form,
		newspaper: {
			id: newspaper.id,
			name: newspaper.name,
			logoUrl,
			background: newspaper.background
		},
		canAfford,
		userBalance: userWallet.balance,
		editCost: EDIT_COST,
		cooldownHours: COOLDOWN_HOURS
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const newspaperId = parseInt(params.id);
		const form = await superValidate(request, valibot(newspaperSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, background, logo } = form.data;

		// Get newspaper and verify ownership
		const newspaper = await db.query.newspapers.findFirst({
			where: eq(newspapers.id, newspaperId)
		});

		if (!newspaper) {
			return message(form, "Newspaper not found", { status: 404 });
		}

		const ownership = await db.query.journalists.findFirst({
			where: and(
				eq(journalists.userId, account.id),
				eq(journalists.newspaperId, newspaperId),
				eq(journalists.rank, "owner")
			)
		});

		if (!ownership) {
			return message(form, "Only the newspaper owner can edit it", { status: 403 });
		}

		// Check user has sufficient funds
		const userWallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!userWallet || userWallet.balance < EDIT_COST) {
			return message(form, "Insufficient funds to edit newspaper", { status: 400 });
		}

		// Check if new name conflicts with another newspaper
		if (name !== newspaper.name) {
			const existingNewspaper = await db.query.newspapers.findFirst({
				where: eq(newspapers.name, name)
			});

			if (existingNewspaper) {
				return message(form, "A newspaper with this name already exists", { status: 400 });
			}
		}

		try {
			let logoFileId: number | null = newspaper.logo;

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

			// Update newspaper
			await db
				.update(newspapers)
				.set({
					name,
					logo: logoFileId,
					background: background || null
				})
				.where(eq(newspapers.id, newspaperId));

			return message(form, "Newspaper updated successfully!");
		} catch (err) {
			console.error("Update newspaper error:", err);
			return message(form, "Failed to update newspaper", { status: 500 });
		}
	},

	delete: async ({ params, locals }) => {
		const account = locals.account!;
		const newspaperId = parseInt(params.id);

		try {
			// Get newspaper details
			const newspaper = await db.query.newspapers.findFirst({
				where: eq(newspapers.id, newspaperId)
			});

			if (!newspaper) {
				return fail(404, { error: "Newspaper not found" });
			}

			// Check if user is the owner
			const ownership = await db.query.journalists.findFirst({
				where: and(
					eq(journalists.userId, account.id),
					eq(journalists.newspaperId, newspaperId),
					eq(journalists.rank, "owner")
				)
			});

			if (!ownership) {
				return fail(403, { error: "Only the newspaper owner can delete it" });
			}

			// Delete newspaper (cascade will handle journalists and articles)
			await db.delete(newspapers).where(eq(newspapers.id, newspaperId));
		} catch (err) {
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Delete newspaper error:", err);
			return fail(500, { error: "Failed to delete newspaper" });
		}

		redirect(303, "/newspaper");
	}
};
