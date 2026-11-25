<!-- src/routes/(authenticated)/(dock)/civic/+page.svelte -->
<!-- Patronage: the oligarch's ledger. A hero with the patron's standing, stat
     tiles, a gallery of buildings to commission with a live preview of what
     one would really add where (towns notice their first clinic more than
     their fifth), the patron's own buildings with expansions and plaques,
     goodwill per region and a timeline of everything paid for. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge, Button, OddsRing, SearchSelect } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { dtgDate } from "#lib/utils/dtg.js";
	import { civicNewBuildingEffect, civicSaturation, type CivicBuildingType } from "#lib/config/game/civic.config.js";
	import CivicArt from "./CivicArt.svelte";
	import CivicProjectCard from "./CivicProjectCard.svelte";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconSparkle from "~icons/fluent/sparkle-20-regular";
	import IconBuilding from "~icons/fluent/building-multiple-20-regular";
	import IconMap from "~icons/fluent/map-20-regular";
	import IconMoney from "~icons/fluent/money-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconHome from "~icons/fluent/home-20-regular";
	import IconLocation from "~icons/fluent/location-20-regular";
	import IconInfo from "~icons/fluent/info-20-regular";
	import IconTrophy from "~icons/fluent/trophy-20-regular";
	import IconRibbon from "~icons/fluent/ribbon-20-regular";
	import IconCheck from "~icons/fluent/checkmark-circle-20-regular";
	import IconExpand from "~icons/fluent/arrow-circle-up-20-regular";
	import IconPlaque from "~icons/fluent/signature-20-regular";
	import IconWrench from "~icons/fluent/wrench-20-regular";
	import IconPeople from "~icons/fluent/people-community-20-regular";

	let { data } = $props();

	// ── Planner ────────────────────────────────────────────────────────────
	let type = $state<CivicBuildingType>("water_works");
	let regionId = $state<string | undefined>(
		(() => (data.homeRegionId != null ? String(data.homeRegionId) : undefined))()
	);
	let funding = $state(false);

	const building = $derived(data.buildings.find((b) => b.type === type) ?? data.buildings[0]!);
	const region = $derived(data.regions.find((r) => String(r.id) === regionId) ?? null);
	const existing = $derived(region ? ((data.crowding as Record<string, number>)[region.id] ?? 0) : 0);
	const effect = $derived(civicNewBuildingEffect(type, existing));
	const watchedRow = $derived(region ? data.goodwillView.find((g) => g.regionId === region.id) : undefined);
	const short = $derived(data.walletBalance < building.cost);
	const pending = $derived(
		!!region && data.projects.some((p) => p.regionId === region.id && p.buildingType === type && !p.completedAt)
	);
	const blocked = $derived(
		!region
			? "Choose a region."
			: pending
				? "You already have one of those going up there."
				: short
					? "Your wallet can't cover it."
					: null
	);
	// The saturation curve for the chosen region, slot by slot.
	const SLOTS = 6;
	const slots = $derived(
		Array.from({ length: SLOTS }, (_, i) => ({
			i,
			m: civicSaturation(i),
			state: i < existing ? "taken" : i === existing ? "next" : "free"
		}))
	);

	// ── Derived figures ───────────────────────────────────────────────────
	const underWay = $derived(data.projects.filter((p) => !p.completedAt || p.upgradeCompletesAt).length);
	const landmarks = $derived(data.projects.filter((p) => p.tier >= 3).length);
	const plaques = $derived(data.projects.filter((p) => p.plaque).length);
	const affordable = $derived(data.buildings.filter((b) => b.cost <= data.walletBalance).length);

	const money = (n: number) =>
		n >= 1_000_000
			? `$${+(n / 1_000_000).toFixed(1)}M`
			: n >= 1000
				? `$${+(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`
				: `$${Math.round(n)}`;
	const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const tone = (score: number) =>
		score >= 60
			? { text: "text-positive-fg", bar: "bg-positive" }
			: score < 35
				? { text: "text-hostile-fg", bar: "bg-hostile" }
				: { text: "text-fg", bar: "bg-primary" };

	const HISTORY_ICON = {
		funded: IconMoney,
		opened: IconCheck,
		expanding: IconWrench,
		expanded: IconExpand,
		dedicated: IconPlaque
	} as const;
	const HISTORY_TINT = {
		funded: "bg-surface-7 text-fg-muted",
		opened: "bg-positive/15 text-positive-fg",
		expanding: "bg-warning/15 text-warning",
		expanded: "bg-primary/15 text-primary-fg",
		dedicated: "bg-warning/15 text-warning"
	} as const;
