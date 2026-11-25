<!-- src/routes/(authenticated)/(dock)/region/[id]/+page.svelte -->
<!-- A region at a glance: a live view of its ground (terrain, coast,
     settlements, today's weather and daylight) under its name and coat of
     arms, stat tiles, then the situation and intel tasking, governor and
     industry. Travel & entry pairs the visa passport page with the ticket. -->
<script lang="ts">
	import { goodLabel } from "#lib/config/index.js";
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentHome20Regular from "~icons/fluent/home-20-regular";
	import FluentPeople20Regular from "~icons/fluent/people-20-regular";
	import FluentBuilding20Regular from "~icons/fluent/building-20-regular";
	import FluentFlash20Regular from "~icons/fluent/flash-20-regular";
	import FluentShield20Regular from "~icons/fluent/shield-20-regular";
	import FluentRadar20Regular from "~icons/fluent/radar-20-regular";
	import FluentWater24Regular from "~icons/fluent/water-24-regular";
	import FluentSun20Regular from "~icons/fluent/weather-sunny-20-regular";
	import FluentMoon20Regular from "~icons/fluent/weather-moon-20-regular";
	import FluentCloud20Regular from "~icons/fluent/weather-cloudy-20-regular";
	import FluentRain20Regular from "~icons/fluent/weather-rain-20-regular";
	import FluentFog20Regular from "~icons/fluent/weather-fog-20-regular";
	import FluentMountain20Regular from "~icons/fluent/mountain-location-bottom-20-regular";
	import FluentRibbon20Filled from "~icons/fluent/ribbon-20-filled";

	import Logo from "#lib/component/Logo.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import UserLink from "#lib/component/UserLink.svelte";

	import { Button, Badge, SearchSelect } from "#lib/component/ui/index.js";
	import { formatDate, regionCoatUrl } from "#lib/utils/formatting.js";
	import { BUILDING_TEMPLATES, VALID_BUILDING_TYPES as BUILDING_ORDER } from "#lib/config/index.js";
	import BorderingRegions from "./BorderingRegions.svelte";
	import BattleHistory from "#lib/component/BattleHistory.svelte";
	import TravelEntry from "./TravelEntry.svelte";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import TravelBanner from "./TravelBanner.svelte";
	import RegionSituation from "./RegionSituation.svelte";
	import GatherIntel from "./GatherIntel.svelte";
	import { SensorImage } from "#lib/component/recon/index.js";
	import { WEATHER_LABEL, localHour } from "#lib/config/index.js";
	import type { ImageryInput } from "#lib/utils/sensor-image.js";
	import Revolution from "./Revolution.svelte";
	import { StrikeLog, StrikePlanner } from "#lib/component/strike/index.js";
	import { formatPopulation } from "#lib/config/index.js";
	import { countdown } from "#lib/utils/military.js";

	const { data, form } = $props();

	let isAttacking = $state(false);
	const warItems = $derived(
		(data.attackableWars as { id: number; attacker: { name: string }; defender: { name: string } }[]).map((w) => ({
			id: w.id,
			name: `${w.attacker.name} vs ${w.defender.name}`
		}))
	);
	let attackWarId = $state<string | undefined>(undefined);
	$effect(() => {
		if (!attackWarId && warItems.length) attackWarId = String(warItems[0].id);
	});

	const attackFromItems = $derived(
		(data.borderingRegionsForAttack as { id: number; name: string; distanceKm: number }[]).map((b) => ({
			id: b.id,
			name: b.name,
			hint: `${Math.round(b.distanceKm)} km`
		}))
	);
	let attackFromId = $state<string | undefined>(undefined);
	$effect(() => {
		if (!attackFromId && attackFromItems.length) attackFromId = String(attackFromItems[0].id);
	});

	const isIndependent = $derived(!data.region.stateId);

	// Calculate remaining cooldown time
	function getCooldownRemaining(cooldownEndsAt: string) {
		const now = new Date().getTime();
		const endsAt = new Date(cooldownEndsAt).getTime();
		const diffMs = endsAt - now;

		if (diffMs <= 0) return null;

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		return { hours, minutes };
	}

	const canAttack = $derived(
		!data.ongoingBattle &&
			!(data.recentFailedBattle && getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)) &&
			data.attackableWars.length > 0 &&
			data.borderingRegionsForAttack.length > 0
	);

	const resourceEntries = $derived(
		[
			{ name: "oil", value: data.region.oil },
			{ name: "steel", value: data.region.steel },
			{ name: "chromium", value: data.region.chromium },
			{ name: "tungsten", value: data.region.tungsten },
			{ name: "rubber", value: data.region.rubber },
			{ name: "aluminium", value: data.region.aluminium }
		].filter((r) => r.value)
	);

	const level = (v: number | null) => (v === null ? "?" : v || 0);
	const construction = $derived(`/region/${data.region.id}/construction`);
	const facts = $derived([
		{
			label: "Civilians",
			value: formatPopulation(data.civilians.population),
			href: "#strikes",
			title: `${data.civilians.population.toLocaleString("en-US")} civilians · ${data.civilians.density}/km²`,
			icon: FluentPeople20Regular,
			tone: "text-positive-fg bg-positive/12"
		},
		{
			label: "Residents",
			value: data.population,
			href: `/region/${data.region.id}/population`,
			icon: FluentHome20Regular,
			tone: "text-friendly-fg bg-friendly/12"
		},
		{
			label: "Infrastructure",
			value: level(data.region.infrastructure),
			href: construction,
			icon: FluentBuilding20Regular,
			tone: "text-primary-fg bg-primary/12"
		},
		{
			label: "Power",
			value: level(data.region.economy),
			href: construction,
			icon: FluentFlash20Regular,
			tone: "text-warning bg-warning/12"
		},
		{
			label: "Fortifications",
			value: level(data.region.fortifications),
			href: construction,
			icon: FluentShield20Regular,
			tone: "text-fg-soft bg-surface-8"
		},
		{
			label: "Radar",
			value: level(data.region.radar),
			href: construction,
			title: "Air-defence radar coverage",
			icon: FluentRadar20Regular,
			tone: "text-hostile-fg bg-hostile/12"
		}
	]);

	// The hero: a live frame of the region's ground under today's sky. Only
	// public things are drawn (terrain, coast, how built-up it looks), never units.
	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(t);
	});
	const scenery = $derived(data.situation.scenery);
	const conditions = $derived(data.situation.conditions);
	const heroInput = $derived<ImageryInput>({
		reportId: data.region.id,
		regionId: data.region.id,
		// Satellites look down through clear skies; under cloud a drone flies beneath it.
		sensor: conditions.weather === "clear" || conditions.weather === "fog" ? "sat_eo" : "drone_eo",
		observedAt: new Date(Math.floor(now.getTime() / 600_000) * 600_000).toISOString(),
		lat: scenery.lat,
		lon: scenery.lon,
		terrain: scenery.terrain,
		infrastructure: scenery.infrastructure,
		strikes: [],
		findings: {
			outcome: "ok",
			conditions,
			airDefence: null,
			coverage: {},
			categories: [],
			unitTypes: null,
			firingPositions: null,
			buildings: null,
			battle: null
		}
	});
	const hour = $derived(localHour(scenery.lon ?? 0, now));
	const clock = $derived(
		`${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`
	);
	const WeatherIcon = $derived(
		{
			clear: conditions.night ? FluentMoon20Regular : FluentSun20Regular,
			cloudy: FluentCloud20Regular,
			rain: FluentRain20Regular,
			fog: FluentFog20Regular
		}[conditions.weather]
	);
	const TERRAIN_LABEL: Record<string, string> = {
		shore: "Coastal",
		lake: "Lakeland",
		mountain: "Mountains",
		hills: "Hills",
		forest: "Forest",
		jungle: "Jungle",
		desert: "Desert",
		urban: "Urban",
		city: "City",
		town: "Town",
		fields: "Farmland",
		plains: "Plains"
	};
