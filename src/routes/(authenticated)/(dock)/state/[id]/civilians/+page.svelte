<!-- src/routes/(authenticated)/(dock)/state/[id]/civilians/+page.svelte -->
<!-- Civilian population by region, its recent trend, and the opinion those
     civilians hold of this state and of foreign states. -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { formatPopulation, STANCE_TONE, stanceLabel } from "#lib/config/index.js";

	let { data } = $props();

	const stanceTone = (stance: number) => STANCE_TONE[stanceLabel(stance)];
	const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
</script>

<svelte:head>
	<title>Civilians · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Civilians"
		subtitle={data.state.name}
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Total civilians</p>
			<p class="mt-1 font-mono text-3xl font-bold text-fg">{data.civilians.toLocaleString()}</p>
			<p class="mt-1 text-xs text-fg-muted">Non-player inhabitants of this state's regions.</p>
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Population trend</p>
			<Sparkline
				values={data.trend}
				label="Civilian population of {data.state.name} over the last 90 days"
				color="var(--color-positive)"
			/>
			<p class="mt-1 text-xs text-fg-muted">Recorded by the daily world snapshots.</p>
		</div>
	</div>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<h2 class="section-title">By region</h2>
		{#if data.regions.length}
			<div class="rounded-sm border border-line/20">
				<div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
					<span>Region</span><span class="text-right">Civilians</span><span class="text-right">/km²</span><span class="text-right">Workers</span>
				</div>
				{#each data.regions as region (region.id)}
					<div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0">
						<a href="/region/{region.id}" class="min-w-0 truncate text-fg hover:text-primary-hover">
							{region.name} <span class="text-xs text-fg-faint">#{region.id}</span>
						</a>
						<span class="text-right font-mono text-fg-soft">{formatPopulation(region.population)}</span>
						<span class="text-right font-mono text-fg-muted">{region.density}</span>
						<span class="text-right font-mono text-fg-muted" title="{(region.workforceShare * 100).toFixed(0)}% of civilians can work">
							{region.workforce.toLocaleString()}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<EmptyState title="No regions" subtitle="This state does not hold any regions yet." />
		{/if}
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Civilian Stance</h2>
			<span class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">opinion of foreign states</span>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Toward {data.state.name}</h3>
				{#if data.stancesAbout.length}
					<ul class="divide-y divide-line/10">
						{#each data.stancesAbout as stance (stance.stateId)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<a href="/state/{stance.stateId}" class="truncate text-fg hover:text-primary-hover">{stance.name}</a>
								<span class="font-mono shrink-0 {STANCE_TONE[stanceLabel(stance.stance)]}">
									{signed(stance.stance)} · {stance.label}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-xs text-fg-muted">No foreign state has drawn a strong reaction yet.</p>
				{/if}
			</div>
			<div>
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">How its civilians see others</h3>
				{#if data.stancesHeld.length}
					<ul class="divide-y divide-line/10">
						{#each data.stancesHeld as stance (stance.stateId)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<a href="/state/{stance.stateId}" class="truncate text-fg hover:text-primary-hover">{stance.name}</a>
								<span class="font-mono shrink-0 {stanceTone(stance.stance)}">
									{signed(stance.stance)} · {stance.label}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-xs text-fg-muted">Neutral toward every state so far.</p>
				{/if}
			</div>
		</div>
		{#if data.bailoutHistory.length}
			<div class="pt-3 border-t border-line/15">
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Recent bailouts received</h3>
				<ul class="space-y-1 text-xs text-fg-body">
					{#each data.bailoutHistory as bailout}
						<li class="flex justify-between gap-3">
							<span>{bailout.from} · {formatDate(bailout.date)}</span>
							<span class="font-mono text-positive">{bailout.amount.toLocaleString()}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</PageContainer>
