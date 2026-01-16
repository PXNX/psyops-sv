<!-- src/routes/(authenticated)/(dock)/bloc/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentSearch24Regular from "~icons/fluent/search-24-regular";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentChevronRight24Regular from "~icons/fluent/chevron-right-24-regular";
	import FluentAdd24Regular from "~icons/fluent/add-24-regular";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";

	export let data: PageData;

	let searchInput = data.search || "";
	let sortBy = data.sortBy || "members";

	const sortOptions = [
		{ value: "members", label: "Member States" },
		{ value: "population", label: "Total Population" },
		{ value: "name", label: "Name" }
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput);
		if (sortBy) params.set("sort", sortBy);
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === "Enter") {
			applyFilters();
		}
	}
</script>

<div class="min-h-screen bg-base-200 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h1 class="text-4xl font-bold mb-2">Political Blocs</h1>
					<p class="text-base-content/60">
						{data.blocs.length} {data.blocs.length === 1 ? "bloc" : "blocs"} • Political-military alliances
					</p>
				</div>
				
				{#if data.canCreateBloc}
					<a href="/bloc/create" class="btn btn-primary gap-2">
						<FluentAdd24Regular class="w-5 h-5" />
						Create Bloc
					</a>
				{/if}
			</div>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-col sm:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1">
				<label class="input input-bordered flex items-center gap-2">
					<FluentSearch24Regular class="w-5 h-5 opacity-60" />
					<input
						type="text"
						bind:value={searchInput}
						on:keypress={handleKeyPress}
						placeholder="Search blocs..."
						class="grow"
					/>
				</label>
			</div>

			<!-- Sort -->
			<select bind:value={sortBy} on:change={applyFilters} class="select select-bordered w-full sm:w-auto">
				{#each sortOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<!-- User State Info Banner (if president without bloc) -->
		{#if data.userPresidency && !data.userPresidency.blocId}
			<div class="alert alert-info mb-6">
				<FluentFlag20Filled class="w-6 h-6" />
				<div class="flex-1">
					<h3 class="font-bold">You're the President of {data.userPresidency.stateName}</h3>
					<p class="text-sm">Select a bloc below to apply for membership</p>
				</div>
			</div>
		{:else if data.userPresidency?.blocId}
			<div class="alert alert-success mb-6">
				<FluentCheckmark20Filled class="w-6 h-6" />
				<div class="flex-1">
					<h3 class="font-bold">Your state is already in a bloc</h3>
					<p class="text-sm">
						<a href="/bloc/{data.userPresidency.blocId}" class="link">View your bloc</a>
					</p>
				</div>
			</div>
		{/if}

		<!-- Blocs Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.blocs as bloc}
				<div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
					<div class="card-body">
						<!-- Bloc Header -->
						<div class="flex items-center gap-3 mb-4">
							<div
								class="size-12 rounded-xl flex items-center justify-center"
								style="background-color: {bloc.color}"
							>
								<FluentFlag20Filled class="size-6 text-white" />
							</div>
							<div class="flex-1 min-w-0">
								<h2 class="card-title text-lg truncate">
									{bloc.name}
								</h2>
								{#if bloc.isUserMember}
									<div class="badge badge-success badge-sm gap-1">
										<FluentCheckmark20Filled class="size-3" />
										Your Bloc
									</div>
								{/if}
							</div>
						</div>

						<!-- Description -->
						{#if bloc.description}
							<p class="text-sm opacity-70 mb-4 line-clamp-2">
								{bloc.description}
							</p>
						{/if}

						<!-- Stats -->
						<div class="grid grid-cols-2 gap-3 mb-4">
							<!-- Member States -->
							<div class="stats shadow bg-base-200">
								<div class="stat p-3">
									<div class="stat-figure" style="color: {bloc.color}">
										<FluentBuildingGovernment20Filled class="w-6 h-6" />
									</div>
									<div class="stat-title text-xs">States</div>
									<div class="stat-value text-lg">{bloc.memberCount}</div>
								</div>
							</div>

							<!-- Total Population -->
							<div class="stats shadow bg-base-200">
								<div class="stat p-3">
									<div class="stat-figure" style="color: {bloc.color}">
										<FluentPeople20Filled class="w-6 h-6" />
									</div>
									<div class="stat-title text-xs">Population</div>
									<div class="stat-value text-lg">
										{#if bloc.totalPopulation >= 1000000}
											{(bloc.totalPopulation / 1000000).toFixed(1)}M
										{:else if bloc.totalPopulation >= 1000}
											{(bloc.totalPopulation / 1000).toFixed(1)}K
										{:else}
											{bloc.totalPopulation}
										{/if}
									</div>
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="card-actions justify-between items-center mt-2">
							<a
								href="/bloc/{bloc.id}"
								class="flex items-center gap-1 text-sm font-medium hover:underline"
								style="color: {bloc.color}"
							>
								<span>View Details</span>
								<FluentChevronRight24Regular class="w-4 h-4" />
							</a>

							{#if data.userPresidency && !data.userPresidency.blocId && !bloc.isUserMember}
								<form method="POST" action="?/apply" use:enhance class="inline">
									<input type="hidden" name="blocId" value={bloc.id} />
									<button
										type="submit"
										class="btn btn-sm gap-2"
										style="background-color: {bloc.color}; border-color: {bloc.color}; color: white;"
									>
										<FluentFlag20Filled class="size-4" />
										Apply to Join
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Empty State -->
		{#if data.blocs.length === 0}
			<div class="hero min-h-[400px]">
				<div class="hero-content text-center">
					<div class="max-w-md">
						<div class="mb-4">
							<FluentGlobe20Filled class="w-24 h-24 mx-auto opacity-30" />
						</div>
						<h1 class="text-3xl font-bold">No blocs found</h1>
						<p class="py-6 opacity-70">
							{#if searchInput}
								Try adjusting your search
							{:else if data.canCreateBloc}
								Be the first to create a political bloc!
							{:else}
								No political blocs exist yet
							{/if}
						</p>
						{#if data.canCreateBloc}
							<a href="/bloc/create" class="btn btn-primary gap-2">
								<FluentAdd24Regular class="w-5 h-5" />
								Create First Bloc
							</a>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Info Box -->
		<div class="mt-8 alert bg-base-100 border-base-300">
			<FluentFlag20Filled class="w-6 h-6 opacity-60" />
			<div>
				<h3 class="font-bold">About Political Blocs</h3>
				<p class="text-sm opacity-70">
					Political-military alliances that coordinate member states' policies, military strategies, and economic
					cooperation. Only state presidents can apply to join blocs on behalf of their states.
				</p>
			</div>
		</div>
	</div>
</div>