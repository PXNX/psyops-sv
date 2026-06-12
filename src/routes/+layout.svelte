<script>
	import "../app.css";

	import { fade } from "svelte/transition";
	import { page, navigating } from "$app/state";

	const { children } = $props();
</script>

<svelte:head>
	<title>PsyOps SV</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<div class="min-h-screen bg-slate-950">
	{#key page.url}
		<div transition:fade>
			{@render children()}
		</div>
	{/key}
</div>

<style>
	:global(body) {
		background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 50%, #0f172a 100%);
		background-attachment: fixed;
	}
</style>
