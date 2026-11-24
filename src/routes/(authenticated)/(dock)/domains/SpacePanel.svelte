<!-- src/routes/(authenticated)/(dock)/domains/SpacePanel.svelte -->
<!-- Space: what the constellation gives us, the satellites themselves, and
     the launch, counter-space and hardening orders. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPlanet20Regular from "~icons/fluent/planet-20-regular";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import {
		ORBIT_LABEL,
		SATELLITE_KINDS,
		SATELLITE_KIND_IDS,
		SPACE_DEFENCE,
		SPACE_OPS,
		SPACE_OP_KINDS,
		type Orbit,
		type SatelliteKind,
		type SpaceOpKind
	} from "#lib/config/index.js";
	import Meter from "./Meter.svelte";
	import OptionPills from "./OptionPills.svelte";
	import { humanize, levelTone, money, outcomeTone, submitOrder, type Planner, type StateOption } from "./shared";

	let { p, targets }: { p: Planner; targets: StateOption[] } = $props();

	// Satellite launches need these from the state stockpile (space service).
	const LAUNCH_CHIPS = 80;
	const LAUNCH_RARE_EARTH = 20;

	let satKind = $state<SatelliteKind>("recon");
	let satName = $state("");
	let opKind = $state<SpaceOpKind>("uplink_jam");
	let opTarget = $state("");

	const sat = $derived(SATELLITE_KINDS[satKind]);
	const op = $derived(SPACE_OPS[opKind]);
	const opCosts = $derived<Record<string, number>>(
		op.durationHours > 0 ? { cost: op.cost, durationHours: op.durationHours } : { cost: op.cost }
	);
</script>

