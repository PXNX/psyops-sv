<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import FluentOpen20Filled from "~icons/fluent/open-20-filled";
	import FluentCertificate20Filled from "~icons/fluent/certificate-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import type { PageData } from "./$types";
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Open Source Licenses · PsyOps</title></svelte:head>

<PageContainer maxWidth="4xl" class="py-12">
	<div class="animate-soft-in space-y-10">
		<header class="flex items-start gap-3 border-b border-line/20 pb-5">
			<span class="flex size-12 items-center justify-center rounded-sm border border-positive/30 bg-positive-bg/18 text-positive-fg">
				<FluentCertificate20Filled class="size-6" />
			</span>
			<div>
				<h1 class="font-serif text-3xl text-heading">Open source licenses</h1>
				<p class="mt-1 text-sm text-fg-soft">
					PsyOps builds on {data.licenses.length} open source packages. Thank you to everyone who maintains them.
				</p>
			</div>
		</header>

		<section>
			<h2 class="section-title text-base">Packages</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each data.licenses as pkg}
					<div class="panel-muted soft-lift flex items-center justify-between gap-3 rounded-sm p-3">
						<div class="min-w-0">
							{#if pkg.url}
								<a href={pkg.url} target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-sm font-medium text-fg hover:text-primary-hover">
									<span class="truncate">{pkg.name}</span><FluentOpen20Filled class="size-3.5 shrink-0 text-fg-muted" />
								</a>
							{:else}
								<p class="truncate text-sm font-medium text-fg">{pkg.name}</p>
							{/if}
							<p class="truncate text-xs text-fg-muted">v{pkg.version}{pkg.author ? ` · ${pkg.author}` : ""}</p>
						</div>
						<Badge tone="green" size="xs">{pkg.license}</Badge>
					</div>
				{/each}
			</div>
		</section>

		<section id="icons" class="scroll-mt-6">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-primary-fg" />
				<h2 class="section-title text-base">Icons & assets</h2>
			</div>
			<p class="mt-1 text-sm text-fg-muted">Icons come from these open source sets via Iconify.</p>
			<div class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each data.iconSets as set}
					<div class="panel-muted soft-lift rounded-sm p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-medium text-fg">{set.name}</p>
							{#if set.licenseUrl}
								<a href={set.licenseUrl} target="_blank" rel="noopener noreferrer" class="hover:underline"><Badge tone="green" size="xs">{set.license}</Badge></a>
							{:else}
								<Badge tone="green" size="xs">{set.license}</Badge>
							{/if}
						</div>
						<p class="mt-1 text-xs text-fg-muted">
							{#if set.author}
								{#if set.authorUrl}
									<a href={set.authorUrl} target="_blank" rel="noopener noreferrer" class="hover:text-primary-hover">{set.author}</a>
								{:else}{set.author}{/if}
							{/if}
							{#if set.total}{set.author ? " · " : ""}{set.total.toLocaleString()} icons{/if}
						</p>
					</div>
				{:else}
					<p class="text-sm text-fg-muted">No icon sets found.</p>
				{/each}
			</div>
		</section>
	</div>
</PageContainer>

<style>
	h1,
	h2 {
		font-family: var(--font-serif);
		color: var(--color-heading);
	}
</style>
