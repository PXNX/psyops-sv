<!-- src/routes/(authenticated)/(dock)/state/[id]/civilians/+page.svelte -->
<!-- Civilian population by region, its recent trend, and the opinion those
     civilians hold of this state and of foreign states. -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { formatDate, getRegionName } from "#lib/utils/formatting.js";
	import { DISEASES, DISEASE_COUNTERMEASURES, formatPopulation, STANCE_TONE, stanceLabel } from "#lib/config/index.js";

	import IntelValue from "#lib/component/intel/IntelValue.svelte";
	import IntelNote from "#lib/component/intel/IntelNote.svelte";
	import type { Estimate } from "#lib/utils/intel-estimate.js";

	let { data } = $props();
	const exact = $derived(data.intel.exact);
	/** Growth is positive unless the shown figure says otherwise. */
	const growing = (e: Estimate) => e.kind === "hidden" || e.value >= 0;

	const stanceTone = (stance: number) => STANCE_TONE[stanceLabel(stance)];
	const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

	let regionQuery = $state("");
	let stanceQuery = $state("");
	const matches = (name: string, query: string) => name.toLowerCase().includes(query.trim().toLowerCase());
	const filteredRegions = $derived(data.regions.filter((r) => matches(`${r.name} #${r.id}`, regionQuery)));
	const filteredAbout = $derived(data.stancesAbout.filter((s) => matches(s.name, stanceQuery)));
	const filteredHeld = $derived(data.stancesHeld.filter((s) => matches(s.name, stanceQuery)));
</script>

