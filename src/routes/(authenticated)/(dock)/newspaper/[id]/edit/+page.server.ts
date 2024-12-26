import { getDb } from "$lib/server/db";
import { fail } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { newspaperSchema } from "./schema";

export const load: PageServerLoad = async () => {
	const form = await superValidate(valibot(newspaperSchema), {
		strict: true
	});

	// Always return { form } in load functions
	return { form };
};

export const actions = {
	default: async ({ request, locals }) => {
		await new Promise((r) => setTimeout(r, 2000));

		const form = await superValidate(request, valibot(newspaperSchema));
		console.error(".........");
		console.error(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
			//	throw error(400, "User not found.");
			//	return;
		}

		const db = await getDb();

		/*	const [newspaper] = await db.create<NewspaperSchema>(NEWSPAPER, form.data);

		console.log(locals, newspaper, "+++++++++++", locals.account!.id, newspaper.id);

		await db.insert_relation("journalist", {
			in: locals.account!.id,
			out: newspaper.id,
			rank: "owner"
		}); */

		// TODO: Do something with the validated form.data

		// Display a success status message
		return message(form, "Form posted successfully!");

		//	return redirect(302, "/newspaper/" + extractId(newspaper.id));
	}
} satisfies Actions;
