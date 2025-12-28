// src/routes/(authenticated)/moderation/+layout.server.ts
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;

	if (!account) {
		return redirect(302, "/auth/login");
	}

	// Check if user is moderator or admin
	if (account.role !== "moderator" && account.role !== "admin") {
		return error(403, "Only moderators can access this page");
	}

	return { account };
};
