<!-- src/routes/(authenticated)/(dock)/newspaper/+page.svelte -->
<!-- Every newspaper by readership, with your own papers listed first. -->
<script lang="ts">
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { stamp } from "#lib/component/press/time.js";

	const { data } = $props();

	let searchQuery = $state("");

	const mine = $derived(data.newspapers.filter((n) => n.rank));
	const filtered = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.newspapers;
		return data.newspapers.filter(
			(n) => n.name.toLowerCase().includes(query) || n.latestTitle?.toLowerCase().includes(query)
		);
	});

	const rankTone = { owner: "blue", editor: "purple", author: "neutral" } as const;
</script>

<PageContainer maxWidth="5xl">
	<PageHeader title="Newspapers" backHref="/posts" backLabel="Posts">
		{#snippet actions()}
			{#if !data.ownsNewspaper}
				<Button variant="primary" href="/newspaper/create" icon={FluentAdd20Filled}>Found a paper</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="relative">
		<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-fg-muted pointer-events-none" />
		<input
			class="field-control w-full rounded-sm pl-10 pr-4 py-2 text-sm"
			placeholder="Search newspapers"
			type="search"
			aria-label="Search newspapers"
			bind:value={searchQuery}
		/>
	</div>

	{#if data.newspapers.length === 0}
		<EmptyState icon={MdiNewspaper} title="No newspapers yet">
			{#snippet actions()}
				<Button variant="primary" href="/newspaper/create" icon={FluentAdd20Filled}>Found the first one</Button>
			{/snippet}
		</EmptyState>
	{:else if filtered.length === 0}
		<EmptyState icon={FluentSearch20Filled} title="Nothing matches “{searchQuery.trim()}”" />
	{:else}
		{#if mine.length > 0 && !searchQuery.trim()}
			<section class="space-y-2">
				<h2 class="section-title">Your newspapers</h2>
				{@render list(mine)}
			</section>
		{/if}
		<section class="space-y-2">
			<h2 class="section-title">All newspapers</h2>
			{@render list(filtered)}
		</section>
	{/if}
</PageContainer>

{#snippet list(items: typeof data.newspapers)}
	<ul class="panel rounded-sm divide-y divide-white/[0.06] overflow-hidden">
		{#each items as newspaper (newspaper.id)}
			<li>
				<a
					href="/newspaper/{newspaper.id}"
					class="group flex items-center gap-3 px-3 sm:px-4 py-3 min-w-0 transition-colors hover:bg-white/[0.04]"
				>
					<Logo
						src={newspaper.logo}
						alt=""
						class="size-10 shrink-0 rounded-sm"
						placeholderIcon={MdiNewspaper}
						placeholderGradient="from-surface-6 to-surface-6"
					/>
					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-2 min-w-0">
							<span
								class="font-semibold text-fg group-hover:text-friendly-fg transition-colors truncate"
								>{newspaper.name}</span
							>
							{#if newspaper.rank}
								<Badge tone={rankTone[newspaper.rank]} size="xs" class="capitalize shrink-0">{newspaper.rank}</Badge>
							{/if}
							{#if newspaper.subscribed}
								<FluentCheckmark20Filled class="size-3.5 shrink-0 text-positive" aria-label="Subscribed" />
							{/if}
						</p>
						{#if newspaper.latestTitle && newspaper.latestAt}
							<p class="mt-0.5 flex items-center gap-2 text-xs text-fg-muted min-w-0">
								<span class="truncate text-fg-soft">{newspaper.latestTitle}</span>
								<span class="shrink-0 font-mono">{stamp(newspaper.latestAt)}</span>
							</p>
						{/if}
					</div>
					<div class="shrink-0 flex flex-col items-end gap-0.5 font-mono text-xs text-fg-muted">
						<span class="inline-flex items-center gap-1" title="Subscribers">
							<FluentPeople20Filled class="size-3.5" />{newspaper.subscriberCount}
						</span>
						<span class="inline-flex items-center gap-1" title="Articles">
							<FluentDocument20Filled class="size-3.5" />{newspaper.articleCount}
						</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}
