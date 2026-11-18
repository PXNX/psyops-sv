<!-- The command console shell: top bar, icon rail and status bar on wide
     screens; a flat bottom bar on phones. -->
<script lang="ts">
	import FluentChartMultiple from "~icons/fluent/chart-multiple-24-regular";
	import FluentMap from "~icons/fluent/map-24-regular";
	import FluentEye from "~icons/fluent/eye-tracking-24-regular";
	import FluentNews from "~icons/fluent/news-24-regular";
	import FluentChat from "~icons/fluent/chat-multiple-24-regular";
	import FluentDataTrending from "~icons/fluent/data-trending-24-regular";
	import FluentTarget from "~icons/fluent/target-24-regular";
	import FluentBuildingFactory from "~icons/fluent/building-factory-24-regular";
	import FluentContactCard from "~icons/fluent/contact-card-24-regular";
	import FluentMail from "~icons/fluent/mail-24-regular";
	import OnboardingSheet from "#lib/component/OnboardingSheet.svelte";
	import { navigating, page } from "$app/state";
	import { afterNavigate } from "$app/navigation";
	import { onMount } from "svelte";

	// The main column is our scroll container, so SvelteKit's built-in scroll
	// restoration cannot see it. Reset it on every navigation or the next page
	// renders mid-scroll, which reads as a janky, half-loaded page.
	afterNavigate(() => {
		mainEl?.scrollTo({ top: 0 });
	});

	const { children, data } = $props();

	type NavItem = { href: string; icon: typeof FluentMap; label: string; mobile?: boolean };
	const navItems: NavItem[] = $derived([
		{ href: "/", icon: FluentChartMultiple, label: "Overview", mobile: true },
		{ href: "/map", icon: FluentMap, label: "Map", mobile: true },
		{ href: "/intel", icon: FluentEye, label: "Intel" },
		{ href: "/posts", icon: FluentNews, label: "Posts", mobile: true },
		{ href: "/chat", icon: FluentChat, label: "Comms" },
		{ href: "/market", icon: FluentDataTrending, label: "Market" },
		{ href: "/training", icon: FluentTarget, label: "Forces", mobile: true },
		{ href: "/production", icon: FluentBuildingFactory, label: "Production", mobile: true },
		{ href: "/user/" + data.account.id, icon: FluentContactCard, label: "Profile", mobile: true }
	]);

	const isActive = (href: string) => {
		if (href === "/") return page.url.pathname === "/";
		return page.url.pathname === href || page.url.pathname.startsWith(href + "/");
	};

	// "PSYOPS / STATE" — the first path segment names the section.
	const section = $derived(page.url.pathname.split("/")[1]?.replace(/-/g, " ") || "overview");

	// Live UTC clock for the bar, like any ops console.
	let now = $state(new Date());
	onMount(() => {
		const t = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(t);
	});
	const utc = $derived(now.toISOString().slice(11, 19));
	const date = $derived(now.toISOString().slice(0, 10));

	const hideNav = $derived(page.url.pathname === "/posts/new" || page.url.pathname.startsWith("/welcome"));

	let mainEl: HTMLElement | undefined;
</script>

