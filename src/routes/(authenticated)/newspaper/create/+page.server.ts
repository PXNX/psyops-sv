import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { z } from "zod";
import { message } from "sveltekit-superforms";
import { error, fail } from "@sveltejs/kit";
import { Newspaper, newspaperSchema } from "$lib/server/newspaper";
import { db } from "$lib/server/db";


export const load: PageServerLoad = async ({}) => {
	const form = await superValidate(zod(newspaperSchema));

	// Always return { form } in load functions
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(newspaperSchema));
		console.error(".........");
		console.error(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
			//	throw error(400, "User not found.");
			//	return;
		}

		await db.create<Newspaper>("newspapers", form.data);

		// TODO: Do something with the validated form.data

		// Display a success status message
		return message(form, "Form posted successfully!");
	}
} satisfies Actions;
