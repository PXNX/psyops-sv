import { db } from "$lib/server/db";
import { type NewspaperInput, newspaperSchema } from "$lib/server/newspaper";
import { extractId } from "$lib/util";
import { fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(newspaperSchema));

	// Always return { form } in load functions
	return { form };
};

export const actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod(newspaperSchema));
		console.error(".........");
		console.error(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
			//	throw error(400, "User not found.");
			//	return;
		}

		const [newspaper] = await db.create<NewspaperInput>("newspaper", form.data);

		console.log(locals, newspaper, "+++++++++++", locals.account!.id, newspaper.id);

		await db.insert_relation("journalist", {
			in: locals.account!.id,
			out: newspaper.id,
			rank: "owner"
		});

		// TODO: Do something with the validated form.data

		// Display a success status message
		//	return message(form, "Form posted successfully!");

		return redirect(302, "/newspaper/" + extractId(newspaper.id));
	}
} satisfies Actions;
