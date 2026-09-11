<!-- src/routes/(authenticated)/(dock)/state/[id]/region/+page.svelte -->
<script lang="ts">
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import Logo from "$lib/component/Logo.svelte";
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

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}" class="text-sm text-[#a89e8e] hover:text-[#d5c4df] transition-colors">
			{data.state.name}
		</a>
		<h1 class="text-3xl font-bold text-[#fff7e8] mt-1">Regions</h1>
		<p class="text-[#a89e8e] mt-1">{data.regions.length} regions</p>
	</div>

	<!-- Search and Filters -->
	<div class="panel rounded-xl p-4">
		<div class="flex flex-col md:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1 relative">
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#a89e8e]" />
				<input
					type="text"
					bind:value={searchInput}
					onkeydown={(e) => e.key === "Enter" && applyFilters()}
					placeholder="Search regions..."
					class="w-full pl-10 pr-4 py-2 field-control rounded-lg"
				/>
			</div>

			<!-- Sort Dropdown -->
			<div class="flex gap-2">
				<select
					bind:value={selectedSort}
					onchange={() => applyFilters()}
					class="px-4 py-2 field-control rounded-lg"
				>
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
			<a
				href="/region/{region.id}"
				class="group panel rounded-xl hover:border-[#b7a0c5]/40 transition-all overflow-hidden"
			>
				<!-- Region Header -->
				<div class="h-24 relative bg-gradient-to-br from-[#8c709b]/20 to-[#315d8d]/20">
					<div class="absolute inset-0 bg-gradient-to-b from-transparent to-[#14283f]" />

					<!-- Region Logo -->
					<div class="absolute bottom-0 left-4 translate-y-1/2">
						<div class="rounded-xl">
							<Logo
								src="/coats/{region.id}.svg"
								alt={region.name}
								class="size-16 rounded-xl"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-[#8c709b] to-[#315d8d]"
							/>
						</div>
					</div>

					<!-- Residence Badge -->
					{#if data.userRegionIds.includes(region.id)}
						<div class="absolute top-3 right-3">
							<div
								class="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-1"
							>
								<FluentHome20Filled class="size-3 text-emerald-400" />
								<span class="text-xs text-emerald-400 font-medium">Resident</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Region Content -->
				<div class="px-4 pt-10 pb-4 space-y-3">
					<!-- Name and Rating -->
					<div>
						<h3 class="text-lg font-bold text-[#fff7e8] group-hover:text-[#d5c4df] transition-colors">
							{region.name}
						</h3>
						<div class="flex items-center gap-3 text-sm text-[#a89e8e] mt-1">
							<span>Rating: {region.rating || 0}</span>
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="flex items-center gap-1 text-[#a89e8e]">
							<FluentPeople20Filled class="size-3" />
							<span>{region.population.toLocaleString()}</span>
						</div>
						<div class="text-[#a89e8e]">Infrastructure: {region.infrastructure || 0}</div>
						<div class="text-[#a89e8e]">Economy: {region.economy || 0}</div>
						<div class="text-[#a89e8e]">Education: {region.education || 0}</div>
					</div>

					<!-- Resources (if any) -->
					{#if region.oil || region.steel || region.chromium || region.tungsten || region.rubber || region.aluminium}
						<div class="pt-2 border-t border-[#dfceb0]/10">
							<div class="flex flex-wrap gap-1">
								{#if region.oil}
									<span class="px-2 py-0.5 bg-[#e6a527]/15 border border-[#e6a527]/30 rounded text-xs text-[#f7c56b]">
										Oil
									</span>
								{/if}
								{#if region.steel}
									<span class="px-2 py-0.5 bg-[#14283f] border border-[#dfceb0]/20 rounded text-xs text-[#d9ccb7]">
										Steel
									</span>
								{/if}
								{#if region.chromium}
									<span class="px-2 py-0.5 bg-[#315d8d]/20 border border-[#7ba0c8]/30 rounded text-xs text-[#b7d0e6]">
										Chromium
									</span>
								{/if}
								{#if region.tungsten}
									<span
										class="px-2 py-0.5 bg-[#8c709b]/20 border border-[#b7a0c5]/30 rounded text-xs text-[#d5c4df]"
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
		<div class="text-center py-12">
			<div class="size-20 mx-auto bg-[#102239]/70 rounded-full flex items-center justify-center mb-4">
				<FluentSearch20Filled class="size-10 text-[#a89e8e]" />
			</div>
			<h3 class="text-xl font-bold text-[#a89e8e] mb-2">No regions found</h3>
			<p class="text-[#a89e8e]/70">Try adjusting your search or filters</p>
		</div>
	{/if}
</div>
