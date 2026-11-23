<!-- src/routes/(authenticated)/(dock)/state/[id]/power/+page.svelte -->
<!-- Why the power rating has its value, and how every other state compares. -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { formatPopulation } from "#lib/config/index.js";

	let { data } = $props();
</script>

<svelte:head>
	<title>Power rating · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Power rating"
		subtitle={data.state.name}
		icon={FluentShield20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<div class="mt-3 text-xs">
		<a href="/state/{data.state.id}/energyusage" class="text-fg-muted hover:text-primary-hover transition-colors">
			See energy usage →
		</a>
	</div>

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<p class="text-sm text-fg-body">
			The rating is an explainable score from the state's territory, people, forces, fleet, industry,
			energy network and public buildings. The stored dossier rating
			(<span class="font-mono">{data.power?.storedRating ?? 0}</span>) is
			set separately and may be edited by officials.
		</p>
		<div class="rounded-sm border border-line/20">
			<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
				<span>Component</span><span class="text-right">Value</span><span class="text-right">Points</span>
			</div>
			{#each data.power?.components ?? [] as component (component.key)}
				<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0">
					<span>
						<strong class="font-medium text-fg">{component.label}</strong>
						<span class="block text-xs text-fg-muted">{component.detail}</span>
					</span>
					<span class="text-right font-mono text-fg-soft">{component.value.toLocaleString()}</span>
					<span class="text-right font-mono text-fg">+{component.points.toLocaleString()}</span>
				</div>
			{/each}
			<div class="flex justify-between bg-primary/10 px-3 py-2 text-sm font-semibold text-fg">
				<span>Total score</span><span class="font-mono">{(data.power?.score ?? 0).toLocaleString()}</span>
			</div>
		</div>
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<h2 class="section-title">All states, ranked</h2>
		<div class="max-h-[32rem] overflow-y-auto rounded-sm border border-line/20">
			{#each data.ranking as row, i (row.id)}
				<a
					href="/state/{row.id}"
					class="flex items-center gap-3 px-3 py-2 text-sm border-b border-line/10 last:border-0 hover:bg-surface-5 {row.id === data.state.id
						? 'bg-primary/10 text-primary-fg'
						: ''}"
				>
					<span class="w-5 shrink-0 font-mono text-xs text-fg-faint">#{i + 1}</span>
					<span class="min-w-0 flex-1 truncate">{row.name}</span>
					<span class="font-mono text-xs text-fg-muted">{row.regions}R · {formatPopulation(row.population)}</span>
					<span class="w-16 text-right font-mono font-semibold">{row.score.toLocaleString()}</span>
					<span class="w-12 text-right font-mono text-xs text-fg-faint" title="Stored dossier rating">{row.rating}</span>
				</a>
			{/each}
		</div>
	</section>
</PageContainer>
