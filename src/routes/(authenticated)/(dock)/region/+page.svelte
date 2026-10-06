<!-- src/routes/(authenticated)/(dock)/region/+page.svelte -->
<script lang="ts">
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import * as m from "#lib/paraglide/messages.js";
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
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput);
		if (selectedSort) params.set("sort", selectedSort);
		goto(`/region?${params.toString()}`);
	}

	function handleSortChange(sort: string) {
		selectedSort = sort;
		applyFilters();
	}

	function getRegionName(id: number) {
		const key = `region_${id}`;
		return m[key]();
	}

	function getRegionColor(region: any) {
		return region.stateColor || "#f2b01e";
	}
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader title="All Regions" subtitle="{data.regions.length} regions available" />

	<!-- Search and Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="flex-1 relative">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#a8a083]" />
			<input
				type="text"
				bind:value={searchInput}
				onkeydown={(e) => e.key === "Enter" && applyFilters()}
				placeholder="Search regions..."
				class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
			/>
		</div>

		<!-- Sort Dropdown -->
		<select
			bind:value={selectedSort}
			onchange={() => applyFilters()}
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			{#each sortOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<!-- Regions Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.regions as region}
			<a
				href="/region/{region.id}"
				class="group panel-interactive rounded-sm p-5 relative space-y-3"
				style="border-top: 3px solid {getRegionColor(region)}"
			>
				<!-- Residence Badge -->
				{#if data.userRegionIds.includes(region.id)}
					<div class="absolute top-4 right-4">
						<Badge tone="green" icon={FluentHome20Filled}>Resident</Badge>
					</div>
				{/if}

				<!-- Region Header -->
				<div class="flex items-center gap-3">
					<div
						class="size-14 rounded-sm overflow-hidden shrink-0 flex items-center justify-center"
						style="background-color: {getRegionColor(region)}30;"
					>
						<img src="/coats/{region.id}.svg" alt={getRegionName(region.id)} class="size-12 object-contain" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
							{getRegionName(region.id)}
						</h2>
						<div class="flex items-center gap-2 text-xs text-[#a8a083] mt-0.5">
							<span>#{region.rating || 0}</span>
							{#if region.stateName}
								<span>•</span>
								<span class="truncate">{region.stateName}</span>
							{:else}
								<span class="text-[#ffd35c]">• Independent</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Quick Stats -->
				<div class="grid grid-cols-2 gap-2 text-xs text-[#d3caa9]">
					<div class="flex items-center gap-1">
						<FluentPeople20Filled class="size-3 text-[#5eaef5]" />
						<span>{region.population.toLocaleString()}</span>
					</div>
					<div>
						<span class="text-[#a8a083]">Infrastructure:</span>
						{region.infrastructure || 0}
					</div>
					<div>
						<span class="text-[#a8a083]">Economy:</span>
						{region.economy || 0}
					</div>
					<div>
						<span class="text-[#a8a083]">Education:</span>
						{region.education || 0}
					</div>
				</div>

				<!-- Resources (if any) -->
				{#if region.oil || region.steel || region.chromium || region.tungsten || region.rubber || region.aluminium}
					<div class="pt-3 border-t border-[#c8b47a]/10">
						<div class="flex flex-wrap gap-1">
							{#if region.oil}
								<Badge tone="amber" size="xs">Oil: {region.oil}</Badge>
							{/if}
							{#if region.steel}
								<Badge tone="neutral" size="xs">Steel: {region.steel}</Badge>
							{/if}
							{#if region.chromium}
								<Badge tone="blue" size="xs">Chromium: {region.chromium}</Badge>
							{/if}
							{#if region.tungsten}
								<Badge tone="purple" size="xs">Tungsten: {region.tungsten}</Badge>
							{/if}
						</div>
					</div>
				{/if}
			</a>
		{/each}
	</div>

	<!-- Empty State -->
	{#if data.regions.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#1a1f15] mb-4">
				<FluentSearch20Filled class="size-8 text-[#a8a083]" />
			</div>
			<h2 class="text-xl font-bold text-[#f5efd8] mb-2">No regions found</h2>
			<p class="text-[#a8a083]">Try adjusting your search or filters</p>
		</div>
	{/if}
</PageContainer>
