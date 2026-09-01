<script>
	import "../app.css";

	import { fade } from "svelte/transition";
	import { page, navigating } from "$app/state";
	import { browser } from "$app/environment";
	import { settings } from "$lib/settings.svelte";

	const { children } = $props();

	// Restore persisted preferences on the client before the first paint.
	if (browser) {
		settings.hydrateFromStorage();
	}

	// Keep the document theme in sync with the reactive setting on every page.
	$effect(() => {
		document.documentElement.setAttribute("data-theme", settings.theme);
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
	{#key page.url}
		<div transition:fade>
			{@render children()}
		</div>
	{/key}
</div>

