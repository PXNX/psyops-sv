<!-- src/routes/(authenticated)/(dock)/domains/TradePanel.svelte -->
<!-- Air and sea trade: how freely freight flows, the lanes we run, the zones
     we have closed, and the forms to open a lane or close a zone. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowSwap20Regular from "~icons/fluent/arrow-swap-20-regular";
	import FluentInfo16Regular from "~icons/fluent/info-16-regular";
	import { Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import {
		CLOSURES,
		CLOSURE_KINDS,
		TRADE_KINDS,
		TRADE_LANES,
		closureCost,
		laneCost,
		laneRevenue,
		type ClosureKind,
		type TradeKind
	} from "#lib/config/index.js";
	import Meter from "./Meter.svelte";
	import OptionPills from "./OptionPills.svelte";
	import { hoursLeft, money, submitOrder, type Planner, type StateOption } from "./shared";

	let { p, targets }: { p: Planner; targets: StateOption[] } = $props();

	let laneKind = $state<TradeKind>("sea");
	let partner = $state("");
	let capacity = $state(50);

	let zoneKind = $state<ClosureKind>("airspace");
	let zoneScope = $state<"all" | "one">("all");
	let zoneTarget = $state("");
	let hours = $state(24);

	const laneSpec = $derived(TRADE_LANES[laneKind]);
	const zoneSpec = $derived(CLOSURES[zoneKind]);
	const flowOf = (kind: string) => p.trade.factors[kind as TradeKind] ?? 1;
</script>

<section id="trade" class="panel scroll-mt-20 p-4" aria-labelledby="trade-title">
	<header class="mb-3 flex items-center justify-between gap-2">
		<h2 id="trade-title" class="section-title">
			<FluentArrowSwap20Regular class="size-4" />Air &amp; sea · Trade lanes
		</h2>
		<a
			href="/docs/navy"
			class="text-fg-faint hover:text-fg"
			title="Lanes earn treasury every six hours; closures and blockades choke them"
		>
			<FluentInfo16Regular class="size-4" /><span class="sr-only">Trade help</span>
		</a>
	</header>

	<div class="divide-y divide-line/15">
		<div class="grid gap-x-6 gap-y-2.5 pb-4 sm:grid-cols-2">
			<Meter label="Air freight flow" value={p.trade.factors.air} title="A closed airspace grounds air corridors" />
			<Meter
				label="Sea freight flow"
				value={p.trade.factors.sea}
				title="EEZ closures and blockades throttle sea lanes"
			/>
		</div>

		{#if p.trade.lanes.length || p.trade.zones.length}
			<div class="grid gap-4 py-4 lg:grid-cols-2">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<caption class="section-title mb-2">Active lanes</caption>
						<thead class="text-fg-faint">
							<tr>
								<th class="py-1 pr-3 font-medium">Partner</th>
								<th class="py-1 pr-3 text-right font-medium">Cap.</th>
								<th class="py-1 text-right font-medium" title="Treasury per six-hour cycle at current flow">
									Per cycle
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-line/10">
							{#each p.trade.lanes.slice(0, 6) as lane (lane.id)}
								<tr>
									<td class="py-1.5 pr-3">
										<span class="text-fg-soft">{lane.partner}</span>
										<span class="text-fg-faint">· {TRADE_LANES[lane.kind as TradeKind].label}</span>
									</td>
									<td class="data py-1.5 pr-3 text-right">{lane.capacity}</td>
									<td class="data py-1.5 text-right text-positive-fg">
										{money(laneRevenue(lane.kind as TradeKind, lane.capacity, flowOf(lane.kind)))}
									</td>
								</tr>
							{:else}
								<tr><td colspan="3" class="py-1.5 text-fg-muted">No lanes open.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<caption class="section-title mb-2">Our closures</caption>
						<thead class="text-fg-faint">
							<tr>
								<th class="py-1 pr-3 font-medium">Zone</th>
								<th class="py-1 pr-3 text-right font-medium">Strength</th>
								<th class="py-1 text-right font-medium">Ends in</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-line/10">
							{#each p.trade.zones.slice(0, 6) as zone (zone.id)}
								<tr>
									<td class="py-1.5 pr-3">
										<span class="text-fg-soft">{CLOSURES[zone.kind as ClosureKind].label}</span>
										<span class="text-fg-faint">· {zone.target ?? "all traffic"}</span>
									</td>
									<td class="data py-1.5 pr-3 text-right">{zone.strength}%</td>
									<td class="data py-1.5 text-right">{hoursLeft(zone.expiresAt)} h</td>
								</tr>
							{:else}
								<tr><td colspan="3" class="py-1.5 text-fg-muted">No zones closed.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		{#if p.roles.trade}
			<form method="POST" action="?/openLane" use:enhance={submitOrder} class="space-y-2 py-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-sm font-medium text-fg">Open a trade lane</h3>
					<OptionPills
						name="kind"
						label="Lane type"
						bind:value={laneKind}
						options={TRADE_KINDS.map((k) => ({ value: k, label: TRADE_LANES[k].label, title: TRADE_LANES[k].blurb }))}
					/>
				</div>
				<div class="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
					<div class="min-w-0 lg:w-56">
						<SearchSelect
							name="partnerStateId"
							items={targets}
							bind:value={partner}
							showId
							placeholder="Partner state…"
							searchPlaceholder="Search states…"
						/>
					</div>
					<label
						class="flex items-center gap-2 text-xs text-fg-muted"
						title="{laneSpec.minCapacity}–{laneSpec.maxCapacity} points"
					>
						Capacity
						<input
							class="field-control data h-8 w-20 px-2 text-sm"
							type="number"
							name="capacity"
							bind:value={capacity}
							min={laneSpec.minCapacity}
							max={laneSpec.maxCapacity}
						/>
					</label>
					<span class="text-xs text-fg-faint">
						earns <span class="data text-positive-fg">
							{money(laneRevenue(laneKind, capacity || 0, flowOf(laneKind)))}
						</span>/cycle
					</span>
					<div class="flex items-center justify-between gap-3 sm:col-span-2 lg:ml-auto">
						<ResourceRequirements inline costs={{ cost: laneCost(laneKind, capacity || 0) }} available={{}} />
						<Button type="submit" size="sm" disabled={!partner}>Open lane</Button>
					</div>
				</div>
			</form>
		{/if}

		{#if p.roles.closure}
			<form method="POST" action="?/closeZone" use:enhance={submitOrder} class="space-y-2 py-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-sm font-medium text-fg">Close a zone</h3>
					<OptionPills
						name="kind"
						label="Zone"
						bind:value={zoneKind}
						options={CLOSURE_KINDS.map((k) => ({ value: k, label: CLOSURES[k].label, title: CLOSURES[k].blurb }))}
					/>
				</div>
				<div class="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
					<div
						class="flex rounded-sm border border-line/15 bg-surface-2 p-0.5 text-xs"
						role="radiogroup"
						aria-label="Closed to"
					>
						{#each [["all", "Everyone"], ["one", "One state"]] as [v, l] (v)}
							<button
								type="button"
								role="radio"
								aria-checked={zoneScope === v}
								class="flex-1 rounded-sm px-2.5 py-1 transition-colors {zoneScope === v
									? 'bg-surface-8 text-fg'
									: 'text-fg-muted hover:text-fg'}"
								onclick={() => (zoneScope = v as "all" | "one")}
							>
								{l}
							</button>
						{/each}
					</div>
					{#if zoneScope === "one"}
						<div class="min-w-0 lg:w-56">
							<SearchSelect
								name="targetStateId"
								items={targets}
								bind:value={zoneTarget}
								showId
								placeholder="Closed to…"
								searchPlaceholder="Search states…"
							/>
						</div>
					{/if}
					<label
						class="flex items-center gap-2 text-xs text-fg-muted"
						title="{zoneSpec.minHours}–{zoneSpec.maxHours} hours"
					>
						Hours
						<input
							class="field-control data h-8 w-20 px-2 text-sm"
							type="number"
							name="hours"
							bind:value={hours}
							min={zoneSpec.minHours}
							max={zoneSpec.maxHours}
						/>
					</label>
					<div class="flex items-center justify-between gap-3 sm:col-span-2 lg:ml-auto">
						<ResourceRequirements inline costs={{ cost: closureCost(zoneKind, hours || 0) }} available={{}} />
						<Button type="submit" size="sm" variant="secondary" disabled={zoneScope === "one" && !zoneTarget}>
							Declare closure
						</Button>
					</div>
				</div>
			</form>
		{/if}

		{#if !p.roles.trade && !p.roles.closure}
			<p class="pt-3 text-xs text-fg-muted">
				Lanes and closures are set by the president and the economy, foreign or defence minister.
			</p>
		{:else if !p.trade.lanes.length && !p.trade.zones.length}
			<p class="pt-3 text-xs text-fg-muted">No lanes or closures yet — open a lane to start earning.</p>
		{/if}
	</div>
</section>
