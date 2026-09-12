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
	import PartyTag from "$lib/component/PartyTag.svelte";
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
		<div class="absolute inset-0 bg-[#8c709b]/10 rounded-2xl blur-3xl"></div>
		<div class="relative">
			<h1 class="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-[#fff7e8]">Companies</h1>
			<div class="flex flex-wrap gap-2 md:gap-3">
				{#if data.userCompany}
					<a
						href="/company/{data.userCompany.id}"
						class="px-3 md:px-4 py-2 bg-[#8c709b]/20 hover:bg-[#8c709b]/30
						       border border-[#b7a0c5]/30 rounded-lg text-[#d5c4df] hover:text-[#f0e7f5] transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
					>
						<FluentBuilding20Filled class="size-4" />
						<span>My Company</span>
					</a>
				{:else}
					<a
						href="/company/create"
						class="px-3 md:px-4 py-2 bg-[#587252]/20 hover:bg-[#587252]/30
						       border border-[#8fae88]/30 rounded-lg text-[#c6dfbf] hover:text-[#edfae7] transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
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
			class="block relative overflow-hidden rounded-xl md:rounded-2xl bg-[#8c709b]/10 border border-[#b7a0c5]/25 p-4 md:p-6
			       hover:border-[#b7a0c5]/40 transition-all duration-300 group"
		>
			<div class="absolute inset-0 bg-[#8c709b]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

			<div class="relative flex flex-col sm:flex-row items-start gap-4">
				<div class="rounded-xl shrink-0">
					<Logo
						src={data.userCompany.logo}
						alt={data.userCompany.name}
						placeholderIcon={FluentBuilding20Filled}
						placeholderGradient="from-[#8c709b] to-[#315d8d]"
						class="size-16 md:size-20 rounded-xl"
					/>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2.5 rounded-full bg-green-400 animate-pulse"></div>
						<span class="text-xs font-medium text-[#d5c4df] uppercase tracking-wide">Your Company</span>
					</div>
					<h2 class="text-xl md:text-2xl font-bold text-[#fff7e8] truncate mb-2">{data.userCompany.name}</h2>
					<div class="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-[#a89e8e]">
						<span class="flex items-center gap-1.5">
							<FluentFactory20Filled class="size-4 text-[#d5c4df]" />
							{data.userCompany.factoryCount}
							{data.userCompany.factoryCount === 1 ? "factory" : "factories"}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentPeople20Filled class="size-4 text-blue-400" />
							{data.userCompany.workerCount}
							{data.userCompany.workerCount === 1 ? "worker" : "workers"}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentCalendar20Filled class="size-4 text-[#a89e8e]" />
							Founded {formatDate(data.userCompany.foundedAt)}
						</span>
					</div>
				</div>

				<FluentArrowRight20Filled
					class="size-5 md:size-6 text-[#d5c4df] group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block"
				/>
			</div>
		</a>
	{/if}

	<!-- Filters -->
	<div class="relative overflow-hidden rounded-xl md:rounded-2xl panel-muted p-4 md:p-5">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
			<div>
				<label
					for="search"
					class="flex items-center gap-1.5 text-xs font-medium text-[#a89e8e] uppercase tracking-wide mb-2"
				>
					<FluentSearch20Filled class="size-3.5" /> Search
				</label>
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Company or owner name..."
					class="input w-full field-control"
				/>
			</div>

			<div>
				<label
					for="state"
					class="flex items-center gap-1.5 text-xs font-medium text-[#a89e8e] uppercase tracking-wide mb-2"
				>
					<FluentLocation20Filled class="size-3.5" /> State
				</label>
				<select id="state" bind:value={selectedState} class="select w-full field-control">
					<option value="all">All States</option>
					{#each data.states as state}
						<option value={state.id}>{state.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<p class="mt-3 text-xs text-[#a89e8e]">
			Showing {filteredCompanies.length} of {data.companies.length} companies
		</p>
	</div>

	<!-- Company List -->
	{#if filteredCompanies.length > 0}
		<div class="space-y-2 md:space-y-3">
			{#each filteredCompanies as company}
				<a href="/company/{company.id}" class="block relative overflow-hidden rounded-xl panel-interactive group">
					<div class="relative p-4 md:p-5">
						<div class="flex items-center gap-3 md:gap-4">
							<Logo
								src={company.logo}
								alt={company.name}
								placeholderIcon={FluentBuilding20Filled}
								placeholderGradient="from-[#8c709b] to-[#315d8d]"
								class="size-12 md:size-14 rounded-xl shrink-0"
							/>

							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-[#fff7e8] text-base md:text-lg truncate">{company.name}</h3>
								<p class="text-xs md:text-sm text-[#a89e8e] truncate">
									{#if company.ownerPartyAbbreviation}
										<PartyTag abbreviation={company.ownerPartyAbbreviation} color={company.ownerPartyColor} />
									{/if}
									{company.ownerName || "Unknown owner"}
								</p>
							</div>

							<div class="hidden sm:flex items-center gap-4 md:gap-6 shrink-0">
								<div class="text-center">
									<p class="text-lg md:text-xl font-bold text-[#fff7e8]">{company.factoryCount}</p>
									<p class="text-xs text-[#a89e8e]">Factories</p>
								</div>
								<div class="text-center">
									<p class="text-lg md:text-xl font-bold text-[#fff7e8]">{company.workerCount}</p>
									<p class="text-xs text-[#a89e8e]">Workers</p>
								</div>
								{#if company.states.length > 0}
									<div class="text-center">
										<p class="text-lg md:text-xl font-bold text-[#fff7e8]">{company.states.length}</p>
										<p class="text-xs text-[#a89e8e]">{company.states.length === 1 ? "State" : "States"}</p>
									</div>
								{/if}
							</div>

							<FluentArrowRight20Filled
								class="size-5 text-[#a89e8e] group-hover:text-[#d5c4df] group-hover:translate-x-0.5 transition-all shrink-0 hidden md:block"
							/>
						</div>

						<!-- Mobile stats row -->
						<div class="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-[#dfceb0]/15">
							<span class="flex items-center gap-1 text-xs text-[#a89e8e]">
								<FluentFactory20Filled class="size-3.5 text-[#d5c4df]" />
								{company.factoryCount}
							</span>
							<span class="flex items-center gap-1 text-xs text-[#a89e8e]">
								<FluentPeople20Filled class="size-3.5 text-blue-400" />
								{company.workerCount}
							</span>
							{#if company.states.length > 0}
								<span class="flex items-center gap-1 text-xs text-[#a89e8e]">
									<FluentLocation20Filled class="size-3.5 text-green-400" />
									{company.states.length}
									{company.states.length === 1 ? "state" : "states"}
								</span>
							{/if}
							<span class="ml-auto text-xs text-[#a89e8e]">
								{formatDate(company.foundedAt)}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="relative overflow-hidden rounded-xl md:rounded-2xl panel-muted p-10 md:p-16 text-center">
			<FluentBuilding20Filled class="size-12 md:size-16 text-[#a89e8e] mx-auto mb-4" />
			<h3 class="text-lg font-semibold text-[#fff7e8] mb-2">No Companies Found</h3>
			<p class="text-sm text-[#a89e8e]">
				{searchQuery || selectedState !== "all"
					? "Try adjusting your filters"
					: "No companies have been registered yet"}
			</p>
			{#if !data.userCompany}
				<a
					href="/company/create"
					class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#8c709b]/20 hover:bg-[#8c709b]/30
					       rounded-lg text-[#d5c4df] hover:text-[#f0e7f5] text-sm font-medium transition-all"
				>
					<FluentAdd20Filled class="size-4" />
					Be the first to register
				</a>
			{/if}
		</div>
	{/if}
</PageContainer>
