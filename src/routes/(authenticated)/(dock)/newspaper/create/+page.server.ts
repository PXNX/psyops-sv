// src/routes/(authenticated)/(dock)/newspaper/create/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
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
		await new Promise((r) => setTimeout(r, 2000));

		const form = await superValidate(request, valibot(newspaperSchema));
		console.error(".........");
		console.error(form);

		if (!form.valid) {
			return fail(400, { form });
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

		console.log(locals, newspaper, "+++++++++++", locals.account!.id, newspaper.id);

		// Create journalist relationship (owner)
		await db.insert(journalists).values({
			userId: locals.account!.id,
			newspaperId: newspaper.id,
			rank: "owner"
		});

		return redirect(302, "/newspaper/" + newspaper.id);
	}
} satisfies Actions;