<!-- A stat-card figure: formatted as before when exact, an estimate otherwise. -->
{#snippet figure(e: Estimate, tone: string, format: (n: number) => string, unit = "")}
	{#if e.kind === "exact"}
		<p class="mt-0.5 font-mono text-lg font-bold {tone}">{format(e.value)}{unit}</p>
	{:else}
		<IntelValue estimate={e} {unit} variant="block" class="mt-0.5" />
	{/if}
{/snippet}

<svelte:head>
	<title>Civilians · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Civilians"
		subtitle={data.state.name}
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if !exact}
		<IntelNote stateId={data.state.id} group="population" level={data.intel.level} class="mb-4" />
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Total civilians</p>
			{#if data.civilians.kind === "exact"}
				<p class="mt-1 font-mono text-3xl font-bold text-fg">{data.civilians.value.toLocaleString()}</p>
			{:else}
				<IntelValue estimate={data.civilians} variant="block" class="mt-1" />
			{/if}
			<p class="mt-1 text-xs text-fg-muted">Non-player inhabitants of this state's regions.</p>
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Population trend</p>
			{#if data.trend}
				<Sparkline
					values={data.trend}
					label="Civilian population of {data.state.name} over the last 90 days"
					color="var(--color-positive)"
				/>
				<p class="mt-1 text-xs text-fg-muted">Recorded by the daily world snapshots.</p>
			{:else}
				<p class="text-xs text-fg-muted">
					The daily census is kept by {data.state.name} and isn't known abroad.
				</p>
			{/if}
		</div>
	</div>

	<!-- Vital rates and the forces behind them -->
	<section class="panel animate-rise-in rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Vital rates &amp; national service</h2>
			<span
				class="flex items-center gap-1 font-mono text-xs {growing(data.demographics.annualRate)
					? 'text-positive-fg'
					: 'text-hostile-fg'}"
			>
				{#if data.demographics.annualRate.kind === "exact"}
					{data.demographics.annualRate.value > 0 ? "+" : ""}{data.demographics.annualRate.value.toFixed(1)}%
				{:else}
					<IntelValue estimate={data.demographics.annualRate} unit="%" />
				{/if}
				/ year
			</span>
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Fertility</p>
				{@render figure(data.demographics.fertility, "text-positive-fg", (n) => n.toFixed(1))}
				<p class="text-[10px] text-fg-muted">births per 1k a year</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Mortality</p>
				{@render figure(data.demographics.mortality, "text-hostile-fg", (n) => n.toFixed(1))}
				<p class="text-[10px] text-fg-muted">deaths per 1k a year</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Workforce</p>
				{@render figure(data.workforce, "text-fg", formatPopulation)}
				<p class="text-[10px] text-fg-muted">civilians available for jobs</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Manpower for war</p>
				{@render figure(data.manpower.available, "text-fg", formatPopulation)}
				<p class="text-[10px] text-fg-muted">
					{data.manpower.regime} ·
					{#if exact && data.manpower.underArms.kind === "exact" && data.manpower.perThousand.kind === "exact"}
						{formatPopulation(data.manpower.underArms.value)} under arms · {data.manpower.perThousand.value}/1k
					{:else}
						<IntelValue estimate={data.manpower.underArms} /> under arms
					{/if}
				</p>
			</div>
		</div>

		<div class="rounded-sm border border-line/20">
			<div
				class="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted"
			>
				<span>What moves the population</span><span class="text-right">People / year</span>
			</div>
			{#each data.demographics.contributions as contribution (contribution.label)}
				<div class="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line/10 px-3 py-1.5 text-sm last:border-0">
					<span class="text-fg-soft">{contribution.label}</span>
					{#if contribution.value.kind === "exact"}
						<span class="text-right font-mono {contribution.value.value >= 0 ? 'text-positive-fg' : 'text-hostile-fg'}">
							{signed(contribution.value.value)}
						</span>
					{:else}
						<IntelValue
							estimate={contribution.value}
							class="justify-end text-right {growing(contribution.value) ? 'text-positive-fg' : 'text-hostile-fg'}"
						/>
					{/if}
				</div>
			{:else}
				<p class="px-3 py-2 text-xs text-fg-muted">No pressures recorded yet.</p>
			{/each}
		</div>
		<p class="text-[11px] text-fg-muted">
			Fertility follows education, the conscription regime and hospital care; mortality follows war, the environment,
			conscription, healthcare shortfalls, hardship and disease. Workforce is set by the share of civilians able to
			work, reduced by the draft and illness.
		</p>
	</section>

	<!-- Disease watch -->
	<section class="panel animate-rise-in rounded-sm p-4 sm:p-5 mt-4 space-y-3" style="--rise-delay: 80ms">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Disease watch</h2>
			<span class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">biological outbreaks</span>
		</div>
		{#if data.outbreaks.length}
			<ul class="space-y-2">
				{#each data.outbreaks as outbreak (outbreak.id)}
					{@const disease = DISEASES[outbreak.diseaseId as keyof typeof DISEASES]}
					<li class="panel-muted flex flex-wrap items-center gap-3 rounded-sm px-3 py-2">
						<span class="text-xl">{disease?.icon ?? "🦠"}</span>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold text-fg">
								{disease?.label ?? outbreak.diseaseId}
								<span class="font-normal text-fg-muted">· {getRegionName(outbreak.regionId)}</span>
							</p>
							<p class="text-[10px] text-fg-muted">
								{disease?.description ?? ""} · {(disease?.spreadRate ?? 0) * 100}% daily spread ·
								{((disease?.mortalityRate ?? 0) * 100).toFixed(2)}% daily mortality
							</p>
						</div>
						<span class="flex items-center gap-1 text-sm text-hostile-fg">
							<IntelValue estimate={outbreak.cases} /> cases
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-fg-muted">
				No active outbreaks. Clean water, food and hospitals are keeping the population healthy.
			</p>
		{/if}
		<div class="border-t border-line/15 pt-3">
			<p class="mb-2 text-[10px] uppercase tracking-wide text-fg-muted">What protects civilians</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each DISEASE_COUNTERMEASURES as measure (measure.label)}
					<div class="flex items-start gap-2 text-xs text-fg-muted">
						<span>{measure.icon}</span>
						<span><strong class="font-medium text-fg">{measure.label}</strong> — {measure.detail}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">By region</h2>
			<input
				type="search"
				bind:value={regionQuery}
				placeholder="Search regions…"
				aria-label="Search regions"
				class="field-control rounded-sm px-2 py-1 text-xs w-48"
			/>
		</div>
		{#if filteredRegions.length}
			<div class="rounded-sm border border-line/20">
				<div
					class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 sm:grid-cols-[1fr_auto_auto_auto] border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted"
				>
					<span class="hidden sm:block">Region</span><span class="text-right">Civilians</span><span class="text-right">
						/km²
					</span><span class="text-right"> Workers </span>
				</div>
				{#each filteredRegions as region (region.id)}
					<div
						class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 sm:grid-cols-[1fr_auto_auto_auto] border-b border-line/10 px-3 py-2 text-sm last:border-0"
					>
						<a
							href="/region/{region.id}"
							class="col-span-3 flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover sm:col-span-1"
						>
							<Logo src={region.logo} alt="" class="size-6 shrink-0" />
							<span class="min-w-0 truncate">
								{region.name} <span class="text-xs text-fg-faint">#{region.id}</span>
							</span>
						</a>
						{#if region.population.kind === "exact"}
							<span class="text-right font-mono text-fg-soft">{formatPopulation(region.population.value)}</span>
						{:else}
							<IntelValue estimate={region.population} wrap class="justify-end text-right text-fg-soft" />
						{/if}
						<IntelValue estimate={region.density} wrap class="justify-end text-right text-fg-muted" />
						<span
							class="min-w-0 text-right text-fg-muted"
							title={region.workforceShare == null
								? undefined
								: `${(region.workforceShare * 100).toFixed(0)}% of civilians can work`}
						>
							<IntelValue estimate={region.workforce} wrap class="justify-end" />
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<EmptyState
				title={regionQuery ? "No matching regions" : "No regions"}
				subtitle={regionQuery ? "Try a different region name." : "This state does not hold any regions yet."}
			/>
		{/if}
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Civilian Stance</h2>
			<input
				type="search"
				bind:value={stanceQuery}
				placeholder="Search states…"
				aria-label="Search states in civilian stances"
				class="field-control rounded-sm px-2 py-1 text-xs w-48"
			/>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Toward {data.state.name}</h3>
				{#if filteredAbout.length}
					<ul class="divide-y divide-line/10">
						{#each filteredAbout as stance (stance.stateId)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<a
									href="/state/{stance.stateId}"
									class="flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover"
								>
									<Logo src={stance.logo} alt="" class="size-6 shrink-0" />
									<span class="truncate">{stance.name}</span>
								</a>
								<span class="font-mono shrink-0 {STANCE_TONE[stanceLabel(stance.stance)]}">
									{signed(stance.stance)} · {stance.label}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-xs text-fg-muted">No foreign state has drawn a strong reaction yet.</p>
				{/if}
			</div>
			<div>
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">How its civilians see others</h3>
				{#if filteredHeld.length}
					<ul class="divide-y divide-line/10">
						{#each filteredHeld as stance (stance.stateId)}
							<li class="flex items-center justify-between gap-3 py-2 text-sm">
								<a
									href="/state/{stance.stateId}"
									class="flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover"
								>
									<Logo src={stance.logo} alt="" class="size-6 shrink-0" />
									<span class="truncate">{stance.name}</span>
								</a>
								<span class="font-mono shrink-0 {stanceTone(stance.stance)}">
									{signed(stance.stance)} · {stance.label}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-xs text-fg-muted">Neutral toward every state so far.</p>
				{/if}
			</div>
		</div>
		{#if data.bailoutHistory.length}
			<div class="pt-3 border-t border-line/15">
				<h3 class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Recent bailouts received</h3>
				<ul class="space-y-1 text-xs text-fg-body">
					{#each data.bailoutHistory as bailout}
						<li class="flex justify-between gap-3">
							<span class="flex min-w-0 items-center gap-2">
								<Logo src={bailout.logo} alt="" class="size-5 shrink-0" />
								<span class="truncate">{bailout.from} · {formatDate(bailout.date)}</span>
							</span>
							<span class="font-mono text-positive">{bailout.amount.toLocaleString()}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</PageContainer>
