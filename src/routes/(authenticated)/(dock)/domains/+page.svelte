<!-- src/routes/(authenticated)/(dock)/domains/+page.svelte -->
<!-- Joint command console: one status tile per domain, then compact panels
     for logistics, trade, sea, space, cyber and the shadow economy. Leaders
     see the order forms; citizens can still run smuggling cargo. -->
<script lang="ts">
	import FluentVehicleTruckProfile20Regular from "~icons/fluent/vehicle-truck-profile-20-regular";
	import FluentVehicleShip20Regular from "~icons/fluent/vehicle-ship-20-regular";
	import FluentAirplane20Regular from "~icons/fluent/airplane-20-regular";
	import FluentBrainCircuit20Regular from "~icons/fluent/brain-circuit-20-regular";
	import FluentPlanet20Regular from "~icons/fluent/planet-20-regular";
	import FluentCheckmarkCircle20Regular from "~icons/fluent/checkmark-circle-20-regular";
	import FluentWarning20Regular from "~icons/fluent/warning-20-regular";
	import FluentInfo16Regular from "~icons/fluent/info-16-regular";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { AI_MAX_LEVEL } from "#lib/config/index.js";
	import DomainTile from "./DomainTile.svelte";
	import LogisticsPanel from "./LogisticsPanel.svelte";
	import TradePanel from "./TradePanel.svelte";
	import SeaPanel from "./SeaPanel.svelte";
	import SpacePanel from "./SpacePanel.svelte";
	import CyberPanel from "./CyberPanel.svelte";
	import ShadowPanel from "./ShadowPanel.svelte";
	import { pct, type DomainStatus } from "./shared";

	const { data, form } = $props();
	const p = $derived(data.planner);
	const targets = $derived(p?.targets ?? []);

	const tiles = $derived.by(() => {
		if (!p) return [];
		const operational = p.satellites.filter((s) => s.status === "operational").length;
		const damaged = p.satellites.some((s) => s.status === "damaged");
		const airLanes = p.trade.lanes.filter((l) => l.kind === "air").length;
		const landDegraded = p.supply.average < 0.85 || p.supply.blockaded;
		return [
			{
				icon: FluentVehicleTruckProfile20Regular,
				label: "Land",
				value: `${pct(p.supply.average)}%`,
				hint: `supply · worst ${pct(p.supply.worst)}%`,
				status: (landDegraded ? "degraded" : "ok") as DomainStatus,
				href: "#logistics"
			},
			{
				icon: FluentVehicleShip20Regular,
				label: "Sea",
				value: String(p.seaControl),
				hint: `${p.blockades.length ? "blockaded" : "sea control"} · ${p.fleet.length} ${p.fleet.length === 1 ? "hull" : "hulls"}`,
				status: (p.blockades.length ? "degraded" : p.seaControl > 0 ? "ok" : "idle") as DomainStatus,
				href: "#sea"
			},
			{
				icon: FluentAirplane20Regular,
				label: "Air",
				value: `${pct(p.trade.factors.air, 1)}%`,
				hint: `freight flow · ${airLanes} corridor${airLanes === 1 ? "" : "s"}`,
				status: (p.trade.factors.air < 1 ? "degraded" : "ok") as DomainStatus,
				href: "#trade"
			},
			{
				icon: FluentBrainCircuit20Regular,
				label: "Cyber",
				value: `L${p.ai.level}/${AI_MAX_LEVEL}`,
				hint: p.ai.label,
				status: (p.ai.level > 0 ? "ok" : "idle") as DomainStatus,
				href: "#cyber"
			},
			{
				icon: FluentPlanet20Regular,
				label: "Space",
				value: String(operational),
				hint: `satellites · GPS ×${p.space.gps}`,
				status: (damaged ? "degraded" : operational > 0 ? "ok" : "idle") as DomainStatus,
				href: "#space"
			}
		];
	});

	// Things that need a leader's attention, shown in the side rail.
	const alerts = $derived.by(() => {
		if (!p) return [];
		const out: string[] = [];
		for (const b of p.blockades) out.push(`Blockade by ${b.blockader} at ${b.strength}% strength`);
		if (p.supply.worst < 0.5) out.push(`A region is down to ${pct(p.supply.worst)}% supply`);
		if (p.autonomy.shortage > 0)
			out.push(`${p.autonomy.shortage} strategic input${p.autonomy.shortage === 1 ? " is" : "s are"} unsourced`);
		if (p.trade.factors.sea < 1) out.push(`Sea freight throttled to ${pct(p.trade.factors.sea)}%`);
		if (p.trade.factors.air < 1) out.push(`Air freight throttled to ${pct(p.trade.factors.air)}%`);
		for (const s of p.satellites.filter((s) => s.status === "damaged")) out.push(`${s.name} damaged (${s.health}%)`);
		return out;
	});

	const lastMessage = $derived(form && "message" in form && form.message ? String(form.message) : null);
</script>

<svelte:head><title>Domains · PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<div class="space-y-5 py-6">
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div class="min-w-0">
				<p class="section-title">J3 · Joint command</p>
				<h1 class="mt-1 text-2xl font-semibold text-fg">Domains</h1>
				<p class="mt-1 text-sm text-fg-muted">
					Supply, trade, sea, space and cyber{data.state ? ` for ${data.state.name}` : ""} at a glance.
				</p>
			</div>
			<div class="flex items-center gap-2">
				{#if data.state}<Badge>{data.state.name}</Badge>{/if}
				<a href="/docs/conflict" class="flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
					<FluentInfo16Regular class="size-4" />Guide
				</a>
			</div>
		</header>

		{#if lastMessage}
			<p class="animate-rise-in flex items-start gap-2 text-sm text-positive-fg" role="status">
				<FluentCheckmarkCircle20Regular class="mt-0.5 size-4 shrink-0" />{lastMessage}
			</p>
		{/if}

		{#if !data.state}
			<div class="panel p-6 text-sm text-fg-muted">Settle in a state to see its command picture.</div>
		{:else}
			{#if p}
				<div class="rise-stagger grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
					{#each tiles as t, i (t.label)}
						<div class={i === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""}>
							<DomainTile {...t} />
						</div>
					{/each}
				</div>
			{/if}

			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<div class="min-w-0 space-y-4">
					{#if p}
						<LogisticsPanel {p} />
						<TradePanel {p} {targets} />
						<SeaPanel {p} {targets} />
						<SpacePanel {p} {targets} />
					{:else}
						<div class="panel p-4 text-sm text-fg-muted">
							The command picture is for the president and the defence, economy and foreign ministers.
						</div>
					{/if}
				</div>

				<aside class="min-w-0 space-y-4">
					{#if p}
						<section class="panel p-4" aria-labelledby="alerts-title">
							<h2 id="alerts-title" class="section-title mb-2">
								<FluentWarning20Regular class="size-4" />Alerts
							</h2>
							{#if alerts.length}
								<ul class="space-y-1.5 text-xs">
									{#each alerts as a (a)}
										<li class="flex items-start gap-2 text-warning">
											<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"></span>{a}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="flex items-center gap-2 text-xs text-positive-fg">
									<FluentCheckmarkCircle20Regular class="size-4" />All domains nominal.
								</p>
							{/if}
						</section>
						<CyberPanel {p} />
					{/if}
					{#if data.civilian}<ShadowPanel {p} civilian={data.civilian} {targets} />{/if}
				</aside>
			</div>
		{/if}
	</div>
</PageContainer>
