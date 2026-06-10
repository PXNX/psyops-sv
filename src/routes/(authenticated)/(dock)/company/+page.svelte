<!-- src/routes/company/+page.svelte -->
<script lang="ts">
	import Logo from "$lib/component/Logo.svelte";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";

	import PageContainer from "$lib/component/PageContainer.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	let { data } = $props();

	let selectedState = $state("all");
	let searchQuery = $state("");

	const filteredCompanies = $derived.by(() => {
		let filtered = data.companies;

		if (selectedState !== "all") {
			filtered = filtered.filter((c) => c.states.some((s) => s.id === selectedState));
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(c) => c.name.toLowerCase().includes(query) || c.ownerName?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});
</script>

<PageContainer maxWidth="7xl">
	<!-- Header -->
	<div class="relative">
		<div class="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-2xl blur-3xl"></div>
		<div class="relative">
			<h1 class="text-3xl md:text-4xl font-bold mb-3 md:mb-4">Companies</h1>
			<div class="flex flex-wrap gap-2 md:gap-3">
				{#if data.userCompany}
					<a
						href="/company/{data.userCompany.id}"
						class="px-3 md:px-4 py-2 bg-gradient-to-br from-purple-700/80 to-purple-800/80 hover:from-purple-600/80 hover:to-purple-700/80
						       border border-purple-500/20 rounded-lg text-purple-300 hover:text-white transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
					>
						<FluentBuilding20Filled class="size-4" />
						<span>My Company</span>
					</a>
				{:else}
					<a
						href="/company/create"
						class="px-3 md:px-4 py-2 bg-gradient-to-br from-emerald-700/80 to-emerald-800/80 hover:from-emerald-600/80 hover:to-emerald-700/80
						       border border-emerald-500/20 rounded-lg text-emerald-300 hover:text-white transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
					>
						<FluentAdd20Filled class="size-4" />
						<span>Register Company</span>
					</a>
				{/if}
			</div>
		</div>
	</div>

	<!-- User's Company Card -->
	{#if data.userCompany}
		<a
			href="/company/{data.userCompany.id}"
			class="block relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-950/40 to-blue-950/30 border border-purple-500/30 p-4 md:p-6
			       hover:border-purple-400/50 transition-all duration-300 group"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

			<div class="relative flex flex-col sm:flex-row items-start gap-4">
				<div class="ring-4 ring-purple-500/20 rounded-xl shrink-0">
					<Logo
						src={data.userCompany.logo}
						alt={data.userCompany.name}
						placeholderIcon={FluentBuilding20Filled}
						placeholderGradient="from-purple-500 to-blue-500"
						class="size-16 md:size-20 rounded-xl"
					/>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2.5 rounded-full bg-green-400 animate-pulse"></div>
						<span class="text-xs font-medium text-purple-300 uppercase tracking-wide">Your Company</span>
					</div>
					<h2 class="text-xl md:text-2xl font-bold text-white truncate mb-2">{data.userCompany.name}</h2>
					<div class="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-gray-400">
						<span class="flex items-center gap-1.5">
							<FluentFactory20Filled class="size-4 text-purple-400" />
							{data.userCompany.factoryCount} {data.userCompany.factoryCount === 1 ? 'factory' : 'factories'}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentPeople20Filled class="size-4 text-blue-400" />
							{data.userCompany.workerCount} {data.userCompany.workerCount === 1 ? 'worker' : 'workers'}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentCalendar20Filled class="size-4 text-gray-500" />
							Founded {formatDate(data.userCompany.foundedAt)}
						</span>
					</div>
				</div>

				<FluentArrowRight20Filled class="size-5 md:size-6 text-purple-400 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
			</div>
		</a>
	{/if}

	<!-- Filters -->
	<div class="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-4 md:p-5">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
			<div>
				<label for="search" class="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
					<FluentSearch20Filled class="size-3.5" /> Search
				</label>
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Company or owner name..."
					class="input w-full bg-slate-800/50 border-slate-700/50 text-white placeholder:text-gray-500 focus:border-purple-500/50"
				/>
			</div>

			<div>
				<label for="state" class="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
					<FluentLocation20Filled class="size-3.5" /> State
				</label>
				<select
					id="state"
					bind:value={selectedState}
					class="select w-full bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50"
				>
					<option value="all">All States</option>
					{#each data.states as state}
						<option value={state.id}>{state.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<p class="mt-3 text-xs text-gray-500">
			Showing {filteredCompanies.length} of {data.companies.length} companies
		</p>
	</div>

	<!-- Company List -->
	{#if filteredCompanies.length > 0}
		<div class="space-y-2 md:space-y-3">
			{#each filteredCompanies as company}
				<a
					href="/company/{company.id}"
					class="block relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10
					       hover:border-purple-500/30 transition-all duration-300 group"
				>
					<div class="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

					<div class="relative p-4 md:p-5">
						<div class="flex items-center gap-3 md:gap-4">
							<Logo
								src={company.logo}
								alt={company.name}
								placeholderIcon={FluentBuilding20Filled}
								placeholderGradient="from-purple-500 to-blue-500"
								class="size-12 md:size-14 rounded-xl shrink-0"
							/>

							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-white text-base md:text-lg truncate">{company.name}</h3>
								<p class="text-xs md:text-sm text-gray-400 truncate">{company.ownerName || 'Unknown owner'}</p>
							</div>

							<div class="hidden sm:flex items-center gap-4 md:gap-6 shrink-0">
								<div class="text-center">
									<p class="text-lg md:text-xl font-bold text-white">{company.factoryCount}</p>
									<p class="text-xs text-gray-500">Factories</p>
								</div>
								<div class="text-center">
									<p class="text-lg md:text-xl font-bold text-white">{company.workerCount}</p>
									<p class="text-xs text-gray-500">Workers</p>
								</div>
								{#if company.states.length > 0}
									<div class="text-center">
										<p class="text-lg md:text-xl font-bold text-white">{company.states.length}</p>
										<p class="text-xs text-gray-500">{company.states.length === 1 ? 'State' : 'States'}</p>
									</div>
								{/if}
							</div>

							<FluentArrowRight20Filled class="size-5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden md:block" />
						</div>

						<!-- Mobile stats row -->
						<div class="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-slate-700/30">
							<span class="flex items-center gap-1 text-xs text-gray-400">
								<FluentFactory20Filled class="size-3.5 text-purple-400" />
								{company.factoryCount}
							</span>
							<span class="flex items-center gap-1 text-xs text-gray-400">
								<FluentPeople20Filled class="size-3.5 text-blue-400" />
								{company.workerCount}
							</span>
							{#if company.states.length > 0}
								<span class="flex items-center gap-1 text-xs text-gray-400">
									<FluentLocation20Filled class="size-3.5 text-green-400" />
									{company.states.length} {company.states.length === 1 ? 'state' : 'states'}
								</span>
							{/if}
							<span class="ml-auto text-xs text-gray-500">
								{formatDate(company.foundedAt)}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-10 md:p-16 text-center">
			<FluentBuilding20Filled class="size-12 md:size-16 text-gray-600 mx-auto mb-4" />
			<h3 class="text-lg font-semibold text-white mb-2">No Companies Found</h3>
			<p class="text-sm text-gray-400">
				{searchQuery || selectedState !== "all"
					? "Try adjusting your filters"
					: "No companies have been registered yet"}
			</p>
			{#if !data.userCompany}
				<a
					href="/company/create"
					class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500
					       rounded-lg text-white text-sm font-medium transition-all"
				>
					<FluentAdd20Filled class="size-4" />
					Be the first to register
				</a>
			{/if}
			</div>
			{/if}
			</PageContainer>
