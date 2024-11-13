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
</script>

<svelte:head>
	<title>Google OAuth example in SvelteKit</title>
</svelte:head>

<main class=" flex-1 overflow-y-auto pb-16 w-full h-[100dvh]">
	{#if $navigating}
		<span class="loading loading-ring loading-md"></span>
	{:else}
		{@render children()}
	{/if}
</main>

{#if !$page.url.pathname.includes("login") && $page.status === 200}
	<nav class="btm-nav btm-nav-md">
		<button onclick={() => navigateTo("")} class="flinch">
			<Icon icon="fluent-emoji-flat:bar-chart" class="w-5 h-5" />

			<object
				type="image/svg+xml"
				class="w-5 h-5"
				data="https://upload.wikimedia.org/wikipedia/commons/e/e5/Zeichen_224.svg"
			></object>
		</button>
		<button onclick={() => navigateTo("news")} class="flinch">
			<Icon icon="noto:newspaper" class="w-5 h-5" style="width: 24px; height: 24px;" />
		</button>
		<button onclick={() => navigateTo("training")} class="flinch">
			<Icon icon="fluent-emoji:military-helmet" class="w-5 h-5" />
		</button>
		<a class="flinch" href="/production">
			<Icon icon="fluent-emoji:nut-and-bolt" class="w-5 h-5" />
		</a>
		<a class="flinch" href="/user">
			<Icon icon="fluent-emoji:identification-card" class="w-5 h-5" />
		</a>
	</nav>
{/if}