</script>

<svelte:head>
	<title>Patronage · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Hero: the patron's standing -->
	<header class="panel relative overflow-hidden rounded-sm">
		<CivicArt
			kind="skyline"
			class="pointer-events-none absolute inset-0 h-full w-full opacity-70"
			label="A town lit by private patronage"
		/>
		<div
			class="pointer-events-none absolute inset-0 bg-linear-to-r from-surface-1 via-surface-1/80 to-surface-1/20"
		></div>
		<div class="relative flex flex-wrap items-center gap-4 p-4 sm:p-6">
			<OddsRing value={data.rank.progress} color="var(--color-warning)" size={84} label="Progress to the next title">
				<span class="flex flex-col items-center leading-none">
					<IconTrophy class="size-5 text-warning" />
					<span class="data mt-1 text-xs text-fg">L{data.rank.level}</span>
				</span>
			</OddsRing>
			<div class="min-w-0 flex-1">
				<p class="section-title">Civic patronage</p>
				<h1 class="mt-1 font-serif text-2xl leading-tight font-bold text-fg sm:text-3xl">{data.rank.label}</h1>
				<p class="mt-1 text-sm text-fg-muted">
					{#if data.rank.next}
						<span class="data text-positive-fg">{data.goodwill}</span> goodwill ·
						<span class="data">{data.rank.next.min - data.goodwill}</span> more to become {data.rank.next.label.toLowerCase()}
					{:else}
						<span class="data text-positive-fg">{data.goodwill}</span> goodwill · the highest title there is
					{/if}
				</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<Badge tone="green" icon={IconWallet}>{money(data.walletBalance)} in wallet</Badge>
					{#if data.homeRegionId}
						{@const home = data.goodwillView.find((g) => g.home)}
						{#if home}
							<Badge tone="blue" icon={IconHome}>{home.name} · opinion {home.opinion}</Badge>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Stat tiles -->
	<dl class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-positive/15 text-positive-fg">
				<IconSparkle class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Goodwill</dt>
				<dd class="data text-lg text-positive-fg">+{data.goodwill}</dd>
				<dd class="truncate text-[11px] text-fg-faint">after saturation</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-fg">
				<IconMoney class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Invested</dt>
				<dd class="data truncate text-lg text-fg">{money(data.invested)}</dd>
				<dd class="truncate text-[11px] text-fg-faint">
					{data.goodwill ? `${money(data.invested / data.goodwill)} per point` : "nothing open yet"}
				</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
				<IconBuilding class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Buildings</dt>
				<dd class="data text-lg text-fg">
					{data.completed}<span class="text-sm text-fg-faint">/{data.projects.length}</span>
				</dd>
				<dd class="truncate text-[11px] text-fg-faint">
					{underWay
						? `${underWay} under way`
						: landmarks
							? `${landmarks} landmark${landmarks === 1 ? "" : "s"}`
							: "open"}
				</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-politics-bg/25 text-fg">
				<IconMap class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Regions</dt>
				<dd class="data text-lg text-fg">{data.goodwillView.filter((g) => g.myBuildings).length}</dd>
				<dd class="truncate text-[11px] text-fg-faint">{plaques} plaque{plaques === 1 ? "" : "s"} unveiled</dd>
			</div>
		</div>
	</dl>

	<!-- Gallery + planner -->
	<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
		<section class="min-w-0" aria-labelledby="gallery-title">
			<h2 id="gallery-title" class="section-title mb-2">
				Commission a building
				<span class="h-px flex-1 bg-line/15"></span>
				<span class="data normal-case tracking-normal text-fg-faint">
					{affordable}/{data.buildings.length} affordable
				</span>
			</h2>
			<ul class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Building">
				{#each data.buildings as item (item.type)}
					{@const tooDear = item.cost > data.walletBalance}
					<li class="min-w-0">
						<label
							class="group flex h-full cursor-pointer flex-col gap-2 rounded-sm border border-line/15 bg-surface-2 p-3 transition-colors hover:border-line/40 hover:bg-surface-4 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60"
							class:opacity-60={tooDear}
						>
							<input type="radio" name="civic-type" value={item.type} bind:group={type} class="sr-only" />
							<span class="flex items-start justify-between gap-2">
								<span class="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-1/60">
									<CivicArt kind="building" variant={item.type} class="size-12" label={item.name} />
								</span>
								<span class="data rounded-full bg-positive/15 px-2 py-0.5 text-[11px] text-positive-fg">
									+{item.opinion}
								</span>
							</span>
							<span class="text-sm leading-tight font-medium text-fg">{item.name}</span>
							<span class="text-xs leading-snug text-fg-muted">{item.description}</span>
							{#if item.sideEffect}
								<span class="flex items-start gap-1 text-[11px] leading-snug text-primary-fg">
									<IconInfo class="mt-px size-3.5 shrink-0" />{item.sideEffect}
								</span>
							{/if}
							<span class="data mt-auto flex items-center gap-3 pt-1 text-[11px] text-fg-muted">
								<span class:text-error={tooDear}>{money(item.cost)}</span>
								<span class="flex items-center gap-0.5"><IconClock class="size-3" />{item.days}d</span>
							</span>
						</label>
					</li>
				{/each}
			</ul>

			<!-- Tiers explainer -->
			<div class="mt-3 grid grid-cols-3 gap-2 text-center">
				{#each data.tiers as t (t.tier)}
					<div class="rounded-sm border border-line/15 bg-surface-2 px-2 py-2">
						<p class="text-xs font-medium text-fg">{t.label}</p>
						<p class="data text-[11px] text-positive-fg">×{t.opinionMult} opinion</p>
						<p class="data text-[10px] text-fg-faint">
							{t.tier === 1 ? "base price" : `expand for ${pct(t.costMult)}`}
						</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Planner -->
		<form
			method="POST"
			action="?/build"
			class="panel self-start overflow-hidden lg:sticky lg:top-4"
			use:enhance={() => {
				funding = true;
				return async ({ result, update }) => {
					funding = false;
					await update({ reset: false });
					toastResult(result);
				};
			}}
		>
			<input type="hidden" name="type" value={type} />
			<div class="flex items-start gap-3 border-b border-line/15 bg-linear-to-br from-positive/15 to-transparent p-4">
				<span class="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-2">
					<CivicArt kind="building" variant={type} class="size-12" label={building.name} />
				</span>
				<div class="min-w-0">
					<p class="section-title">Commission</p>
					<h2 class="text-lg leading-tight font-semibold text-fg">{building.name}</h2>
					<p class="data mt-1 text-xs text-fg-muted">{money(building.cost)} · {building.days} days</p>
				</div>
			</div>
			<div class="space-y-4 p-4">
				<div>
					<label class="field-label flex items-center gap-1.5" for="civic-region">
						<IconLocation class="size-4 text-fg-muted" /> Region
					</label>
					<SearchSelect
						id="civic-region"
						name="regionId"
						items={data.regions}
						bind:value={regionId}
						showId
						placeholder="Choose a region…"
						searchPlaceholder="Search regions…"
					/>
				</div>

				<!-- What it would really add -->
				<div>
					<div class="flex items-center gap-3">
						<OddsRing
							value={effect.multiplier}
							color="var(--color-positive)"
							dim={!region}
							size={64}
							textClass="text-sm"
							label="Effect after saturation"
						/>
						<div class="min-w-0">
							<p class="data text-2xl leading-none text-positive-fg">+{fmt(effect.effective)}</p>
							<p class="mt-1 text-xs text-fg-muted">
								{#if !region}
									opinion · pick a region
								{:else if existing}
									{effect.value} × {pct(effect.multiplier)}: the region's civic building no. {existing + 1}
								{:else}
									full value: the first civic building there
								{/if}
							</p>
							{#if watchedRow}
								<p class="data mt-0.5 text-[11px] text-fg-faint">
									opinion {watchedRow.opinion} → {Math.min(100, Math.round(watchedRow.opinion + effect.effective))}
								</p>
							{/if}
						</div>
					</div>
					<div class="mt-3" aria-label="Value of each civic building in this region">
						<div class="flex h-10 items-end gap-1">
							{#each slots as s (s.i)}
								<span
									class="flex-1 rounded-t-sm transition-colors {s.state === 'taken'
										? 'bg-fg-faint/40'
										: s.state === 'next'
											? 'bg-positive'
											: 'bg-surface-7'}"
									style:height="{Math.max(8, s.m * 100)}%"
									title="Building {s.i + 1}: {pct(s.m)}"
								></span>
							{/each}
						</div>
						<p class="mt-1 text-[10px] leading-snug text-fg-faint">
							Each civic building in a region counts {pct(data.saturation.DECAY)} of the one before (never below {pct(
								data.saturation.FLOOR
							)}). Expanding is often worth more than another building.
						</p>
					</div>
				</div>

				{#if blocked && region}
					<p class="text-xs text-warning">{blocked}</p>
				{/if}
				<Button type="submit" variant="primary" block loading={funding} disabled={!!blocked} icon={IconRibbon}>
					Fund · {money(building.cost)}
				</Button>
			</div>
		</form>
	</div>

	<!-- Your buildings -->
	<section class="mt-8" aria-labelledby="mine-title">
		<h2 id="mine-title" class="section-title mb-2">
			Your buildings
			<span class="h-px flex-1 bg-line/15"></span>
			<span class="data normal-case tracking-normal text-fg-faint">{data.projects.length}</span>
		</h2>
		{#if !data.projects.length}
			<EmptyState title="Nothing built yet" subtitle="Fund a water works or a clinic to start buying goodwill." />
		{:else}
			<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.projects as project (project.id)}
					<li class="min-w-0">
						<CivicProjectCard
							{project}
							wallet={data.walletBalance}
							plaqueCost={data.dedication.COST}
							plaqueMax={data.dedication.MAX_LENGTH}
							plaqueBonus={data.dedication.OPINION}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Goodwill per region -->
		<section class="min-w-0" aria-labelledby="regions-title">
			<h2 id="regions-title" class="section-title mb-2">
				<IconPeople class="size-4" /> Goodwill by region
				<span class="h-px flex-1 bg-line/15"></span>
			</h2>
			{#if !data.goodwillView.length}
				<p class="panel p-4 text-sm text-fg-muted">Settle somewhere or fund a building to follow a region's mood.</p>
			{:else}
				<ul class="panel divide-y divide-line/10">
					{#each data.goodwillView as row (row.regionId)}
						{@const t = tone(row.opinion)}
						<li class="p-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<a
										href="/region/{row.regionId}"
										class="flex items-center gap-1.5 text-sm font-medium text-fg hover:text-primary-fg"
									>
										{#if row.home}<IconHome class="size-4 shrink-0 text-primary-fg" />{/if}
										<span class="truncate">{row.name}</span>
									</a>
									<p class="truncate text-[11px] text-fg-faint">
										{#if row.stateId}
											<a href="/state/{row.stateId}" class="hover:text-primary-fg">{row.stateName}</a>
										{:else}
											Unclaimed
										{/if}
										· {row.buildings} civic building{row.buildings === 1 ? "" : "s"}
									</p>
								</div>
								<div class="shrink-0 text-right">
									<p class="data text-sm {t.text}">{row.opinion}<span class="text-fg-faint">/100</span></p>
									<p class="data text-[11px] text-positive-fg">
										{row.mine ? `+${fmt(row.mine)} yours` : "none yours"}
									</p>
								</div>
							</div>
							<div class="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-4">
								<div
									class="h-full rounded-full transition-[width] duration-700 {t.bar}"
									style:width="{row.opinion}%"
								></div>
								{#if row.mine}
									<div
										class="absolute inset-y-0 rounded-r-full bg-warning/80"
										style:left="{Math.max(0, row.opinion - row.mine)}%"
										style:width="{Math.min(row.mine, row.opinion)}%"
										title="Your share"
									></div>
								{/if}
								<span class="absolute inset-y-0 left-1/2 w-px bg-fg/30" title="Neutral (50)"></span>
							</div>
							<p class="mt-1 text-[10px] text-fg-faint">
								Next civic building here counts <span class="data">{pct(row.nextMultiplier)}</span>
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- History -->
		<section class="min-w-0" aria-labelledby="history-title">
			<h2 id="history-title" class="section-title mb-2">
				<IconHistory class="size-4" /> History
				<span class="h-px flex-1 bg-line/15"></span>
			</h2>
			{#if !data.history.length}
				<p class="panel p-4 text-sm text-fg-muted">Your first donation will start the record.</p>
			{:else}
				<ol class="panel relative space-y-3 p-4">
					<span class="absolute top-6 bottom-6 left-[1.9rem] w-px bg-line/15" aria-hidden="true"></span>
					{#each data.history as event, i (`${event.projectId}-${event.kind}-${i}`)}
						{@const Icon = HISTORY_ICON[event.kind]}
						{@const future = new Date(event.at).getTime() > data.now}
						<li class="relative flex items-start gap-3" class:opacity-70={future}>
							<span class="grid size-7 shrink-0 place-items-center rounded-full {HISTORY_TINT[event.kind]}">
								<Icon class="size-4" />
							</span>
							<div class="min-w-0 pt-0.5">
								<p class="text-sm leading-snug text-fg">{event.text}</p>
								<p class="data text-[11px] text-fg-faint">{future ? "due " : ""}{dtgDate(event.at)}</p>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</PageContainer>
