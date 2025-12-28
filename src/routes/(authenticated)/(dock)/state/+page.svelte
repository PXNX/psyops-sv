<!-- src/routes/(authenticated)/(dock)/state/[id]/region/+page.svelte -->
<script lang="ts">
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let searchInput = $state(data.search);
	let selectedSort = $state(data.sortBy);

	const sortOptions = [
		{ value: "rating", label: "Rating" },
		{ value: "population", label: "Population" }
		// todo: add gdp
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput);
		if (selectedSort) params.set("sort", selectedSort);
		goto(`/state?${params.toString()}`);
	}

	function handleSortChange(sort: string) {
		selectedSort = sort;
		applyFilters();
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">All States</h1>
			<p class="text-gray-400 mt-1">{data.regions.length} states available</p>
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
		<div class="flex flex-col md:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1 relative">
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
				<input
					type="text"
					bind:value={searchInput}
					onkeydown={(e) => e.key === "Enter" && applyFilters()}
					placeholder="Search regions..."
					class="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
				/>
			</div>

			<!-- Sort Dropdown -->
			<div class="flex gap-2">
				<select
					bind:value={selectedSort}
					onchange={() => applyFilters()}
					class="px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
				>
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Regions Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.regions as region}
			<a
				href="/region/{region.id}"
				class="group bg-slate-800 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all overflow-hidden"
			>
				<!-- Region Header with State Color -->
				<div
					class="h-24 relative"
					style="background: linear-gradient(135deg, {getRegionColor(region)}40, {getRegionColor(region)}20)"
				>
					<div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-800" />

					<!-- Region Logo -->
					<div class="absolute bottom-0 left-4 translate-y-1/2">
						<div class="ring-4 ring-slate-800 rounded-xl">
							<img
								src="/coats/{region.id}.svg"
								alt={getRegionName(region.id)}
								class="size-16 rounded-xl object-cover"
							/>
						</div>
					</div>

					<!-- Residence Badge -->
					{#if data.userRegionIds.includes(region.id)}
						<div class="absolute top-3 right-3">
							<div
								class="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-1"
							>
								<FluentHome20Filled class="size-3 text-emerald-400" />
								<span class="text-xs text-emerald-400 font-medium">Resident</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Region Content -->
				<div class="px-4 pt-10 pb-4 space-y-3">
					<!-- Name and Rating -->
					<div>
						<h3 class="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
							{getRegionName(region.id)}
						</h3>
						<div class="flex items-center gap-3 text-sm text-gray-400 mt-1">
							<span>#{region.rating || 0}</span>
							{#if region.stateName}
								<span>•</span>
								<span>{region.stateName}</span>
							{:else}
								<span class="text-amber-400">• Independent</span>
							{/if}
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="flex items-center gap-1 text-gray-400">
							<FluentPeople20Filled class="size-3" />
							<span>{region.population.toLocaleString()}</span>
						</div>
						<div class="text-gray-400">
							Infrastructure: {region.infrastructure || 0}
						</div>
						<div class="text-gray-400">
							Economy: {region.economy || 0}
						</div>
						<div class="text-gray-400">
							Education: {region.education || 0}
						</div>
					</div>

					<!-- Resources (if any) -->
					{#if region.oil || region.steel || region.chromium || region.tungsten || region.rubber || region.aluminium}
						<div class="pt-2 border-t border-white/5">
							<div class="flex flex-wrap gap-1">
								{#if region.oil}
									<span class="px-2 py-0.5 bg-amber-600/20 border border-amber-600/30 rounded text-xs text-amber-400">
										Oil: {region.oil}
									</span>
								{/if}
								{#if region.steel}
									<span class="px-2 py-0.5 bg-gray-600/20 border border-gray-600/30 rounded text-xs text-gray-400">
										Steel: {region.steel}
									</span>
								{/if}
								{#if region.chromium}
									<span class="px-2 py-0.5 bg-blue-600/20 border border-blue-600/30 rounded text-xs text-blue-400">
										Chromium: {region.chromium}
									</span>
								{/if}
								{#if region.tungsten}
									<span
										class="px-2 py-0.5 bg-purple-600/20 border border-purple-600/30 rounded text-xs text-purple-400"
									>
										Tungsten: {region.tungsten}
									</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>

	<!-- Empty State -->
	{#if data.regions.length === 0}
		<div class="text-center py-12">
			<div class="size-20 mx-auto bg-slate-700/30 rounded-full flex items-center justify-center mb-4">
				<FluentSearch20Filled class="size-10 text-gray-500" />
			</div>
			<h3 class="text-xl font-bold text-gray-400 mb-2">No regions found</h3>
			<p class="text-gray-500">Try adjusting your search or filters</p>
		</div>
	{/if}
</div>
