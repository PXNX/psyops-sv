<!-- src/routes/(authenticated)/(fullscreen)/welcome/+page.svelte -->
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

<div
	class="  flex flex-col justify-center items-center space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 min-h-dvh"
>
	{@render children()}
</div>
