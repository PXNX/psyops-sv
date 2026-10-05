import { redirect } from "@sveltejs/kit";

import type { LayoutLoad } from "./$types";

// Pathname-dependent onboarding guards. Running them here (instead of in
// +layout.server.ts) means client-side navigations re-evaluate them in the
// browser rather than refetching the server layout data on every page change.
export const load: LayoutLoad = ({ data, url }) => {
	const isWelcomePage = url.pathname.startsWith("/welcome");
	const isDashboard = url.pathname === "/";

	if (!data.residence && !data.needsOnboarding && !isWelcomePage) {
		// Finished onboarding but still has no residence – fall back to the
		// legacy region-selection page so they aren't stuck.
		throw redirect(303, "/welcome/region");
	}

	if (!data.residence && data.needsOnboarding && !isWelcomePage && !isDashboard) {
		// Mid-onboarding: keep them on the dashboard until they pick a region.
		throw redirect(303, "/");
	}

	return data;
};
