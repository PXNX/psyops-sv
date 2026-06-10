import { redirect } from "@sveltejs/kit";
import { isMockMode } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (isMockMode && locals.account) {
		throw redirect(302, "/");
	}
};
