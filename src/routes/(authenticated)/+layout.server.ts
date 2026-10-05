import { redirect } from "@sveltejs/kit";
import { db } from "#lib/server/db.js";
import { residences, regions, states, userProfiles } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";

import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.account === null) {
		// untrack: the login redirect only needs the path for the `next` param;
		// reading it tracked would rerun this load on every navigation.
		throw redirect(302, "/auth/login?next=" + event.untrack(() => event.url.pathname));
	}

	const account = event.locals.account;

	// This load intentionally doesn't depend on the URL, so it only reruns when
	// invalidated (form actions, refreshAll) — not on every page change. The
	// pathname-based onboarding/welcome redirects live in ./+layout.ts, which
	// runs in the browser without a server round trip.
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

	return {
		account: event.locals.account,
		profile: profile ?? null,
		residence: userResidence,
		needsOnboarding,
		onboardingStep
	};
};
