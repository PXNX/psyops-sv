<script lang="ts">
	import WorldMap from "#lib/assets/worldmap3.svg?raw";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { gameDate } from "#lib/utils/game-time.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const selected = $derived(data.selected);
	const regionColors = $derived.by(() => {
		const colors = new Map<number, string>();
		if (!selected) return colors;
		for (const region of selected.regions) {
			if (!region.stateId) continue;
			const bloc = selected.blocs.find((b) => b.memberStateIds.includes(region.stateId));
			colors.set(region.id, bloc?.color ?? "#38bdf8");
		}
		return colors;
	});

	/** Colour the saved world map by who held each region on that day. */
	const historicSvg = $derived.by(() => {
		if (!selected) return WorldMap;
		let svg = WorldMap;
		for (const [id, color] of regionColors) {
			const marker = `id="${id}"`;
			const at = svg.indexOf(marker);
			if (at < 0) continue;
			const open = svg.lastIndexOf("<path", at);
			if (open < 0) continue;
			const end = svg.indexOf(">", at);
			if (end < 0) continue;
			svg = `${svg.slice(0, end)} style="fill:${color};fill-opacity:0.75"${svg.slice(end)}`;
		}
		return svg;
	});

	const stats = $derived(selected ? [...selected.states].sort((a, b) => b.treasury - a.treasury) : []);
	const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n.toLocaleString());
</script>

<svelte:head><title>Historic maps – PsyOps</title></svelte:head>

<PageContainer maxWidth="full" class="space-y-4 py-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="font-serif text-2xl text-heading">Historic maps</h1>
			<p class="text-sm text-fg-muted">A snapshot is taken every day at midnight. Pick a day to see who held what.</p>
		</div>
		{#if selected}
			<Badge tone="blue" size="sm">{gameDate(selected.capturedAt)}</Badge>
		{/if}
	</div>

	<div class="flex gap-2 overflow-x-auto pb-2">
		{#each data.snapshots as snap (snap.id)}
			{@const active = selected?.id === snap.id}
			<a
				href="/map/history?at={snap.capturedAt.toISOString().slice(0, 10)}"
				class="press-spring shrink-0 rounded-sm border px-3 py-1.5 text-xs {active
					? 'border-primary bg-primary/12 text-primary-fg'
					: 'border-line/20 text-fg-muted hover:border-primary/40'}"
			>
				{snap.capturedAt.toISOString().slice(0, 10)}
			</a>
		{/each}
	</div>

	{#if selected}
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<section class="panel overflow-hidden rounded-sm p-2">
				<div class="map-history-svg">{@html historicSvg}</div>
				<div class="flex flex-wrap gap-3 px-2 py-2 text-[11px] text-fg-muted">
					{#each selected.blocs as bloc (bloc.id)}
						<span class="inline-flex items-center gap-1.5">
							<span class="size-2.5 rounded-sm" style="background:{bloc.color}"></span>{bloc.name}
						</span>
					{/each}
				</div>
			</section>

			<section class="panel max-h-[70vh] overflow-y-auto rounded-sm p-3">
				<h2 class="section-title text-base">That day's world</h2>
				{#each stats as state (state.id)}
					<div class="soft-lift mt-2 rounded-sm border border-line/20 p-2 text-xs">
						<div class="flex items-center justify-between gap-2">
							<span class="font-medium text-fg">{state.name}</span>
							<span class="text-fg-muted">{state.regionCount} regions</span>
						</div>
						<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-fg-muted">
							<span><strong class="text-fg">{fmt(state.population)}</strong> people</span>
							<span><strong class="text-fg">{fmt(state.steel)}</strong> steel</span>
							<span><strong class="text-fg">{fmt(state.power)}</strong> power</span>
							<span><strong class="text-fg">{fmt(state.treasury)}</strong> treasury</span>
							<span><strong class="text-fg">{state.army}</strong> units · {state.ships} ships · {state.aircraft} aircraft</span>
						</div>
					</div>
				{/each}
			</section>
		</div>
	{:else}
		<p class="py-10 text-center text-sm text-fg-muted">No snapshots yet. The first one is taken at midnight.</p>
	{/if}
</PageContainer>

<style>
	.map-history-svg :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		max-height: 70vh;
	}
</style>
