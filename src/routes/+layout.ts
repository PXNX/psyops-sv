import type { LayoutLoad } from "./$types";
import { loadLocaleAsync } from "$lib/i18n/i18n-util.async";
import { setLocale } from "$lib/i18n/i18n-svelte";
import { enableCache } from "@iconify/svelte";

enableCache("local");

export const load = (async (event) => {
	// Locale now comes from the server instead of the route
	const { locale } = event.data;
	// But we load and set it as before
	await loadLocaleAsync(locale);
	setLocale(locale);

	return event.data;
}) satisfies LayoutLoad;
