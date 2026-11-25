<!-- src/routes/(authenticated)/(dock)/civic/+page.svelte -->
<!-- Patronage: the oligarch's ledger across every region. A hero with the
     patron's standing, stat tiles, every building paid for (each links to its
     region's patronage page, where funding, expansions and plaques happen),
     goodwill per region and a timeline of everything paid for. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge, Button, OddsRing } from "#lib/component/ui/index.js";
	import { dtgDate } from "#lib/utils/dtg.js";
	import CivicArt from "#lib/component/civic/CivicArt.svelte";
	import CivicProjectCard from "#lib/component/civic/CivicProjectCard.svelte";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconSparkle from "~icons/fluent/sparkle-20-regular";
	import IconBuilding from "~icons/fluent/building-multiple-20-regular";
	import IconMap from "~icons/fluent/map-20-regular";
	import IconMoney from "~icons/fluent/money-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconHome from "~icons/fluent/home-20-regular";
	import IconTrophy from "~icons/fluent/trophy-20-regular";
	import IconRibbon from "~icons/fluent/ribbon-20-regular";
	import IconCheck from "~icons/fluent/checkmark-circle-20-regular";
	import IconExpand from "~icons/fluent/arrow-circle-up-20-regular";
	import IconPlaque from "~icons/fluent/signature-20-regular";
	import IconWrench from "~icons/fluent/wrench-20-regular";
	import IconPeople from "~icons/fluent/people-community-20-regular";

	let { data } = $props();

	// ── Derived figures ───────────────────────────────────────────────────
	const underWay = $derived(data.projects.filter((p) => !p.completedAt || p.upgradeCompletesAt).length);
	const landmarks = $derived(data.projects.filter((p) => p.tier >= 3).length);
	const plaques = $derived(data.projects.filter((p) => p.plaque).length);
	const homeHref = $derived(data.homeRegionId != null ? `/region/${data.homeRegionId}/patronage` : null);

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
			{#if homeHref}
				<Button href={homeHref} variant="primary" icon={IconRibbon} class="w-full sm:w-auto">
					Fund in {data.homeRegionName}
				</Button>
			{/if}
		</div>
		<p class="relative border-t border-line/15 px-4 py-2 text-[11px] text-fg-muted sm:px-6">
			Commission, expand and name buildings on a region's <span class="text-fg">Patronage</span> page: open any region and
			follow its patronage card.
		</p>
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

	<!-- Your buildings -->
	<section class="mt-8" aria-labelledby="mine-title">
		<h2 id="mine-title" class="section-title mb-2">
			Your buildings
			<span class="h-px flex-1 bg-line/15"></span>
			<span class="data normal-case tracking-normal text-fg-faint">{data.projects.length}</span>
		</h2>
		{#if !data.projects.length}
			<EmptyState
				title="Nothing built yet"
				subtitle="Open a region and fund a water works or a clinic on its patronage page to start buying goodwill."
			/>
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
							manage={false}
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
										href="/region/{row.regionId}/patronage"
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
