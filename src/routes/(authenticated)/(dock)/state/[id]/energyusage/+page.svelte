<!-- src/routes/(authenticated)/(dock)/state/[id]/energyusage/+page.svelte -->
<!-- Why the energy books look the way they do: the split of consumed power,
     fuel and upkeep factors, and how every state compares. -->
<script lang="ts">
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import IntelValue from "#lib/component/intel/IntelValue.svelte";
	import IntelNote from "#lib/component/intel/IntelNote.svelte";
	import type { Estimate } from "#lib/utils/intel-estimate.js";

	let { data } = $props();

	const usage = $derived(data.usage);
	/** A share for the stacked bar: the shown value, nothing when unknown. */
	const width = (e: Estimate) => (e.kind === "hidden" ? 0 : e.value);
	const toneFor = (key: string) =>
		key === "civilian" ? "bg-primary" : key === "military" ? "bg-hostile" : "bg-warning";
</script>

<!-- A stat-card figure: as before when exact, an estimate otherwise. -->
{#snippet figure(e: Estimate, tone: string, unit: string)}
	{#if e.kind === "exact"}
		<p class="mt-0.5 font-mono text-lg font-bold {tone}">{e.value.toLocaleString()}{unit}</p>
	{:else}
		<IntelValue estimate={e} {unit} variant="block" class="mt-0.5" />
	{/if}
{/snippet}

<svelte:head>
	<title>Energy usage · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Energy usage"
		subtitle={data.state.name}
		icon={FluentFlash20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if !data.intel.exact}
		<IntelNote stateId={data.state.id} group="energy" level={data.intel.level} class="mb-4" />
	{/if}

	{#if !usage}
		<section class="panel rounded-sm p-5 text-sm text-fg-muted">
			No energy ledger has been recorded for this state yet — the first daily tick creates one.
		</section>
	{:else}
		<section class="panel animate-rise-in rounded-sm p-4 sm:p-5 space-y-3">
			<p class="text-sm text-fg-body">
				Every day the grid produces power and the energy tick draws from it for homes, the forces and export. The
				figures below are taken straight from that ledger; the shares are the policy set by the state's economy
				minister. Fuel and maintenance shortfalls throttle how much of the network actually works.
			</p>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Grid output</p>
					{@render figure(usage.production, "text-fg", " MW")}
				</div>
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Power used</p>
					{@render figure(usage.used, "text-primary-fg", " MW")}
				</div>
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Utilisation</p>
					{@render figure(usage.utilisation, "text-fg", "%")}
				</div>
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Per 1,000 people</p>
					{@render figure(usage.perCapita, "text-fg", " MW")}
				</div>
			</div>

			<div class="rounded-sm border border-line/20">
				<div
					class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted"
				>
					<span>Destination</span><span class="text-right">Power</span><span class="text-right">Share</span>
				</div>
				{#each usage.components as component (component.key)}
					<div
						class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0"
					>
						<span>
							<strong class="font-medium text-fg">{component.label}</strong>
							<span class="block text-xs text-fg-muted">{component.detail}</span>
						</span>
						<IntelValue estimate={component.mw} unit=" MW" wrap class="justify-end text-right text-fg-soft" />
						<IntelValue estimate={component.share} unit="%" wrap class="justify-end text-right text-fg" />
					</div>
				{/each}
			</div>

			<!-- A stacked bar makes the policy split readable at a glance. -->
			<div class="flex h-3 overflow-hidden rounded-full border border-line/20">
				{#each usage.components as component (component.key)}
					<div
						class={toneFor(component.key)}
						style="width:{width(component.share)}%"
						title="{component.label}: {component.share.kind === 'exact' ? '' : '~'}{width(component.share)}%"
					></div>
				{/each}
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="panel-muted rounded-sm p-3">
					<p class="section-title text-xs">Refined fuel pools</p>
					<ul class="mt-2 space-y-1 text-xs">
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Civilian</span><IntelValue estimate={usage.fuel.civilian} />
						</li>
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Military</span><IntelValue estimate={usage.fuel.military} />
						</li>
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Exported</span><IntelValue estimate={usage.fuel.exported} />
						</li>
					</ul>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<p class="section-title text-xs">Network condition</p>
					<ul class="mt-2 space-y-1 text-xs">
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Fuel factor</span><IntelValue
								estimate={usage.factors.fuel}
								unit="%"
								class={width(usage.factors.fuel) < 100 ? "text-warning" : "text-fg"}
							/>
						</li>
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Maintenance factor</span><IntelValue
								estimate={usage.factors.maintenance}
								unit="%"
								class={width(usage.factors.maintenance) < 100 ? "text-warning" : "text-fg"}
							/>
						</li>
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Plants</span><span class="flex items-center gap-1">
								<IntelValue estimate={usage.plants} /> · <IntelValue estimate={usage.plantOutput} unit=" MW" />
							</span>
						</li>
						<li class="flex justify-between gap-2">
							<span class="text-fg-muted">Grid / storage levels</span><span class="flex items-center gap-1">
								<IntelValue estimate={usage.gridLevels} /> / <IntelValue estimate={usage.storageLevels} />
							</span>
						</li>
						<li class="flex justify-between">
							<span class="text-fg-muted">Regions</span><span class="font-mono">{usage.regions}</span>
						</li>
						<li class="flex justify-between">
							<span class="text-fg-muted">Last tick</span><span class="font-mono text-fg-muted">
								{usage.lastTick ? new Date(usage.lastTick).toLocaleString() : "—"}
							</span>
						</li>
					</ul>
				</div>
			</div>
		</section>

		{#if data.history.length}
			<section class="panel animate-rise-in mt-4 rounded-sm p-4 sm:p-5" style="--rise-delay: 80ms">
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<h2 class="section-title mb-2">Power generated</h2>
						<Sparkline
							values={data.history.map((h) => h.power)}
							label="Daily grid output over the last 90 days"
							color="var(--color-primary)"
						/>
					</div>
					<div>
						<h2 class="section-title mb-2">Power used</h2>
						<Sparkline
							values={data.history.map((h) => h.usedPower)}
							label="Daily consumption over the last 90 days"
							color="var(--color-warning)"
						/>
					</div>
				</div>
			</section>
		{/if}
	{/if}

	<section class="panel animate-rise-in mt-4 rounded-sm p-4 sm:p-5" style="--rise-delay: 140ms">
		<h2 class="section-title mb-1">All states, ranked by consumption</h2>
		<p class="mb-3 text-xs text-fg-muted">
			Other states are ranked by your estimates; only your own state's figures are exact.
		</p>
		<div class="max-h-[32rem] overflow-y-auto rounded-sm border border-line/20">
			{#each data.ranking as row, i (row.id)}
				<a
					href="/state/{row.id}/energyusage"
					class="flex items-center gap-3 border-b border-line/10 px-3 py-2 text-sm last:border-0 hover:bg-surface-5 {row.id ===
					data.state.id
						? 'bg-primary/10 text-primary-fg'
						: ''}"
				>
					<span class="w-5 shrink-0 font-mono text-xs text-fg-faint">#{i + 1}</span>
					<span class="min-w-0 flex-1 truncate">{row.name}</span>
					<span class="hidden shrink-0 text-xs text-fg-muted sm:inline"><IntelValue estimate={row.population} /></span>
					<span class="hidden shrink-0 text-xs text-fg-muted sm:inline">
						<IntelValue estimate={row.perCapita} unit="/1k" />
					</span>
					<IntelValue estimate={row.used} unit=" MW" wrap class="shrink-0 justify-end text-right font-semibold" />
				</a>
			{/each}
		</div>
	</section>
</PageContainer>
