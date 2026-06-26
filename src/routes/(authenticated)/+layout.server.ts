import { redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { residences, regions, states, userProfiles } from "$lib/server/schema";
import { eq } from "drizzle-orm";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.account === null) {
		throw redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	const account = event.locals.account;

	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

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

	// No profile → step 0 (greeting). Profile exists → use stored step.
	// null step = onboarding finished.
	const onboardingStep: number | null = !profile ? 0 : profile.onboardingStep;
	const needsOnboarding = onboardingStep != null;

	const isWelcomePage = event.url.pathname.startsWith("/welcome");
	const isDashboard = event.url.pathname === "/";

	if (!userResidence && !needsOnboarding && !isWelcomePage) {
		// Finished onboarding but still has no residence – fall back to the
		// legacy region-selection page so they aren't stuck.
		throw redirect(303, "/welcome/region");
	}

	if (!userResidence && needsOnboarding && !isWelcomePage && !isDashboard) {
		// Mid-onboarding: keep them on the dashboard until they pick a region.
		throw redirect(303, "/");
	}

	return {
		account: event.locals.account,
		profile: profile ?? null,
		residence: userResidence,
		needsOnboarding,
		onboardingStep
	};
};
