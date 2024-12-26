<script lang="ts">
	import { goto } from "$app/navigation";

	import FluentEmojiBarChart from "~icons/fluent-emoji/bar-chart";
	import FluentEmojiNewspaper from "~icons/fluent-emoji/newspaper";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import FluentEmojiNutAndBolt from "~icons/fluent-emoji/nut-and-bolt";
	import FluentEmojiIdentificationCard from "~icons/fluent-emoji/identification-card";
	import { page } from "$app/state";
	import { fly, fade } from "svelte/transition";

	const { children, data } = $props();
</script>

<svelte:head>
	<title>PsyOps | Welcome</title>
</svelte:head>

{#key page.url}
	<div class=" h-full flex flex-col justify-center items-center" in:fly={{ y: 200, duration: 400 }} out:fade>
		{@render children()}
	</div>
{/key}
