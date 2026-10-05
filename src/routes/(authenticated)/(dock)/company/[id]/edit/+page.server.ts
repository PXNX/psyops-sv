// src/routes/company/[id]/edit/+page.server.ts
import { db } from "#lib/server/db.js";
import { companies, companyEditCooldown, files, userWallets, factories, factoryWorkers } from "#lib/server/schema.js";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm, getLogoUrl } from "#lib/server/backblaze.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editCompanySchema } from "./schema";

// Configuration constants
const EDIT_COST = 10000;
const COOLDOWN_HOURS = 48;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const companyId = parseInt(params.id);

	// Get company details with factories and workers in one efficient query
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, companyId),
		with: {
			owner: {
				with: {
					profile: true
				}
			}
		}
	});

	if (!company) {
		throw error(404, "Company not found");
	}

	// Check if user is the owner
	if (company.ownerId !== account.id) {
		throw error(403, "Only the company owner can edit the company");
	}

	// Everything below only depends on the company, so fetch it in parallel
	const [wallet, cooldown, logoUrl, { companyFactories, workerCount }, form] = await Promise.all([
		// Get user's wallet balance, creating it if it doesn't exist
		(async () => {
			const [userWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id)).limit(1);
			if (userWallet) return userWallet;
			const [newWallet] = await db
				.insert(userWallets)
				.values({
					userId: account.id,
					balance: 10000
				})
				.returning();
			return newWallet;
		})(),
		// Check if company is on cooldown
		db.query.companyEditCooldown.findFirst({
			where: eq(companyEditCooldown.userId, account.id)
		}),
		getLogoUrl(company.logo),
		// Get company statistics (optimized single query for factories and workers)
		(async () => {
			const companyFactories = await db
				.select({
					id: factories.id
				})
				.from(factories)
				.where(eq(factories.companyId, companyId));

			const factoryIds = companyFactories.map((f) => f.id);
			const workerCount =
				factoryIds.length > 0
					? await db
							.select({ count: sql<number>`count(*)` })
							.from(factoryWorkers)
							.where(inArray(factoryWorkers.factoryId, factoryIds))
					: [{ count: 0 }];
			return { companyFactories, workerCount };
		})(),
		// Populate form with existing data
		superValidate(
			{
				name: company.name,
				description: company.description ?? ""
			},
			valibot(editCompanySchema)
		)
	]);

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastEditAt);
		cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

		if (cooldownEnd > new Date()) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	// Check if user can afford the edit
	const canAfford = Number(wallet.balance) >= EDIT_COST;

	return {
		form,
		company: {
			id: company.id,
			name: company.name,
			logoUrl,
			description: company.description,
			foundedAt: company.foundedAt.toISOString(),
			factoryCount: companyFactories.length,
			workerCount: Number(workerCount[0].count)
		},
		isOnCooldown,
		cooldownEndsAt,
		canAfford,
		userBalance: Number(wallet.balance),
		editCost: EDIT_COST,
		cooldownHours: COOLDOWN_HOURS
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const companyId = parseInt(params.id);
		const form = await superValidate(request, valibot(editCompanySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, description, logo } = form.data;

		// Get company and verify ownership
		const company = await db.query.companies.findFirst({
			where: eq(companies.id, companyId)
		});

		if (!company) {
			return message(form, "Company not found", { status: 404 });
		}

		if (company.ownerId !== account.id) {
			return message(form, "Only the company owner can edit the company", { status: 403 });
		}

		// Check cooldown
		const cooldown = await db.query.companyEditCooldown.findFirst({
			where: eq(companyEditCooldown.userId, account.id)
		});

		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastEditAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

			if (cooldownEnd > new Date()) {
				const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				const hoursLeft = Math.floor(minutesLeft / 60);
				const remainingMinutes = minutesLeft % 60;

				const timeMessage =
					hoursLeft > 0
						? `${hoursLeft} hour${hoursLeft > 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`
						: `${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}`;

				return message(form, `Please wait ${timeMessage} before editing again`, { status: 400 });
			}
		}

		// Check user has sufficient funds
		const [userWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id)).limit(1);

		if (!userWallet || Number(userWallet.balance) < EDIT_COST) {
			return message(form, "Insufficient funds to edit company", { status: 400 });
		}

		// Check if new name conflicts with another company
		if (name !== company.name) {
			const existingCompany = await db.query.companies.findFirst({
				where: and(eq(companies.name, name), sql`${companies.id} != ${companyId}`)
			});

			if (existingCompany) {
				return message(form, "A company with this name already exists", { status: 400 });
			}
		}

		try {
			let logoFileId: number | null = company.logo;

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

			// Use a transaction for atomicity
			await db.transaction(async (tx) => {
				// Deduct cost from user's wallet
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} - ${EDIT_COST}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));

				// Update company
				await tx
					.update(companies)
					.set({
						name,
						logo: logoFileId,
						description: description || null
					})
					.where(eq(companies.id, companyId));

				// Update or create cooldown
				if (cooldown) {
					await tx
						.update(companyEditCooldown)
						.set({
							lastEditAt: new Date()
						})
						.where(eq(companyEditCooldown.userId, account.id));
				} else {
					await tx.insert(companyEditCooldown).values({
						userId: account.id,
						lastEditAt: new Date()
					});
				}
			});

			return message(form, "Company updated successfully!");
		} catch (err) {
			console.error("Update company error:", err);
			return message(form, "Failed to update company", { status: 500 });
		}
	}
};
