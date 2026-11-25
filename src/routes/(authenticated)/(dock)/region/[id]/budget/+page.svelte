<!-- src/routes/(authenticated)/(dock)/region/[id]/budget/+page.svelte -->
<!-- The regional purse and the construction queue it funds. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import { countdown } from "#lib/utils/military.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import RegionBudget from "../RegionBudget.svelte";

	let { data, form } = $props();
	const worksHref = $derived(`/region/${data.region.id}/construction${data.budget?.isGovernor ? "?fund=region" : ""}`);
</script>

<svelte:head>
	<title>Budget · {data.region.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader title="Regional budget" subtitle={data.region.name}>
		{#snippet actions()}
			<Button href="/region/{data.region.id}" variant="secondary" size="sm" icon={FluentChevronLeft20Filled}>
				Region
			</Button>
		{/snippet}
	</PageHeader>

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

	{#if data.budget}
		<section class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Budget at a glance">
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Balance</p>
				<p class="font-mono text-lg font-bold text-fg">${data.budget.balance.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">In the last 24 h</p>
				<p class="font-mono text-lg font-bold text-positive-fg">+${data.budget.incomeLastDay.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Work queue</p>
				<p class="font-mono text-lg font-bold text-fg">{data.queue.length}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Paid by</p>
				<p class="text-sm font-bold text-fg">{data.payFrom === "region" ? "Regional budget" : "State treasury"}</p>
			</div>
		</section>
	{/if}

	<section class="panel rounded-sm p-4 mt-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="section-title">Construction queue</h2>
			<a href={worksHref} class="text-xs text-fg-muted hover:text-primary-fg"> Full building plans → </a>
		</div>
		{#if data.buildOptions.length}
			<form method="POST" action="?/build" class="mt-3 flex flex-wrap items-end gap-2 panel-muted rounded-sm p-3">
				<input type="hidden" name="payFrom" value={data.payFrom} />
				<input type="hidden" name="quantity" value="1" />
				<label class="min-w-0 flex-1">
					<span class="field-label">Add a building to the queue</span>
					<select name="buildingType" class="field-control rounded-sm h-9 w-full px-2 text-sm" required>
						{#each data.buildOptions as option (option.type)}
							<option value={option.type}>
								{option.label} · {option.days} days · ${option.currency.toLocaleString()}
							</option>
						{/each}
					</select>
				</label>
				<Button type="submit" size="sm" variant="primary" icon={FluentBuilding20Filled}>Add to queue</Button>
			</form>
		{/if}
		{#if data.queue.length}
			<ul class="mt-3 divide-y divide-line/15">
				{#each data.queue as item (item.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
						<span class="flex items-center gap-2 min-w-0">
							<FluentBuilding20Filled class="size-4 text-friendly shrink-0" />
							<span class="truncate">{item.name}</span>
						</span>
						<span class="font-mono text-xs text-fg-muted">
							started {item.startedAt ? formatDate(item.startedAt) : "—"}
						</span>
						<span class="font-mono text-xs {countdown(item.completesAt) ? 'text-warning' : 'text-positive-fg'}">
							{countdown(item.completesAt) ?? "complete"}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-fg-muted">Nothing under construction here right now.</p>
		{/if}
	</section>

	<div class="mt-4">
		{#if data.budget}
			<RegionBudget regionId={data.region.id} budget={data.budget} />
		{:else}
			<section class="panel rounded-sm p-4">
				<h2 class="section-title">Regional budget</h2>
				<p class="mt-2 text-sm text-fg-muted">An independent region has no state tax share to spend.</p>
			</section>
		{/if}
	</div>
</PageContainer>
