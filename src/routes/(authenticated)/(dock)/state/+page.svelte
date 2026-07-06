<script lang="ts">
	import { goto } from "$app/navigation";
	import type { PageData } from "./$types";
	import IconFluentSearch24Regular from "~icons/fluent/search-24-regular";
	import IconFluentDismiss24Regular from "~icons/fluent/dismiss-24-regular";
	import IconFluentPeople24Regular from "~icons/fluent/people-24-regular";
	import IconFluentStar24Regular from "~icons/fluent/star-24-regular";
	import IconFluentChevronRight24Regular from "~icons/fluent/chevron-right-24-regular";
	import IconFluentBuildingMultiple24Regular from "~icons/fluent/building-multiple-24-regular";

	export let data: PageData;

	let searchInput = data.search || "";
	let sortBy = data.sortBy || "rating";

	const sortOptions = [
		{ value: "rating", label: "Rating" },
		{ value: "population", label: "Population" }
	];

	let debounceTimer: ReturnType<typeof setTimeout>;

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput.trim());
		if (sortBy) params.set("sort", sortBy);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 300);
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === "Enter") {
			clearTimeout(debounceTimer);
			applyFilters();
		}
	}

	function clearSearch() {
		searchInput = "";
		clearTimeout(debounceTimer);
		applyFilters();
	}
</script>

<div class="min-h-screen bg-base-200 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold mb-2">All States</h1>
			<p class="text-base-content/60">{data.regions.length} states available</p>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-col sm:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1">
				<label
					class="input input-bordered input-lg flex items-center gap-3 focus-within:input-primary focus-within:shadow-md transition-all"
				>
					<IconFluentSearch24Regular class="w-5 h-5 opacity-60 shrink-0" />
					<input
						type="text"
						bind:value={searchInput}
						on:input={handleSearchInput}
						on:keypress={handleKeyPress}
						placeholder="Search states by name..."
						class="grow text-base"
						aria-label="Search states"
					/>
					{#if searchInput}
						<button
							type="button"
							on:click={clearSearch}
							class="btn btn-ghost btn-sm btn-circle -mr-2"
							aria-label="Clear search"
						>
							<IconFluentDismiss24Regular class="w-4 h-4" />
						</button>
					{/if}
				</label>
			</div>

			<!-- Sort -->
			<select
				bind:value={sortBy}
				on:change={applyFilters}
				class="select select-bordered select-lg w-full sm:w-auto"
				aria-label="Sort states"
			>
				{#each sortOptions as option}
					<option value={option.value}>Sort: {option.label}</option>
				{/each}
			</select>
		</div>

		<!-- Active search indicator -->
		{#if data.search}
			<div class="mb-6 flex items-center gap-2 text-sm text-base-content/70">
				<span>
					{data.regions.length}
					{data.regions.length === 1 ? "result" : "results"} for
					<span class="font-semibold text-base-content">"{data.search}"</span>
				</span>
				<button type="button" on:click={clearSearch} class="btn btn-ghost btn-xs gap-1">
					<IconFluentDismiss24Regular class="w-3.5 h-3.5" />
					Clear
				</button>
			</div>
		{/if}

		<!-- States Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.regions as state}
				<a
					href="/state/{state.id}"
					class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300 hover:border-primary"
				>
					<div class="card-body">
						<!-- Resident Badge -->
						{#if data.userRegionIds.includes(state.id)}
							<div class="absolute top-4 right-4">
								<div class="badge badge-success gap-2">Resident</div>
							</div>
						{/if}

						<!-- State Header -->
						<div class="flex items-center gap-3 mb-4">
							{#if state.stateColor}
								<div class="avatar placeholder">
									<div class="w-12 rounded-lg text-neutral-content" style="background: {state.stateColor}">
										<span class="text-xl font-bold">{state.name.charAt(0)}</span>
									</div>
								</div>
							{:else}
								<div class="avatar placeholder">
									<div class="bg-primary text-primary-content rounded-lg w-12">
										<span class="text-xl font-bold">{state.name.charAt(0)}</span>
									</div>
								</div>
							{/if}
							<div class="flex-1">
								<h2 class="card-title text-lg">
									{state.name}
								</h2>
								<p class="text-sm opacity-60">
									#{state.rating || 0}
								</p>
							</div>
						</div>

						<!-- Description -->
						{#if state.description}
							<p class="text-sm opacity-70 mb-4 line-clamp-2">
								{state.description}
							</p>
						{/if}

						<!-- Stats -->
						<div class="grid grid-cols-2 gap-3">
							<!-- Population -->
							<div class="stats shadow bg-base-200">
								<div class="stat p-3">
									<div class="stat-figure text-primary">
										<IconFluentPeople24Regular class="w-6 h-6" />
									</div>
									<div class="stat-title text-xs">Population</div>
									<div class="stat-value text-lg">{state.population.toLocaleString()}</div>
								</div>
							</div>

							<!-- Rating -->
							<div class="stats shadow bg-base-200">
								<div class="stat p-3">
									<div class="stat-figure text-warning">
										<IconFluentStar24Regular class="w-6 h-6" />
									</div>
									<div class="stat-title text-xs">Rating</div>
									<div class="stat-value text-lg">{state.rating || 0}</div>
								</div>
							</div>
						</div>

						<!-- View Details Link -->
						<div class="card-actions justify-end mt-4">
							<div class="flex items-center gap-1 text-primary text-sm font-medium">
								<span>View Details</span>
								<IconFluentChevronRight24Regular class="w-4 h-4" />
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Empty State -->
		{#if data.regions.length === 0}
			<div class="hero min-h-[400px]">
				<div class="hero-content text-center">
					<div class="max-w-md">
						<div class="mb-4">
							<IconFluentBuildingMultiple24Regular class="w-24 h-24 mx-auto opacity-30" />
						</div>
						<h1 class="text-3xl font-bold">No states found</h1>
						<p class="py-6 opacity-70">
							{#if data.search}
								No states match "{data.search}". Try a different search.
							{:else}
								Try adjusting your search or filters
							{/if}
						</p>
						{#if data.search}
							<button type="button" on:click={clearSearch} class="btn btn-primary btn-sm"> Clear search </button>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
