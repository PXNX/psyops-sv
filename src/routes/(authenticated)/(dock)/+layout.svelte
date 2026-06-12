<script lang="ts">
	import FluentEmojiBarChart from "~icons/fluent-emoji/bar-chart";
	import FluentEmojiNewspaper from "~icons/fluent-emoji/newspaper";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import FluentEmojiNutAndBolt from "~icons/fluent-emoji/nut-and-bolt";
	import FluentEmojiIdentificationCard from "~icons/fluent-emoji/identification-card";
	import { navigating, page } from "$app/state";
	import { resolve } from "$app/paths";

	const { children, data } = $props();

	const navItems = [
		{ href: "/", icon: FluentEmojiBarChart, label: "Dashboard" },
		{ href: "/posts", icon: FluentEmojiNewspaper, label: "Posts" },
		{ href: "/training", icon: FluentEmojiMilitaryHelmet, label: "Training" },
		{ href: "/production", icon: FluentEmojiNutAndBolt, label: "Production" },
		{ href: "/user/" + data.account.id, icon: FluentEmojiIdentificationCard, label: "Profile" }
	];

	const isActive = (href: string) => {
		if (href === "/" && page.url.pathname === "/") return true;
		if (href !== "/" && page.url.pathname.startsWith(href)) return true;
		return false;
	};
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
	<main class="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden">
		{@render children()}
	</main>
{/if}

{#if page.url.pathname !== "/posts/new" && !page.url.pathname.startsWith("/welcome")}
	<!-- Gaming-style dock navigation -->
	<nav class="dock">
		{#each navItems as item (item.href)}
			<a
				href={item.href}
				class="flinch dock-item"
				class:active={isActive(item.href)}
				title={item.label}
			>
				<svelte:component this={item.icon} class="size-5 md:size-6" />
				<span class="hidden sm:inline text-xs font-semibold">{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	@reference "../../../app.css";

	main {
		@apply pb-16;
	}

	@media (min-width: 768px) {
		main {
			@apply pb-20;
		}
	}

	.dock-item {
		@apply flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-300;
	}

	.dock-item.active {
		@apply text-cyan-200;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.4), inset 0 0 10px rgba(0, 255, 255, 0.2);
	}
</style>
