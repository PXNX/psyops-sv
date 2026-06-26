<!-- src/routes/bloc/[id]/+page.svelte -->
<script lang="ts">
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import { enhance } from "$app/forms";
	import Logo from "$lib/component/Logo.svelte";

	const { data, form } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Bloc Header -->
	<div class="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-5 sm:py-6">
			<div class="flex items-start gap-4 sm:gap-5">
				<!-- Bloc Logo -->
				<div class="relative flex-shrink-0">
					<div class="absolute inset-0 blur-xl rounded-full" style="background-color: {data.bloc.color}30"></div>
					<Logo
						src={data.bloc.logo}
						alt={data.bloc.name}
						placeholderIcon={FluentFlag20Filled}
						class="relative size-16 sm:size-20 rounded-xl border-2"
						placeholderGradient="from-slate-500 to-slate-600"
					/>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h1 class="text-xl sm:text-2xl font-bold text-white tracking-wide">{data.bloc.name}</h1>
							<span class="text-xs text-slate-400 font-mono uppercase tracking-wider">Alliance</span>
						</div>
						{#if data.isLeader}
							<a
								href="/bloc/{data.bloc.id}/edit"
								class="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/50 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono flex-shrink-0"
							>
								<FluentEdit20Filled class="size-3.5" />
								Edit
							</a>
						{/if}
					</div>
					{#if data.bloc.description}
						<p class="text-sm text-slate-300/80 mt-2 leading-relaxed">{data.bloc.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
		<!-- Stats Strip -->
		<div class="grid grid-cols-2 gap-3">
			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentBuildingGovernment20Filled class="size-4" style="color: {data.bloc.color}" />
					<span class="text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-wider">States</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-white font-mono">{data.totalStates}</div>
			</div>
			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentPeople20Filled class="size-4" style="color: {data.bloc.color}" />
					<span class="text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-wider">Population</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-white font-mono">{data.totalPopulation.toLocaleString()}</div>
			</div>
		</div>

		<!-- Error/Success -->
		{#if form?.error}
			<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 font-mono">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300 font-mono">
				Bloc membership updated
			</div>
		{/if}

		<!-- Active Wars -->
		{#if data.activeWars.length > 0}
			<div class="space-y-2">
				{#each data.activeWars as war}
					<a
						href="/war/{war.id}"
						class="flex items-center gap-3 bg-gradient-to-r from-red-950/25 to-slate-900/50 border border-red-500/20 rounded-xl p-3 sm:p-4 hover:border-red-400/40 transition-all group"
					>
						<div class="relative flex-shrink-0">
							<div class="absolute inset-0 bg-red-500/20 blur-lg rounded-full animate-pulse"></div>
							<div
								class="relative size-9 sm:size-10 bg-red-950/60 rounded-lg border border-red-500/30 flex items-center justify-center"
							>
								<span class="text-lg">⚔️</span>
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-0.5">
								<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
								<span class="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">Active War</span>
							</div>
							<div class="text-sm text-slate-300">
								<span class="font-bold text-red-400">{war.attacker.name}</span>
								<span class="text-slate-600 mx-1">vs</span>
								<span class="font-bold text-blue-400">{war.defender.name}</span>
							</div>
							{#if war.activeBattles > 0}
								<span class="text-[10px] text-amber-400/70 font-mono mt-0.5 inline-block">
									{war.activeBattles} active {war.activeBattles === 1 ? "battle" : "battles"}
								</span>
							{/if}
						</div>
						<span class="text-slate-600 group-hover:text-red-400 transition-colors">→</span>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Member States -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
		>
			<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-5 py-3">
				<h2 class="text-sm font-bold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-2">
					<FluentBuildingGovernment20Filled class="size-4" style="color: {data.bloc.color}" />
					Member States
				</h2>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.memberStates as state}
					<a
						href="/state/{state.id}"
						class="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 hover:border-slate-600/60 transition-all group"
					>
						<Logo
							src={state.logo}
							alt={state.name}
							placeholderIcon={FluentGlobe20Filled}
							class="size-10 sm:size-12 rounded-lg"
						/>

						<div class="flex-1 min-w-0">
							<p class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
								{state.name}
							</p>
							<div class="flex items-center gap-3 text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5">
								<span class="flex items-center gap-1">
									<FluentPeople20Filled class="size-3" />
									{state.population.toLocaleString()}
								</span>
								{#if state.president}
									<span class="truncate">👤 {state.president.name}</span>
								{/if}
								<span class="px-1.5 py-0.5 bg-slate-800/60 rounded text-[10px] text-slate-400"
									>#{state.rating || "—"}</span
								>
							</div>
						</div>
						<span class="text-slate-600 group-hover:text-slate-400 transition-colors text-sm">→</span>
					</a>
				{/each}
			</div>
		</div>

		<!-- Join/Leave -->
		{#if data.canJoin}
			<div
				class="bg-gradient-to-r from-slate-900/50 to-slate-950/50 border rounded-xl p-4 sm:p-5"
				style="border-color: {data.bloc.color}30"
			>
				<form method="POST" action="?/join" use:enhance>
					<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div class="flex-1">
							<span class="text-sm font-bold text-white">Join this Bloc</span>
							{#if data.userState}
								<p class="text-xs text-slate-400 font-mono mt-0.5">Join as president of {data.userState.name}</p>
							{/if}
						</div>
						<button
							type="submit"
							class="w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono font-bold text-sm text-white transition-all flex items-center justify-center gap-2 hover:brightness-110"
							style="background-color: {data.bloc.color}"
						>
							<FluentPersonAdd20Filled class="size-4" />
							Join
						</button>
					</div>
				</form>
			</div>
		{:else if data.isMember}
			<div class="bg-gradient-to-r from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4">
				<form method="POST" action="?/leave" use:enhance>
					<div class="flex items-center justify-between gap-3">
						<div>
							<span class="text-sm font-bold text-white">Member</span>
							<p class="text-xs text-slate-500 font-mono mt-0.5">
								{data.userState?.name || "Your state"} is part of this alliance
							</p>
						</div>
						<button
							type="submit"
							class="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
						>
							<FluentDismiss20Filled class="size-3.5" />
							Leave
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
