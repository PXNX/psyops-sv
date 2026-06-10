<!-- src/routes/(authenticated)/(dock)/war/[id]/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { getRegionName, formatDateTime } from "$lib/utils/formatting.js";
	import Logo from "$lib/component/Logo.svelte";

	const { data } = $props();

	function formatDate(date: string) {
		return formatDateTime(date);
	}

	function getStatusColor(status: string) {
		switch (status) {
			case "active":
				return "bg-red-500/20 border-red-500/30 text-red-400";
			case "ended":
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
			default:
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
		}
	}

	function getBattleStatusColor(status: string) {
		switch (status) {
			case "ongoing":
				return "bg-amber-500/20 border-amber-500/30 text-amber-400";
			case "attacker_won":
				return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
			case "defender_won":
				return "bg-blue-500/20 border-blue-500/30 text-blue-400";
			default:
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
		}
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- War Header -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<div class="flex items-start justify-between mb-6">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<FluentFire20Filled class="size-8 text-red-500" />
					<h1 class="text-3xl font-bold text-white">War #{data.war.id}</h1>
					<span class="px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(data.war.status)}">
						{data.war.status === "active" ? "Active" : "Ended"}
					</span>
				</div>
				<div class="flex items-center gap-2 text-sm text-gray-400">
					<FluentCalendar20Filled class="size-4" />
					<span>Declared {formatDate(data.war.declaredAt)}</span>
					{#if data.war.endedAt}
						<span>• Ended {formatDate(data.war.endedAt)}</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Combatants -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Attacker -->
			<div class="bg-slate-700/30 rounded-lg p-4 border border-red-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-red-500" />
					<span class="text-sm font-medium text-red-400">Attacker</span>
				</div>
				<div class="flex items-center gap-3">
					<Logo src={data.war.attacker.logo} alt={data.war.attacker.name} class="size-12 rounded-lg" />
					<div>
						<a
							href="/state/{data.war.attacker.id}"
							class="text-lg font-bold text-white hover:text-red-400 transition-colors"
						>
							{data.war.attacker.name}
						</a>
						{#if data.war.attackerBloc}
							<div class="text-xs text-gray-400">{data.war.attackerBloc.name}</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- VS -->
			<div class="flex items-center justify-center">
				<div class="text-2xl font-bold text-gray-500">VS</div>
			</div>

			<!-- Defender -->
			<div class="bg-slate-700/30 rounded-lg p-4 border border-blue-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-blue-500" />
					<span class="text-sm font-medium text-blue-400">Defender</span>
				</div>
				<div class="flex items-center gap-3">
					<Logo src={data.war.defender.logo} alt={data.war.defender.name} class="size-12 rounded-lg" />
					<div>
						<a
							href="/state/{data.war.defender.id}"
							class="text-lg font-bold text-white hover:text-blue-400 transition-colors"
						>
							{data.war.defender.name}
						</a>
						{#if data.war.defenderBloc}
							<div class="text-xs text-gray-400">{data.war.defenderBloc.name}</div>
						{/if}
						{#if data.war.defender.capitulated}
							<div class="flex items-center gap-1 mt-1">
								<span class="px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded text-xs text-red-300">
									🏳️ CAPITULATED
								</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Capitulated States (if bloc war) -->
		{#if data.capitulatedStates && data.capitulatedStates.length > 0}
			<div class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
				<h3 class="text-sm font-bold text-red-400 mb-3">🏳️ Capitulated States</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each data.capitulatedStates as state}
						<div class="flex items-center gap-2 bg-slate-800/50 rounded p-2">
							<Logo src={state.logo} alt={state.name} class="size-8 rounded" />
							<div class="flex-1">
								<div class="text-sm font-medium text-white">{state.name}</div>
								{#if state.capitulatedAt}
									<div class="text-xs text-gray-500">
										{formatDate(state.capitulatedAt)}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- War Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentFire20Filled class="size-5 text-red-500" />
				<span class="text-sm text-gray-400">Total Battles</span>
			</div>
			<div class="text-2xl font-bold text-white">
				{data.battleStats.ongoing + data.battleStats.attacker_won + data.battleStats.defender_won}
			</div>
		</div>

		<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentTrophy20Filled class="size-5 text-emerald-500" />
				<span class="text-sm text-gray-400">Attacker Victories</span>
			</div>
			<div class="text-2xl font-bold text-emerald-400">{data.battleStats.attacker_won}</div>
		</div>

		<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentTrophy20Filled class="size-5 text-blue-500" />
				<span class="text-sm text-gray-400">Defender Victories</span>
			</div>
			<div class="text-2xl font-bold text-blue-400">{data.battleStats.defender_won}</div>
		</div>

		<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentFlag20Filled class="size-5 text-amber-500" />
				<span class="text-sm text-gray-400">Ongoing Battles</span>
			</div>
			<div class="text-2xl font-bold text-amber-400">{data.battleStats.ongoing}</div>
		</div>
	</div>

	<!-- Territory Control -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Territory Control</h2>
		<div class="space-y-4">
			<div>
				<div class="flex justify-between text-sm mb-2">
					<span class="text-gray-400">{data.war.attacker.name}</span>
					<span class="text-red-400">{data.attackerControl.toFixed(1)}%</span>
				</div>
				<div class="h-3 bg-slate-700 rounded-full overflow-hidden">
					<div class="h-full bg-red-500" style="width: {data.attackerControl}%"></div>
				</div>
			</div>
			<div>
				<div class="flex justify-between text-sm mb-2">
					<span class="text-gray-400">{data.war.defender.name}</span>
					<span class="text-blue-400">{data.defenderControl.toFixed(1)}%</span>
				</div>
				<div class="h-3 bg-slate-700 rounded-full overflow-hidden">
					<div class="h-full bg-blue-500" style="width: {data.defenderControl}%"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Battles List -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Battles</h2>
		<div class="space-y-3">
			{#if data.war.battles && data.war.battles.length > 0}
				{#each data.war.battles as battle}
					<a
						href="/battle/{battle.id}"
						class="block bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-purple-500/30 transition-all"
					>
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<span class="text-lg font-bold text-white">{getRegionName(battle.region.id)}</span>
									<span class="px-2 py-1 rounded-full text-xs font-medium border {getBattleStatusColor(battle.status)}">
										{battle.status.replace("_", " ")}
									</span>
									{#if battle.status === "attacker_won"}
										<span class="text-xs text-emerald-400">🏆 Region Captured</span>
									{:else if battle.status === "defender_won"}
										<span class="text-xs text-blue-400">🛡️ Successfully Defended</span>
									{/if}
								</div>
								<div class="flex items-center gap-4 text-sm text-gray-400">
									<span>Started {formatDate(battle.startedAt)}</span>
									{#if battle.endedAt}
										<span>• Ended {formatDate(battle.endedAt)}</span>
									{/if}
									<span>• {battle.attackerState.name} vs {battle.defenderState.name}</span>
								</div>
							</div>
							<div class="text-gray-400">→</div>
						</div>
					</a>
				{/each}
			{:else}
				<div class="text-center py-8 text-gray-400">No battles yet</div>
			{/if}
		</div>
	</div>

	<!-- Surrenders -->
	{#if data.war.surrenders && data.war.surrenders.length > 0}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4">Surrenders</h2>
			<div class="space-y-3">
				{#each data.war.surrenders as surrender}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<FluentFlag20Filled class="size-5 text-gray-400" />
								<div>
									<div class="font-bold text-white">{surrender.state.name}</div>
									<div class="text-sm text-gray-400">
										Surrendered by {surrender.surrenderer.profile?.name || "Unknown"}
									</div>
								</div>
							</div>
							<div class="text-sm text-gray-400">{formatDate(surrender.surrenderedAt)}</div>
						</div>
						{#if surrender.reason}
							<div class="mt-2 text-sm text-gray-400 pl-8">{surrender.reason}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
