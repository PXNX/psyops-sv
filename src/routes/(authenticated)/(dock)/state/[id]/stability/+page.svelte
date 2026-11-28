<!-- src/routes/(authenticated)/(dock)/state/[id]/stability/+page.svelte -->
<!-- Where the regime stability number comes from: one capped contribution per
     lever, added to a neutral baseline and clamped to 0-100. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import IntelNote from "#lib/component/intel/IntelNote.svelte";
	import RelatedLinks from "#lib/component/RelatedLinks.svelte";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";

	let { data } = $props();
	const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<svelte:head>
	<title>Regime stability · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Regime stability"
		subtitle={data.state.name}
		icon={FluentShield20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if !data.intel.exact}
		<IntelNote stateId={data.state.id} group="population" level={data.intel.level} class="mt-3" />
	{/if}

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<p class="text-sm text-fg-body">
			Stability is how firmly this state's civilians support their government. It is calculated on read from records
			other systems already write — opinion in each region, war crimes, environmental law, conscription, education,
			wages, shortages and live covert effects. Each lever is capped, so one crisis cannot erase the whole score.
		</p>
		{#if data.stability}
			<div class="flex flex-wrap items-baseline justify-between gap-2 rounded-sm bg-surface-2/60 px-3 py-2">
				<span class="font-semibold text-fg">{data.stability.label}</span>
				<span class="font-mono text-2xl font-bold text-fg">
					{data.stability.score}<span class="text-sm text-fg-muted">/100</span>
				</span>
			</div>
			<p class="text-xs text-fg-muted">{data.stability.blurb}</p>
			<div class="overflow-hidden rounded-sm border border-line/20">
				<div
					class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted"
				>
					<span>Contribution</span><span class="text-right">Points</span>
				</div>
				{#each data.stability.breakdown as item (item.key)}
					<div
						class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0"
					>
						<span class="min-w-0 text-fg-body">{item.label}</span>
						<span class="text-right font-mono {item.value >= 0 ? 'text-positive-fg' : 'text-hostile-fg'}">
							{item.value >= 0 ? "+" : ""}{item.value}
						</span>
					</div>
				{/each}
				<div class="flex justify-between bg-primary/10 px-3 py-2 text-sm font-semibold text-fg">
					<span>Final score</span><span class="font-mono">{data.stability.score}</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-fg-muted">No exact stability figures are available for this state.</p>
		{/if}
	</section>

	{#if data.facts}
		<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
			<h2 class="section-title">What feeds the score</h2>
			<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Civilians</dt>
					<dd class="font-mono text-fg">{data.facts.population.toLocaleString()}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Soldiers / 1,000</dt>
					<dd class="font-mono text-fg">{data.facts.conscription.toFixed(1)}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Hardship</dt>
					<dd class="font-mono text-fg">{pct(data.facts.hardship)}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Environment</dt>
					<dd class="font-mono text-fg capitalize">{data.facts.environment}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">At war</dt>
					<dd class="font-mono text-fg">{data.facts.atWar ? "Yes" : "No"}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Defending</dt>
					<dd class="font-mono text-fg">{data.facts.defending ? "Yes" : "No"}</dd>
				</div>
			</dl>
			<p class="text-xs text-fg-muted">
				Stability scales combat morale and the war-exhaustion limit, drives emigration below 35, and feeds the weekly
				civilian population change. See
				<a href="/state/{data.state.id}/civilians" class="text-primary-fg hover:underline">civilians</a>
				and <a href="/state/{data.state.id}/power" class="text-primary-fg hover:underline">national power</a>
				for related figures.
			</p>
		</section>
	{/if}
</PageContainer>
