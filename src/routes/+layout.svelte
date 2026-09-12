<script>
	import "../app.css";

	import { onNavigate } from "$app/navigation";
	import { browser } from "$app/environment";
	import { settings } from "$lib/settings.svelte";

	const { children } = $props();

	// Restore persisted preferences on the client before the first paint.
	if (browser) {
		settings.hydrateFromStorage();
	}

	// Register the service worker so the PWA install prompt, offline page, and
	// runtime asset caching (images/fonts) from src/service-worker.js actually
	// take effect — SvelteKit builds the file but never registers it for you.
	if (browser && "serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service-worker.js", { type: "module" });
	}

	// Keep the document theme in sync with the reactive setting on every page.
	$effect(() => {
		document.documentElement.setAttribute("data-theme", settings.theme);
	});

	// Cross-fade between pages using the View Transitions API instead of
	// keying the whole tree on the URL. Keying on `page.url` used to destroy
	// and remount every layout (including the dock nav) on every navigation,
	// which is what made page-to-page navigation feel slow. This transitions
	// the DOM diff in place — no remount, no lost component state.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>PsyOps SV</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<div class="min-h-dvh">
	{@render children()}
</div>

