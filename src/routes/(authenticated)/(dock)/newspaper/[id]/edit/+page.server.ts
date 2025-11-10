// src/routes/(authenticated)/(dock)/newspaper/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers } from "$lib/server/schema";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { newspaperSchema } from "./schema";

export const load: PageServerLoad = async () => {
	const form = await superValidate(valibot(newspaperSchema), {
		strict: true
	});

	return { form };
};

export const actions = {
	default: async ({ request, locals }) => {
		// Optional: Simulate delay
		// await new Promise((r) => setTimeout(r, 2000));

		const form = await superValidate(request, valibot(newspaperSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		if (!locals.account) {
			return fail(401, { form });
		}

		// Create newspaper
		const [newspaper] = await db
			.insert(newspapers)
			.values({
				name: form.data.name,
				avatar: form.data.avatar || null,
				background: form.data.background || null
			})
			.returning();

		// Create journalist relationship with owner rank
		await db.insert(journalists).values({
			userId: locals.account.id,
			newspaperId: newspaper.id,
			rank: "owner"
		});

		return message(form, "Newspaper created successfully!");
	}
} satisfies Actions;
