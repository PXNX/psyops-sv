// src/routes/(authenticated)/(dock)/settings/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles } from "$lib/server/schema";
import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	return {
		profile: {
			email: account.email,
			name: profile?.name
		}
	};
};

export const actions: Actions = {
	logout: async () => {
		return redirect(302, "/auth/logout");
	}
};
