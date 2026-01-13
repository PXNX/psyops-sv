// src/routes/company/create/+page.server.ts
import { db } from "$lib/server/db";
import { companies, companyCreationCooldown, userWallets, files } from "$lib/server/schema";
import { redirect } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createCompanySchema } from "./schema";

const COMPANY_COST = 100000;
const COOLDOWN_DAYS = 30;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's wallet
	const wallet = await db.query.userWallets.findFirst({
		where: eq(userWallets.userId, account.id)
	});

	const userBalance = wallet?.balance ?? 0;
	const canAfford = userBalance >= COMPANY_COST;

	// Check cooldown
	const cooldown = await db.query.companyCreationCooldown.findFirst({
		where: eq(companyCreationCooldown.userId, account.id)
	});

	let isOnCooldown = false;
	let cooldownEndsAt: Date | null = null;

	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastCreationAt);
		cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

		if (new Date() < cooldownEnd) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd;
		}
	}

	// Check if user already has a company
	const existingCompany = await db.query.companies.findFirst({
		where: eq(companies.ownerId, account.id)
	});

	if (existingCompany) {
		throw redirect(302, `/company/${existingCompany.id}`);
	}

	const form = await superValidate(valibot(createCompanySchema));

	return {
		form,
		userBalance,
		companyCost: COMPANY_COST,
		canAfford,
		isOnCooldown,
		cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
		cooldownDays: COOLDOWN_DAYS
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createCompanySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, description, logo } = form.data;

		// Get user's wallet
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		const userBalance = wallet?.balance ?? 0;

		// Check if user can afford
		if (userBalance < COMPANY_COST) {
			return message(
				form,
				`Insufficient funds. You need ${COMPANY_COST.toLocaleString()} currency to create a company.`,
				{ status: 400 }
			);
		}

		// Check cooldown
		const cooldown = await db.query.companyCreationCooldown.findFirst({
			where: eq(companyCreationCooldown.userId, account.id)
		});

		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastCreationAt);
			cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

			if (new Date() < cooldownEnd) {
				const daysRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
				return message(form, `You must wait ${daysRemaining} more day(s) before creating another company.`, {
					status: 400
				});
			}
		}

		// Check if user already has a company
		const existingCompany = await db.query.companies.findFirst({
			where: eq(companies.ownerId, account.id)
		});

		if (existingCompany) {
			return message(form, "You already own a company", { status: 400 });
		}

		// Create company with transaction
		const newCompany = await db.transaction(async (tx) => {
			// Deduct cost
			await tx
				.update(userWallets)
				.set({
					balance: userBalance - COMPANY_COST,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Update or create cooldown
			if (cooldown) {
				await tx
					.update(companyCreationCooldown)
					.set({ lastCreationAt: new Date() })
					.where(eq(companyCreationCooldown.userId, account.id));
			} else {
				await tx.insert(companyCreationCooldown).values({
					userId: account.id,
					lastCreationAt: new Date()
				});
			}

			let logoFileId: number | null = null;

			// Upload logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					tx.rollback();
					return null;
				}

				// Create file record in database
				const [fileRecord] = await tx
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

			// Create company
			const [company] = await tx
				.insert(companies)
				.values({
					name: name.trim(),
					logo: logoFileId,
					description: description?.trim() || null,
					ownerId: account.id
				})
				.returning();

			return company;
		});

		if (!newCompany) {
			return message(form, "Failed to create company", { status: 500 });
		}

		throw redirect(303, `/company/${newCompany.id}`);
	}
};
