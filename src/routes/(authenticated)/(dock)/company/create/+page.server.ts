// src/routes/company/create/+page.server.ts
import { db } from "$lib/server/db";
import { companies, companyCreationCooldown, userWallets } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const COMPANY_COST = 100000;
const COOLDOWN_DAYS = 30;

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Check cooldown
	const [cooldown] = await db
		.select()
		.from(companyCreationCooldown)
		.where(eq(companyCreationCooldown.userId, account.id));

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastCreationAt);
		cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

		if (new Date() < cooldownEnd) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	return {
		userBalance: wallet?.balance || 0,
		isOnCooldown,
		cooldownEndsAt
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const data = await request.formData();

		const name = data.get("name") as string;
		const logo = data.get("logo") as string;
		const description = data.get("description") as string;

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { error: "Company name is required" });
		}

		if (name.length > 100) {
			return fail(400, { error: "Company name must be 100 characters or less" });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(companyCreationCooldown)
			.where(eq(companyCreationCooldown.userId, account.id));

		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastCreationAt);
			cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

			if (new Date() < cooldownEnd) {
				return fail(400, {
					error: `Company creation is on cooldown. Try again after ${cooldownEnd.toLocaleDateString()}`
				});
			}
		}

		// Check balance
		const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!wallet || wallet.balance < COMPANY_COST) {
			return fail(400, { error: "Insufficient funds" });
		}

		// Check if user already has a company
		const [existingCompany] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

		if (existingCompany) {
			return fail(400, { error: "You already own a company" });
		}

		// Create company
		const company = await db.transaction(async (tx) => {
			// Deduct cost
			await tx
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${COMPANY_COST}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Create company
			await tx.insert(companies).values({
				name: name.trim(),
				logo: logo || null,
				description: description || null,
				ownerId: account.id
			});

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
		});

		throw redirect(303, "/company" + "/" + company.id);
	}
};
