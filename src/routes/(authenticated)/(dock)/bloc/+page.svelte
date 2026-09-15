<!-- src/routes/bloc/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { enhance } from "$app/forms";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import Button from "$lib/component/ui/Button.svelte";
	import Badge from "$lib/component/ui/Badge.svelte";

	const { data } = $props();

	let searchInput = $state(data.search || "");
	let sortBy = $state(data.sortBy || "members");

	const sortOptions = [
		{ value: "members", label: "Member States" },
		{ value: "population", label: "Total Population" },
		{ value: "name", label: "Name" }
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

	function formatPopulation(n: number) {
		if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
		if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
		return String(n);
	}
</script>

<svelte:head>
	<title>Political Blocs</title>
	<meta name="description" content="Browse every political-military alliance in PsyOps." />
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-[#fff7e8]">Political Blocs</h1>
			<p class="text-[#a89e8e] mt-1">
				{data.blocs.length}
				{data.blocs.length === 1 ? "bloc" : "blocs"} • Political-military alliances
			</p>
		</div>
		{#if data.canCreateBloc}
			<Button href="/bloc/create" icon={FluentAdd20Filled}>Create Bloc</Button>
		{/if}
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
				placeholder="Search blocs by name..."
				aria-label="Search blocs"
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
			aria-label="Sort blocs"
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
				{data.blocs.length}
				{data.blocs.length === 1 ? "result" : "results"} for
				<span class="font-semibold text-[#fff7e8]">"{data.search}"</span>
			</span>
			<Button variant="ghost" size="xs" icon={FluentDismiss20Filled} onclick={clearSearch}>Clear</Button>
		</div>
	{/if}

	<!-- User State Info Banner -->
	{#if data.userPresidency && !data.userPresidency.blocId}
		<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-[#315d8d]/25 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentFlag20Filled class="size-6 text-[#b7d0e6]" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-[#fff7e8]">You're the President of {data.userPresidency.stateName}</h3>
					<p class="text-sm text-[#a89e8e]">Select a bloc below to apply for membership</p>
				</div>
			</div>
		</div>
	{:else if data.userPresidency?.blocId}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-[#587252]/25 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentCheckmarkCircle20Filled class="size-6 text-[#c6dfbf]" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-[#fff7e8]">Your state is already in a bloc</h3>
					<a href="/bloc/{data.userPresidency.blocId}" class="text-sm text-[#c6dfbf] hover:underline">
						View your bloc
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Blocs Grid -->
	{#if data.blocs.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.blocs as bloc}
				<div class="panel-interactive rounded-sm p-5 flex flex-col">
					<!-- Bloc Header -->
					<div class="flex items-center gap-3 mb-3">
						<div
							class="size-12 rounded-sm flex items-center justify-center shrink-0"
							style="background-color: {bloc.color}30;"
						>
							<FluentFlag20Filled class="size-6" style="color: {bloc.color}" />
						</div>
						<div class="flex-1 min-w-0">
							<h2 class="font-bold text-[#fff7e8] truncate">{bloc.name}</h2>
							{#if bloc.isUserMember}
								<Badge tone="green" icon={FluentCheckmarkCircle20Filled}>Your Bloc</Badge>
							{/if}
						</div>
					</div>

					<!-- Description -->
					{#if bloc.description}
						<p class="text-sm text-[#a89e8e] mb-4 line-clamp-2">{bloc.description}</p>
					{/if}

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-2 mb-3">
						<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
							<FluentBuildingGovernment20Filled class="size-4 text-[#b7d0e6] shrink-0" />
							<div class="min-w-0">
								<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">States</p>
								<p class="text-sm font-bold text-[#fff7e8] truncate">{bloc.memberCount}</p>
							</div>
						</div>
						<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
							<FluentPeople20Filled class="size-4 text-[#f7c56b] shrink-0" />
							<div class="min-w-0">
								<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Population</p>
								<p class="text-sm font-bold text-[#fff7e8] truncate">{formatPopulation(bloc.totalPopulation)}</p>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[#dfceb0]/10">
						<a
							href="/bloc/{bloc.id}"
							class="group flex items-center gap-1 text-xs text-[#e5d8c1]/70 hover:text-[#f2c463] transition-colors"
						>
							<span>View Details</span>
							<FluentChevronRight20Filled class="size-3.5 group-hover:translate-x-0.5 transition-transform" />
						</a>

						{#if data.userPresidency && !data.userPresidency.blocId && !bloc.isUserMember}
							<form method="POST" action="?/apply" use:enhance>
								<input type="hidden" name="blocId" value={bloc.id} />
								<button
									type="submit"
									class="px-3 py-1.5 rounded-sm text-xs font-mono font-bold text-white transition-all hover:brightness-110 flex items-center gap-1.5"
									style="background-color: {bloc.color}"
								>
									<FluentFlag20Filled class="size-3.5" />
									Apply to Join
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#102239] mb-4">
				<FluentGlobe20Filled class="size-8 text-[#a89e8e]" />
			</div>
			<h2 class="text-xl font-bold text-[#fff7e8] mb-2">No blocs found</h2>
			<p class="text-[#a89e8e] mb-4">
				{#if data.search}
					No blocs match "{data.search}". Try a different search.
				{:else if data.canCreateBloc}
					Be the first to create a political bloc!
				{:else}
					No political blocs exist yet
				{/if}
			</p>
			{#if data.search}
				<Button variant="secondary" size="sm" onclick={clearSearch}>Clear search</Button>
			{:else if data.canCreateBloc}
				<Button href="/bloc/create" icon={FluentAdd20Filled}>Create First Bloc</Button>
			{/if}
		</div>
	{/if}

	<!-- Info Box -->
	<div class="panel-muted rounded-sm p-4 flex items-start gap-3">
		<FluentFlag20Filled class="size-5 text-[#a89e8e] shrink-0 mt-0.5" />
		<div>
			<h3 class="text-sm font-semibold text-[#fff7e8]">About Political Blocs</h3>
			<p class="text-sm text-[#a89e8e] mt-0.5">
				Political-military alliances that coordinate member states' policies, military strategies, and economic
				cooperation. Only state presidents can apply to join blocs on behalf of their states.
			</p>
		</div>
	</div>
</PageContainer>
