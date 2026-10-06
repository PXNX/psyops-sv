<!-- src/routes/(authenticated)/(dock)/state/[id]/region/+page.svelte -->
<script lang="ts">
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let searchInput = $state(data.search);
	let selectedSort = $state(data.sortBy);

	const sortOptions = [
		{ value: "rating", label: "Rating" },
		{ value: "population", label: "Population" },
		{ value: "infrastructure", label: "Infrastructure" },
		{ value: "economy", label: "Economy" },
		{ value: "education", label: "Education" },
		{ value: "hospitals", label: "Hospitals" },
		{ value: "fortifications", label: "Fortifications" }
	];

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput);
		if (selectedSort) params.set("sort", selectedSort);
		goto(`/state/${data.state.id}/region?${params.toString()}`);
	}
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Regions"
		subtitle="{data.regions.length} regions"
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<!-- Search and Filters -->
	<div class="panel rounded-sm p-4">
		<div class="flex flex-col md:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1 relative">
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#a8a083]" />
				<input
					type="text"
					bind:value={searchInput}
					onkeydown={(e) => e.key === "Enter" && applyFilters()}
					placeholder="Search regions..."
					class="w-full pl-10 pr-4 py-2.5 field-control rounded-sm"
				/>
			</div>

			<!-- Sort Dropdown -->
			<div class="flex gap-2">
				<select bind:value={selectedSort} onchange={() => applyFilters()} class="px-4 py-2.5 field-control rounded-sm">
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Regions Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.regions as region}
			<a href="/region/{region.id}" class="group panel-interactive rounded-sm overflow-hidden">
				<!-- Region Header -->
				<div class="h-24 relative bg-[#1a1f15]/70 border-b border-[#c8b47a]/10">
					<!-- Region Logo -->
					<div class="absolute bottom-0 left-4 translate-y-1/2">
						<div class="rounded-sm">
							<Logo
								src="/coats/{region.id}.svg"
								alt={region.name}
								class="size-16 rounded-sm"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-[#2369b5] to-[#2369b5]"
							/>
						</div>
					</div>

					<!-- Residence Badge -->
					{#if data.userRegionIds.includes(region.id)}
						<div class="absolute top-3 right-3">
							<Badge tone="green" icon={FluentHome20Filled}>Resident</Badge>
						</div>
					{/if}
				</div>

				<!-- Region Content -->
				<div class="px-4 pt-10 pb-4 space-y-3">
					<!-- Name and Rating -->
					<div>
						<h3 class="text-lg font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors">
							{region.name}
						</h3>
						<div class="flex items-center gap-3 text-sm text-[#a8a083] mt-1">
							<span>Rating: {region.rating || 0}</span>
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="flex items-center gap-1 text-[#a8a083]">
							<FluentPeople20Filled class="size-3" />
							<span>{region.population.toLocaleString()}</span>
						</div>
						<div class="text-[#a8a083]">Infrastructure: {region.infrastructure || 0}</div>
						<div class="text-[#a8a083]">Economy: {region.economy || 0}</div>
						<div class="text-[#a8a083]">Education: {region.education || 0}</div>
					</div>

					<!-- Resources (if any) -->
					{#if region.oil || region.steel || region.chromium || region.tungsten || region.rubber || region.aluminium}
						<div class="pt-2 border-t border-[#c8b47a]/10">
							<div class="flex flex-wrap gap-1">
								{#if region.oil}
									<span
										class="px-2 py-0.5 bg-[#f2b01e]/15 border border-[#f2b01e]/30 rounded-sm text-xs text-[#ffd35c]"
									>
										Oil
									</span>
								{/if}
								{#if region.steel}
									<span class="px-2 py-0.5 bg-[#242a1d] border border-[#c8b47a]/20 rounded-sm text-xs text-[#d3caa9]">
										Steel
									</span>
								{/if}
								{#if region.chromium}
									<span
										class="px-2 py-0.5 bg-[#2369b5]/20 border border-[#5eaef5]/30 rounded-sm text-xs text-[#b3dcff]"
									>
										Chromium
									</span>
								{/if}
								{#if region.tungsten}
									<span
										class="px-2 py-0.5 bg-[#8a4fc0]/20 border border-[#c08cf0]/30 rounded-sm text-xs text-[#e3cbfb]"
									>
										Tungsten
									</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>

	<!-- Empty State -->
	{#if data.regions.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="size-20 mx-auto bg-[#1a1f15]/70 rounded-full flex items-center justify-center mb-4">
				<FluentSearch20Filled class="size-10 text-[#a8a083]" />
			</div>
			<h3 class="text-xl font-bold text-[#f5efd8] mb-2">No regions found</h3>
			<p class="text-[#a8a083]/70">Try adjusting your search or filters</p>
		</div>
	{/if}
</PageContainer>
