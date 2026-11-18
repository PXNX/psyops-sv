<!-- src/routes/bloc/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { enhance } from "$app/forms";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";

	const { data } = $props();

	let searchInput = $state(data.search || "");
	let sortBy = $state(data.sortBy || "members");

	const sortOptions = [
		{ value: "members", label: "Member States" },
		{ value: "population", label: "Total Population" },
		{ value: "name", label: "Name" }
	];

	let debounceTimer: ReturnType<typeof setTimeout>;

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set("search", searchInput.trim());
		if (sortBy) params.set("sort", sortBy);
		goto(`?${params.toString()}`, { reset: false });
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 300);
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === "Enter") {
			clearTimeout(debounceTimer);
			applyFilters();
		}
	}

	function clearSearch() {
		searchInput = "";
		clearTimeout(debounceTimer);
		applyFilters();
	}

	function formatPopulation(n: number) {
		if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
		if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
		return String(n);
	}
</script>

<svelte:head>
	<title>Political Blocs</title>
	<meta name="description" content="Browse every political-military alliance in PsyOps." />
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		documentTitle={false}
		title="Political Blocs"
		subtitle="{data.blocs.length} {data.blocs.length === 1 ? 'alliance' : 'alliances'} in force"
	>
		{#snippet actions()}
			{#if data.canCreateBloc}
				<Button href="/bloc/create" icon={FluentAdd20Filled}>Found a bloc</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Search -->
		<div class="relative flex-1">
			<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#8e9abb]" />
			<input
				type="text"
				bind:value={searchInput}
				oninput={handleSearchInput}
				onkeypress={handleKeyPress}
				placeholder="Search blocs by name..."
				aria-label="Search blocs"
				class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
			/>
			{#if searchInput}
				<button
					type="button"
					onclick={clearSearch}
					aria-label="Clear search"
					class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-sm text-[#8e9abb] hover:text-[#eef2ff] hover:bg-[#f5a524]/10 transition-colors"
				>
					<FluentDismiss20Filled class="size-4" />
				</button>
			{/if}
		</div>

		<!-- Sort -->
		<select
			bind:value={sortBy}
			onchange={applyFilters}
			aria-label="Sort blocs"
			class="field-control rounded-sm px-4 py-2.5 sm:w-auto"
		>
			{#each sortOptions as option}
				<option value={option.value}>Sort: {option.label}</option>
			{/each}
		</select>
	</div>

	<!-- Active search indicator -->
	{#if data.search}
		<div class="flex items-center gap-2 text-sm text-[#8e9abb]">
			<span>
				{data.blocs.length}
				{data.blocs.length === 1 ? "result" : "results"} for
				<span class="font-semibold text-[#eef2ff]">"{data.search}"</span>
			</span>
			<Button variant="ghost" size="xs" icon={FluentDismiss20Filled} onclick={clearSearch}>Clear</Button>
		</div>
	{/if}

	<!-- Blocs -->
	{#if data.blocs.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.blocs as bloc (bloc.id)}
				<article
					class="panel-interactive rounded-sm flex flex-col overflow-hidden {bloc.isUserMember
						? 'border-[#4fd88a]/40'
						: ''}"
				>
					<div class="h-1.5 shrink-0" style:background-color={bloc.color}></div>
					<a href="/bloc/{bloc.id}" class="group flex-1 p-4 space-y-3">
						<div class="flex items-center gap-3">
							<div
								class="size-12 rounded-full flex items-center justify-center shrink-0 border-2"
								style="border-color: {bloc.color}; background-color: {bloc.color}26;"
							>
								<FluentFlag20Filled class="size-6" style="color: {bloc.color}" />
							</div>
							<div class="flex-1 min-w-0">
								<h2
									class="font-serif text-lg font-bold leading-tight text-[#eef2ff] group-hover:text-[#ffc857] transition-colors truncate"
								>
									{bloc.name}
								</h2>
								<p class="text-[10px] uppercase tracking-[0.2em] text-[#8e9abb]">
									Since {new Date(bloc.createdAt).getFullYear()}
								</p>
							</div>
							{#if bloc.isUserMember}
								<Badge tone="green" icon={FluentCheckmarkCircle20Filled}>Yours</Badge>
							{/if}
						</div>

						{#if bloc.description}
							<p class="font-serif text-sm italic text-[#c2cbe3] line-clamp-2">{bloc.description}</p>
						{/if}

						<!-- Member flags -->
						{#if bloc.members.length}
							<div class="flex items-center">
								<div class="flex -space-x-1.5">
									{#each bloc.members.slice(0, 8) as m (m.id)}
										<Logo
											src={m.logo}
											alt={m.name}
											class="size-7 rounded-sm ring-2 ring-[#131c33]"
											placeholderIcon={FluentBuildingGovernment20Filled}
										/>
									{/each}
								</div>
								{#if bloc.members.length > 8}
									<span class="ml-2 text-xs text-[#8e9abb]">+{bloc.members.length - 8}</span>
								{/if}
							</div>
						{/if}

						<p class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8e9abb]">
							<span class="flex items-center gap-1"
								><FluentBuildingGovernment20Filled class="size-3.5 text-[#6aa8ff]" />
								<span class="font-bold text-[#eef2ff]">{bloc.memberCount}</span>
								{bloc.memberCount === 1 ? "state" : "states"}</span
							>
							<span class="flex items-center gap-1"
								><FluentPeople20Filled class="size-3.5 text-[#ffcb6b]" />
								<span class="font-bold text-[#eef2ff]">{formatPopulation(bloc.totalPopulation)}</span> citizens</span
							>
						</p>
					</a>

					{#if bloc.leader || bloc.isPendingApplication || (data.userPresidency && !data.userPresidency.blocId && !data.pendingApplicationBlocId)}
						<div class="flex items-center justify-between gap-2 border-t border-[#8ea6e0]/10 px-4 py-2.5">
							{#if bloc.leader}
								<UserLink
									size="sm"
									id={bloc.leader.id}
									name={bloc.leader.name}
									avatar={bloc.leader.avatar}
									subtitle="Bloc leader"
								/>
							{:else}
								<span class="text-xs text-[#8e9abb]">No leader elected</span>
							{/if}

							{#if bloc.isPendingApplication}
								<Badge tone="amber" icon={FluentFlag20Filled}>Applied</Badge>
							{:else if data.userPresidency && !data.userPresidency.blocId && !data.pendingApplicationBlocId}
								<form method="POST" action="?/apply" use:enhance>
									<input type="hidden" name="blocId" value={bloc.id} />
									<Button type="submit" variant="soft-amber" size="xs" icon={FluentFlag20Filled}>Apply</Button>
								</form>
							{/if}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{:else}
		<EmptyState icon={FluentGlobe20Filled} title={data.search ? `No blocs match "${data.search}"` : "No blocs yet"}>
			{#snippet actions()}
				{#if data.search}
					<Button variant="secondary" size="sm" onclick={clearSearch}>Clear search</Button>
				{:else if data.canCreateBloc}
					<Button href="/bloc/create" icon={FluentAdd20Filled}>Found a bloc</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{/if}
</PageContainer>
