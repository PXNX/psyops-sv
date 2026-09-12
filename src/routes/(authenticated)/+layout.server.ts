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

	// This load reruns on every client-side navigation (it reads
	// event.url.pathname below to gate onboarding/welcome redirects), so the
	// two independent lookups run in parallel rather than back-to-back —
	// halving the DB round-trip cost this layout adds to every page change.
	const [profile, userResidence] = await Promise.all([
		db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		}),
		db
			.select({
				id: residences.id,
				regionId: residences.regionId,
				homeRegionId: residences.homeRegionId,
				stateId: states.id,
				stateName: states.name
			})
			.from(residences)
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.leftJoin(states, eq(regions.stateId, states.id))
			.where(eq(residences.userId, account.id))
			.limit(1)
			.then((rows) => rows[0] ?? null)
	]);

	// Keep the theme cookie in sync with the stored profile so server-side
	// rendering applies the correct theme on subsequent requests.
	if (profile?.theme && event.cookies.get("theme") !== profile.theme) {
		event.cookies.set("theme", profile.theme, {
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			sameSite: "lax",
			httpOnly: false
		});
	}

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
