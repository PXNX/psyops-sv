<!-- src/routes/(authenticated)/regions/+page.svelte -->
<script lang="ts">
	import { page } from "$app/stores";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";

	let { data } = $props();

	let searchQuery = $state("");
	let sortBy = $state<"population" | "name" | "state">("population");
	let showIndependentOnly = $state(false);

	const isWelcomeFlow = $page.url.searchParams.get("welcome") === "true";

	// Filter and sort regions
	const filteredRegions = $derived(() => {
		let regions = data.regions;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			regions = regions.filter(
				(r) =>
					r.name.toLowerCase().includes(query) ||
					r.state?.name.toLowerCase().includes(query) ||
					r.description?.toLowerCase().includes(query)
			);
		}

		// Independent filter
		if (showIndependentOnly) {
			regions = regions.filter((r) => !r.state);
		}

		// Sort
		regions = [...regions].sort((a, b) => {
			switch (sortBy) {
				case "population":
					return a.populationCount - b.populationCount;
				case "name":
					return a.name.localeCompare(b.name);
				case "state":
					const aState = a.state?.name || "ZZZ"; // Independent regions last
					const bState = b.state?.name || "ZZZ";
					return aState.localeCompare(bState);
				default:
					return 0;
			}
		});

		return regions;
	});

	function formatPopulation(count: number): string {
		if (count >= 1000000) {
			return `${(count / 1000000).toFixed(1)}M`;
		} else if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}K`;
		}
		return count.toString();
	}

	function getPopulationColor(count: number): string {
		if (count === 0) return "text-green-400";
		if (count < 10) return "text-emerald-400";
		if (count < 50) return "text-yellow-400";
		if (count < 100) return "text-orange-400";
		return "text-red-400";
	}

	function getPopulationDensity(count: number): string {
		if (count === 0) return "Uninhabited";
		if (count < 10) return "Very Low";
		if (count < 50) return "Low";
		if (count < 100) return "Moderate";
		if (count < 500) return "High";
		return "Very High";
	}
</script>

<!-- Header -->
<div class="space-y-2">
	<div class="flex items-center gap-3">
		<div class="size-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
			<FluentGlobe20Filled class="size-6 text-white" />
		</div>
		<div>
			<h1 class="text-3xl font-bold text-white">
				{isWelcomeFlow ? "Choose Your Region" : "Available Regions"}
			</h1>
			<p class="text-gray-400">
				{#if isWelcomeFlow}
					Select where you'd like to establish your residence
				{:else if data.hasPrimaryResidence}
					Browse regions to establish additional residences
				{:else}
					You need to select a primary residence to continue
				{/if}
			</p>
		</div>
	</div>

	<!-- User Location Info -->
	{#if data.userLocation}
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<div class="flex items-center gap-2">
				<FluentLocation20Filled class="size-5 text-blue-400" />
				<p class="text-sm text-blue-300">
					<strong>Your location:</strong>
					{data.userLocation.city}, {data.userLocation.country}
					{#if data.nearbyRegions.length > 0}
						• {data.nearbyRegions.length} nearby region{data.nearbyRegions.length !== 1 ? "s" : ""} available
					{/if}
				</p>
			</div>
		</div>
	{/if}
</div>

<!-- Filters & Search -->
<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-4">
	<div class="flex items-center gap-2">
		<FluentFilter20Filled class="size-5 text-purple-400" />
		<h2 class="text-lg font-semibold text-white">Filters & Search</h2>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Search -->
		<div class="md:col-span-2">
			<label for="search" class="sr-only">Search regions</label>
			<div class="relative">
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Search by region name, state, or description..."
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 pl-10"
				/>
			</div>
		</div>

		<!-- Sort -->
		<div>
			<label for="sort" class="sr-only">Sort by</label>
			<div class="relative">
				<FluentArrowSort20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
				<select
					id="sort"
					bind:value={sortBy}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white pl-10"
				>
					<option value="population">Sort by Population (Low to High)</option>
					<option value="name">Sort by Name (A-Z)</option>
					<option value="state">Sort by State</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Toggle Filter -->
	<div class="flex items-center gap-2">
		<input
			type="checkbox"
			id="independentOnly"
			bind:checked={showIndependentOnly}
			class="checkbox checkbox-sm checkbox-primary"
		/>
		<label for="independentOnly" class="text-sm text-gray-300 cursor-pointer">
			Show only independent regions (no state governance)
		</label>
	</div>

	<!-- Results Count -->
	<div class="text-sm text-gray-400">
		Showing {filteredRegions().length} of {data.regions.length} region{data.regions.length !== 1 ? "s" : ""}
	</div>
</div>

<!-- Nearby Regions (Priority) -->
{#if data.nearbyRegions.length > 0 && !searchQuery && !showIndependentOnly}
	<div class="space-y-3">
		<div class="flex items-center gap-2">
			<FluentLocation20Filled class="size-5 text-blue-400" />
			<h2 class="text-lg font-semibold text-white">Recommended for You (Nearby)</h2>
			<span class="badge badge-sm bg-blue-600/20 text-blue-300 border-0">
				{data.nearbyRegions.length}
			</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.nearbyRegions as region (region.id)}
				<a
					href="/regions/{region.id}"
					class="group bg-slate-800/50 border-2 border-blue-500/30 rounded-xl p-5 space-y-3 hover:bg-slate-800/70 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02]"
				>
					<!-- Region Image -->
					{#if region.avatar}
						<div class="aspect-video rounded-lg overflow-hidden bg-slate-900/50">
							<img src={region.avatar} alt={region.name} class="w-full h-full object-cover" />
						</div>
					{/if}

					<!-- Region Info -->
					<div class="space-y-2">
						<div class="flex items-start justify-between gap-2">
							<h3 class="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
								{region.name}
							</h3>
							{#if !region.state}
								<span class="badge badge-sm bg-purple-600/20 text-purple-300 border-0 shrink-0"> Independent </span>
							{/if}
						</div>

						{#if region.state}
							<div class="flex items-center gap-2 text-sm text-gray-400">
								<FluentBuildingGovernment20Filled class="size-4" />
								<span>{region.state.name}</span>
							</div>
						{/if}

						{#if region.description}
							<p class="text-sm text-gray-400 line-clamp-2">{region.description}</p>
						{/if}

						<!-- Population -->
						<div class="flex items-center justify-between pt-2 border-t border-slate-700">
							<div class="flex items-center gap-2">
								<FluentPeople20Filled class="size-4 {getPopulationColor(region.populationCount)}" />
								<span class="text-sm font-medium {getPopulationColor(region.populationCount)}">
									{formatPopulation(region.populationCount)} resident{region.populationCount !== 1 ? "s" : ""}
								</span>
							</div>
							<span class="text-xs text-gray-500">
								{getPopulationDensity(region.populationCount)}
							</span>
						</div>
					</div>

					<!-- CTA -->
					<div class="pt-2">
						<div class="btn btn-sm btn-block bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2">
							<FluentCheckmark20Filled class="size-4" />
							Request Residence
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}

<!-- All Regions -->
<div class="space-y-3">
	<div class="flex items-center gap-2">
		<FluentHome20Filled class="size-5 text-purple-400" />
		<h2 class="text-lg font-semibold text-white">
			{data.nearbyRegions.length > 0 && !searchQuery && !showIndependentOnly ? "Other Regions" : "All Regions"}
		</h2>
	</div>

	{#if filteredRegions().length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-12 text-center space-y-3">
			<div class="size-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
				<FluentLocation20Filled class="size-8 text-gray-400" />
			</div>
			<h3 class="text-lg font-semibold text-white">No regions found</h3>
			<p class="text-gray-400">Try adjusting your filters or search query</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredRegions() as region (region.id)}
				{#if !data.nearbyRegions.some((r) => r.id === region.id) || searchQuery || showIndependentOnly}
					<a
						href="/regions/{region.id}"
						class="group bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-3 hover:bg-slate-800/70 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02]"
					>
						<!-- Region Image -->
						{#if region.avatar}
							<div class="aspect-video rounded-lg overflow-hidden bg-slate-900/50">
								<img src={region.avatar} alt={region.name} class="w-full h-full object-cover" />
							</div>
						{/if}

						<!-- Region Info -->
						<div class="space-y-2">
							<div class="flex items-start justify-between gap-2">
								<h3 class="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
									{region.name}
								</h3>
								{#if !region.state}
									<span class="badge badge-sm bg-purple-600/20 text-purple-300 border-0 shrink-0"> Independent </span>
								{/if}
							</div>

							{#if region.state}
								<div class="flex items-center gap-2 text-sm text-gray-400">
									<FluentBuildingGovernment20Filled class="size-4" />
									<span>{region.state.name}</span>
								</div>
							{/if}

							{#if region.description}
								<p class="text-sm text-gray-400 line-clamp-2">{region.description}</p>
							{/if}

							<!-- Population -->
							<div class="flex items-center justify-between pt-2 border-t border-slate-700">
								<div class="flex items-center gap-2">
									<FluentPeople20Filled class="size-4 {getPopulationColor(region.populationCount)}" />
									<span class="text-sm font-medium {getPopulationColor(region.populationCount)}">
										{formatPopulation(region.populationCount)} resident{region.populationCount !== 1 ? "s" : ""}
									</span>
								</div>
								<span class="text-xs text-gray-500">
									{getPopulationDensity(region.populationCount)}
								</span>
							</div>
						</div>

						<!-- CTA -->
						<div class="pt-2">
							<div class="btn btn-sm btn-block bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2">
								<FluentCheckmark20Filled class="size-4" />
								Request Residence
							</div>
						</div>
					</a>
				{/if}
			{/each}
		</div>
	{/if}
</div>
