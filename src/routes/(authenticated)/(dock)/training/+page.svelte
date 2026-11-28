<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<!-- Forces: the order of battle for the army, navy and air arm. A status
     strip, formations as a tree, a dense roster, the recruitment office, and
     a side rail with the drill yard, exercises and the officer corps. -->
<script lang="ts">
	import { page } from "$app/state";
	import type { PageData } from "./$types";
	import FluentShield20Regular from "~icons/fluent/shield-20-regular";
	import FluentVehicleShip20Regular from "~icons/fluent/vehicle-ship-20-regular";
	import FluentAirplane20Regular from "~icons/fluent/airplane-20-regular";
	import FluentPeopleTeam20Regular from "~icons/fluent/people-team-20-regular";
	import FluentGauge20Regular from "~icons/fluent/gauge-20-regular";
	import FluentBox20Regular from "~icons/fluent/box-20-regular";
	import FluentFlag20Regular from "~icons/fluent/flag-20-regular";
	import FluentHatGraduation20Regular from "~icons/fluent/hat-graduation-20-regular";
	import FluentPersonAdd20Regular from "~icons/fluent/person-add-20-regular";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import { AIRCRAFT_IDS, DOMAIN_UNITS, POPULATION_FLOOR } from "#lib/config/index.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import NavyConsole from "#lib/component/forces/NavyConsole.svelte";
	import AirOperations from "#lib/component/forces/AirOperations.svelte";
	import Tutorial from "#lib/component/Tutorial.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import StatTile from "./StatTile.svelte";
	import Roster from "./Roster.svelte";
	import Formations from "./Formations.svelte";
	import SelectionBar from "./SelectionBar.svelte";
	import Recruitment from "./Recruitment.svelte";
	import SideRail from "./SideRail.svelte";
	import { SERVICE_DOMAIN, type Service } from "./forces";

	import FormError from "#lib/component/FormError.svelte";

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	// ── Service tabs (kept in ?view=) ───────────────────────────────────────
	const SERVICES: { id: Service; label: string; icon: typeof FluentShield20Regular }[] = [
		{ id: "army", label: "Army", icon: FluentShield20Regular },
		{ id: "navy", label: "Navy", icon: FluentVehicleShip20Regular },
		{ id: "aviation", label: "Aviation", icon: FluentAirplane20Regular }
	];
	const isService = (v: string | null): v is Service => SERVICES.some((s) => s.id === v);
	let view = $state<Service>(
		isService(page.url.searchParams.get("view")) ? (page.url.searchParams.get("view") as Service) : "army"
	);
	$effect(() => {
		const fromUrl = page.url.searchParams.get("view");
		if (isService(fromUrl)) view = fromUrl;
	});
	function setView(next: Service) {
		view = next;
		const url = new URL(page.url.href);
		url.searchParams.set("view", next);
		history.replaceState(history.state, "", url);
	}

	const airSteps = [
		{
			id: "panel",
			title: "1. Open Air operations",
			body: "This panel lists every ready squadron with its fuel and experience. Click inside the form to begin.",
			target: '[data-tutorial="air-ops"]',
			done: "air-panel-open",
			manual: "Show form",
			art: "squadron" as const
		},
		{
			id: "kind",
			title: "2. Choose a mission",
			body: "Pick a mission type. Each requires a role: bombers for bombing, naval bombers for sea targets, tankers for refuelling.",
			target: '[data-tutorial="air-kind"]',
			done: "air-kind-changed",
			manual: "Show selector",
			art: "mission" as const
		},
		{
			id: "launch",
			title: "3. Launch",
			body: "Choose a target and click “Launch mission”. Fuel is spent immediately and the effect lands after the flight — see /docs/air.",
			target: '[data-tutorial="air-ops"]',
			done: "air-mission",
			manual: "Show form",
			art: "fuel" as const
		}
	];

	// ── Clock ───────────────────────────────────────────────────────────────
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 30000);
		return () => clearInterval(t);
	});

	const blocked = $derived(
		data.isIndependentRegion
			? "Independent region — join a state to recruit and exercise."
			: data.isTraveling
				? "No recruiting or exercises while travelling."
				: ""
	);

	// ── Units of the selected service ───────────────────────────────────────
	const domainOf = (unitType: string) => data.templates[unitType as keyof typeof data.templates]?.domain;
	const countFor = (s: Service) => data.units.filter((u) => domainOf(u.unitType) === SERVICE_DOMAIN[s]).length;
	const branchUnits = $derived(
		data.units
			.filter((u) => domainOf(u.unitType) === SERVICE_DOMAIN[view])
			.sort(
				(a, b) =>
					Number(a.isTraining) - Number(b.isTraining) ||
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			)
	);
	const ready = $derived(branchUnits.filter((u) => !u.isTraining));
	const branchTemplates = $derived(Object.values(data.templates).filter((t) => t.domain === SERVICE_DOMAIN[view]));

	// Everything in progress, across all services: the rail is a status board.
	const byCreated = (a: { createdAt: Date | string }, b: { createdAt: Date | string }) =>
		new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	const training = $derived(data.units.filter((u) => u.isTraining).sort(byCreated));
	const exercising = $derived(data.units.filter((u) => u.isExercising).sort(byCreated));

	// ── Formations ──────────────────────────────────────────────────────────
	const groupKind = $derived(view === "army" ? "division" : view === "aviation" ? "airgroup" : null);
	const groups = $derived((data.unitGroups ?? []).filter((g) => g.kind === groupKind));
	const groupNames = $derived(new Map((data.unitGroups ?? []).map((g) => [g.id, g.name])));
	const canGroup = $derived.by(() => {
		if (!groupKind) return null;
		const allowed: readonly string[] = groupKind === "airgroup" ? AIRCRAFT_IDS : DOMAIN_UNITS.land;
		return (u: { unitType: string; isTraining: boolean; health: number }) =>
			allowed.includes(u.unitType) && !u.isTraining && u.health > 0;
	});
	const unassigned = $derived(canGroup ? branchUnits.filter((u) => canGroup(u) && !u.groupId).length : 0);

	let selected = $state<number[]>([]);
	$effect(() => {
		void view;
		selected = [];
	});
	// Drop ticks for units that left (disbanded, moved by the server…).
	$effect(() => {
		const ids = new Set(branchUnits.map((u) => u.id));
		if (selected.some((id) => !ids.has(id))) selected = selected.filter((id) => ids.has(id));
	});

	// ── Status strip ────────────────────────────────────────────────────────
	const avg = (key: "health" | "organization" | "supplyLevel" | "fuel") =>
		ready.length ? Math.round(ready.reduce((s, u) => s + (u[key] ?? 0), 0) / ready.length) : null;
	const effective = (stat: "baseAttack" | "baseDefense") =>
		Math.round(
			ready.reduce(
				(s, u) => s + (data.templates[u.unitType as keyof typeof data.templates]?.[stat] ?? 0) * (u.health / 100),
				0
			)
		);
	const officersAlive = $derived((data.officers ?? []).filter((o) => o.alive).length);
	const lowOrg = $derived(ready.filter((u) => u.organization < data.exerciseConfig.MIN_ORG_TO_START).length);
	const inService = $derived(ready.length + (view === "navy" ? data.navy.ships.length : 0));
	const tone = (v: number | null) =>
		v == null ? "text-fg" : v < 25 ? "text-error" : v < 50 ? "text-warning" : "text-fg";

	let yard = $state<HTMLElement>();
