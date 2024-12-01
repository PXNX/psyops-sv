<script lang="ts">
	/// import "../app.css";
	import { ParaglideJS } from "@inlang/paraglide-sveltekit";
	import { i18n } from "$lib/i18n";

	import { goto } from "$app/navigation";
	import { page, navigating } from "$app/stores";

	import FluentEmojiBarChart from "~icons/fluent-emoji/bar-chart";
	import FluentEmojiNewspaper from "~icons/fluent-emoji/newspaper";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import FluentEmojiNutAndBolt from "~icons/fluent-emoji/nut-and-bolt";
	import FluentEmojiIdentificationCard from "~icons/fluent-emoji/identification-card";

	const { children } = $props();

	let active = "home";

	function navigateTo(page2: string) {
		active = page2;
		goto(`/${page2}`);
	}
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
