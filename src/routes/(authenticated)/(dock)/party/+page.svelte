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
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold text-white">Political Parties</h1>
			<p class="text-gray-400 mt-1">
				{data.parties.length}
				{data.parties.length === 1 ? "party" : "parties"}
				{data.scope === "state" ? `in ${data.stateName}` : "across all states"}
			</p>
		</div>
		<a href="/party/create" class="btn btn-primary gap-2">
			<FluentAdd20Filled class="size-5" />
			Create your own party
		</a>
	</div>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="relative flex-1">
			<FluentSearch20Filled class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search parties by name, abbreviation, or ideology..."
				class="input input-bordered w-full pl-12 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500"
			/>
		</div>

		<!-- Scope: my state vs global -->
		<div class="join">
			<button
				type="button"
				class="btn join-item {data.scope === 'state' ? 'btn-primary' : 'btn-ghost bg-slate-800/50 border-white/10'}"
				onclick={() => updateParams({ scope: null })}
			>
				<FluentLocation20Filled class="size-4" />
				{data.stateName}
			</button>
			<button
				type="button"
				class="btn join-item {data.scope === 'global' ? 'btn-primary' : 'btn-ghost bg-slate-800/50 border-white/10'}"
				onclick={() => updateParams({ scope: "global" })}
			>
				<FluentGlobe20Filled class="size-4" />
				Global
			</button>
		</div>

		<!-- Sort -->
		<select
			value={data.sort}
			onchange={(e) => updateParams({ sort: e.currentTarget.value })}
			class="select select-bordered bg-slate-800/50 border-white/10 text-white"
		>
			<option value="size">Sort: Size</option>
			<option value="age">Sort: Age</option>
		</select>

		<!-- Ideology filter -->
		<select
			value={data.ideology ?? ""}
			onchange={(e) => updateParams({ ideology: e.currentTarget.value || null })}
			class="select select-bordered bg-slate-800/50 border-white/10 text-white"
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
				<a
					href="/party/{party.id}"
					class="card bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all group"
				>
					<div class="card-body p-5">
						<!-- Party Header -->
						<div class="flex items-start gap-3 mb-3">
							<div
								class="size-12 rounded-lg flex items-center justify-center flex-shrink-0"
								style="background-color: {party.color}"
							>
								{#if party.logoUrl}
									<img src={party.logoUrl} alt={party.name} class="size-10 object-contain" />
								{:else}
									<FluentPeople20Filled class="size-6 text-white" />
								{/if}
							</div>

							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-white group-hover:text-purple-400 transition-colors truncate">
									{party.name}
								</h3>
								{#if party.abbreviation}
									<span
										class="inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1"
										style="background-color: {party.color}20; color: {party.color}"
									>
										{party.abbreviation}
									</span>
								{/if}
							</div>
						</div>

						<!-- Description -->
						{#if party.description}
							<p class="text-sm text-gray-400 line-clamp-2 mb-3">{party.description}</p>
						{/if}

						<!-- Stats -->
						<div class="flex items-center justify-between text-sm flex-wrap gap-2">
							<div class="flex items-center gap-1 text-gray-400">
								<FluentPeople20Filled class="size-4" />
								<span>{party.memberCount} members</span>
							</div>
							{#if party.ideology}
								<div class="flex items-center gap-1 text-gray-400">
									<FluentFlag20Filled class="size-4" />
									<span>{party.ideology}</span>
								</div>
							{/if}
						</div>
						{#if data.scope === "global" && party.stateName}
							<div class="flex items-center gap-1 text-xs text-gray-500 mt-2">
								<FluentLocation20Filled class="size-3" />
								<span>{party.stateName}</span>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="card bg-slate-800/50 border border-white/5">
			<div class="card-body text-center py-12">
				<FluentPeople20Filled class="size-16 text-gray-600 mx-auto mb-4" />
				<p class="text-gray-400 text-lg">No parties found</p>
				<p class="text-gray-500 text-sm mt-1">Try adjusting your search or create your own party</p>
				<a href="/party/create" class="btn btn-primary gap-2 mt-4 mx-auto">
					<FluentAdd20Filled class="size-5" />
					Create your own party
				</a>
			</div>
		</div>
	{/if}
</div>
