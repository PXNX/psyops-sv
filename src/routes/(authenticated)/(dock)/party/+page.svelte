<!-- src/routes/party/+page.svelte -->
<script lang="ts">
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";

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
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Political Parties</h1>
			<p class="text-gray-400 mt-1">Browse parties in {data.stateName}</p>
		</div>
		<a href="/party/create" class="btn btn-primary gap-2">
			<FluentAdd20Filled class="size-5" />
			Create Party
		</a>
	</div>

	<!-- Search -->
	<div class="relative">
		<FluentSearch20Filled class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search parties by name, abbreviation, or ideology..."
			class="input input-bordered w-full pl-12 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500"
		/>
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
						<div class="flex items-center justify-between text-sm">
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
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="card bg-slate-800/50 border border-white/5">
			<div class="card-body text-center py-12">
				<FluentPeople20Filled class="size-16 text-gray-600 mx-auto mb-4" />
				<p class="text-gray-400 text-lg">No parties found</p>
				<p class="text-gray-500 text-sm mt-1">Try adjusting your search or create a new party</p>
			</div>
		</div>
	{/if}
</div>
