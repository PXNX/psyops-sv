import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { residences, regions, states } from "$lib/server/schema";
import { eq } from "drizzle-orm";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.account === null) {
		throw redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	const account = event.locals.account;

	// Allow access to the region selection page without a residence
	const isRegionSelection = event.url.pathname.startsWith("/welcome/region");

	// Fetch the user's residence (with region/state info) for all non-region-selection pages
	if (!isRegionSelection) {
		const userResidence = await db
			.select({
				id: residences.id,
				regionId: residences.regionId,
				stateId: states.id,
				stateName: states.name
			})
			.from(residences)
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.leftJoin(states, eq(regions.stateId, states.id))
			.where(eq(residences.userId, account.id))
			.limit(1)
			.then((rows) => rows[0] ?? null);

		// If no residence, force them to region selection — no other page is accessible
		if (!userResidence) {
			throw redirect(303, "/welcome/region");
		}

		return {
			account: event.locals.account,
			residence: userResidence
		};
	}

	return {
		account: event.locals.account,
		residence: null
	};
};
