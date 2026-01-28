<script lang="ts">
	import FluentEmojiBarChart from "~icons/fluent-emoji/bar-chart";
	import FluentEmojiNewspaper from "~icons/fluent-emoji/newspaper";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import FluentEmojiNutAndBolt from "~icons/fluent-emoji/nut-and-bolt";
	import FluentEmojiIdentificationCard from "~icons/fluent-emoji/identification-card";
	import { navigating, page } from "$app/state";
	import { resolve } from "$app/paths";

	const { children, data } = $props();
</script>

<svelte:head>
	<title>PsyOps SV</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

{#if navigating.to}
	<div class="flex flex-col h-dvh">
		<span class="loading loading-ring loading-md m-auto"></span>
	</div>
{:else}
	<main class="flex flex-col h-[calc(100dvh-4rem)] overflow-y-auto">
		{@render children()}
	</main>
{/if}

{#if page.url.pathname !== "/posts/new" && !page.url.pathname.startsWith("/welcome")}
	<!-- TODO && page.url.pathname !== "posts/[id]/edit" -->
	<nav class="dock-md dock">
		<a href={"/"} class="flinch">
			<FluentEmojiBarChart class="size-6" />
		</a>
		<a href={"/posts"} class="flinch">
			<FluentEmojiNewspaper class="size-6" />
		</a>
		<a href={"/training"} class="flinch">
			<FluentEmojiMilitaryHelmet class="size-6" />
		</a>
		<a href={"/production"} class="flinch">
			<FluentEmojiNutAndBolt class="size-6" />
		</a>
		<a href={"/user/" + data.account.id} class="flinch">
			<FluentEmojiIdentificationCard class="size-6" />
		</a>
	</nav>
{/if}
