<!-- src/routes/(authenticated)/(dock)/region/[id]/patronage/+page.svelte -->
<!-- Patronage in one region: its civilian opinion and your share of it, a
     gallery of buildings to commission here with a live preview of what one
     would really add (towns notice their first clinic more than their fifth),
     your buildings here with expansions and plaques, every other patron's
     buildings, the arithmetic behind the opinion and the region's record. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge, Button, OddsRing } from "#lib/component/ui/index.js";
	import BackLink from "#lib/component/ui/BackLink.svelte";
	import CivicArt from "#lib/component/civic/CivicArt.svelte";
	import CivicProjectCard from "#lib/component/civic/CivicProjectCard.svelte";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { dtgDate } from "#lib/utils/dtg.js";
	import {
		CIVIC_BUILDINGS,
		CIVIC_TIERS,
		civicNewBuildingEffect,
		civicSaturation,
		isCivicBuildingType,
		type CivicBuildingType
	} from "#lib/config/game/civic.config.js";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconSparkle from "~icons/fluent/sparkle-20-regular";
	import IconBuilding from "~icons/fluent/building-multiple-20-regular";
	import IconMoney from "~icons/fluent/money-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconHome from "~icons/fluent/home-20-regular";
	import IconInfo from "~icons/fluent/info-20-regular";
	import IconRibbon from "~icons/fluent/ribbon-20-regular";
	import IconCheck from "~icons/fluent/checkmark-circle-20-regular";
	import IconExpand from "~icons/fluent/arrow-circle-up-20-regular";
	import IconPlaque from "~icons/fluent/signature-20-regular";
	import IconWrench from "~icons/fluent/wrench-20-regular";
	import IconPeople from "~icons/fluent/people-community-20-regular";
	import IconCalculator from "~icons/fluent/calculator-20-regular";
	import IconStar from "~icons/fluent/star-20-regular";

	let { data } = $props();

	// ── Planner ────────────────────────────────────────────────────────────
	let type = $state<CivicBuildingType>("water_works");
	let funding = $state(false);

	const building = $derived(data.buildings.find((b) => b.type === type) ?? data.buildings[0]!);
	const effect = $derived(civicNewBuildingEffect(type, data.existing));
	const short = $derived(data.walletBalance < building.cost);
	const pending = $derived(data.projects.some((p) => p.mine && p.buildingType === type && !p.completedAt));
	const blocked = $derived(
		pending ? "You already have one of those going up here." : short ? "Your wallet can't cover it." : null
	);
	// The saturation curve for this region, slot by slot.
	const SLOTS = 6;
	const slots = $derived(
		Array.from({ length: Math.max(SLOTS, data.existing + 1) }, (_, i) => ({
			i,
			m: civicSaturation(i),
			state: i < data.existing ? "taken" : i === data.existing ? "next" : "free"
		}))
	);

	const mine = $derived(data.projects.filter((p) => p.mine));
	const others = $derived(data.projects.filter((p) => !p.mine));
	const affordable = $derived(data.buildings.filter((b) => b.cost <= data.walletBalance).length);
	const opinion = $derived(data.opinion.score);

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
	const t = $derived(tone(opinion));
	const buildingName = (type: string) => (isCivicBuildingType(type) ? CIVIC_BUILDINGS[type].name : type);

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
	<title>Patronage · {data.region.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<BackLink href="/region/{data.region.id}" label={data.region.name} />

	<!-- Hero: the region's mood and your part in it -->
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
			<OddsRing value={opinion / 100} color="var(--color-positive)" size={84} label="Civilian opinion">
				<span class="flex flex-col items-center leading-none">
					<span class="data text-lg {t.text}">{opinion}</span>
					<span class="mt-0.5 text-[9px] tracking-wide text-fg-faint uppercase">opinion</span>
				</span>
			</OddsRing>
			<div class="min-w-0 flex-1">
				<p class="section-title">Patronage</p>
				<h1 class="mt-1 font-serif text-2xl leading-tight font-bold text-fg sm:text-3xl">{data.region.name}</h1>
				<p class="mt-1 text-sm text-fg-muted">
					{#if data.region.stateId}
						<a href="/state/{data.region.stateId}" class="hover:text-primary-fg">{data.region.stateName}</a>
					{:else}
						Unclaimed
					{/if}
					· {data.existing} civic building{data.existing === 1 ? "" : "s"}
				</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<Badge tone="green" icon={IconWallet}>{money(data.walletBalance)} in wallet</Badge>
					{#if data.region.home}
						<Badge tone="blue" icon={IconHome}>Your home</Badge>
					{/if}
					<a href="/civic" class="contents">
						<Badge tone="amber" icon={IconStar}>Your patronage</Badge>
					</a>
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
				<dt class="section-title">Your goodwill</dt>
				<dd class="data text-lg text-positive-fg">+{fmt(data.myGoodwill)}</dd>
				<dd class="truncate text-[11px] text-fg-faint">of +{fmt(data.civicTotal)} from patrons</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
				<IconBuilding class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Yours here</dt>
				<dd class="data text-lg text-fg">
					{mine.length}<span class="text-sm text-fg-faint">/{data.projects.length}</span>
				</dd>
				<dd class="truncate text-[11px] text-fg-faint">civic buildings</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-fg">
				<IconRibbon class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Next counts</dt>
				<dd class="data text-lg text-fg">{pct(data.nextMultiplier)}</dd>
				<dd class="truncate text-[11px] text-fg-faint">of its full value</dd>
			</div>
		</div>
		<div class="panel flex items-center gap-3 p-3">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-politics-bg/25 text-fg">
				<IconPeople class="size-5" />
			</span>
			<div class="min-w-0">
				<dt class="section-title">Patrons</dt>
				<dd class="data text-lg text-fg">{new Set(data.projects.map((p) => p.patron.id)).size}</dd>
				<dd class="truncate text-[11px] text-fg-faint">have built here</dd>
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
									+{fmt(civicNewBuildingEffect(item.type, data.existing).effective)}
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
				{#each data.tiers as tier (tier.tier)}
					<div class="rounded-sm border border-line/15 bg-surface-2 px-2 py-2">
						<p class="text-xs font-medium text-fg">{tier.label}</p>
						<p class="data text-[11px] text-positive-fg">×{tier.opinionMult} opinion</p>
						<p class="data text-[10px] text-fg-faint">
							{tier.tier === 1 ? "base price" : `expand for ${pct(tier.costMult)}`}
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
					<p class="section-title">Commission in {data.region.name}</p>
					<h2 class="text-lg leading-tight font-semibold text-fg">{building.name}</h2>
					<p class="data mt-1 text-xs text-fg-muted">{money(building.cost)} · {building.days} days</p>
				</div>
			</div>
			<div class="space-y-4 p-4">
				<!-- What it would really add -->
				<div>
					<div class="flex items-center gap-3">
						<OddsRing
							value={effect.multiplier}
							color="var(--color-positive)"
							size={64}
							textClass="text-sm"
							label="Effect after saturation"
						/>
						<div class="min-w-0">
							<p class="data text-2xl leading-none text-positive-fg">+{fmt(effect.effective)}</p>
							<p class="mt-1 text-xs text-fg-muted">
								{#if data.existing}
									{effect.value} × {pct(effect.multiplier)}: the region's civic building no. {data.existing + 1}
								{:else}
									full value: the first civic building here
								{/if}
							</p>
							<p class="data mt-0.5 text-[11px] text-fg-faint">
								opinion {opinion} → {Math.min(100, Math.round(data.opinion.raw + effect.effective))}
							</p>
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

				{#if blocked}
					<p class="text-xs text-warning">{blocked}</p>
				{/if}
				<Button type="submit" variant="primary" block loading={funding} disabled={!!blocked} icon={IconRibbon}>
					Fund · {money(building.cost)}
				</Button>
			</div>
		</form>
	</div>

	<!-- Your buildings here -->
	<section class="mt-8" aria-labelledby="mine-title">
		<h2 id="mine-title" class="section-title mb-2">
			Your buildings here
			<span class="h-px flex-1 bg-line/15"></span>
			<span class="data normal-case tracking-normal text-fg-faint">{mine.length}</span>
		</h2>
		{#if !mine.length}
			<EmptyState
				title="Nothing of yours here yet"
				subtitle="Fund a water works or a clinic above to start buying goodwill in {data.region.name}."
			/>
		{:else}
			<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each mine as project (project.id)}
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
		<div class="min-w-0 space-y-6">
			<!-- Other patrons -->
			<section aria-labelledby="others-title">
				<h2 id="others-title" class="section-title mb-2">
					<IconPeople class="size-4" /> Other patrons
					<span class="h-px flex-1 bg-line/15"></span>
					<span class="data normal-case tracking-normal text-fg-faint">{others.length}</span>
				</h2>
				{#if !others.length}
					<p class="panel p-4 text-sm text-fg-muted">Nobody else has built here yet.</p>
				{:else}
					<ul class="panel divide-y divide-line/10">
						{#each others as p (p.id)}
							<li class="flex items-center gap-3 p-3">
								<span class="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-2">
									<CivicArt
										kind="building"
										variant={p.buildingType}
										tier={p.tier}
										class="size-8"
										label={buildingName(p.buildingType)}
									/>
								</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-fg">
										{buildingName(p.buildingType)}
										<span class="text-xs font-normal text-fg-faint">· {CIVIC_TIERS[p.tier - 1]?.label}</span>
									</p>
									<UserLink id={p.patron.id} name={p.patron.name} avatar={p.patron.logo} size="xs" />
									{#if p.plaque}
										<p class="truncate font-serif text-xs text-fg-muted italic">“{p.plaque}”</p>
									{/if}
								</div>
								<div class="shrink-0 text-right">
									{#if p.completedAt}
										<p class="data text-sm text-positive-fg">+{fmt(p.goodwill)}</p>
										<p class="text-[10px] text-fg-faint">
											{p.multiplier != null && p.multiplier < 1 ? `${p.value} × ${pct(p.multiplier)}` : "goodwill"}
										</p>
									{:else}
										<p class="data text-sm text-fg-muted">+{p.value}</p>
										<p class="text-[10px] text-fg-faint">opens {dtgDate(p.completesAt)}</p>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Opinion breakdown -->
			<section aria-labelledby="opinion-title">
				<h2 id="opinion-title" class="section-title mb-2">
					<IconCalculator class="size-4" /> Civilian opinion
					<span class="h-px flex-1 bg-line/15"></span>
					<span class="data normal-case tracking-normal {t.text}">{opinion}/100</span>
				</h2>
				<div class="panel p-3">
					<div class="relative h-2 overflow-hidden rounded-full bg-surface-4">
						<div class="h-full rounded-full transition-[width] duration-700 {t.bar}" style:width="{opinion}%"></div>
						{#if data.myGoodwill}
							<div
								class="absolute inset-y-0 rounded-r-full bg-warning/80"
								style:left="{Math.max(0, opinion - data.myGoodwill)}%"
								style:width="{Math.min(data.myGoodwill, opinion)}%"
								title="Your share"
							></div>
						{/if}
						<span class="absolute inset-y-0 left-1/2 w-px bg-fg/30" title="Neutral (50)"></span>
					</div>
					<ul class="mt-3 divide-y divide-line/10 text-xs">
						{#each data.opinion.components as c (c.key)}
							<li class="flex items-baseline justify-between gap-3 py-1.5">
								<span class="min-w-0">
									<span class="text-fg">{c.label}</span>
									<span class="block truncate text-[11px] text-fg-faint">{c.detail}</span>
								</span>
								<span
									class="data shrink-0 {c.key === 'base'
										? 'text-fg-muted'
										: c.points < 0
											? 'text-error'
											: 'text-positive-fg'}"
								>
									{c.key === "base" ? "" : c.points >= 0 ? "+" : ""}{fmt(c.points)}
								</span>
							</li>
						{/each}
					</ul>
					<p class="mt-2 text-[10px] leading-snug text-fg-faint">
						Civic buildings count in the order they opened: the first here is worth its full value, each later one {pct(
							data.saturation.DECAY
						)} of the one before, never below {pct(data.saturation.FLOOR)}.
					</p>
				</div>
			</section>
		</div>

		<!-- History -->
		<section class="min-w-0" aria-labelledby="history-title">
			<h2 id="history-title" class="section-title mb-2">
				<IconHistory class="size-4" /> History
				<span class="h-px flex-1 bg-line/15"></span>
			</h2>
			{#if !data.history.length}
				<p class="panel p-4 text-sm text-fg-muted">No patron has built here yet.</p>
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
								<p class="text-sm leading-snug break-words {event.mine ? 'text-fg' : 'text-fg-muted'}">{event.text}</p>
								<p class="data text-[11px] text-fg-faint">{future ? "due " : ""}{dtgDate(event.at)}</p>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</PageContainer>
