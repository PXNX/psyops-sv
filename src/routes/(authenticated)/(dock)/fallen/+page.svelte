<script lang="ts">
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import { formatDate, getDurationText } from "$lib/utils/formatting.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<PageContainer maxWidth="4xl">
	<PageHeader
		title="Fallen States & Blocs"
		subtitle="A memorial to states and blocs that were conquered and dissolved."
	>
		{#snippet actions()}
			<a href="/" class="btn btn-ghost btn-sm">
				<FluentHome20Filled class="size-4" />
				Dashboard
			</a>
		{/snippet}
	</PageHeader>

	<!-- Fallen States -->
	<section class="space-y-3">
		<h2 class="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
			<FluentBuildingGovernment20Filled class="size-4" />
			Fallen States
			<span class="text-slate-600 font-mono">({data.fallenStates.length})</span>
		</h2>

		{#if data.fallenStates.length === 0}
			<SectionCard>
				<p class="text-slate-400 text-sm text-center py-4">
					No states have fallen yet. The map still belongs to the living.
				</p>
			</SectionCard>
		{:else}
			<div class="grid gap-2">
				{#each data.fallenStates as state (state.id)}
					<a
						href="/state/{state.id}"
						class="flex items-center gap-4 bg-slate-800/50 border border-white/5 rounded-xl p-4 hover:border-red-500/30 transition-all group"
					>
						<Logo
							src={state.logo}
							alt={state.name}
							class="size-12 rounded-lg border border-slate-700/50 grayscale opacity-80"
							placeholderIcon={FluentBuildingGovernment20Filled}
							placeholderGradient="from-slate-600 to-slate-700"
						/>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-bold text-white group-hover:text-red-300 truncate">{state.name}</span>
								{#if state.bloc}
									<span
										class="text-[10px] font-mono px-1.5 py-0.5 rounded border"
										style="color: {state.bloc.color}; border-color: {state.bloc.color}40;"
									>
										{state.bloc.name}
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
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
							<div class="text-xs text-slate-500 uppercase tracking-wide">Existed</div>
							<div class="text-sm font-bold font-mono text-slate-300">
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
		<h2 class="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
			<FluentFlag20Filled class="size-4" />
			Dissolved Blocs
			<span class="text-slate-600 font-mono">({data.fallenBlocs.length})</span>
		</h2>

		{#if data.fallenBlocs.length === 0}
			<SectionCard>
				<p class="text-slate-400 text-sm text-center py-4">No blocs have been dissolved yet.</p>
			</SectionCard>
		{:else}
			<div class="grid gap-2">
				{#each data.fallenBlocs as bloc (bloc.id)}
					<div
						class="flex items-center gap-4 bg-slate-800/50 border border-white/5 rounded-xl p-4"
						style="border-left: 3px solid {bloc.color};"
					>
						<Logo
							src={bloc.logo}
							alt={bloc.name}
							class="size-12 rounded-lg border border-slate-700/50 grayscale opacity-80"
							placeholderIcon={FluentFlag20Filled}
							placeholderGradient="from-slate-600 to-slate-700"
						/>
						<div class="flex-1 min-w-0">
							<span class="font-bold text-white truncate">{bloc.name}</span>
							<div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
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
							<div class="text-xs text-slate-500 uppercase tracking-wide">Existed</div>
							<div class="text-sm font-bold font-mono text-slate-300">
								{getDurationText(bloc.createdAt, bloc.capitulatedAt)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</PageContainer>
