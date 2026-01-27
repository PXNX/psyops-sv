<script lang="ts">
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

{#key page.url}
	<div transition:fade>
		{@render children()}
	</div>
{/key}
