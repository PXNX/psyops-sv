<!-- src/routes/bloc/[id]/+page.svelte -->
<script lang="ts">
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";

	import { enhance } from "$app/forms";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data, form } = $props();
</script>

<div class="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
	<!-- Hero Section -->
	<div
		class="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
		style="background: linear-gradient(135deg, {data.bloc.color}20 0%, {data.bloc.color}10 100%);"
	>
		<div
			class="absolute inset-0 opacity-10"
			style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.bloc.color}30 35px, {data.bloc.color}30 70px);"
		></div>
		<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
		<div class="relative z-10 p-5 sm:p-8">
			<!-- Header row -->
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 sm:mb-6">
				<div class="flex items-center gap-3 sm:gap-4">
					<div class="ring-4 ring-white/10 rounded-2xl">
						<Logo src={data.bloc.logo} alt={data.bloc.name} placeholderIcon={FluentFlag20Filled} class="size-16 sm:size-20" />
					</div>
					<div class="flex-1 min-w-0">
						<h1 class="text-2xl sm:text-3xl font-bold text-white truncate">{data.bloc.name}</h1>
						<p class="text-xs sm:text-sm text-gray-400 mt-0.5">Political-Military Alliance</p>
					</div>
				</div>
				{#if data.isLeader}
					<a
						href="/bloc/{data.bloc.id}/edit"
						class="btn btn-sm w-full sm:w-auto bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-0 text-white gap-2"
					>
						<FluentEdit20Filled class="size-4" />
						Edit Bloc
					</a>
				{/if}
			</div>
			<!-- Stats -->
			<div class="grid grid-cols-2 gap-3">
				<div class="bg-black/20 rounded-xl border border-white/10 p-3 sm:p-4">
					<FluentBuildingGovernment20Filled class="size-5 mb-2" style="color: {data.bloc.color}" />
					<p class="text-xl sm:text-2xl font-bold text-white">{data.totalStates}</p>
					<p class="text-xs text-gray-400">Member States</p>
				</div>
				<div class="bg-black/20 rounded-xl border border-white/10 p-3 sm:p-4">
					<FluentPeople20Filled class="size-5 mb-2" style="color: {data.bloc.color}" />
					<p class="text-xl sm:text-2xl font-bold text-white">{data.totalPopulation.toLocaleString()}</p>
					<p class="text-xs text-gray-400">Total Population</p>
				</div>
			</div>
			<!-- Description -->
			{#if data.bloc.description}
				<div class="mt-4 bg-black/20 rounded-xl p-3 sm:p-4 border border-white/10">
					<p class="text-sm text-gray-300 leading-relaxed">{data.bloc.description}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Member States -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4 sm:p-5">
		<div class="flex items-center gap-2 mb-4">
			<div
				class="size-9 sm:size-10 rounded-lg flex items-center justify-center"
				style="background-color: {data.bloc.color}20"
			>
				<FluentBuildingGovernment20Filled class="size-4 sm:size-5" style="color: {data.bloc.color}" />
			</div>
			<h2 class="text-base sm:text-lg font-semibold text-white">Member States</h2>
		</div>

		<div class="space-y-2 sm:space-y-3">
			{#each data.memberStates as state}
				<a
					href="/state/{state.id}"
					class="group bg-slate-700/30 rounded-lg p-3 sm:p-4 hover:bg-slate-700/50 transition-all border border-transparent hover:border-white/10 flex items-center gap-3 sm:gap-4"
				>
					<Logo src={state.logo} alt={state.name} placeholderIcon={FluentGlobe20Filled} />

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5 sm:mb-1">
							<p
								class="text-sm sm:text-base font-semibold text-white group-hover:text-purple-400 transition-colors truncate"
							>
								{state.name}
							</p>
							<span class="px-1.5 sm:px-2 py-0.5 bg-slate-600/50 rounded text-[10px] sm:text-xs text-gray-300 shrink-0">
								#{state.rating || "N/A"}
							</span>
						</div>
						<div class="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400">
							<span class="flex items-center gap-1">
								<FluentPeople20Filled class="size-3" />
								<span class="whitespace-nowrap">{state.population.toLocaleString()}</span>
							</span>
							{#if state.president}
								<span class="flex items-center gap-1 truncate">
									<span class="shrink-0">👤</span>
									<span class="hidden sm:inline">President:</span>
									<span class="truncate">{state.president.name}</span>
								</span>
							{/if}
						</div>
					</div>

					<FluentChevronRight20Filled
						class="size-4 sm:size-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0"
					/>
				</a>
			{/each}
		</div>
	</div>

	<!-- Active Wars -->
	{#if data.activeWars.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4 sm:p-5">
			<div class="flex items-center gap-2 mb-4">
				<div class="size-9 sm:size-10 rounded-lg flex items-center justify-center bg-red-600/20">
					<FluentShield20Filled class="size-4 sm:size-5 text-red-400" />
				</div>
				<h2 class="text-base sm:text-lg font-semibold text-white">Active Wars</h2>
			</div>

			<div class="space-y-2 sm:space-y-3">
				{#each data.activeWars as war}
					<a
						href="/war/{war.id}"
						class="group bg-slate-700/30 rounded-lg p-3 sm:p-4 hover:bg-slate-700/50 transition-all border border-transparent hover:border-white/10 block"
					>
						<div class="flex items-center justify-between gap-3 mb-2">
							<div class="flex items-center gap-2 flex-1 min-w-0">
								<!-- Attacker -->
								<div class="flex items-center gap-2 flex-1 min-w-0">
									<Logo src={war.attacker.logo} alt={war.attacker.name} placeholderIcon={FluentShield20Filled} />
									<span class="text-sm sm:text-base font-semibold text-white truncate">{war.attacker.name}</span>
								</div>

								<span class="text-xs sm:text-sm text-gray-500 shrink-0">vs</span>

								<!-- Defender -->
								<div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
									<span class="text-sm sm:text-base font-semibold text-white truncate">{war.defender.name}</span>
									<Logo src={war.defender.logo} alt={war.defender.name} placeholderIcon={FluentShield20Filled} />
								</div>
							</div>

							<FluentChevronRight20Filled
								class="size-4 sm:size-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0"
							/>
						</div>

						<div class="flex items-center gap-3 text-[10px] sm:text-xs text-gray-400">
							<span
								>Started {formatDate(war.declaredAt)}</span
							>
							{#if war.activeBattles > 0}
								<span class="flex items-center gap-1 text-red-400">
									<span class="size-1.5 rounded-full bg-red-400 animate-pulse"></span>
									{war.activeBattles} active {war.activeBattles === 1 ? "battle" : "battles"}
								</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Error/Success Messages -->
	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/20 rounded-xl p-4">
			<p class="text-sm text-red-300">{form.error}</p>
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-green-600/10 border border-green-500/20 rounded-xl p-4">
			<p class="text-sm text-green-300">Successfully updated bloc membership!</p>
		</div>
	{/if}

	<!-- Join/Leave Bloc -->
	{#if data.canJoin}
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 sm:p-6">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div class="flex-1">
						<h3 class="text-base sm:text-lg font-semibold text-white mb-1">Join This Bloc</h3>
						<p class="text-xs sm:text-sm text-gray-400">
							{#if data.userState}
								Join as the president of {data.userState.name}
							{:else}
								Only state presidents can join blocs
							{/if}
						</p>
					</div>
					<button
						type="submit"
						class="btn btn-sm sm:btn-md w-full sm:w-auto gap-2"
						style="background-color: {data.bloc.color}; border: none; color: white;"
					>
						<FluentPersonAdd20Filled class="size-4 sm:size-5" />
						Join Bloc
					</button>
				</div>
			</form>
		</div>
	{:else if data.isMember}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 sm:p-6">
			<form method="POST" action="?/leave" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h3 class="text-base sm:text-lg font-semibold text-white mb-1">Your State is a Member</h3>
						<p class="text-xs sm:text-sm text-gray-400">
							{data.userState?.name || "Your state"} is part of this alliance
						</p>
					</div>
					<button
						type="submit"
						class="btn btn-sm w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200 gap-2"
					>
						<FluentDismiss20Filled class="size-4" />
						Leave Bloc
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>
