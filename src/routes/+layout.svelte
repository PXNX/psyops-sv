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
		{#if navigating.to}
			<main class=" flex h-dvh">
				<span class="loading loading-ring loading-md m-auto"></span>
			</main>
		{:else}
			{@render children()}
		{/if}
	</div>
{/key}
