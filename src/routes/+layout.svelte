<script lang="ts">
	import Icon from "@iconify/svelte";
	import { enableCache } from "@iconify/svelte";

	// Enable caching in localStorage

	import "../app.css";

	import { onMount } from "svelte";

	onMount(() => {
		enableCache("all");
	});

	import { page, navigating } from "$app/stores";

	enableCache("all");

	let { children } = $props();

	import { goto } from "$app/navigation";

	let active = "home";

	function navigateTo(page2: string) {
		active = page2;
		goto(`/${page2}`);
	}

	import FluentEmojiBarChart from "~icons/fluent-emoji/bar-chart";
	import FluentEmojiNewspaper from "~icons/fluent-emoji/newspaper";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import FluentEmojiNutAndBolt from "~icons/fluent-emoji/nut-and-bolt";
	import FluentEmojiIdentificationCard from "~icons/fluent-emoji/identification-card";
</script>

<svelte:head>
	<title>PsyOps SV</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<main class=" flex-1 overflow-y-auto pb-16 w-full h-[100dvh]">
	{#if $navigating}
		<span class="loading loading-ring loading-md place-self-center"></span>
	{:else}
		{@render children()}
	{/if}
</main>

{#if !$page.url.pathname.includes("login") && $page.status === 200}
	<nav class="btm-nav btm-nav-md">
		<button onclick={() => navigateTo("")} class="flinch">
			<FluentEmojiBarChart class="w-6 h-6" />
		</button>
		<button onclick={() => navigateTo("news")} class="flinch">
			<FluentEmojiNewspaper class="w-6 h-6" />
		</button>
		<button onclick={() => navigateTo("training")} class="flinch">
			<FluentEmojiMilitaryHelmet class="w-6 h-6" />
		</button>
		<a class="flinch" href="/production">
			<FluentEmojiNutAndBolt class="w-6 h-6" />
		</a>
		<a class="flinch" href="/user">
			<FluentEmojiIdentificationCard class="w-6 h-6" />
		</a>
	</nav>
{/if}
