// src/routes/(authenticated)/(dock)/dashboard/+page.server.ts
import { db } from "$lib/server/db";
import { residences, userTravels, userWallets, companies, articles, userProfiles } from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user profile
	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	// Get user's primary residence (current location)
	const primaryResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id))
	});

	// Get active travel if any
	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
	});

	return {
		account: {
			id: account.id,
			email: account.email,
			role: account.role,
			profile
		},
		userLocation: primaryResidence ? { regionId: primaryResidence.regionId } : null,
		activeTravel
	};
};
