<!-- src/routes/party/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	const { data } = $props();

	let searchQuery = $state("");

	const filteredParties = $derived(
		data.parties.filter(
			(party) =>
				party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				party.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				party.ideology?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function updateParams(changes: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (!value) params.delete(key);
			else params.set(key, value);
		}
		goto(`?${params.toString()}`, { reset: false });
	}
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Political Parties"
		subtitle={`${data.parties.length} ${data.parties.length === 1 ? "party" : "parties"} ${
			data.scope === "state" ? `in ${data.stateName}` : "across all states"
		}`}
	>
		{#snippet actions()}
			<Button variant="primary" href="/party/create" icon={FluentAdd20Filled}>Create your own party</Button>
		{/snippet}
	</PageHeader>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="relative flex-1">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#a8a083]" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search parties by name, abbreviation, or ideology..."
				class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
			/>
		</div>

		<!-- Scope: my state vs global -->
		<div class="join">
			<Button
				type="button"
				variant={data.scope === "state" ? "primary" : "secondary"}
				class="join-item"
				icon={FluentLocation20Filled}
				onclick={() => updateParams({ scope: null })}
			>
				{data.stateName}
			</Button>
			<Button
				type="button"
				variant={data.scope === "global" ? "primary" : "secondary"}
				class="join-item"
				icon={FluentGlobe20Filled}
				onclick={() => updateParams({ scope: "global" })}
			>
				Global
			</Button>
		</div>

		<!-- Sort -->
		<select
			value={data.sort}
			onchange={(e) => updateParams({ sort: e.currentTarget.value })}
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			<option value="size">Sort: Size</option>
			<option value="age">Sort: Age</option>
		</select>

		<!-- Ideology filter -->
		<select
			value={data.ideology ?? ""}
			onchange={(e) => updateParams({ ideology: e.currentTarget.value || null })}
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			<option value="">All ideologies</option>
			{#each data.ideologies as ideologyOption}
				<option value={ideologyOption.toLowerCase()}>{ideologyOption}</option>
			{/each}
		</select>
	</div>

	<!-- Party Grid -->
	{#if filteredParties.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredParties as party}
				<a href="/party/{party.id}" class="group panel-interactive rounded-sm p-5">
					<!-- Party Header -->
					<div class="flex items-start gap-3 mb-3">
						<div
							class="size-12 rounded-sm flex items-center justify-center shrink-0"
							style="background-color: {party.color}"
						>
							{#if party.logoUrl}
								<img src={party.logoUrl} alt={party.name} class="size-10 object-contain" />
							{:else}
								<FluentPeople20Filled class="size-6 text-[#f5efd8]" />
							{/if}
						</div>

						<div class="flex-1 min-w-0">
							<h3 class="font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
								{party.name}
							</h3>
							{#if party.abbreviation}
								<span
									class="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold mt-1"
									style="background-color: {party.color}20; color: {party.color}"
								>
									{party.abbreviation}
								</span>
							{/if}
						</div>
					</div>

					<!-- Description -->
					{#if party.description}
						<p class="text-sm text-[#a8a083] line-clamp-2 mb-3">{party.description}</p>
					{/if}

					<!-- Stats -->
					<div class="flex items-center justify-between text-sm flex-wrap gap-2">
						<div class="flex items-center gap-1 text-[#d3caa9]">
							<FluentPeople20Filled class="size-4 text-[#c08cf0]" />
							<span>{party.memberCount} members</span>
						</div>
						{#if party.ideology}
							<div class="flex items-center gap-1 text-[#d3caa9]">
								<FluentFlag20Filled class="size-4 text-[#c08cf0]" />
								<span>{party.ideology}</span>
							</div>
						{/if}
					</div>
					{#if data.scope === "global" && party.stateName}
						<div class="flex items-center gap-1 text-xs text-[#a8a083] mt-2">
							<FluentLocation20Filled class="size-3" />
							<span>{party.stateName}</span>
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{:else}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#1a1f15] mb-4">
				<FluentPeople20Filled class="size-8 text-[#a8a083]" />
			</div>
			<p class="text-xl font-bold text-[#f5efd8] mb-2">No parties found</p>
			<p class="text-[#a8a083] mb-4">Try adjusting your search or create your own party</p>
			<Button variant="primary" href="/party/create" icon={FluentAdd20Filled}>Create your own party</Button>
		</div>
	{/if}
</PageContainer>
