import { getDb, USER } from "$lib/server/db";
import { extractId } from "$lib/util";
import { fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { welcomeSchema, type WelcomeSchema } from "./schema";

export const load: PageServerLoad = async () => {
	const form = await superValidate(valibot(welcomeSchema), {
		strict: true
	});

	// Always return { form } in load functions
	return { form };
};

export const actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, valibot(welcomeSchema));
		console.error(".........");
		console.error(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
			//	throw error(400, "User not found.");
			//	return;
		}

		const db = await getDb();

		const [user] = await db.update<WelcomeSchema>(USER, form.data);

		console.log(locals, user, "+++++++++++", locals.account!.id, user.id);

		await db.insert_relation("journalist", {
			in: locals.account!.id,
			out: user.id,
			rank: "owner"
		});

		// TODO: Do something with the validated form.data

		// Display a success status message
		//	return message(form, "Form posted successfully!");

		return redirect(302, "/user/" + extractId(locals.account!.id));
	}
} satisfies Actions;
