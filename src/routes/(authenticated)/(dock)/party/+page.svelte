<!-- src/routes/party/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import UserLink from "#lib/component/UserLink.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";

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
		const params = new URLSearchParams(page.url.searchParams.toString());
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
			<Button variant="primary" href="/party/create" icon={FluentAdd20Filled}>Found a party</Button>
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

	<!-- Party posters -->
	{#if filteredParties.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredParties as party (party.id)}
				<article class="panel-interactive rounded-sm overflow-hidden flex flex-col">
					<a href="/party/{party.id}" class="group flex-1 flex">
						<div class="w-2 shrink-0" style:background-color={party.color}></div>
						<div class="flex-1 min-w-0 p-4 space-y-3">
							<div class="flex items-start gap-3">
								<div
									class="size-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2"
									style="background-color: {party.color}; border-color: {party.color}"
								>
									{#if party.logoUrl}
										<img loading="lazy" decoding="async" src={party.logoUrl} alt="" class="size-full object-cover" />
									{:else}
										<FluentPeople20Filled class="size-7 text-[#f5efd8]" />
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<h3
										class="font-serif text-lg font-black uppercase leading-tight text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors line-clamp-2"
									>
										{party.name}
									</h3>
									<div class="mt-1 flex flex-wrap items-center gap-1.5">
										<PartyTag abbreviation={party.abbreviation} color={party.color} />
										{#if party.ideology}
											<Badge tone="purple" size="xs">{party.ideology}</Badge>
										{/if}
									</div>
								</div>
							</div>

							{#if party.description}
								<p class="font-serif text-sm italic text-[#d3caa9] line-clamp-2">“{party.description}”</p>
							{/if}

							<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#a8a083]">
								<span class="flex items-center gap-1">
									<FluentPeople20Filled class="size-3.5 text-[#c08cf0]" />
									<span class="font-bold text-[#f5efd8]">{party.memberCount}</span>
									{party.memberCount === 1 ? "member" : "members"}
								</span>
								{#if data.scope === "global" && party.stateName}
									<span class="flex items-center gap-1">
										<FluentLocation20Filled class="size-3.5" />{party.stateName}
									</span>
								{/if}
							</p>
						</div>
					</a>
					{#if party.leader}
						<div class="border-t border-[#c8b47a]/10 px-4 py-2.5 pl-6">
							<UserLink
								size="sm"
								id={party.leader.id}
								name={party.leader.name}
								avatar={party.leader.avatar}
								subtitle="Party leader"
							/>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon={FluentPeople20Filled} title="No parties found">
			{#snippet actions()}
				<Button variant="primary" href="/party/create" icon={FluentAdd20Filled}>Found a party</Button>
			{/snippet}
		</EmptyState>
	{/if}
</PageContainer>
