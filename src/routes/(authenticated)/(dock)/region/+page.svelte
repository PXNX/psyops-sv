<!-- src/routes/(authenticated)/(dock)/region/+page.svelte -->
<!-- The regions as an atlas gazetteer: coat of arms, name, owning state and
     the figure the list is sorted by. -->
<script lang="ts">
	import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let searchInput = $state(data.search);
	let selectedSort = $state(data.sortBy);

	const sortOptions = [
		{ value: "rating", label: "Rating" },
		{ value: "population", label: "Population" },
		{ value: "infrastructure", label: "Infrastructure" },
		{ value: "economy", label: "Economy" },
		{ value: "education", label: "Education" },
		{ value: "hospitals", label: "Hospitals" },
		{ value: "fortifications", label: "Fortifications" },
		{ value: "oil", label: "Oil" },
		{ value: "aluminium", label: "Aluminium" },
		{ value: "rubber", label: "Rubber" },
		{ value: "tungsten", label: "Tungsten" },
		{ value: "steel", label: "Steel" },
		{ value: "chromium", label: "Chromium" }
	] as const;
	type SortKey = (typeof sortOptions)[number]["value"];

	const RESOURCES = ["oil", "steel", "chromium", "tungsten", "rubber", "aluminium"] as const;

	function applySort() {
		const params = new URLSearchParams();
		if (selectedSort) params.set("sort", selectedSort);
		goto(`/region?${params.toString()}`);
	}

	// Region names live in the translations, so search them here.
	const filtered = $derived.by(() => {
		const q = (searchInput ?? "").trim().toLowerCase();
		const named = data.regions.map((r) => ({ ...r, name: getRegionName(r.id) }));
		return q ? named.filter((r) => r.name.toLowerCase().includes(q) || r.stateName?.toLowerCase().includes(q)) : named;
	});

	const sortLabel = $derived(sortOptions.find((o) => o.value === selectedSort)?.label ?? "Rating");
	const sortValue = (r: (typeof data.regions)[number]) => Number(r[(selectedSort as SortKey) ?? "rating"] ?? 0);
</script>

<PageContainer maxWidth="6xl">
	<PageHeader title="Regions" subtitle="{data.regions.length} regions" />

	<div class="flex flex-col sm:flex-row gap-3">
		<div class="flex-1 relative">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-fg-muted" />
			<input
				type="text"
				bind:value={searchInput}
				placeholder="Find a region or state…"
				aria-label="Search regions"
				class="field-control w-full rounded-sm pl-11 pr-10 py-2.5"
			/>
			{#if searchInput}
				<button
					type="button"
					onclick={() => (searchInput = "")}
					aria-label="Clear search"
					class="tap-target absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-fg-muted hover:text-fg"
				>
					<FluentDismiss20Filled class="size-4" />
				</button>
			{/if}
		</div>
		<select
			bind:value={selectedSort}
			onchange={applySort}
			aria-label="Sort regions"
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			{#each sortOptions as option (option.value)}
				<option value={option.value}>By {option.label.toLowerCase()}</option>
			{/each}
		</select>
	</div>

	{#if filtered.length === 0}
		<EmptyState icon={FluentGlobe20Filled} title="No region by that name" />
	{:else}
		<section class="panel rounded-sm overflow-hidden">
			<div
				class="flex items-center gap-3 border-b border-line/15 bg-surface-4/70 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-fg-muted"
			>
				<span class="w-7 text-right">No.</span>
				<span class="flex-1">Region</span>
				<span class="w-20 text-right">{sortLabel}</span>
			</div>
			<ol class="divide-y divide-line/10">
				{#each filtered as region, i (region.id)}
					{@const resources = RESOURCES.filter((k) => region[k])}
					<li>
						<a
							href="/region/{region.id}"
							class="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-primary/5"
						>
							<span class="w-7 shrink-0 text-right font-mono text-xs text-fg-muted">{i + 1}</span>
							<img
								loading="lazy"
								decoding="async"
								src={regionCoatUrl(region.id)}
								alt=""
								class="size-10 shrink-0 object-contain transition-transform group-hover:-translate-y-0.5"
							/>
							<div class="min-w-0 flex-1">
								<p class="flex items-center gap-2">
									<span
										class="truncate font-serif font-bold text-fg group-hover:text-primary-hover transition-colors"
										>{region.name}</span
									>
									{#if data.userRegionIds.includes(region.id)}
										<Badge tone="green" size="xs">Home</Badge>
									{/if}
								</p>
								<p class="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
									{#if region.stateName}
										<span class="truncate">{region.stateName}</span>
									{:else}
										<span class="text-primary-fg">Independent</span>
									{/if}
									<span class="flex items-center gap-1"
										><FluentPeople20Filled class="size-3 text-friendly" />{region.population.toLocaleString()}</span
									>
									{#each resources as k (k)}
										<span class="hidden capitalize text-fg-soft sm:inline">· {k} {region[k]}</span>
									{/each}
								</p>
							</div>
							<span class="w-20 shrink-0 text-right font-mono text-sm font-bold text-fg">
								{sortValue(region).toLocaleString()}
							</span>
						</a>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</PageContainer>
