<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import { formatDate, getDurationText } from "#lib/utils/formatting.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<PageContainer maxWidth="4xl">
	<PageHeader
		title="Fallen States & Blocs"
		subtitle="A memorial to states and blocs that were conquered and dissolved."
	>
		{#snippet actions()}
			<Button variant="secondary" size="sm" href="/" icon={FluentHome20Filled}>Dashboard</Button>
		{/snippet}
	</PageHeader>

	<!-- Fallen States -->
	<section class="space-y-3">
		<h2 class="text-sm font-bold text-[#a8a083] uppercase tracking-wide flex items-center gap-2">
			<FluentBuildingGovernment20Filled class="size-4" />
			Fallen States
			<span class="text-[#a8a083]/70">({data.fallenStates.length})</span>
		</h2>

		{#if data.fallenStates.length === 0}
			<SectionCard>
				<p class="text-[#a8a083] text-sm text-center py-4">
					No states have fallen yet. The map still belongs to the living.
				</p>
			</SectionCard>
		{:else}
			<div class="grid gap-2">
				{#each data.fallenStates as state (state.id)}
					<a href="/state/{state.id}" class="group panel-interactive rounded-sm p-4 flex items-center gap-4">
						<Logo
							src={state.logo}
							alt={state.name}
							class="size-12 rounded-sm border border-[#c8b47a]/15 grayscale opacity-80"
							placeholderIcon={FluentBuildingGovernment20Filled}
							placeholderGradient="from-[#3a3a3a] to-[#3a3a3a]"
						/>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate"
									>{state.name}</span
								>
								{#if state.bloc}
									<span
										class="text-[10px] px-1.5 py-0.5 rounded-sm border"
										style="color: {state.bloc.color}; border-color: {state.bloc.color}40;"
									>
										{state.bloc.name}
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 mt-1 text-xs text-[#a8a083]">
								<span class="flex items-center gap-1">
									<FluentPeople20Filled class="size-3.5" />
									{state.population.toLocaleString()}
								</span>
								{#if state.capitulatedAt}
									<span>Fell {formatDate(state.capitulatedAt)}</span>
								{/if}
							</div>
						</div>
						<div class="text-right shrink-0">
							<div class="text-[10px] text-[#a8a083] uppercase tracking-wide">Existed</div>
							<div class="text-sm font-bold text-[#d3caa9]">
								{getDurationText(state.createdAt, state.capitulatedAt)}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Fallen Blocs -->
	<section class="space-y-3">
		<h2 class="text-sm font-bold text-[#a8a083] uppercase tracking-wide flex items-center gap-2">
			<FluentFlag20Filled class="size-4" />
			Dissolved Blocs
			<span class="text-[#a8a083]/70">({data.fallenBlocs.length})</span>
		</h2>

		{#if data.fallenBlocs.length === 0}
			<SectionCard>
				<p class="text-[#a8a083] text-sm text-center py-4">No blocs have been dissolved yet.</p>
			</SectionCard>
		{:else}
			<div class="grid gap-2">
				{#each data.fallenBlocs as bloc (bloc.id)}
					<div class="panel rounded-sm p-4 flex items-center gap-4" style="border-left: 3px solid {bloc.color};">
						<Logo
							src={bloc.logo}
							alt={bloc.name}
							class="size-12 rounded-sm border border-[#c8b47a]/15 grayscale opacity-80"
							placeholderIcon={FluentFlag20Filled}
							placeholderGradient="from-[#3a3a3a] to-[#3a3a3a]"
						/>
						<div class="flex-1 min-w-0">
							<span class="font-bold text-[#f5efd8] truncate">{bloc.name}</span>
							<div class="flex items-center gap-3 mt-1 text-xs text-[#a8a083]">
								<span class="flex items-center gap-1">
									<FluentBuildingGovernment20Filled class="size-3.5" />
									{bloc.memberStates} member{bloc.memberStates === 1 ? "" : "s"}
								</span>
								{#if bloc.capitulatedAt}
									<span>Dissolved {formatDate(bloc.capitulatedAt)}</span>
								{/if}
							</div>
						</div>
						<div class="text-right shrink-0">
							<div class="text-[10px] text-[#a8a083] uppercase tracking-wide">Existed</div>
							<div class="text-sm font-bold text-[#d3caa9]">
								{getDurationText(bloc.createdAt, bloc.capitulatedAt)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</PageContainer>
