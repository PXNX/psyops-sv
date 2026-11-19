<!-- src/routes/(authenticated)/(dock)/market/+page.svelte -->
<!-- The market: the biggest movers on a large chart, then every commodity
     with its last price, 24h move and a week sparkline. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PriceChart from "./PriceChart.svelte";
	import Sparkline from "./Sparkline.svelte";
	import { DAY, HOUR, money, type SeriesPoint } from "./series";

	let { data } = $props();

	const all = $derived(data.groups.flatMap((g) => g.quotes));

	// Ranked by the size of the 24h move; items that only moved over the week follow.
	const movers = $derived(
		all
			.filter((q) => q.week.length > 0)
			.sort((a, b) => {
				const score = (q: (typeof all)[number]) =>
					q.change24h !== null ? 1000 + Math.abs(q.change24h) : Math.abs(q.change7d ?? 0);
				return score(b) - score(a);
			})
			.slice(0, 4)
	);

	let picked = $state<string | null>(null);
	const hero = $derived(movers.find((m) => m.name === picked) ?? movers[0] ?? null);
	let hover = $state<SeriesPoint | null>(null);
	const heroPrice = $derived(hover?.price ?? hero?.last ?? null);

	const now = $derived(data.now);
	// Zoom to the traded part of the week so a young market isn't a dot at the edge.
	const heroStart = $derived(
		hero?.week.length ? Math.min(Math.max(now - 7 * DAY, hero.week[0].t), now - 6 * HOUR) : now - 7 * DAY
	);
	const weekTime = (t: number) =>
		new Date(t).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
	const weekAxis = $derived((t: number) =>
		now - heroStart < 2 * DAY
			? new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
			: new Date(t).toLocaleDateString(undefined, { weekday: "short" })
	);
</script>

{#snippet change(pct: number | null, label?: string)}
	{#if pct !== null}
		<span
			class="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums {pct >=
			0
				? 'bg-success/15 text-positive-fg'
				: 'bg-error/10 text-hostile-fg'}"
		>
			{pct >= 0 ? "▲" : "▼"}
			{Math.abs(pct).toFixed(1)}%{#if label}<span class="font-sans font-normal opacity-70">{label}</span>{/if}
		</span>
	{/if}
{/snippet}

<PageContainer maxWidth="6xl">
	<PageHeader title="Market">
		{#snippet actions()}
			<div class="panel-muted rounded-sm px-3 py-2 text-right">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Cash</p>
				<p class="text-sm sm:text-base font-bold text-fg font-mono">${data.wallet.balance.toLocaleString()}</p>
			</div>
		{/snippet}
	</PageHeader>

	{#if hero}
		<section class="panel rounded-sm overflow-hidden">
			<div class="px-4 pt-4 sm:px-5 sm:pt-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
				<a href="/market/{hero.name}" class="group flex items-center gap-3 min-w-0">
					<span class="size-12 shrink-0 flex items-center justify-center rounded-sm panel-muted">
						<ResourceIcon name={hero.name} class="size-7" />
					</span>
					<span class="min-w-0">
						<span
							class="block font-sans text-lg sm:text-xl font-semibold capitalize text-fg group-hover:text-primary-fg transition-colors truncate"
							>{hero.name}</span
						>
						<span class="flex items-center gap-2">
							{#key heroPrice}
								<span class="animate-tick font-mono text-lg font-bold tabular-nums text-fg"
									>{heroPrice !== null ? money(heroPrice) : "—"}</span
								>
							{/key}
							{#if hover}
								<span class="font-mono text-xs text-fg-muted">{weekTime(hover.t)}</span>
							{:else}
								{@render change(hero.change24h ?? hero.change7d, hero.change24h !== null ? "24h" : "7d")}
							{/if}
						</span>
					</span>
				</a>
				{#if movers.length > 1}
					<div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Movers">
						{#each movers as m (m.name)}
							{@const on = m.name === hero.name}
							{@const pct = m.change24h ?? m.change7d}
							<button
								type="button"
								role="tab"
								aria-selected={on}
								class="tap-target press-spring flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors {on
									? 'border-primary/40 bg-primary/15 text-primary-fg'
									: 'border-white/10 bg-white/[0.03] text-fg-soft hover:border-white/20 hover:text-fg'}"
								onclick={() => {
									picked = m.name;
									hover = null;
								}}
							>
								<ResourceIcon name={m.name} class="size-4" />
								<span class="capitalize">{m.name}</span>
								{#if pct !== null}
									<span class="font-mono tabular-nums {pct >= 0 ? 'text-positive' : 'text-hostile'}"
										>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span
									>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<div class="mt-2 px-1 sm:px-2 pb-2">
				{#key hero.name}
					<div class="animate-rise-in">
						<PriceChart
							points={hero.week}
							start={heroStart}
							end={now}
							height={220}
							formatTime={hover ? weekTime : weekAxis}
							bind:active={hover}
						/>
					</div>
				{/key}
			</div>
		</section>
	{/if}

	<div class="grid gap-x-5 gap-y-6 lg:grid-cols-2 items-start">
		{#each data.groups as group}
			<section class="min-w-0">
				<h2 class="section-title mb-2 px-1">{group.title}</h2>
				<ul class="panel rounded-sm p-1.5">
					{#each group.quotes as q, i (q.name)}
						{@const price = q.last ?? q.ask}
						<li class="animate-rise-in" style="--rise-delay: {i * 35}ms">
							<a
								href="/market/{q.name}"
								class="group press-spring flex items-center gap-3 rounded-sm px-2.5 py-2.5 hover:bg-white/[0.04] transition-colors"
								style="--press-scale: 0.985"
							>
								<span
									class="size-10 shrink-0 flex items-center justify-center rounded-sm bg-white/[0.04] border border-white/10 transition-colors group-hover:border-primary/45"
								>
									<ResourceIcon name={q.name} class="size-6" />
								</span>
								<span class="min-w-0 flex-1">
									<span
										class="block text-sm font-semibold capitalize text-fg group-hover:text-primary-fg transition-colors truncate"
										>{q.name}</span
									>
									<span class="block text-xs text-fg-muted truncate">
										{#if q.held}<span class="font-mono text-fg-soft">{q.held.toLocaleString()}</span> held{/if}
										{#if q.held && q.unitsOnOffer}·{/if}
										{#if q.unitsOnOffer}<span class="font-mono">{q.unitsOnOffer.toLocaleString()}</span> on offer{/if}
										{#if !q.held && !q.unitsOnOffer}No asks{/if}
									</span>
								</span>
								<Sparkline prices={q.week.map((p) => p.price)} class="h-8 w-14 sm:w-24 shrink-0" />
								<span class="w-[5.5rem] shrink-0 text-right">
									{#if price !== null}
										<span class="block font-mono text-sm font-bold tabular-nums text-fg">{money(price)}</span>
										{#if q.change24h !== null}
											<span
												class="block font-mono text-xs tabular-nums {q.change24h >= 0
													? 'text-positive'
													: 'text-hostile'}"
											>
												{q.change24h >= 0 ? "▲" : "▼"}
												{Math.abs(q.change24h).toFixed(1)}%
											</span>
										{:else if q.last === null}
											<span class="block text-[11px] text-fg-muted">ask</span>
										{/if}
									{:else}
										<span class="text-xs text-fg-muted">—</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</PageContainer>
