<!-- src/routes/(authenticated)/(dock)/state/[id]/region/+page.svelte -->
<script lang="ts">
	import { regionCoatUrl } from "#lib/utils/formatting.js";
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
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-fg-muted" />
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
				<div class="h-24 relative bg-surface-4/70 border-b border-line/10">
					<!-- Region Logo -->
					<div class="absolute bottom-0 left-4 translate-y-1/2">
						<div class="rounded-sm">
							<Logo
								src={regionCoatUrl(region.id)}
								alt={region.name}
								class="size-16 rounded-sm"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-friendly-bg to-friendly-bg"
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
						<h3 class="text-lg font-bold text-fg group-hover:text-primary-hover transition-colors">
							{region.name}
						</h3>
						<div class="flex items-center gap-3 text-sm text-fg-muted mt-1">
							<span>Rating: {region.rating || 0}</span>
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="flex items-center gap-1 text-fg-muted">
							<FluentPeople20Filled class="size-3" />
							<span>{region.population.toLocaleString()}</span>
						</div>
						<div class="text-fg-muted">Infrastructure: {region.infrastructure || 0}</div>
						<div class="text-fg-muted">Economy: {region.economy || 0}</div>
						<div class="text-fg-muted">Education: {region.education || 0}</div>
					</div>

					<!-- Resources (if any) -->
					{#if region.oil || region.steel || region.chromium || region.tungsten || region.rubber || region.aluminium}
						<div class="pt-2 border-t border-line/10">
							<div class="flex flex-wrap gap-1">
								{#if region.oil}
									<span class="px-2 py-0.5 bg-primary/15 border border-primary/30 rounded-sm text-xs text-primary-fg">
										Oil
									</span>
								{/if}
								{#if region.steel}
									<span class="px-2 py-0.5 bg-surface-6 border border-line/20 rounded-sm text-xs text-fg-soft">
										Steel
									</span>
								{/if}
								{#if region.chromium}
									<span
										class="px-2 py-0.5 bg-friendly-bg/20 border border-friendly/30 rounded-sm text-xs text-friendly-fg"
									>
										Chromium
									</span>
								{/if}
								{#if region.tungsten}
									<span
										class="px-2 py-0.5 bg-politics-bg/20 border border-politics/30 rounded-sm text-xs text-politics-fg"
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
			<div class="size-20 mx-auto bg-surface-4/70 rounded-full flex items-center justify-center mb-4">
				<FluentSearch20Filled class="size-10 text-fg-muted" />
			</div>
			<h3 class="text-xl font-bold text-fg mb-2">No regions found</h3>
			<p class="text-fg-muted/70">Try adjusting your search or filters</p>
		</div>
	{/if}
</PageContainer>
