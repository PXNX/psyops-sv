<script>
	import "../app.css";

	import { onNavigate } from "$app/navigation";
	import { browser } from "$app/env";
	import { settings } from "#lib/settings.svelte.js";
	import { viewTransitionActive } from "#lib/utils/motion.js";
	import InstallPrompt from "#lib/components/InstallPrompt.svelte";
	import Toaster from "#lib/ui/Toaster.svelte";
	import ConfirmHost from "#lib/ui/ConfirmHost.svelte";
	import GlobalImageCropper from "#lib/component/GlobalImageCropper.svelte";

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

	// Keep the document theme — including the PWA chrome colour — in sync with
	// the reactive setting on every page.
	$effect(() => {
		document.documentElement.setAttribute("data-theme", settings.theme);
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute("content", settings.theme === "light" ? "#f2f4f7" : "#0c1222");
	});

	// Cross-fade between pages using the View Transitions API instead of
	// keying the whole tree on the URL. Keying on `page.url` used to destroy
	// and remount every layout (including the dock nav) on every navigation,
	// which is what made page-to-page navigation feel slow. This transitions
	// the DOM diff in place — no remount, no lost component state.
	onNavigate((navigation) => {
		if (navigation.shallow) return;
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document
				.startViewTransition(async () => {
					// Block page-level entrance animations until the swap is done
					// (see lib/utils/motion.ts for why).
					viewTransitionActive.set(true);
					resolve();
					await navigation.complete;
				})
				.finished.finally(() => viewTransitionActive.set(false))
				.catch(() => {}); // a skipped transition rejects `finished`
		});
	});
</script>

<svelte:head>
	<title>Psyops</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<div class="min-h-dvh">
	{@render children()}
</div>

<InstallPrompt />
<Toaster />
<ConfirmHost />
<GlobalImageCropper />
