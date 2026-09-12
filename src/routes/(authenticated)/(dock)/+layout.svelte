<script lang="ts">
	import FluentChartMultiple from "~icons/fluent/chart-multiple-24-regular";
	import FluentNews from "~icons/fluent/news-24-regular";
	import FluentTarget from "~icons/fluent/target-24-regular";
	import FluentBuildingFactory from "~icons/fluent/building-factory-24-regular";
	import FluentContactCard from "~icons/fluent/contact-card-24-regular";
	import OnboardingSheet from "$lib/component/OnboardingSheet.svelte";
	import { navigating, page } from "$app/state";
	import { resolve } from "$app/paths";

	const { children, data } = $props();

	const navItems = [
		{ href: "/", icon: FluentChartMultiple, label: "Dashboard" },
		{ href: "/posts", icon: FluentNews, label: "Posts" },
		{ href: "/training", icon: FluentTarget, label: "Training" },
		{ href: "/production", icon: FluentBuildingFactory, label: "Production" },
		{ href: "/user/" + data.account.id, icon: FluentContactCard, label: "Profile" }
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
	<!-- Non-blocking progress hint: the outgoing page stays visible and
	     interactive while the next one loads, instead of being replaced by a
	     full-screen spinner (which made every navigation feel like a reload). -->
	<div class="nav-progress" aria-hidden="true"></div>
{/if}

<main class="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden">
	{@render children()}
</main>

{#if page.url.pathname !== "/posts/new" && !page.url.pathname.startsWith("/welcome")}
		<!-- Editorial field-ledger dock navigation -->
	<nav class="dock">
		{#each navItems as item (item.href)}
			<a href={item.href} class="flinch dock-item" class:active={isActive(item.href)} title={item.label}>
				<svelte:component this={item.icon} class="size-5 md:size-6" />
				<span class="hidden sm:inline text-xs font-semibold">{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}

{#if data.needsOnboarding && data.onboardingStep != null}
	<OnboardingSheet onboardingStep={data.onboardingStep} profile={data.profile} residence={data.residence} />
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

	.nav-progress {
		@apply fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-[#e6a527]/10;
	}

	.nav-progress::after {
		content: "";
		display: block;
		height: 100%;
		width: 40%;
		background: #e6a527;
		animation: nav-progress-slide 0.9s ease-in-out infinite;
	}

	@keyframes nav-progress-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(350%);
		}
	}
</style>