</script>

<svelte:head><title>Forces · PsyOps</title></svelte:head>

<PageContainer maxWidth="7xl">
	<FormError message={form?.error} />
	<!-- Header -->
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<p class="section-title">J3 · Order of battle</p>
			<h1 class="mt-1 text-2xl font-semibold text-heading">Forces</h1>
			<p class="mt-0.5 text-sm text-fg-muted">
				{data.residence.stateName ?? "Independent region"} · raise, drill and organise your army, navy and air arm
			</p>
		</div>
		<div
			class="flex shrink-0 rounded-md border border-line/20 bg-surface-2 p-0.5"
			role="tablist"
			aria-label="Service branch"
		>
			{#each SERVICES as s (s.id)}
				{@const count = s.id === "navy" ? data.navy.ships.length + countFor("navy") : countFor(s.id)}
				<button
					type="button"
					role="tab"
					aria-selected={view === s.id}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm transition-colors {view ===
					s.id
						? 'bg-primary/18 font-medium text-primary-fg'
						: 'text-fg-muted hover:text-fg'}"
					onclick={() => setView(s.id)}
				>
					<s.icon class="size-4" />
					{s.label}
					<span class="data text-[10px] opacity-70">{count}</span>
				</button>
			{/each}
		</div>
	</header>

	{#if blocked && view !== "navy"}
		<p class="flex items-center gap-2 rounded-sm border border-warning/35 bg-warning/10 px-3 py-2 text-sm text-fg-body">
			<FluentWarning20Filled class="size-4 shrink-0 text-warning" />
			{blocked}
		</p>
	{/if}

	<!-- Status strip -->
	<div class="panel overflow-hidden">
		<div
			class="grid grid-cols-2 gap-px bg-line/12 sm:grid-cols-5 [&>*]:bg-surface-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1"
		>
			<StatTile
				label="In service"
				icon={FluentFlag20Regular}
				value={inService}
				hint={view === "navy" && data.navy.ships.length
					? `${data.navy.ships.length} hulls · ${ready.length} naval units`
					: branchUnits.length > ready.length
						? `${branchUnits.length - ready.length} more in training`
						: "none in training"}
			/>
			<StatTile
				label="Strength"
				icon={FluentShield20Regular}
				value={avg("health")}
				suffix="%"
				tone={tone(avg("health"))}
				hint={ready.length ? `ATK ${effective("baseAttack")} · DEF ${effective("baseDefense")}` : "no units ready"}
				title="Average strength; attack and defence scaled by what is left of each unit"
			/>
			<StatTile
				label="Readiness"
				icon={FluentGauge20Regular}
				value={avg("organization")}
				suffix="%"
				tone={tone(avg("organization"))}
				hint={ready.length
					? lowOrg
						? `${lowOrg} too disorganised to drill`
						: "all fit to exercise"
					: "average organisation"}
				title="Average organisation"
			/>
			<StatTile
				label="Supply"
				icon={FluentBox20Regular}
				value={avg("supplyLevel")}
				suffix="%"
				tone={tone(avg("supplyLevel"))}
				hint={avg("fuel") != null ? `fuel ${avg("fuel")}%` : "average supply"}
			/>
			<StatTile
				label="Commanders"
				icon={FluentHatGraduation20Regular}
				value={officersAlive}
				hint={(data.commanderTrainings ?? []).length
					? `${(data.commanderTrainings ?? []).length} at the academy`
					: `${(data.unitGroups ?? []).length} formations`}
			/>
		</div>
	</div>

	{#if view === "navy"}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
			<section class="panel min-w-0 p-4 sm:p-5">
				<h2 class="section-title mb-3">
					<FluentVehicleShip20Regular class="size-4" /> Naval units <Badge tone="neutral" size="xs">
						{branchUnits.length}
					</Badge>
				</h2>
				{#if branchUnits.length}
					<Roster
						units={branchUnits}
						templates={data.templates}
						exercise={data.exerciseConfig}
						{now}
						{blocked}
						{groupNames}
						canGroup={null}
						bind:selected
					/>
				{:else}
					<p class="text-sm text-fg-muted">
						No naval units trained yet — hulls at sea are listed in the fleet console below.
					</p>
				{/if}
			</section>
			<aside class="panel space-y-4 self-start p-4">
				<SideRail
					{now}
					{training}
					{exercising}
					exercise={data.exerciseConfig}
					officers={data.officers ?? []}
					courses={data.commanderTrainings ?? []}
					canCommand={data.navy.canCommand}
					bind:yard
				/>
			</aside>
		</div>
		<!-- The fleet console used to be /navy; it lives here as the Navy tab. -->
		<NavyConsole data={data.navy} embedded />
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
			<div class="min-w-0 space-y-6">
				{#if view === "aviation"}
					<section class="panel p-4 sm:p-5">
						<h2 class="section-title mb-3"><FluentAirplane20Regular class="size-4" /> Air operations</h2>
						<AirOperations
							airSupport={data.navy.airSupport}
							airMissions={data.navy.airMissions}
							regionList={data.navy.regionList}
							airbases={data.navy.airbases}
							myStateId={data.navy.myStateId}
							canCommand={data.navy.canCommand}
						/>
					</section>
					<Tutorial id="air" title="Luftwaffen-Kurzanleitung" steps={airSteps} />
				{/if}

				<!-- Order of battle -->
				{#if groupKind}
					<section class="panel p-4 sm:p-5">
						<div class="mb-3 flex flex-wrap items-center gap-2">
							<h2 class="section-title">
								<FluentPeopleTeam20Regular class="size-4" />
								{groupKind === "division" ? "Divisions" : "Airgroups"}
							</h2>
							<Badge tone="neutral" size="xs">{groups.length}</Badge>
							{#if unassigned}
								<span class="ml-auto text-[11px] text-fg-muted">{unassigned} unassigned — tick them in the roster</span>
							{/if}
						</div>
						<Formations
							kind={groupKind}
							{groups}
							allGroups={data.unitGroups ?? []}
							units={data.officerUnits ?? []}
							officers={data.officers ?? []}
							{unassigned}
							bind:selected
						/>
					</section>
				{/if}

				<!-- Roster -->
				<section class="panel p-4 sm:p-5">
					<div class="mb-2 flex flex-wrap items-center gap-2">
						<h2 class="section-title"><FluentFlag20Regular class="size-4" /> Roster</h2>
						<Badge tone="green" size="xs">{ready.length} ready</Badge>
						{#if branchUnits.length > ready.length}<Badge tone="amber" size="xs">
								{branchUnits.length - ready.length} training
							</Badge>{/if}
					</div>
					{#if branchUnits.length}
						<Roster
							units={branchUnits}
							templates={data.templates}
							exercise={data.exerciseConfig}
							{now}
							{blocked}
							{groupNames}
							{canGroup}
							bind:selected
						/>
					{:else}
						<p class="py-4 text-sm text-fg-muted">
							No {view === "army" ? "battalions" : "squadrons"} yet — recruit one below.
						</p>
					{/if}
				</section>

				{#if groupKind && selected.length}
					<SelectionBar kind={groupKind} {groups} officers={data.officers ?? []} bind:selected />
				{/if}

				<!-- Recruitment office -->
				<section id="recruit" class="panel scroll-mt-4 p-4 sm:p-5">
					<div class="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h2 class="section-title"><FluentPersonAdd20Regular class="size-4" /> Recruitment office</h2>
						<span class="text-[11px] text-fg-muted">
							<span class="data text-fg-soft">
								{Math.max(0, data.availableManpower - POPULATION_FLOOR).toLocaleString()}
							</span> civilians to spare in your region
						</span>
					</div>
					<Recruitment
						templates={branchTemplates}
						inventory={data.inventory}
						manpower={data.availableManpower}
						{blocked}
						glow={() => yard}
					/>
				</section>
			</div>

			<aside class="panel space-y-4 self-start p-4 lg:sticky lg:top-4">
				<SideRail
					{now}
					{training}
					{exercising}
					exercise={data.exerciseConfig}
					officers={data.officers ?? []}
					courses={data.commanderTrainings ?? []}
					canCommand={data.navy.canCommand}
					bind:yard
				/>
			</aside>
		</div>
	{/if}
</PageContainer>
