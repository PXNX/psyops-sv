<!-- About hub: a calm landing page that points at the legal, credit and
     support pages instead of stacking every sheet into one screen. -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentCertificate20Filled from "~icons/fluent/certificate-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocumentText20Filled from "~icons/fluent/document-text-20-filled";
	import FluentPersonShield24Regular from "~icons/fluent/person-shield-24-regular";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const cards = [
		{
			href: "/docs",
			title: "Documentation",
			description: "Guides, mechanics and interactive tutorials",
			icon: FluentDocument20Filled,
			accent: "border-friendly/30 bg-friendly-bg/18 text-friendly-fg",
			meta: "Learn"
		},
		{
			href: "/changelog",
			title: "Changelog",
			description: "Every release, grouped by features, changes and fixes",
			icon: FluentHistory20Filled,
			accent: "border-primary/30 bg-primary/12 text-primary-fg",
			meta: "Releases"
		},
		{
			href: "/about/licenses",
			title: "Licenses",
			description: `${data.licenses.length} open source packages we build on`,
			icon: FluentCertificate20Filled,
			accent: "border-positive/30 bg-positive-bg/18 text-positive-fg",
			meta: "Credits"
		},
		{
			href: "/about/licenses#icons",
			title: "Icons & assets",
			description: `${data.iconSets.length} icon sets and their creators`,
			icon: FluentImage20Filled,
			accent: "border-warning/30 bg-warning/12 text-warning",
			meta: "Design"
		},
		{
			href: "/about/terms",
			title: "Terms of Service",
			description: "The rules for playing here",
			icon: FluentDocumentText20Filled,
			accent: "border-politics/30 bg-politics-bg/15 text-politics-fg",
			meta: "Legal"
		},
		{
			href: "/about/privacy",
			title: "Privacy Policy",
			description: "What we store and your data rights",
			icon: FluentPersonShield24Regular,
			accent: "border-error/30 bg-error/12 text-error",
			meta: "Legal"
		},
		{
			href: "/about/support",
			title: "Support",
			description: "Contact us or report a bug",
			icon: FluentChat20Filled,
			accent: "border-friendly/30 bg-friendly-bg/18 text-friendly-fg",
			meta: "Help"
		}
	];
</script>

<svelte:head>
	<title>About · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl" class="py-12">
	<div class="animate-soft-in">
		<header class="relative overflow-hidden rounded-md border border-line/20 bg-surface-1 px-6 py-10">
			<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_55%)]"></div>
			<div class="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
				<div class="panel flex size-24 shrink-0 items-center justify-center">
					<img loading="lazy" decoding="async" alt="PsyOps logo" class="size-20" src="/logo.svg" />
				</div>
				<div>
					<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
						<h1 class="font-serif text-4xl text-heading">PsyOps</h1>
						<Badge tone="blue" size="sm">v{data.version}</Badge>
					</div>
					<p class="mt-2 max-w-xl text-sm leading-relaxed text-fg-soft">
						A global political simulation: build a state, command its forces, shape public opinion and write
						the story everyone else reads.
					</p>
				</div>
			</div>
		</header>

		<section class="mt-10">
			<h2 class="section-title">Explore</h2>
			<p class="mt-1 text-sm text-fg-muted">Everything about the game and the project, one click away.</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				{#each cards as card, i}
					<a
						href={card.href}
						class="panel-interactive soft-lift animate-rise-in group flex items-start gap-3 rounded-sm p-4 no-underline"
						style="--rise-delay: {i * 45}ms"
					>
						<span class="flex size-10 shrink-0 items-center justify-center rounded-sm border {card.accent}">
							<card.icon class="size-5" />
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-2">
								<span class="text-sm font-semibold text-heading group-hover:text-primary-hover">{card.title}</span>
								<Badge tone="neutral" size="xs">{card.meta}</Badge>
							</span>
							<span class="mt-1 block text-xs text-fg-muted">{card.description}</span>
						</span>
						<FluentChevronRight20Filled class="mt-2 size-4 shrink-0 text-fg-faint group-hover:text-primary-hover" />
					</a>
				{/each}
			</div>
		</section>

		<footer class="mt-12 border-t border-line/20 pt-5 text-xs text-fg-muted">
			PsyOps is an open project built with {data.licenses.length} open source packages. Made for players who like
			their politics with a little intrigue.
		</footer>
	</div>
</PageContainer>

<style>
	h2 {
		font-family: var(--font-serif);
		color: var(--color-heading);
	}
</style>
