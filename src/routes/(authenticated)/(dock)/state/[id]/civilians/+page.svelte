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
	import {
		DISEASES,
		DISEASE_COUNTERMEASURES,
		formatPopulation,
		STANCE_TONE,
		stanceLabel
	} from "#lib/config/index.js";

	let { data } = $props();

	const stanceTone = (stance: number) => STANCE_TONE[stanceLabel(stance)];
	const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
	const percent = (n: number) => `${n > 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

	let regionQuery = $state("");
	let stanceQuery = $state("");
	const matches = (name: string, query: string) => name.toLowerCase().includes(query.trim().toLowerCase());
	const filteredRegions = $derived(data.regions.filter((r) => matches(`${r.name} #${r.id}`, regionQuery)));
	const filteredAbout = $derived(data.stancesAbout.filter((s) => matches(s.name, stanceQuery)));
	const filteredHeld = $derived(data.stancesHeld.filter((s) => matches(s.name, stanceQuery)));
</script>

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

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Total civilians</p>
			<p class="mt-1 font-mono text-3xl font-bold text-fg">{data.civilians.toLocaleString()}</p>
			<p class="mt-1 text-xs text-fg-muted">Non-player inhabitants of this state's regions.</p>
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted mb-2">Population trend</p>
			<Sparkline
				values={data.trend}
				label="Civilian population of {data.state.name} over the last 90 days"
				color="var(--color-positive)"
			/>
			<p class="mt-1 text-xs text-fg-muted">Recorded by the daily world snapshots.</p>
		</div>
	</div>

	<!-- Vital rates and the forces behind them -->
	<section class="panel animate-rise-in rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Vital rates &amp; national service</h2>
			<span class="font-mono text-xs {data.demographics.annualRate >= 0 ? 'text-positive-fg' : 'text-hostile-fg'}">
				{percent(data.demographics.annualRate)} / year
			</span>
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Fertility</p>
				<p class="mt-0.5 font-mono text-lg font-bold text-positive-fg">
					{(data.demographics.fertility * 1000).toFixed(1)}<span class="text-xs text-fg-muted"> /1k</span>
				</p>
				<p class="text-[10px] text-fg-muted">births per year</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Mortality</p>
				<p class="mt-0.5 font-mono text-lg font-bold text-hostile-fg">
					{(data.demographics.mortality * 1000).toFixed(1)}<span class="text-xs text-fg-muted"> /1k</span>
				</p>
				<p class="text-[10px] text-fg-muted">deaths per year</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Workforce</p>
				<p class="mt-0.5 font-mono text-lg font-bold text-fg">{formatPopulation(data.workforce)}</p>
				<p class="text-[10px] text-fg-muted">civilians available for jobs</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Manpower for war</p>
				<p class="mt-0.5 font-mono text-lg font-bold text-fg">{formatPopulation(data.manpower.available)}</p>
				<p class="text-[10px] text-fg-muted">{data.manpower.regime} · {formatPopulation(data.manpower.underArms)} under arms · {data.manpower.perThousand}/1k</p>
			</div>
		</div>

		<div class="rounded-sm border border-line/20">
			<div class="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
				<span>What moves the population</span><span class="text-right">People / year</span>
			</div>
			{#each data.demographics.contributions as contribution (contribution.label)}
				<div class="grid grid-cols-[1fr_auto] gap-x-3 border-b border-line/10 px-3 py-1.5 text-sm last:border-0">
					<span class="text-fg-soft">{contribution.label}</span>
					<span class="text-right font-mono {contribution.value >= 0 ? 'text-positive-fg' : 'text-hostile-fg'}">
						{signed(contribution.value)}
					</span>
				</div>
			{:else}
				<p class="px-3 py-2 text-xs text-fg-muted">No pressures recorded yet.</p>
			{/each}
		</div>
		<p class="text-[11px] text-fg-muted">
			Fertility follows education, the conscription regime and hospital care; mortality follows war,
			the environment, conscription, healthcare shortfalls, hardship and disease. Workforce is set by
			the share of civilians able to work, reduced by the draft and illness.
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
						<span class="font-mono text-sm text-hostile-fg">{outbreak.cases.toLocaleString()} cases</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-fg-muted">No active outbreaks. Clean water, food and hospitals are keeping the population healthy.</p>
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
				<div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
					<span>Region</span><span class="text-right">Civilians</span><span class="text-right">/km²</span><span class="text-right">Workers</span>
				</div>
				{#each filteredRegions as region (region.id)}
					<div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0">
						<a href="/region/{region.id}" class="flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover">
							<Logo src={region.logo} alt="" class="size-6 shrink-0" />
							<span class="min-w-0 truncate">{region.name} <span class="text-xs text-fg-faint">#{region.id}</span></span>
						</a>
						<span class="text-right font-mono text-fg-soft">{formatPopulation(region.population)}</span>
						<span class="text-right font-mono text-fg-muted">{region.density}</span>
						<span class="text-right font-mono text-fg-muted" title="{(region.workforceShare * 100).toFixed(0)}% of civilians can work">
							{region.workforce.toLocaleString()}
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
								<a href="/state/{stance.stateId}" class="flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover">
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
								<a href="/state/{stance.stateId}" class="flex min-w-0 items-center gap-2 truncate text-fg hover:text-primary-hover">
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
