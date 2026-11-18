<!-- src/routes/company/+page.svelte -->
<!-- The commercial register: one entry per company, numbered like a registry ledger. -->
<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";

	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, SearchSelect } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	let { data } = $props();

	let selectedState = $state("all");
	let searchQuery = $state("");

	const filteredCompanies = $derived.by(() => {
		let filtered = data.companies;

		if (selectedState !== "all") {
			filtered = filtered.filter((c) => c.states.some((s) => String(s.id) === selectedState));
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(c) => c.name.toLowerCase().includes(query) || c.ownerName?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	const stateItems = $derived([
		{ id: "all", name: "All states" },
		...data.states.map((s) => ({ id: s.id, name: s.name }))
	]);

	const entryNo = (id: number) => `HRB ${String(id).padStart(4, "0")}`;
</script>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Companies"
		subtitle="{data.companies.length} {data.companies.length === 1 ? 'company' : 'companies'} on file"
		icon={FluentBuilding20Filled}
	>
		{#snippet actions()}
			{#if !data.userCompany}
				<Button variant="primary" href="/company/create" icon={FluentAdd20Filled}>Register Company</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Your own entry, pinned to the top of the register -->
	{#if data.userCompany}
		<a
			href="/company/{data.userCompany.id}"
			class="block panel-interactive rounded-sm p-4 sm:p-5 group border-l-4 border-l-accent"
		>
			<p class="text-[10px] uppercase tracking-[0.2em] text-accent-fg mb-2">
				Your firm · <span class="font-mono">{entryNo(data.userCompany.id)}</span>
			</p>
			<div class="flex items-center gap-4">
				<Logo
					src={data.userCompany.logo}
					alt=""
					placeholderIcon={FluentBuilding20Filled}
					placeholderGradient="from-surface-13 to-surface-6"
					class="size-14 sm:size-16 rounded-sm shrink-0"
				/>
				<div class="min-w-0 flex-1">
					<h2
						class="font-serif text-xl sm:text-2xl font-bold text-fg group-hover:text-accent-hover transition-colors truncate"
					>
						{data.userCompany.name}
					</h2>
					<p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-fg-muted">
						<span class="flex items-center gap-1.5">
							<FluentFactory20Filled class="size-4 text-politics" />
							{data.userCompany.factoryCount}
							{data.userCompany.factoryCount === 1 ? "factory" : "factories"}
						</span>
						<span class="flex items-center gap-1.5">
							<FluentPeople20Filled class="size-4 text-friendly" />
							{data.userCompany.workerCount}
							{data.userCompany.workerCount === 1 ? "worker" : "workers"}
						</span>
						<span>Est. {formatDate(data.userCompany.foundedAt)}</span>
					</p>
				</div>
			</div>
		</a>
	{/if}

	<!-- Register search -->
	<div class="grid grid-cols-1 sm:grid-cols-[1fr_14rem] gap-3">
		<label class="relative block">
			<span class="sr-only">Search company or owner</span>
			<FluentSearch20Filled
				class="size-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
			/>
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Company or owner…"
				class="field-control rounded-sm pl-9 pr-3 py-2.5 w-full"
			/>
		</label>
		<div class="min-w-0">
			<SearchSelect
				items={stateItems}
				bind:value={selectedState}
				id="register-state"
				placeholder="All states"
				searchPlaceholder="Search states…"
			/>
		</div>
	</div>

	{#if filteredCompanies.length > 0}
		<section class="panel rounded-sm overflow-hidden">
			<div
				class="hidden sm:grid grid-cols-[6rem_1fr_12rem_9rem] gap-4 px-5 py-2 border-b border-line/20 text-[10px] uppercase tracking-wide text-fg-muted"
			>
				<span>Entry</span>
				<span>Company</span>
				<span>Proprietor</span>
				<span class="text-right">Works · Staff</span>
			</div>
			<ul class="divide-y divide-line/10">
				{#each filteredCompanies as company (company.id)}
					<li
						class="relative group px-4 sm:px-5 py-3 transition-colors hover:bg-accent/6 sm:grid sm:grid-cols-[6rem_1fr_12rem_9rem] sm:gap-4 sm:items-center"
					>
						<span class="hidden sm:block font-mono text-xs text-fg-muted">{entryNo(company.id)}</span>

						<div class="flex items-center gap-3 min-w-0">
							<Logo
								src={company.logo}
								alt=""
								placeholderIcon={FluentBuilding20Filled}
								placeholderGradient="from-surface-13 to-surface-6"
								class="size-10 sm:size-11 rounded-sm shrink-0"
							/>
							<div class="min-w-0">
								<a
									href="/company/{company.id}"
									class="font-bold text-fg group-hover:text-accent-hover transition-colors truncate block after:absolute after:inset-0"
								>
									{company.name}
								</a>
								<p class="text-xs text-fg-muted truncate">
									<span class="sm:hidden font-mono">{entryNo(company.id)} · </span>Est. {formatDate(
										company.foundedAt
									)}{#if company.states.length > 0}
										· {company.states.map((s) => s.name).join(", ")}{/if}
								</p>
							</div>
						</div>

						<div class="relative z-10 mt-2 sm:mt-0 flex items-center justify-between gap-3 min-w-0">
							<UserLink
								id={company.ownerId}
								name={company.ownerName}
								avatar={company.ownerAvatar}
								party={{ abbreviation: company.ownerPartyAbbreviation, color: company.ownerPartyColor }}
								size="sm"
							/>
							<span class="sm:hidden shrink-0 flex items-center gap-3 text-xs text-fg-muted">
								<span class="flex items-center gap-1"
									><FluentFactory20Filled class="size-3.5 text-politics" />{company.factoryCount}</span
								>
								<span class="flex items-center gap-1"
									><FluentPeople20Filled class="size-3.5 text-friendly" />{company.workerCount}</span
								>
							</span>
						</div>

						<div class="hidden sm:flex justify-end items-center gap-4 text-sm">
							<span class="flex items-center gap-1.5 text-fg-body" title="Factories">
								<FluentFactory20Filled class="size-4 text-politics" />{company.factoryCount}
							</span>
							<span class="flex items-center gap-1.5 text-fg-body" title="Workers">
								<FluentPeople20Filled class="size-4 text-friendly" />{company.workerCount}
							</span>
						</div>
					</li>
				{/each}
			</ul>
			<p class="px-5 py-2 border-t border-line/15 text-xs text-fg-muted">
				{filteredCompanies.length} of {data.companies.length} entries
			</p>
		</section>
	{:else}
		<EmptyState
			icon={searchQuery || selectedState !== "all" ? FluentLocation20Filled : FluentBuilding20Filled}
			title={searchQuery || selectedState !== "all" ? "No matching entries" : "The register is empty"}
		>
			{#snippet actions()}
				{#if !data.userCompany}
					<Button variant="secondary" size="sm" href="/company/create" icon={FluentAdd20Filled}>
						Register the first company
					</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{/if}
</PageContainer>
