<script lang="ts">
	import "../app.css";
	import { ParaglideJS } from "@inlang/paraglide-sveltekit";
	import { i18n } from "$lib/i18n";

	import { navigating } from "$app/stores";

	const { children } = $props();
</script>

<svelte:head>
	<title>PsyOps SV</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<ParaglideJS {i18n}>
	{#if $navigating}
		<main class=" flex-1 overflow-y-auto pb-16 w-full h-[100dvh]">
			<span class="loading loading-ring loading-md place-self-center"></span>
		</main>
	{:else}
		{@render children()}
	{/if}
</ParaglideJS>
