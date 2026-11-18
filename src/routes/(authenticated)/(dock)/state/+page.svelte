<!-- src/routes/(authenticated)/(dock)/state/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentMap20Filled from "~icons/fluent/map-20-filled";
	import FluentBuildingMultiple20Filled from "~icons/fluent/building-multiple-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";

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
		goto(`?${params.toString()}`, { reset: false });
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
	<PageHeader
		documentTitle={false}
		title="Atlas of States"
		subtitle="{data.regions.length} {data.regions.length === 1 ? 'state' : 'states'}"
	>
		{#snippet actions()}
			<Button variant="secondary" href="/fallen" icon={FluentBuildingBank20Filled}>Fallen States</Button>
		{/snippet}
	</PageHeader>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="relative flex-1">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#8e9abb]" />
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
					class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-[#8e9abb] hover:text-[#eef2ff] hover:bg-[#f5a524]/10 transition-colors"
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
		<div class="flex items-center gap-2 text-sm text-[#8e9abb]">
			<span>
				{data.regions.length}
				{data.regions.length === 1 ? "result" : "results"} for
				<span class="font-semibold text-[#eef2ff]">"{data.search}"</span>
			</span>
			<Button variant="ghost" size="xs" icon={FluentDismiss20Filled} onclick={clearSearch}>Clear</Button>
		</div>
	{/if}

	<!-- Atlas index -->
	{#if data.regions.length > 0}
		<ol class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each data.regions as state, i (state.id)}
				<li>
					<a
						href="/state/{state.id}"
						class="group panel-interactive rounded-sm p-4 flex items-start gap-3 {data.userRegionIds.includes(state.id)
							? 'border-[#4fd88a]/40'
							: ''}"
					>
						<span class="w-7 shrink-0 pt-1 text-right font-mono text-xs text-[#8e9abb]">{i + 1}.</span>
						<div class="size-14 shrink-0 overflow-hidden rounded-sm border border-[#8ea6e0]/25 bg-[#131c33]">
							{#if state.logo}
								<img loading="lazy" decoding="async" src={state.logo} alt="" class="size-full object-cover" />
							{:else}
								<div
									class="flex size-full items-center justify-center"
									style="background-color: {state.stateColor || '#2f6be0'}30;"
								>
									<FluentFlag20Filled class="size-6 text-[#c3dbff]" />
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1 space-y-1">
							<div class="flex items-center gap-2">
								<h2
									class="truncate font-serif text-lg font-bold leading-tight text-[#eef2ff] group-hover:text-[#ffc857] transition-colors"
								>
									{state.name}
								</h2>
								{#if data.userRegionIds.includes(state.id)}
									<Badge tone="green" size="xs">Home</Badge>
								{/if}
							</div>
							<p class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#8e9abb]">
								<span class="flex items-center gap-1"
									><FluentPeople20Filled class="size-3.5 text-[#6aa8ff]" /><span class="text-[#dbe2f4]"
										>{state.population.toLocaleString()}</span
									></span
								>
								<span class="flex items-center gap-1"
									><FluentMap20Filled class="size-3.5 text-[#4fd88a]" /><span class="text-[#dbe2f4]"
										>{state.regionCount}</span
									>
									{state.regionCount === 1 ? "region" : "regions"}</span
								>
								<span class="flex items-center gap-1"
									><FluentStar20Filled class="size-3.5 text-[#ffcb6b]" /><span class="text-[#dbe2f4]"
										>{state.rating || 0}</span
									></span
								>
								{#if state.bloc}
									<span class="flex items-center gap-1">
										<span class="size-2 rounded-full" style:background-color={state.bloc.color}></span>
										<span class="truncate">{state.bloc.name}</span>
									</span>
								{/if}
							</p>
						</div>
					</a>
					{#if state.president}
						<div class="-mt-px flex items-center gap-2 px-4 pt-1.5 pl-[3.25rem] text-[11px] text-[#8e9abb]">
							<span class="uppercase tracking-wide">Head of state</span>
							<UserLink size="xs" id={state.president.id} name={state.president.name} avatar={state.president.avatar} />
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<EmptyState
			icon={FluentBuildingMultiple20Filled}
			title={data.search ? `No states match "${data.search}"` : "No states found"}
		>
			{#snippet actions()}
				{#if data.search}
					<Button variant="secondary" size="sm" onclick={clearSearch}>Clear search</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{/if}
</PageContainer>
