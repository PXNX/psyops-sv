<!-- src/routes/company/+page.svelte -->
<script lang="ts">
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";

	let { data } = $props();

	let selectedState = $state("all");
	let searchQuery = $state("");

	const filteredCompanies = $derived.by(() => {
		let filtered = data.companies;

		// Filter by state
		if (selectedState !== "all") {
			filtered = filtered.filter((c) => c.states.some((s) => s.id === selectedState));
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(c) => c.name.toLowerCase().includes(query) || c.ownerName?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	// todo: make this one just list all companies and have a button to create own company
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Companies</h1>
			<p class="text-gray-400">Browse all registered companies and their operations</p>
		</div>

		{#if !data.userCompany}
			<a
				href="/company/create"
				class="btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
			>
				<FluentAdd20Filled class="size-5" />
				Register Company
			</a>
		{/if}
	</div>

	<!-- User's Company Card (if exists) -->
	{#if data.userCompany}
		<div
			class="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl border border-purple-500/30 overflow-hidden"
		>
			<div class="p-6">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<div class="size-3 rounded-full bg-green-400 animate-pulse"></div>
						<span class="text-sm font-medium text-purple-300">Your Company</span>
					</div>
					<a
						href="/company/{data.userCompany.id}"
						class="btn btn-sm bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300"
					>
						View Dashboard
					</a>
				</div>

				<div class="flex items-start gap-6">
					<div
						class="size-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"
					>
						{#if data.userCompany.logo}
							<img src={data.userCompany.logo} alt={data.userCompany.name} class="size-16 object-contain rounded-xl" />
						{:else}
							<FluentBuilding20Filled class="size-10 text-white" />
						{/if}
					</div>

					<div class="flex-1">
						<h2 class="text-2xl font-bold text-white mb-2">{data.userCompany.name}</h2>
						<div class="flex items-center gap-4 text-sm text-gray-300">
							<span class="flex items-center gap-1">
								<FluentFactory20Filled class="size-4" />
								{data.userCompany.factoryCount} factories
							</span>
							<span class="flex items-center gap-1">
								<FluentPeople20Filled class="size-4" />
								{data.userCompany.workerCount} workers
							</span>
							<span class="flex items-center gap-1">
								<FluentCalendar20Filled class="size-4" />
								Since {new Date(data.userCompany.foundedAt).toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Filters -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Search -->
			<div>
				<label for="search" class="block text-sm font-medium text-gray-300 mb-2">
					<FluentSearch20Filled class="inline size-4" /> Search Companies
				</label>
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Search by company or owner name..."
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50"
				/>
			</div>

			<!-- State Filter -->
			<div>
				<label for="state" class="block text-sm font-medium text-gray-300 mb-2">
					<FluentFilter20Filled class="inline size-4" /> Filter by State
				</label>
				<select
					id="state"
					bind:value={selectedState}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
				>
					<option value="all">All States</option>
					{#each data.states as state}
						<option value={state.id}>{state.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="mt-3 text-sm text-gray-400">
			Showing {filteredCompanies.length} of {data.companies.length} companies
		</div>
	</div>

	<!-- Companies Grid -->
	{#if filteredCompanies.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredCompanies as company}
				<a
					href="/company/{company.id}"
					class="bg-slate-800/50 rounded-xl border border-white/5 hover:border-purple-500/30 p-5 transition-all hover:scale-[1.02] space-y-4"
				>
					<!-- Company Header -->
					<div class="flex items-start gap-3">
						<div
							class="size-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0"
						>
							{#if company.logo}
								<img src={company.logo} alt={company.name} class="size-12 object-contain rounded-lg" />
							{:else}
								<FluentBuilding20Filled class="size-7 text-white" />
							{/if}
						</div>

						<div class="flex-1 min-w-0">
							<h3 class="font-semibold text-white text-lg truncate">{company.name}</h3>
							<p class="text-sm text-gray-400 truncate">
								Owner: {company.ownerName || "Unknown"}
							</p>
						</div>
					</div>

					<!-- Company Stats -->
					<div class="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/50">
						<div class="text-center">
							<p class="text-xs text-gray-500">Factories</p>
							<p class="text-lg font-bold text-white">{company.factoryCount}</p>
						</div>
						<div class="text-center">
							<p class="text-xs text-gray-500">Workers</p>
							<p class="text-lg font-bold text-white">{company.workerCount}</p>
						</div>
						<div class="text-center">
							<p class="text-xs text-gray-500">States</p>
							<p class="text-lg font-bold text-white">{company.states.length}</p>
						</div>
					</div>

					<!-- Operating States -->
					{#if company.states.length > 0}
						<div class="pt-3 border-t border-slate-700/50">
							<p class="text-xs text-gray-500 mb-2">Operating in:</p>
							<div class="flex flex-wrap gap-1">
								{#each company.states.slice(0, 3) as state}
									<span class="badge badge-sm bg-purple-600/20 text-purple-300 border-purple-500/30">
										{state.name}
									</span>
								{/each}
								{#if company.states.length > 3}
									<span class="badge badge-sm bg-slate-700 text-gray-400 border-slate-600">
										+{company.states.length - 3} more
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Founded Date -->
					<div class="flex items-center gap-1 text-xs text-gray-500 pt-2 border-t border-slate-700/50">
						<FluentCalendar20Filled class="size-3" />
						Founded {new Date(company.foundedAt).toLocaleDateString()}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-12 text-center">
			<FluentBuilding20Filled class="size-16 text-gray-500 mx-auto mb-4" />
			<h3 class="text-lg font-semibold text-white mb-2">No Companies Found</h3>
			<p class="text-gray-400">
				{searchQuery || selectedState !== "all"
					? "Try adjusting your filters"
					: "No companies have been registered yet"}
			</p>
		</div>
	{/if}
</div>
