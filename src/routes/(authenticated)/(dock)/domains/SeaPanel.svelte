<!-- src/routes/(authenticated)/(dock)/domains/SeaPanel.svelte -->
<!-- Sea: sea control, the ready fleet, blockades on us, and naval orders. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentVehicleShip20Regular from "~icons/fluent/vehicle-ship-20-regular";
	import FluentWarning20Regular from "~icons/fluent/warning-20-regular";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { NAVAL_OPS, NAVAL_OP_KINDS, type NavalOpKind } from "#lib/config/index.js";
	import OptionPills from "./OptionPills.svelte";
	import { humanize, outcomeTone, submitOrder, type Planner, type StateOption } from "./shared";

	let { p, targets }: { p: Planner; targets: StateOption[] } = $props();

	let kind = $state<NavalOpKind>("blockade");
	let targetState = $state("");
	let region = $state("");
	const spec = $derived(NAVAL_OPS[kind]);
	const ready = $derived(spec.needsCoast ? !!region : !!targetState);

	// The fleet as "3 Frigate · 1 Submarine" rather than every hull by name.
	const fleetByType = $derived(
		Object.entries(
			p.fleet.reduce<Record<string, number>>((acc, u) => ((acc[u.unitType] = (acc[u.unitType] ?? 0) + 1), acc), {})
		).sort((a, b) => b[1] - a[1])
	);
	const opCosts = $derived<Record<string, number>>(
		spec.durationHours > 0 ? { cost: spec.cost, durationHours: spec.durationHours } : { cost: spec.cost }
	);
</script>

<section id="sea" class="panel scroll-mt-20 p-4" aria-labelledby="sea-title">
	<header class="mb-3 flex items-center justify-between gap-2">
		<h2 id="sea-title" class="section-title"><FluentVehicleShip20Regular class="size-4" />Sea · Naval command</h2>
	</header>

	<div class="divide-y divide-line/15">
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4 text-xs">
			<p class="text-fg-muted">
				Sea control <span class="data ml-1 text-base text-fg">{p.seaControl}</span>
			</p>
			<p class="flex flex-wrap items-center gap-1.5 text-fg-muted">
				Fleet
				{#each fleetByType as [type, n] (type)}
					<Badge size="xs"><span class="data">{n}</span> {humanize(type)}</Badge>
				{:else}
					<span class="text-fg-faint">no hulls ready</span>
				{/each}
			</p>
		</div>

		{#if p.blockades.length}
			<p class="flex items-center gap-2 py-3 text-xs text-warning">
				<FluentWarning20Regular class="size-4 shrink-0" />
				Blockaded by {p.blockades.map((b) => b.blockader).join(", ")} — trade and energy imports are cut.
			</p>
		{/if}

		{#if p.roles.naval}
			<form method="POST" action="?/naval" use:enhance={submitOrder} class="space-y-2.5 py-4">
				<OptionPills
					name="kind"
					label="Operation"
					bind:value={kind}
					options={NAVAL_OP_KINDS.map((k) => ({ value: k, label: NAVAL_OPS[k].label, title: NAVAL_OPS[k].blurb }))}
				/>
				<p class="line-clamp-2 text-xs text-fg-muted" title={spec.blurb}>
					{spec.blurb}
					{#if spec.needsWar}<span class="text-fg-faint"> Needs war or casus belli.</span>{/if}
				</p>
				<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div class="min-w-0 sm:max-w-xs">
						{#if spec.needsCoast}
							<SearchSelect
								name="regionId"
								items={p.coastalRegions}
								bind:value={region}
								showId
								placeholder="Coastal region…"
								searchPlaceholder="Search coastal regions…"
								empty="No coastal regions found."
							/>
						{:else}
							<SearchSelect
								name="targetStateId"
								items={targets}
								bind:value={targetState}
								showId
								placeholder="Target state…"
								searchPlaceholder="Search states…"
							/>
						{/if}
					</div>
					<div class="flex items-center justify-between gap-3">
						<ResourceRequirements inline costs={opCosts} available={{}} labels={{ durationHours: "Effect" }} />
						<Button type="submit" size="sm" disabled={!ready}>Launch</Button>
					</div>
				</div>
			</form>
		{:else}
			<p class="py-3 text-xs text-fg-muted">Naval operations are ordered by the president or defence minister.</p>
		{/if}

		{#if p.navalOps.length}
			<div class="overflow-x-auto pt-4">
				<table class="w-full text-left text-xs">
					<caption class="section-title mb-2">Recent operations</caption>
					<tbody class="divide-y divide-line/10">
						{#each p.navalOps.slice(0, 5) as op (op.id)}
							<tr>
								<td class="py-1.5 pr-3 whitespace-nowrap text-fg-soft">
									{NAVAL_OPS[op.kind as NavalOpKind]?.label ?? humanize(op.kind)}
								</td>
								<td class="py-1.5 pr-3 whitespace-nowrap text-fg-muted">{op.target ?? "—"}</td>
								<td class="py-1.5 pr-3">
									<Badge tone={outcomeTone(op.outcome)} size="xs">{humanize(op.outcome)}</Badge>
								</td>
								<td class="hidden max-w-0 truncate py-1.5 text-fg-faint sm:table-cell" title={op.message ?? ""}>
									{op.message ?? ""}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