{#if navigating.to}
	<!-- Non-blocking progress hint: the outgoing page stays visible and
	     interactive while the next one loads. -->
	<div class="nav-progress" aria-hidden="true"></div>
{/if}

<div class="shell" class:no-nav={hideNav}>
	<header class="topbar">
		<a href="/" class="flex items-center gap-2 min-w-0">
			<span class="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" aria-hidden="true"></span>
			<span class="text-sm font-semibold tracking-[0.3em] text-fg">PSYOPS</span>
			<span class="text-fg-faint">/</span>
			<span class="text-xs uppercase tracking-[0.2em] text-fg-muted truncate">{section}</span>
		</a>
		<div class="ml-auto flex items-center gap-1">
			<a href="/inbox" class="topbar-btn" title="Inbox" aria-label="Inbox"><FluentMail class="size-5" /></a>
			<a href="/user/{data.account.id}" class="topbar-btn" title="Profile" aria-label="Profile">
				<FluentContactCard class="size-5" />
			</a>
		</div>
	</header>

	{#if !hideNav}
		<!-- Dock targets are the most common destinations: fetch their JS up front
		     so a tap only has to wait for data, never for code. -->
		<nav class="rail" data-sveltekit-preload-code="eager" aria-label="Main">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="rail-item"
					class:active={isActive(item.href)}
					class:desktop-only={!item.mobile}
					title={item.label}
					aria-current={isActive(item.href) ? "page" : undefined}
				>
					<item.icon class="size-5" />
					<span class="rail-label">{item.label}</span>
				</a>
			{/each}
		</nav>
	{/if}

	<main bind:this={mainEl} class="main">
		{@render children()}
	</main>

	<footer class="statusbar">
		<span class="flex items-center gap-1.5">
			<span class="size-1.5 rounded-full bg-positive animate-pulse" aria-hidden="true"></span>
			LINK OK
		</span>
		{#if data.residence?.stateName}
			<span class="truncate">AO · {data.residence.stateName}</span>
		{/if}
		<span class="ml-auto data">{date}</span>
		<span class="data text-fg">{utc} UTC</span>
	</footer>
</div>

{#if data.needsOnboarding && data.onboardingStep != null}
	<OnboardingSheet onboardingStep={data.onboardingStep} profile={data.profile} residence={data.residence} />
{/if}

<style>
	@reference "../../../app.css";

	.shell {
		display: grid;
		height: 100dvh;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr auto;
		grid-template-areas:
			"main"
			"rail";
	}
	.shell.no-nav {
		grid-template-areas: "main";
		grid-template-rows: 1fr;
	}

	.topbar,
	.statusbar {
		display: none;
	}

	.main {
		grid-area: main;
		@apply flex flex-col min-h-0 overflow-y-auto overflow-x-hidden;
	}

	/* Phones: a flat bar along the bottom edge. */
	.rail {
		grid-area: rail;
		view-transition-name: dock-nav;
		@apply flex items-stretch justify-around border-t border-line/15 bg-surface-2 z-40;
		padding-bottom: env(safe-area-inset-bottom);
	}
	.rail-item {
		@apply press-spring relative flex flex-1 flex-col items-center justify-center gap-0.5 h-14 text-fg-muted transition-colors;
		--press-scale: 0.92;
	}
	.rail-item:hover {
		@apply text-fg;
	}
	.rail-item.active {
		@apply text-primary-fg;
	}
	.rail-item.active::before {
		content: "";
		@apply absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary;
	}
	.rail-label {
		@apply text-[10px] font-medium tracking-wide;
	}
	.desktop-only {
		display: none;
	}

	/* Wide screens: console layout. */
	@media (min-width: 768px) {
		.shell {
			grid-template-columns: 4.5rem 1fr;
			grid-template-rows: 2.75rem 1fr 1.75rem;
			grid-template-areas:
				"top top"
				"rail main"
				"status status";
		}
		.shell.no-nav {
			grid-template-columns: 1fr;
			grid-template-areas:
				"top"
				"main"
				"status";
			grid-template-rows: 2.75rem 1fr 1.75rem;
		}

		.topbar {
			grid-area: top;
			@apply flex items-center gap-3 px-4 border-b border-line/15 bg-surface-2;
		}
		.topbar-btn {
			@apply grid place-items-center size-8 rounded-sm text-fg-muted hover:text-fg hover:bg-surface-7 transition-colors;
		}

		.rail {
			@apply flex-col justify-start gap-1 py-2 border-t-0 border-r;
		}
		.rail-item {
			@apply flex-none h-14 mx-1.5 rounded-sm;
		}
		.rail-item:hover {
			@apply bg-surface-7;
		}
		.rail-item.active {
			@apply bg-primary/12;
		}
		.rail-item.active::before {
			@apply top-2 bottom-2 left-0 right-auto w-0.5 h-auto;
		}
		.desktop-only {
			display: flex;
		}

		.statusbar {
			grid-area: status;
			@apply flex items-center gap-4 px-4 border-t border-line/15 bg-surface-2 text-[11px] uppercase tracking-wider text-fg-muted;
		}
	}

	.nav-progress {
		@apply fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-primary/10;
	}

	.nav-progress::after {
		content: "";
		display: block;
		height: 100%;
		width: 40%;
		background: var(--color-primary);
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
