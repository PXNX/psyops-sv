<script lang="ts">
	import Icon from "@iconify/svelte";
	import { enableCache } from "@iconify/svelte";

	// Enable caching in localStorage

	import "../app.css";

	import { onMount } from "svelte";

	onMount(() => {
		enableCache("local");
	});

	import { page, navigating } from '$app/stores';


	enableCache("local");

	let { children } = $props();



</script>

<svelte:head>
	<title>Google OAuth example in SvelteKit</title>
</svelte:head>

{#if $navigating}
<span class="loading loading-ring loading-sm"></span>
{/if}

{#if !$page.url.pathname.includes("login")}

		<nav class="btm-nav btm-nav-md">
			<a class="flinch" href="/">
			
		
			<Icon icon="fluent-emoji-flat:bar-chart" class="h-5 w-5" />
		
			
			</a>
			<a class="flinch" href="/article">
				<Icon icon="noto:newspaper" class="h-5 w-5" style="width: 24px; height: 24px;" />
			</a>
			<a class="flinch" href="/training">
				<Icon icon="fluent-emoji:military-helmet" class="h-5 w-5" />
			</a>
			<a class="flinch" href="/production">
				<Icon icon="fluent-emoji:nut-and-bolt" class="h-5 w-5" />
			</a>
			<a class="flinch" href="/user">
				<Icon icon="fluent-emoji:identification-card" class="h-5 w-5" />
			</a>
		</nav>

{/if}

{@render children()}