<!-- src/routes/(authenticated)/(dock)/civic/+page.svelte -->
<!-- Patronage: the oligarch's ledger. Private buildings, bought with your own
     money, turn into civilian goodwill in the regions where they open. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import ConstructionProgress from "#lib/component/ConstructionProgress.svelte";
	import { dtgDate } from "#lib/utils/dtg.js";

	let { data, form } = $props();
	let regionId = $state<number>(data.homeRegionId ?? data.regions[0]?.id ?? 0);
	let type = $state(data.buildings[0]?.type ?? "water_works");
	let building = $derived(data.buildings.find((b) => b.type === type) ?? data.buildings[0]);
	let canAfford = $derived(!!building && data.walletBalance >= building.cost);
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
</script>

<svelte:head>
	<title>Patronage · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader title="Civic patronage" subtitle="Build with your own money. Buy goodwill where it counts.">
		{#snippet actions()}
			<span class="panel-muted rounded-sm px-3 py-2 font-mono text-xs text-fg-soft">
				Wallet <span class="text-positive-fg">{money(data.walletBalance)}</span>
			</span>
		{/snippet}
	</PageHeader>

	<div class="grid gap-2 sm:grid-cols-3">
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Goodwill bought</p>
			<p class="font-mono text-lg font-bold text-positive-fg">+{data.goodwill}</p>
		</div>
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Projects funded</p>
			<p class="font-mono text-lg font-bold text-fg">{data.projects.length}</p>
		</div>
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Regions watched</p>
			<p class="font-mono text-lg font-bold text-fg">{data.opinions.length}</p>
		</div>
	</div>

	{#if data.opinions.length}
		<section class="panel rounded-sm p-4">
			<h2 class="section-title mb-3">Civilian opinion</h2>
			<ul class="space-y-3">
				{#each data.opinions as row (row.regionId)}
					<li>
						<div class="flex justify-between gap-3 text-sm">
							<a href="/region/{row.regionId}" class="text-fg hover:text-primary-fg">{row.name}</a>
							<span
								class="font-mono {row.score >= 60
									? 'text-positive-fg'
									: row.score < 35
										? 'text-hostile-fg'
										: 'text-fg'}"
							>
								{row.score}/100
							</span>
						</div>
						<div class="mt-1 h-1.5 rounded-full bg-surface-4 overflow-hidden">
							<div
								class="h-full rounded-full {row.score >= 60
									? 'bg-positive'
									: row.score < 35
										? 'bg-hostile'
										: 'bg-primary'}"
								style="width: {row.score}%"
							></div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="panel rounded-sm p-4">
		<h2 class="section-title mb-3">Fund a building</h2>
		{#if form?.error}
			<p class="field-error mb-3">{form.error}</p>
		{/if}
		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
			{#each data.buildings as item (item.type)}
				<button
					type="button"
					onclick={() => (type = item.type)}
					class="panel-muted rounded-sm p-3 text-left transition-colors {type === item.type
						? 'border-primary/60 bg-primary/10'
						: 'hover:border-primary/40'}"
				>
					<span class="text-xl">{item.icon}</span>
					<span class="block mt-1 font-semibold text-sm text-fg">{item.name}</span>
					<span class="block text-xs text-fg-muted">{item.description}</span>
					<span class="mt-2 flex justify-between font-mono text-[11px]">
						<span class="text-fg-soft">{money(item.cost)}</span>
						<span class="text-positive-fg">+{item.opinion} opinion</span>
					</span>
				</button>
			{/each}
		</div>
		<form
			method="POST"
			action="?/build"
			use:enhance={() =>
				async ({ update, result }) => {
					await update();
					toastResult(result);
				}}
		>
			<input type="hidden" name="type" value={type} />
			<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] items-end">
				<label class="block">
					<span class="field-label">Region</span>
					<select name="regionId" class="field-control rounded-sm px-3 py-2.5 w-full" bind:value={regionId} required>
						{#each data.regions as region (region.id)}
							<option value={region.id}>{region.name}</option>
						{/each}
					</select>
				</label>
				<Button type="submit" variant="primary" disabled={!canAfford || !regionId}>
					{canAfford ? `Fund ${building?.name ?? "building"}` : "Insufficient funds"}
				</Button>
			</div>
		</form>
	</section>

	<section>
		<h2 class="section-title mb-2 px-1">Your buildings ({data.projects.length})</h2>
		{#if !data.projects.length}
			<EmptyState title="Nothing built yet" subtitle="Fund a water works or a clinic to start buying goodwill." />
		{:else}
			<ul class="space-y-2">
				{#each data.projects as project (project.id)}
					{@const item = data.buildings.find((b) => b.type === project.buildingType)}
					<li class="paper rounded-sm p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="font-mono text-[10px] uppercase tracking-[0.2em]">
									Patronage certificate no. {String(project.id).padStart(5, "0")}
								</p>
								<p class="mt-1 font-semibold text-lg">{item?.icon ?? "🏗️"} {item?.name ?? project.buildingType}</p>
								<p class="text-xs opacity-70">Opened {dtgDate(project.completesAt)}</p>
							</div>
							<p class="font-mono text-sm {project.completedAt ? 'text-positive-fg' : ''}">
								{project.completedAt ? `+${item?.opinion ?? 0} opinion` : "Under construction"}
							</p>
						</div>
						{#if !project.completedAt}
							<div class="mt-3">
								<ConstructionProgress startedAt={project.startedAt} completesAt={project.completesAt} compact />
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</PageContainer>
