<!-- src/routes/(authenticated)/(dock)/region/[id]/economy/+page.svelte -->
<!-- The region's purse and its people: budget, civilian population and the
     supplies they can actually get. Linked from the region's Administration. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import RegionBudget from "../RegionBudget.svelte";
	import CivilianNeeds from "../CivilianNeeds.svelte";

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Civilians & budget · {data.region.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<header class="panel rounded-sm p-4 sm:p-5 mb-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-[0.25em] text-fg-muted">Local administration</p>
				<h1 class="font-serif text-2xl sm:text-3xl font-bold text-fg">
					<a href="/region/{data.region.id}" class="hover:text-primary-fg transition-colors">{data.region.name}</a>
					<span class="text-fg-muted">/ Civilians & budget</span>
				</h1>
			</div>
			<Button href="/region/{data.region.id}" variant="secondary" size="sm" icon={FluentChevronLeft20Filled}>
				Back to region
			</Button>
		</div>
	</header>

	{#if form?.error}
		<div
			class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 mb-4 flex items-center gap-2 text-sm"
		>
			<FluentWarning20Filled class="size-4 shrink-0" />
			{form.error}
		</div>
	{/if}
	{#if form?.success && form.message}
		<div
			class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-3 mb-4 flex items-center gap-2 text-sm"
		>
			<FluentCheckmark20Filled class="size-4 shrink-0" />
			{form.message}
		</div>
	{/if}

	<div class="grid gap-4 items-start lg:grid-cols-2">
		{#if data.budget}
			<RegionBudget regionId={data.region.id} budget={data.budget} />
		{:else}
			<section class="panel rounded-sm p-4">
				<h2 class="section-title">Regional budget</h2>
				<p class="mt-2 text-sm text-fg-muted">An independent region has no state tax share to spend.</p>
			</section>
		{/if}

		<div class="space-y-4">
			<section class="panel rounded-sm p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h2 class="section-title text-base">Civilian population</h2>
					{#if data.civilians.report}
						<span class="font-mono text-xs {data.civilians.report.annualRate < 0 ? 'text-error' : 'text-positive-fg'}">
							{data.civilians.report.annualRate >= 0 ? "+" : ""}{(data.civilians.report.annualRate * 100).toFixed(1)}% /
							year
						</span>
					{/if}
				</div>
				<p class="mt-1 font-mono text-xl font-bold text-fg">
					{data.civilians.population.toLocaleString()}
					<span class="text-xs font-normal text-fg-muted">· {data.civilians.density}/km²</span>
				</p>
				<Sparkline
					values={data.civilians.trend ?? []}
					label="Civilian population over the last 90 days"
					color="var(--color-positive)"
				/>
				<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/10 pt-2 text-xs">
					<span
						class="text-fg-muted"
						title="Share set by the region's education level: {(data.civilians.workforce.share * 100).toFixed(0)}%"
					>
						Civilian workforce · {(data.civilians.workforce.share * 100).toFixed(0)}% at education level {data.civilians
							.workforce.education}
					</span>
					<span class="font-mono text-fg-body" title="Civilians available to take a company shift">
						{data.civilians.workforce.available.toLocaleString()} workers
					</span>
				</div>
				{#if data.civilians.report?.contributions.length}
					<div class="mt-2 grid gap-1 text-xs sm:grid-cols-2">
						{#each data.civilians.report.contributions as c}
							<div class="flex justify-between gap-2 border-b border-line/10 py-1">
								<span class="text-fg-muted">{c.label}</span>
								<span class="font-mono {c.value < 0 ? 'text-error' : 'text-positive-fg'}">
									{c.value >= 0 ? "+" : ""}{c.value.toLocaleString()}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<CivilianNeeds needs={data.civilianNeeds} />
		</div>
	</div>
</PageContainer>
