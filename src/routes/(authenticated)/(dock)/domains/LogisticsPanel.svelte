<!-- src/routes/(authenticated)/(dock)/domains/LogisticsPanel.svelte -->
<!-- Land logistics: supply reaching the regions, where strategic inputs come
     from, convoys and infrastructure repair. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentVehicleTruckProfile20Regular from "~icons/fluent/vehicle-truck-profile-20-regular";
	import FluentInfo16Regular from "~icons/fluent/info-16-regular";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { CONVOY, REPAIR, convoyCost, repairCost } from "#lib/config/index.js";
	import Meter from "./Meter.svelte";
	import { humanize, outcomeTone, pct, submitOrder, type Planner } from "./shared";

	let { p }: { p: Planner } = $props();

	let origin = $state("");
	let target = $state("");
	let cargo = $state(100);
	let repairRegion = $state("");

	const repairTarget = $derived(p.ownRegions.find((r) => String(r.id) === repairRegion));
	const repairItems = $derived(
		p.ownRegions.map((r) => ({ ...r, hint: `infra ${r.infrastructure ?? 0}/${REPAIR.MAX_LEVEL}` }))
	);

	// Stacked bar of where each strategic input comes from.
	const sourcing = $derived(
		[
			{ key: "Domestic", n: p.autonomy.domestic, cls: "bg-positive" },
			{ key: "Bloc", n: p.autonomy.bloc, cls: "bg-secondary" },
			{ key: "Trade", n: p.autonomy.trade, cls: "bg-accent" },
			{ key: "Unsourced", n: p.autonomy.shortage, cls: "bg-error" }
		].filter((s) => s.n > 0)
	);
</script>

<section id="logistics" class="panel scroll-mt-20 p-4" aria-labelledby="logistics-title">
	<header class="mb-3 flex items-center justify-between gap-2">
		<h2 id="logistics-title" class="section-title">
			<FluentVehicleTruckProfile20Regular class="size-4" />Land · Logistics
		</h2>
		<a href="/docs/conflict" class="text-fg-faint hover:text-fg" title="How supply and convoys work">
			<FluentInfo16Regular class="size-4" /><span class="sr-only">Logistics help</span>
		</a>
	</header>

	<div class="divide-y divide-line/15">
		<div class="grid gap-x-6 gap-y-4 pb-4 md:grid-cols-2">
			<div class="space-y-2.5">
				<Meter
					label="Average supply"
					value={p.supply.average}
					title="Food, fuel and ammunition reaching active regions. Low supply weakens units and slows factories."
				/>
				<Meter label="Worst region" value={p.supply.worst} />
				<p class="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
					<span class="data text-fg-soft">{p.supply.regions}</span> active regions
					{#if p.supply.blockaded}<Badge tone="amber" size="xs">Blockade throttles supply</Badge>{/if}
				</p>
			</div>
			<div class="space-y-2.5">
				<Meter
					label="Supply autonomy"
					value={p.autonomy.score}
					title="Domestic inputs run factories at full output; bloc and trade cost a little; unsourced inputs degrade quality."
				/>
				{#if p.autonomy.total > 0}
					<div class="flex h-1 overflow-hidden rounded-full bg-surface-8" aria-hidden="true">
						{#each sourcing as s (s.key)}
							<div class={s.cls} style="width: {(s.n / p.autonomy.total) * 100}%"></div>
						{/each}
					</div>
					<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
						{#each sourcing as s (s.key)}
							<li class="flex items-center gap-1.5">
								<span class="size-2 rounded-full {s.cls}"></span>{s.key}
								<span class="data text-fg-soft">{s.n}</span>
							</li>
						{/each}
						<li class="text-fg-faint">of {p.autonomy.total} inputs</li>
					</ul>
				{/if}
			</div>
		</div>

		{#if p.roles.convoy}
			<form method="POST" action="?/convoy" use:enhance={submitOrder} class="space-y-2 py-4">
				<h3 class="text-sm font-medium text-fg">Dispatch a convoy</h3>
				<div class="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
					<div class="min-w-0 lg:w-48">
						<SearchSelect
							name="originRegionId"
							items={p.ownRegions}
							bind:value={origin}
							showId
							placeholder="From region…"
							searchPlaceholder="Search your regions…"
						/>
					</div>
					<div class="min-w-0 lg:w-48">
						<SearchSelect
							name="targetRegionId"
							items={p.ownRegions}
							bind:value={target}
							showId
							placeholder="To region…"
							searchPlaceholder="Search your regions…"
						/>
					</div>
					<label class="flex items-center gap-2 text-xs text-fg-muted">
						Cargo
						<input
							class="field-control data h-8 w-20 px-2 text-sm"
							type="number"
							name="cargo"
							bind:value={cargo}
							min="1"
							max={CONVOY.MAX_CARGO}
						/>
					</label>
					<div class="flex items-center justify-between gap-3 sm:col-span-2 lg:ml-auto">
						<ResourceRequirements inline costs={{ cost: convoyCost(cargo || 0) }} available={{}} />
						<Button type="submit" size="sm" disabled={!origin || !target}>Dispatch</Button>
					</div>
				</div>
			</form>

			<form method="POST" action="?/repair" use:enhance={submitOrder} class="space-y-2 py-4">
				<h3 class="text-sm font-medium text-fg">Rebuild infrastructure</h3>
				<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div class="min-w-0 sm:max-w-xs">
						<SearchSelect
							name="regionId"
							items={repairItems}
							bind:value={repairRegion}
							showId
							placeholder="Region to rebuild…"
							searchPlaceholder="Search your regions…"
						/>
					</div>
					<div class="flex items-center justify-between gap-3">
						<ResourceRequirements
							inline
							costs={{ cost: repairCost(repairTarget?.infrastructure ?? 0), machine_tools: REPAIR.TOOLS }}
							available={{}}
						/>
						<Button type="submit" size="sm" variant="secondary" disabled={!repairRegion}>Rebuild</Button>
					</div>
				</div>
			</form>
		{:else}
			<p class="py-3 text-xs text-fg-muted">Convoys and repairs are ordered by the president or economy minister.</p>
		{/if}

		{#if p.convoys.length}
			<div class="overflow-x-auto pt-4">
				<table class="w-full text-left text-xs">
					<caption class="section-title mb-2">Recent convoys</caption>
					<thead class="text-fg-faint">
						<tr>
							<th class="py-1 pr-3 font-medium">Route</th>
							<th class="py-1 pr-3 text-right font-medium">Cargo</th>
							<th class="py-1 pr-3 text-right font-medium">Risk</th>
							<th class="py-1 font-medium">Outcome</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line/10">
						{#each p.convoys.slice(0, 5) as c (c.id)}
							<tr>
								<td class="max-w-0 truncate py-1.5 pr-3 text-fg-soft sm:max-w-none">{c.origin} → {c.target}</td>
								<td class="data py-1.5 pr-3 text-right">{c.cargo}</td>
								<td class="data py-1.5 pr-3 text-right">{c.interceptionChance}%</td>
								<td class="py-1.5"><Badge tone={outcomeTone(c.outcome)} size="xs">{humanize(c.outcome)}</Badge></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
