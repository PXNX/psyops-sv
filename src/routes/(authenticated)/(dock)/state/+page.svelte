<!-- src/routes/(authenticated)/(dock)/state/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentBuildingMultiple20Filled from "~icons/fluent/building-multiple-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import Button from "$lib/component/ui/Button.svelte";
	import Badge from "$lib/component/ui/Badge.svelte";

	const { data } = $props();

	let searchInput = $state(data.search || "");
	let sortBy = $state(data.sortBy || "rating");

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

<svelte:head>
	<title>All States</title>
	<meta name="description" content="Browse every state in PsyOps." />
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-[#fff7e8]">All States</h1>
			<p class="text-[#a89e8e] mt-1">
				{data.regions.length}
				{data.regions.length === 1 ? "state" : "states"} available
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="relative flex-1">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#a89e8e]" />
			<input
				type="text"
				bind:value={searchInput}
				oninput={handleSearchInput}
				onkeypress={handleKeyPress}
				placeholder="Search states by name..."
				aria-label="Search states"
				class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
			/>
			{#if searchInput}
				<button
					type="button"
					onclick={clearSearch}
					aria-label="Clear search"
					class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-[#a89e8e] hover:text-[#fff7e8] hover:bg-[#e6a527]/10 transition-colors"
				>
					<FluentDismiss20Filled class="size-4" />
				</button>
			{/if}
		</div>

		<!-- Sort -->
		<select
			bind:value={sortBy}
			onchange={applyFilters}
			aria-label="Sort states"
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			{#each sortOptions as option}
				<option value={option.value}>Sort: {option.label}</option>
			{/each}
		</select>
	</div>

	<!-- Active search indicator -->
	{#if data.search}
		<div class="flex items-center gap-2 text-sm text-[#a89e8e]">
			<span>
				{data.regions.length}
				{data.regions.length === 1 ? "result" : "results"} for
				<span class="font-semibold text-[#fff7e8]">"{data.search}"</span>
			</span>
			<Button variant="ghost" size="xs" icon={FluentDismiss20Filled} onclick={clearSearch}>Clear</Button>
		</div>
	{/if}

	<!-- States Grid -->
	{#if data.regions.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.regions as state}
				<a href="/state/{state.id}" class="group panel-interactive rounded-sm p-5 relative">
					{#if data.userRegionIds.includes(state.id)}
						<div class="absolute top-4 right-4">
							<Badge tone="green">Resident</Badge>
						</div>
					{/if}

					<!-- State Header -->
					<div class="flex items-center gap-3 mb-3">
						{#if state.logo}
							<div class="size-12 rounded-sm overflow-hidden bg-[#102239] shrink-0">
								<img src={state.logo} alt={state.name} class="w-full h-full object-cover" />
							</div>
						{:else}
							<div
								class="size-12 rounded-sm flex items-center justify-center shrink-0"
								style="background-color: {state.stateColor || '#315d8d'}30;"
							>
								{#if state.stateColor}
									<span class="text-xl font-bold text-[#fff7e8]">{state.name.charAt(0)}</span>
								{:else}
									<FluentFlag20Filled class="size-6 text-[#b7d0e6]" />
								{/if}
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<h2 class="font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
								{state.name}
							</h2>
							<p class="text-xs text-[#a89e8e]">#{state.rating || 0} rated</p>
						</div>
					</div>

					<!-- Description -->
					{#if state.description}
						<p class="text-sm text-[#a89e8e] mb-4 line-clamp-2">{state.description}</p>
					{/if}

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-2">
						<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
							<FluentPeople20Filled class="size-4 text-[#b7d0e6] shrink-0" />
							<div class="min-w-0">
								<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Population</p>
								<p class="text-sm font-bold text-[#fff7e8] truncate">{state.population.toLocaleString()}</p>
							</div>
						</div>
						<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
							<FluentStar20Filled class="size-4 text-[#f7c56b] shrink-0" />
							<div class="min-w-0">
								<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Rating</p>
								<p class="text-sm font-bold text-[#fff7e8] truncate">{state.rating || 0}</p>
							</div>
						</div>
					</div>

					<!-- View Details Link -->
					<div class="flex items-center justify-end gap-1 text-xs text-[#e5d8c1]/70 group-hover:text-[#f2c463] transition-colors mt-3">
						<span>View Details</span>
						<FluentChevronRight20Filled class="size-3.5" />
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#102239] mb-4">
				<FluentBuildingMultiple20Filled class="size-8 text-[#a89e8e]" />
			</div>
			<h2 class="text-xl font-bold text-[#fff7e8] mb-2">No states found</h2>
			<p class="text-[#a89e8e] mb-4">
				{#if data.search}
					No states match "{data.search}". Try a different search.
				{:else}
					Try adjusting your search or filters.
				{/if}
			</p>
			{#if data.search}
				<Button variant="secondary" size="sm" onclick={clearSearch}>Clear search</Button>
			{/if}
		</div>
	{/if}
</PageContainer>