</script>

<svelte:head>
	<title>{data.region.name}</title>
	<meta
		name="description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.region.name} />
	<meta
		property="og:description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>
	<meta property="og:image" content={regionCoatUrl(data.region.id)} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.region.name} />
	<meta
		name="twitter:description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>
	<meta name="twitter:image" content={regionCoatUrl(data.region.id)} />
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Hero: the region's ground, live -->
	<article
		class="panel rounded-sm overflow-hidden {data.ongoingBattle ? 'alarm-outline' : ''}"
		style={data.rulingPartyColor ? `border-top: 3px solid ${data.rulingPartyColor};` : undefined}
	>
		<div class="relative h-64 sm:h-80 bg-black">
			<SensorImage input={heroInput} variant="bare" fit="cover" class="absolute inset-0 !h-full" />
			<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"></div>
			<span
				class="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-[#bfe8c8]"
				title="A live view of the ground: terrain, coast, settlements, today's weather and daylight. Units only show up through recon."
			>
				<span class="size-1.5 animate-pulse rounded-full bg-[#5fd38a]"></span>
				LIVE · {heroInput.sensor === "sat_eo" ? "SAT" : "UAV"} · {clock} LOCAL
			</span>
			<div class="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 sm:gap-4 sm:p-5">
				<Logo
					src={regionCoatUrl(data.region.id)}
					alt="Coat of arms of {data.region.name}"
					class="size-16 sm:size-20 rounded-sm shrink-0 ring-2 ring-black/40 shadow-lg"
					placeholderIcon={FluentShield20Filled}
					placeholderGradient="from-politics-bg/40 to-politics-bg/40"
				/>
				<div class="min-w-0 flex-1">
					<h1
						class="font-serif text-3xl sm:text-4xl font-bold text-white break-words leading-tight drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]"
					>
						{data.region.name}
					</h1>
					<div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
						{#if data.region.stateName}
							<a
								href="/state/{data.region.stateId}"
								class="font-serif italic text-sm text-white/85 hover:text-primary-hover transition-colors mr-1"
							>
								{data.region.stateName}
							</a>
						{:else}
							<span class="font-serif italic text-sm text-primary-fg flex items-center gap-1 mr-1">
								<FluentFlag20Filled class="size-4" />
								Unclaimed territory
							</span>
						{/if}
						<span class="hero-chip">
							{#if scenery.terrain === "shore" || scenery.terrain === "lake"}<FluentWater24Regular
									class="size-3.5"
								/>{:else}<FluentMountain20Regular class="size-3.5" />{/if}
							{TERRAIN_LABEL[scenery.terrain] ?? scenery.terrain}
						</span>
						<span class="hero-chip" title="Weather and daylight now">
							<WeatherIcon class="size-3.5" />
							{WEATHER_LABEL[conditions.weather]} · {conditions.night ? "night" : "day"}
						</span>
						{#if data.ongoingBattle}
							<a href="/battle/{data.ongoingBattle.id}" class="hero-chip !border-hostile/60 !bg-hostile/30 !text-white">
								<FluentFire20Filled class="size-3.5" /> Battle
							</a>
						{/if}
						{#if data.hasResidence}
							<span class="hero-chip !border-friendly/60 !bg-friendly/30 !text-white animate-pop-in">
								<FluentLocation20Filled class="size-3.5" /> You are here
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Stat tiles -->
		<div class="grid grid-cols-2 gap-px border-t border-line/15 bg-line/12 sm:grid-cols-3 lg:grid-cols-6">
			{#each facts as fact (fact.label)}
				<a
					href={fact.href}
					title={"title" in fact ? fact.title : undefined}
					class="group flex items-center gap-3 bg-surface-2 px-3 py-3 transition-colors hover:bg-surface-4"
				>
					<span class="grid size-9 shrink-0 place-items-center rounded-sm {fact.tone}">
						<fact.icon class="size-5" />
					</span>
					<span class="min-w-0">
						<span class="block text-[10px] uppercase tracking-wide text-fg-muted">{fact.label}</span>
						<span
							class="block text-lg font-bold font-mono leading-tight text-fg group-hover:text-primary-hover transition-colors"
						>
							{fact.value.toLocaleString()}
						</span>
					</span>
				</a>
			{/each}
		</div>
	</article>

	<!-- On the road -->
	{#if data.activeTravel}
		<TravelBanner activeTravel={data.activeTravel} />
	{/if}

	<!-- Alerts -->
	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0" />
			<div class="flex-1 text-sm">{form.error}</div>
		</div>
	{/if}

	{#if form?.success && form?.message}
		<div class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-positive flex-shrink-0" />
			<div class="flex-1 text-sm">{form.message}</div>
		</div>
	{/if}

	<!-- Forces and the intel picture, then tasking recon -->
	<RegionSituation situation={data.situation} hasBattle={!!data.ongoingBattle} />
	{#if data.situation.recon.canTarget || data.situation.isHostileRegion}
		<GatherIntel
			regionId={data.region.id}
			longitude={scenery.lon}
			terrain={scenery.terrain}
			conditions={data.situation.conditions}
			airDefence={data.situation.airDefence}
			recon={data.situation.recon}
			walletBalance={data.walletBalance}
		/>
	{/if}

	<!-- Airstrikes: lasting damage, the planner for leaders at war with the owner -->
	{#if data.strike.effects.length}
		<div class="panel rounded-sm px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" id="strike-effects">
			<span class="section-title">Strike damage</span>
			{#each data.strike.effects as e (e.id)}
				<span class="text-hostile-fg">
					{e.label} <span class="data">−{Math.round(e.magnitude * 100)}%</span>
					<span class="data text-xs text-fg-muted">· {countdown(e.expiresAt) ?? "ending"}</span>
				</span>
			{/each}
		</div>
	{/if}
	{#if data.strike.options}
		<StrikePlanner options={data.strike.options} regionName={data.region.name} />
	{/if}

	<!-- Travel & entry: entry rule, visa and ticket in one place -->
	<TravelEntry
		regionId={data.region.id}
		regionName={data.region.name}
		stateName={data.region.stateName ?? null}
		{isIndependent}
		allowsFreeMovement={data.allowsFreeMovement}
		hasInauguralElection={data.hasInauguralElection}
		hasPendingResidenceApp={data.hasPendingResidenceApp}
		hasResidence={data.hasResidence}
		isInParty={data.isInParty}
		travelling={!!data.activeTravel}
		travelInfo={data.travelInfo}
		walletBalance={data.walletBalance}
		visa={data.visa}
		entryBlockedReason={data.entry.allowed ? null : data.entry.reason}
	/>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
		<!-- Administration -->
		{#if !isIndependent}
			{@const underConstruction = data.buildings.filter((b) => b.isUnderConstruction)}
			<SectionCard>
				<h2 class="section-title mb-3">Administration</h2>
				<div class="space-y-3">
					{#if data.governor}
						<UserLink
							id={data.governor.userId}
							name={data.governor.name}
							avatar={data.governor.logo}
							subtitle="Governor · since {formatDate(data.governor.appointedAt)}"
							size="md"
						/>
					{:else}
						<p class="text-sm text-fg-muted">No governor appointed</p>
					{/if}
					<a
						href="/region/{data.region.id}/construction"
						class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
					>
						<FluentBuilding20Filled class="size-5 text-friendly shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Public works</p>
							<p class="text-xs text-fg-muted truncate">
								{#each BUILDING_ORDER as t, i}{i ? " · " : ""}{BUILDING_TEMPLATES[t].icon}
									{data.region[BUILDING_TEMPLATES[t].stat] ?? 0}{/each}
							</p>
						</div>
						{#if underConstruction.length}
							<Badge tone="amber">{underConstruction.length} building</Badge>
						{/if}
					</a>
					<a
						href="/region/{data.region.id}/budget"
						class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
					>
						<FluentWallet20Filled class="size-5 text-warning shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Regional budget</p>
							<p class="text-xs text-fg-muted truncate">Purse, programmes and the construction queue</p>
						</div>
					</a>
					<a
						href="/region/{data.region.id}/population"
						class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
					>
						<FluentPeople20Filled class="size-5 text-friendly shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Population</p>
							<p class="text-xs text-fg-muted truncate">Civilians, supplies and the civil register</p>
						</div>
					</a>
				</div>
			</SectionCard>
		{/if}

		<!-- Private patronage: fund civic buildings here -->
		<a href="/region/{data.region.id}/patronage" class="panel-interactive rounded-sm p-4 flex items-center gap-3 group">
			<span class="grid size-10 shrink-0 place-items-center rounded-sm bg-warning/12 text-warning">
				<FluentRibbon20Filled class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Patronage</p>
				<p class="text-xs text-fg-muted truncate">
					{data.patronage.buildings} civic building{data.patronage.buildings === 1 ? "" : "s"} ·
					{data.patronage.mine ? `${data.patronage.mine} yours` : "fund one from your wallet"}
				</p>
			</div>
			{#if data.patronage.goodwill}
				<Badge tone="green">+{data.patronage.goodwill} goodwill</Badge>
			{/if}
		</a>

		{#if isIndependent}
			<a
				href="/region/{data.region.id}/population"
				class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
			>
				<FluentPeople20Filled class="size-5 text-friendly shrink-0" />
				<div class="min-w-0 flex-1">
					<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Population</p>
					<p class="text-xs text-fg-muted truncate">Civilians, supplies and the civil register</p>
				</div>
			</a>
		{/if}

		<Revolution regionId={data.region.id} revolution={data.revolution} pastRevolutions={data.pastRevolutions} />

		<!-- Natural resources -->
		{#if resourceEntries.length > 0}
			<SectionCard>
				<h2 class="section-title mb-3">Resources</h2>
				<dl class="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{#each resourceEntries as resource, i (resource.name)}
						<div
							class="panel-muted rounded-sm p-2.5 flex items-center gap-2 animate-pop-in"
							style="--rise-delay: {i * 40}ms"
						>
							<ResourceIcon name={resource.name} class="size-5 shrink-0" />
							<div class="min-w-0">
								<dt class="text-[10px] text-fg-muted uppercase tracking-wide">{goodLabel(resource.name)}</dt>
								<dd class="text-sm font-bold font-mono text-fg">{resource.value}</dd>
							</div>
						</div>
					{/each}
				</dl>
			</SectionCard>
		{/if}

		<!-- Industry -->
		{#if data.factories.length > 0}
			<SectionCard class="md:col-span-2">
				<h2 class="section-title mb-3">
					<FluentBriefcase20Filled class="size-5 text-politics" />
					Industry
				</h2>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each data.factories as factory}
						<a href="/factory/{factory.id}" class="flex items-center gap-3 group panel-interactive rounded-sm p-3">
							<Logo
								src={factory.companyLogoUrl}
								alt={factory.company?.name || "Company"}
								class="size-10 shrink-0"
								placeholderIcon={FluentBriefcase20Filled}
								placeholderGradient="from-politics-bg/40 to-politics-bg/40"
							/>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-fg group-hover:text-primary-hover transition-colors truncate">
									{factory.name}
								</p>
								<p class="text-xs text-fg-muted capitalize truncate">
									{factory.factoryType} • {factory.company?.name}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</SectionCard>
		{/if}
	</div>

	<!-- Active Wars Section -->
	{#if data.ongoingBattle}
		<a
			href="/battle/{data.ongoingBattle.id}"
			class="block bg-red-600/10 border border-red-500/30 rounded-sm p-4 sm:p-5 hover:border-red-400/50 transition-all group"
		>
			<div class="flex items-center gap-4">
				<div
					class="size-12 flex-shrink-0 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center"
				>
					<span class="text-2xl">⚔️</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<span class="text-xs text-red-300 uppercase tracking-widest font-bold">Battle in Progress</span>
					</div>
					<div class="text-sm text-fg-soft">
						<span class="text-red-300 font-bold">{data.ongoingBattle.attackerState.name}</span>
						<span class="text-fg-muted"> → </span>
						<span class="text-friendly-fg font-bold">
							{data.ongoingBattle.defenderState?.name || data.region.stateName}
						</span>
					</div>
				</div>
				<span class="text-fg-muted group-hover:text-red-300 transition-colors">→</span>
			</div>
		</a>
	{:else if data.recentFailedBattle}
		{@const cooldown = getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)}
		{#if cooldown}
			<div class="bg-primary/12 border border-primary/35 rounded-sm p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="size-10 bg-primary/15 rounded-sm border border-primary/35 flex items-center justify-center flex-shrink-0"
					>
						<span class="text-xl">🛡️</span>
					</div>
					<div class="flex-1">
						<div class="text-sm font-bold text-primary-fg">Region Under Protection</div>
						<div class="flex items-center gap-2 text-xs text-fg-muted mt-1">
							<FluentClock20Filled class="size-3.5" />
							<span>Attackable in <span class="font-mono">{cooldown.hours}h {cooldown.minutes}m</span></span>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{:else if data.activeWars.length > 0}
		<div class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="flex items-center gap-3 bg-red-600/10 border border-red-500/30 rounded-sm p-4 hover:border-red-400/50 transition-all group"
				>
					<div
						class="size-10 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center flex-shrink-0"
					>
						<FluentFire20Filled class="size-5 text-red-400" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-300 uppercase tracking-widest">Active War</span>
						</div>
						<div class="text-sm text-fg-soft">
							<span class="font-bold text-red-300">{war.attacker.name}</span>
							<span class="text-fg-muted mx-1">vs</span>
							<span class="font-bold text-friendly-fg">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-fg-muted group-hover:text-red-300 transition-colors text-sm">→</span>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Launch Attack -->
	{#if canAttack}
		<SectionCard>
			<h2 class="section-title mb-4">
				<FluentFire20Filled class="size-5 text-red-400" />
				Launch Attack
			</h2>
			<form
				method="POST"
				action="?/startBattle"
				use:enhance={() => {
					isAttacking = true;
					return async ({ update }) => {
						isAttacking = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				{#if data.attackableWars.length > 1}
					<div>
						<label class="field-label" for="warId">War</label>
						<SearchSelect
							id="warId"
							name="warId"
							items={warItems}
							bind:value={attackWarId}
							placeholder="Choose a war…"
						/>
					</div>
				{:else}
					<input type="hidden" name="warId" value={data.attackableWars[0].id} />
				{/if}

				<div>
					<label class="field-label" for="attackFromRegionId">Attack From</label>
					<SearchSelect
						id="attackFromRegionId"
						name="attackFromRegionId"
						items={attackFromItems}
						bind:value={attackFromId}
						placeholder="Choose a region…"
						showId
					/>
				</div>

				<Button type="submit" variant="danger" block icon={FluentFire20Filled} disabled={isAttacking}>
					{isAttacking ? "Launching Attack..." : "Launch Attack"}
				</Button>
			</form>
		</SectionCard>
	{/if}

	<!-- Strikes on this region -->
	{#if data.strike.log.length}
		<section class="panel rounded-sm p-4" id="strikes">
			<h2 class="section-title mb-3">Strike log</h2>
			<StrikeLog entries={data.strike.log} showRegion={false} />
		</section>
	{/if}

	<!-- Battles fought here -->
	{#if data.battleHistory.length}
		<SectionCard>
			<h2 class="section-title mb-3">Battle history</h2>
			<BattleHistory battles={data.battleHistory} />
		</SectionCard>
	{/if}

	<!-- Bordering Regions -->
	<BorderingRegions borderingRegions={data.borderingRegions} />
</PageContainer>

<style>
	.hero-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 9999px;
		border: 1px solid rgb(255 255 255 / 0.2);
		background: rgb(0 0 0 / 0.45);
		padding: 0.125rem 0.5rem;
		color: rgb(255 255 255 / 0.85);
		backdrop-filter: blur(4px);
	}
</style>