<section id="space" class="panel scroll-mt-20 p-4" aria-labelledby="space-title">
	<header class="mb-3 flex items-center justify-between gap-2">
		<h2 id="space-title" class="section-title"><FluentPlanet20Regular class="size-4" />Space · Constellation</h2>
	</header>

	<div class="divide-y divide-line/15">
		<div class="grid gap-x-6 gap-y-2.5 pb-4 sm:grid-cols-3">
			<Meter label="Recon" value={p.space.recon} display="+{Math.round(p.space.recon * 100)}%" tone="bg-secondary" />
			<Meter label="C2 resilience" value={p.space.comms} tone="bg-secondary" />
			<Meter label="Early warning" value={p.space.earlyWarning} tone="bg-secondary" />
		</div>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-xs text-fg-muted">
			<span>GPS accuracy <span class="data text-fg">×{p.space.gps}</span></span>
			<span>Upkeep <span class="data text-fg">{money(p.space.upkeep)}</span>/day</span>
			<span class="flex items-center gap-2">
				Defence
				<span class="flex gap-0.5" aria-label="Space defence level {p.spaceDefence} of {SPACE_DEFENCE.MAX_LEVEL}">
					{#each Array(SPACE_DEFENCE.MAX_LEVEL) as _, i (i)}
						<span class="h-2 w-3 rounded-[2px] {i < p.spaceDefence ? 'bg-secondary' : 'bg-surface-8'}"></span>
					{/each}
				</span>
			</span>
			{#if p.roles.space && p.spaceNextCost !== null}
				<form
					method="POST"
					action="?/upgradeSpaceDefence"
					use:enhance={submitOrder}
					class="ml-auto flex items-center gap-2"
				>
					<ResourceRequirements inline costs={{ cost: p.spaceNextCost }} available={{}} />
					<Button type="submit" size="xs" variant="secondary">Harden</Button>
				</form>
			{/if}
		</div>

		{#if p.satellites.length}
			<div class="overflow-x-auto py-4">
				<table class="w-full text-left text-xs">
					<caption class="section-title mb-2">In orbit</caption>
					<thead class="text-fg-faint">
						<tr>
							<th class="py-1 pr-3 font-medium">Satellite</th>
							<th class="hidden py-1 pr-3 font-medium sm:table-cell">Orbit</th>
							<th class="w-24 py-1 pr-3 font-medium">Health</th>
							<th class="py-1 font-medium">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line/10">
						{#each p.satellites.slice(0, 8) as s (s.id)}
							<tr>
								<td class="py-1.5 pr-3">
									<span class="text-fg-soft">{s.name}</span>
									<span class="block text-fg-faint">
										{SATELLITE_KINDS[s.kind as SatelliteKind]?.label ?? humanize(s.kind)}
									</span>
								</td>
								<td class="hidden py-1.5 pr-3 text-fg-muted sm:table-cell">
									{ORBIT_LABEL[s.orbit as Orbit] ?? s.orbit}
								</td>
								<td class="py-1.5 pr-3">
									<div class="flex items-center gap-2">
										<div class="h-1 w-12 overflow-hidden rounded-full bg-surface-8">
											<div class="h-full {levelTone(s.health / 100)}" style="width: {s.health}%"></div>
										</div>
										<span class="data">{s.health}%</span>
									</div>
								</td>
								<td class="py-1.5"><Badge tone={outcomeTone(s.status)} size="xs">{humanize(s.status)}</Badge></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="py-3 text-xs text-fg-muted">No satellites in orbit yet{p.roles.space ? " — launch one below." : "."}</p>
		{/if}

		{#if p.roles.space}
			<form method="POST" action="?/launchSatellite" use:enhance={submitOrder} class="space-y-2.5 py-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-sm font-medium text-fg">Launch a satellite</h3>
					<OptionPills
						name="kind"
						label="Satellite type"
						bind:value={satKind}
						options={SATELLITE_KIND_IDS.map((k) => ({
							value: k,
							label: SATELLITE_KINDS[k].label.replace(/ satellite$/, ""),
							title: SATELLITE_KINDS[k].blurb
						}))}
					/>
				</div>
				<p class="line-clamp-2 text-xs text-fg-muted">{sat.blurb}</p>
				<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<input
						class="field-control h-8 w-full px-2 text-sm sm:max-w-xs"
						name="name"
						bind:value={satName}
						required
						minlength="3"
						placeholder="Satellite name"
						aria-label="Satellite name"
					/>
					<div class="flex items-center justify-between gap-3">
						<ResourceRequirements
							inline
							costs={{ cost: sat.cost, chips: LAUNCH_CHIPS, rare_earth: LAUNCH_RARE_EARTH, hours: sat.launchHours }}
							available={{}}
							labels={{ hours: "To orbit" }}
						/>
						<Button type="submit" size="sm" disabled={satName.trim().length < 3}>Launch</Button>
					</div>
				</div>
			</form>

			<form method="POST" action="?/spaceOp" use:enhance={submitOrder} class="space-y-2.5 py-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-sm font-medium text-fg">Counter-space operation</h3>
					<OptionPills
						name="kind"
						label="Operation"
						bind:value={opKind}
						options={SPACE_OP_KINDS.map((k) => ({ value: k, label: SPACE_OPS[k].label, title: SPACE_OPS[k].blurb }))}
					/>
				</div>
				<p class="line-clamp-2 text-xs text-fg-muted">{op.blurb}</p>
				<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div class="min-w-0 sm:max-w-xs">
						<SearchSelect
							name="targetStateId"
							items={targets}
							bind:value={opTarget}
							showId
							placeholder="Target state…"
							searchPlaceholder="Search states…"
						/>
					</div>
					<div class="flex items-center justify-between gap-3">
						<ResourceRequirements inline costs={opCosts} available={{}} labels={{ durationHours: "Effect" }} />
						<Button type="submit" size="sm" variant="secondary" disabled={!opTarget}>Execute</Button>
					</div>
				</div>
			</form>
		{/if}

		{#if p.spaceOps.length}
			<div class="overflow-x-auto pt-4">
				<table class="w-full text-left text-xs">
					<caption class="section-title mb-2">Recent operations</caption>
					<tbody class="divide-y divide-line/10">
						{#each p.spaceOps.slice(0, 5) as o (o.id)}
							<tr>
								<td class="py-1.5 pr-3 text-fg-soft">{SPACE_OPS[o.kind as SpaceOpKind]?.label ?? humanize(o.kind)}</td>
								<td class="py-1.5 pr-3 text-fg-muted">{o.target ?? "—"}</td>
								<td class="py-1.5 text-right">
									<Badge tone={outcomeTone(o.outcome)} size="xs">{humanize(o.outcome)}</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
