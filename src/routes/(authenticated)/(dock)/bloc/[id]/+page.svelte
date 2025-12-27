<!-- src/routes/bloc/[id]/+page.svelte -->
<script lang="ts">
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";

	const { data } = $props();

	const unitTypeIcons: Record<string, string> = {
		heavy_armor: "🚜",
		ifv: "🚙",
		artillery: "🎯",
		air_defence: "🛡️",
		light_infantry: "🪖",
		fighter_squadron: "✈️",
		bomber_squadron: "🛩️"
	};
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Section -->
	<div class="relative">
		<div
			class="bg-gradient-to-br p-px rounded-2xl shimmer-outline"
			style="background: linear-gradient(135deg, {data.bloc.color}40, {data.bloc.color}20)"
		>
			<div class="relative rounded-2xl bg-slate-800 overflow-hidden">
				<!-- Header -->
				<div class="relative p-8" style="background: linear-gradient(135deg, {data.bloc.color}15, transparent)">
					<div class="flex items-center justify-between mb-6">
						<div class="flex items-center gap-4">
							<div
								class="size-16 rounded-2xl flex items-center justify-center"
								style="background-color: {data.bloc.color}"
							>
								<FluentFlag20Filled class="size-8 text-white" />
							</div>
							<div>
								<h1 class="text-3xl font-bold text-white">{data.bloc.name}</h1>
								<p class="text-sm text-gray-400">Political-Military Alliance</p>
							</div>
						</div>

						{#if data.isLeader}
							<a
								href="/bloc/{data.bloc.id}/edit"
								class="btn bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-0 text-white gap-2"
							>
								<FluentEdit20Filled class="size-5" />
								Edit Bloc
							</a>
						{/if}
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-4">
						<div class="bg-slate-700/30 rounded-xl border border-white/5 p-4">
							<FluentBuildingGovernment20Filled class="size-6 mb-2" style="color: {data.bloc.color}" />
							<p class="text-2xl font-bold text-white">{data.totalStates}</p>
							<p class="text-xs text-gray-400">Member States</p>
						</div>
						<div class="bg-slate-700/30 rounded-xl border border-white/5 p-4">
							<FluentPeople20Filled class="size-6 mb-2" style="color: {data.bloc.color}" />
							<p class="text-2xl font-bold text-white">{data.totalPopulation.toLocaleString()}</p>
							<p class="text-xs text-gray-400">Total Population</p>
						</div>
					</div>
				</div>

				<!-- Description -->
				{#if data.bloc.description}
					<div class="px-8 pb-8">
						<div class="bg-slate-700/20 rounded-xl p-4 border border-white/5">
							<p class="text-gray-300 text-sm leading-relaxed">{data.bloc.description}</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Recommended Military Units -->
	{#if data.recommendedTemplates.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-2 mb-4">
				<div class="size-10 rounded-lg flex items-center justify-center" style="background-color: {data.bloc.color}20">
					<FluentShield20Filled class="size-5" style="color: {data.bloc.color}" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-white">Recommended Military Units</h2>
					<p class="text-xs text-gray-400">Suggested unit types for member states</p>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each data.recommendedTemplates as template}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<div class="flex items-center gap-3 mb-2">
							<span class="text-2xl">{unitTypeIcons[template.unitType] || "🎖️"}</span>
							<div>
								<p class="font-semibold text-white text-sm">{template.displayName}</p>
								<p class="text-xs text-gray-400">{template.unitType.replace("_", " ")}</p>
							</div>
						</div>
						{#if template.description}
							<p class="text-xs text-gray-400 mt-2">{template.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Member States -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<div class="flex items-center gap-2 mb-4">
			<div class="size-10 rounded-lg flex items-center justify-center" style="background-color: {data.bloc.color}20">
				<FluentBuildingGovernment20Filled class="size-5" style="color: {data.bloc.color}" />
			</div>
			<h2 class="text-lg font-semibold text-white">Member States</h2>
		</div>

		<div class="space-y-3">
			{#each data.memberStates as state}
				<a
					href="/state/{state.id}"
					class="group bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all border border-transparent hover:border-white/10 flex items-center gap-4"
				>
					<div
						class="size-12 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-lg flex items-center justify-center"
					>
						<FluentGlobe20Filled class="size-6 text-purple-400" />
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<p class="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
								{state.name}
							</p>
							<span class="px-2 py-0.5 bg-slate-600/50 rounded text-xs text-gray-300">
								#{state.rating || "N/A"}
							</span>
						</div>
						<div class="flex items-center gap-3 text-xs text-gray-400">
							<span class="flex items-center gap-1">
								<FluentPeople20Filled class="size-3" />
								{state.population.toLocaleString()}
							</span>
							{#if state.president}
								<span class="flex items-center gap-1">
									👤 President: {state.president.name}
								</span>
							{/if}
						</div>
					</div>

					<FluentChevronRight20Filled
						class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0"
					/>
				</a>
			{/each}
		</div>
	</div>

	<!-- Info Box -->
	<div class="rounded-xl p-4 border" style="background-color: {data.bloc.color}10; border-color: {data.bloc.color}30">
		<p class="text-sm" style="color: {data.bloc.color}">
			<strong>About Blocs:</strong> Political-military alliances that coordinate member states' policies, military strategies,
			and economic cooperation. Member states share recommended military doctrines and maintain closer diplomatic ties.
		</p>
	</div>
</div>
