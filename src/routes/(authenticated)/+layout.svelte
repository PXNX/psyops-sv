<script lang="ts">
	import { goto } from "$app/navigation";

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

{@render children()}

<nav class="btm-nav btm-nav-md">
	<button onclick={() => navigateTo("")} class="flinch">
		<FluentEmojiBarChart class="w-6 h-6" />
	</button>
	<button onclick={() => navigateTo("posts")} class="flinch">
		<FluentEmojiNewspaper class="w-6 h-6" />
	</button>
	<button onclick={() => navigateTo("training")} class="flinch">
		<FluentEmojiMilitaryHelmet class="w-6 h-6" />
	</button>
	<button onclick={() => navigateTo("production")} class="flinch">
		<FluentEmojiNutAndBolt class="w-6 h-6" />
	</button>
	<button onclick={() => navigateTo("user")} class="flinch">
		<FluentEmojiIdentificationCard class="w-6 h-6" />
	</button>
</nav>
