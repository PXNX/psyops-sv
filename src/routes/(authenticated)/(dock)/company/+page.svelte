<!-- src/routes/company/+page.svelte -->
<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";

	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import { formatDate } from "#lib/utils/formatting.js";

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

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader title="Companies" icon={FluentBuilding20Filled}>
		{#snippet actions()}
			{#if data.userCompany}
				<Button variant="soft-purple" href="/company/{data.userCompany.id}" icon={FluentBuilding20Filled}>
					My Company
				</Button>
			{:else}
				<Button variant="primary" href="/company/create" icon={FluentAdd20Filled}>Register Company</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- User's Company Card -->
	{#if data.userCompany}
		<a href="/company/{data.userCompany.id}" class="block panel-interactive rounded-sm p-4 md:p-5 group">
			<div class="flex flex-col sm:flex-row items-start gap-4">
				<Logo
					src={data.userCompany.logo}
					alt={data.userCompany.name}
					placeholderIcon={FluentBuilding20Filled}
					placeholderGradient="from-[#8a4fc0] to-[#2369b5]"
					class="size-16 md:size-20 rounded-sm shrink-0"
				/>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2.5 rounded-full bg-[#6fd14a]"></div>
						<span class="text-[10px] font-medium text-[#a8a083] uppercase tracking-wide">Your Company</span>
					</div>
					<h2
						class="text-xl md:text-2xl font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate mb-2"
					>
						{data.userCompany.name}
					</h2>
					<div class="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-[#a8a083]">
						<span class="flex items-center gap-1.5">
							<FluentFactory20Filled class="size-4 text-[#c08cf0]" />
							{data.userCompany.factoryCount}
							{data.userCompany.factoryCount === 1 ? "factory" : "factories"}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentPeople20Filled class="size-4 text-[#5eaef5]" />
							{data.userCompany.workerCount}
							{data.userCompany.workerCount === 1 ? "worker" : "workers"}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentCalendar20Filled class="size-4 text-[#a8a083]" />
							Founded {formatDate(data.userCompany.foundedAt)}
						</span>
					</div>
				</div>

				<FluentArrowRight20Filled
					class="size-5 md:size-6 text-[#a8a083] group-hover:text-[#ffcf47] group-hover:translate-x-1 transition-all shrink-0 hidden sm:block"
				/>
			</div>
		</a>
	{/if}

	<!-- Filters -->
	<div class="panel-muted rounded-sm p-4 md:p-5">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
			<div>
				<label for="search" class="field-label flex items-center gap-1.5">
					<FluentSearch20Filled class="size-3.5 text-[#a8a083]" /> Search
				</label>
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Company or owner name..."
					class="field-control rounded-sm px-3 py-2.5 w-full"
				/>
			</div>

			<div>
				<label for="state" class="field-label flex items-center gap-1.5">
					<FluentLocation20Filled class="size-3.5 text-[#a8a083]" /> State
				</label>
				<select id="state" bind:value={selectedState} class="field-control rounded-sm px-3 py-2.5 w-full">
					<option value="all">All States</option>
					{#each data.states as state}
						<option value={state.id}>{state.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<p class="mt-3 text-xs text-[#a8a083]">
			Showing {filteredCompanies.length} of {data.companies.length} companies
		</p>
	</div>

	<!-- Company List -->
	{#if filteredCompanies.length > 0}
		<div class="space-y-2 md:space-y-3">
			{#each filteredCompanies as company}
				<a href="/company/{company.id}" class="block panel-interactive rounded-sm p-4 md:p-5 group">
					<div class="flex items-center gap-3 md:gap-4">
						<Logo
							src={company.logo}
							alt={company.name}
							placeholderIcon={FluentBuilding20Filled}
							placeholderGradient="from-[#8a4fc0] to-[#2369b5]"
							class="size-12 md:size-14 rounded-sm shrink-0"
						/>

						<div class="flex-1 min-w-0">
							<h3
								class="font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors text-base md:text-lg truncate"
							>
								{company.name}
							</h3>
							<p class="text-xs md:text-sm text-[#a8a083] truncate">
								{#if company.ownerPartyAbbreviation}
									<PartyTag abbreviation={company.ownerPartyAbbreviation} color={company.ownerPartyColor} />
								{/if}
								{company.ownerName || "Unknown owner"}
							</p>
						</div>

						<div class="hidden sm:flex items-center gap-4 md:gap-6 shrink-0">
							<div class="text-center">
								<p class="text-lg md:text-xl font-bold text-[#f5efd8]">{company.factoryCount}</p>
								<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Factories</p>
							</div>
							<div class="text-center">
								<p class="text-lg md:text-xl font-bold text-[#f5efd8]">{company.workerCount}</p>
								<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Workers</p>
							</div>
							{#if company.states.length > 0}
								<div class="text-center">
									<p class="text-lg md:text-xl font-bold text-[#f5efd8]">{company.states.length}</p>
									<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">
										{company.states.length === 1 ? "State" : "States"}
									</p>
								</div>
							{/if}
						</div>

						<FluentArrowRight20Filled
							class="size-5 text-[#a8a083] group-hover:text-[#ffcf47] group-hover:translate-x-0.5 transition-all shrink-0 hidden md:block"
						/>
					</div>

					<!-- Mobile stats row -->
					<div class="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-[#c8b47a]/15">
						<span class="flex items-center gap-1 text-xs text-[#a8a083]">
							<FluentFactory20Filled class="size-3.5 text-[#c08cf0]" />
							{company.factoryCount}
						</span>
						<span class="flex items-center gap-1 text-xs text-[#a8a083]">
							<FluentPeople20Filled class="size-3.5 text-[#5eaef5]" />
							{company.workerCount}
						</span>
						{#if company.states.length > 0}
							<span class="flex items-center gap-1 text-xs text-[#a8a083]">
								<FluentLocation20Filled class="size-3.5 text-[#6fd14a]" />
								{company.states.length}
								{company.states.length === 1 ? "state" : "states"}
							</span>
						{/if}
						<span class="ml-auto text-xs text-[#a8a083]">
							{formatDate(company.foundedAt)}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#1a1f15] mb-4">
				<FluentBuilding20Filled class="size-8 text-[#a8a083]" />
			</div>
			<h3 class="text-xl font-bold text-[#f5efd8] mb-2">No Companies Found</h3>
			<p class="text-[#a8a083] mb-4">
				{searchQuery || selectedState !== "all"
					? "Try adjusting your filters"
					: "No companies have been registered yet"}
			</p>
			{#if !data.userCompany}
				<Button variant="secondary" size="sm" href="/company/create" icon={FluentAdd20Filled}>
					Be the first to register
				</Button>
			{/if}
		</div>
	{/if}
</PageContainer>
