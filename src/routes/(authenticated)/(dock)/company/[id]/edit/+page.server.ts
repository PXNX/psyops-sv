// src/routes/company/edit/+page.server.ts
import { db } from "$lib/server/db";
import { companies } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's company
	const [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

	return {
		company: company || null
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

		// Get user's company
		const [company] = await db.select().from(companies).where(eq(companies.ownerId, account.id));

		if (!company) {
			return fail(404, { error: "Company not found" });
		}

		// Update company
		await db
			.update(companies)
			.set({
				name: name.trim(),
				logo: logo || null,
				description: description || null
			})
			.where(eq(companies.id, company.id));

		throw redirect(303, "/company/" + company.id);
	}
};
