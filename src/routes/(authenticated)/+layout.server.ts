import { json, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { residences } from "$lib/server/schema";
import { eq } from "drizzle-orm";

import type { RequestEvent } from "./$types";

//TODO: Add your own language detection logic, so that when HL is detected, it's set as cookie and used for translation
const langParam = "hl"; // or maybe better to let user set it and have en default

export const load = async (event: RequestEvent) => {
	//await parent();
	if (event.locals.session === null || event.locals.account === null) {
		return redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	const account = event.locals.account;

	// Allow access to welcome flow pages without residence check
	const isWelcomeFlow = event.url.pathname.startsWith("/welcome");

	if (!isWelcomeFlow) {
		// Check if user has a residence for all other authenticated pages
		const existingResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		});

		// If no residence, force them to region selection
		if (!existingResidence) {
			throw redirect(303, "/welcome/region");
		}
	}

	return {
		account: event.locals.account
	};
};
