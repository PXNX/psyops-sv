<!-- src/routes/(authenticated)/(dock)/state/[id]/residents/+page.svelte -->
<!-- Player residents of this state: which regions they live in and how the
     number has changed over the last 90 days. -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import IntelValue from "#lib/component/intel/IntelValue.svelte";
	import IntelNote from "#lib/component/intel/IntelNote.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Residents · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Residents"
		subtitle={data.state.name}
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if !data.intel.exact}
		<IntelNote stateId={data.state.id} group="population" level={data.intel.level} class="mb-4" />
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Current residents</p>
			{#if data.total.kind === "exact"}
				<p class="mt-1 font-mono text-3xl font-bold text-fg">{data.total.value.toLocaleString()}</p>
			{:else}
				<IntelValue estimate={data.total} variant="block" class="mt-1" />
			{/if}
			<p class="mt-1 text-xs text-fg-muted">Players whose current home is in one of this state's regions.</p>
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Over time</p>
			{#if data.history}
				<Sparkline
					values={data.history}
					label="Residents of {data.state.name} over the last 90 days"
					color="var(--color-primary)"
				/>
				<p class="mt-1 text-xs text-fg-muted">
					Based on when current residents arrived; daily snapshots make recent days exact.
				</p>
			{:else}
				<p class="text-xs text-fg-muted">
					The day-by-day record is kept by {data.state.name}'s own registry and isn't known abroad.
				</p>
			{/if}
		</div>
	</div>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<h2 class="section-title">By region</h2>
		{#if data.regions.length}
			<ul class="divide-y divide-line/10">
				{#each data.regions as region (region.id)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<a
							href="/region/{region.id}/population"
							class="flex min-w-0 items-center gap-2 text-fg hover:text-primary-hover"
						>
							<FluentHome20Filled class="size-4 shrink-0 text-fg-muted" />
							<span class="truncate">{region.name} <span class="text-xs text-fg-faint">#{region.id}</span></span>
						</a>
						<IntelValue estimate={region.population} class="shrink-0 text-fg-soft" />
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState title="No regions" subtitle="This state does not hold any regions yet." />
		{/if}
	</section>
</PageContainer>
