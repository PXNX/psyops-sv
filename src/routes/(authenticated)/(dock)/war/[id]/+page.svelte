<!-- src/routes/(authenticated)/(dock)/war/[id]/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { getRegionName, formatDateTime } from "$lib/utils/formatting.js";
	import Logo from "$lib/component/Logo.svelte";
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";
	import { onMount, onDestroy } from "svelte";

	const { data } = $props();

	let currentTime = $state(new Date());
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let showWarAnim = $state(false);

	onMount(() => {
		countdownInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		if (data.war.status === "active") {
			showWarAnim = true;
		}
	});

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
	});

	function formatDate(date: string) {
		return formatDateTime(date);
	}

	function getBattleStatusColor(status: string) {
		switch (status) {
			case "ongoing":
				return "bg-amber-500/20 border-amber-500/30 text-amber-400";
			case "attacker_won":
				return "bg-red-500/20 border-red-500/30 text-red-400";
			case "defender_won":
				return "bg-blue-500/20 border-blue-500/30 text-blue-400";
			default:
				return "bg-slate-500/20 border-slate-500/30 text-slate-400";
		}
	}

	const warDuration = $derived.by(() => {
		const start = new Date(data.war.declaredAt).getTime();
		const end = data.war.endedAt ? new Date(data.war.endedAt).getTime() : currentTime.getTime();
		const diff = end - start;
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);
		return { days, hours, minutes, seconds };
	});

	const totalBattles = $derived(
		data.battleStats.ongoing + data.battleStats.attacker_won + data.battleStats.defender_won
	);

	const ongoingBattles = $derived(data.war.battles?.filter((b) => b.status === "ongoing") || []);

	const completedBattles = $derived(data.war.battles?.filter((b) => b.status !== "ongoing") || []);
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- War Room Header -->
	<div class="border-b border-red-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<!-- Status Bar -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					{#if data.war.status === "active"}
						<div class="size-2.5 bg-red-500 rounded-full animate-pulse"></div>
						<span class="text-red-400 font-mono text-xs uppercase tracking-widest font-bold">Active Conflict</span>
					{:else}
						<div class="size-2.5 bg-slate-500 rounded-full"></div>
						<span class="text-slate-400 font-mono text-xs uppercase tracking-widest">War Ended</span>
					{/if}
				</div>
				<span class="text-slate-600 font-mono text-xs">WAR #{data.war.id}</span>
			</div>

			<!-- Combatants Face-off -->
			<div class="grid grid-cols-3 gap-4 items-center">
				<!-- Attacker -->
				<a href="/state/{data.war.attacker.id}" class="group flex flex-col items-center gap-3 text-center">
					<div class="relative">
						<div class="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
						<Logo
							src={data.war.attacker.logo}
							alt={data.war.attacker.name}
							class="relative size-16 sm:size-20 rounded-lg border-2 border-red-500/40 group-hover:border-red-400/60 transition-colors"
						/>
					</div>
					<div>
						<div class="text-xs text-red-400/60 font-mono uppercase tracking-wider mb-1">Attacker</div>
						<div class="text-base sm:text-lg font-bold text-white group-hover:text-red-400 transition-colors">
							{data.war.attacker.name}
						</div>
						{#if data.war.attackerBloc}
							<div class="text-xs text-slate-500 font-mono">{data.war.attackerBloc.name}</div>
						{/if}
					</div>
				</a>

				<!-- VS Center -->
				<div class="flex flex-col items-center gap-2">
					<div class="text-4xl sm:text-5xl opacity-40">⚔️</div>
					{#if data.war.status === "active"}
						<div class="font-mono text-center">
							<div class="text-2xl sm:text-3xl font-bold text-white">
								{warDuration.days}<span class="text-slate-600 text-lg">d</span>
								{String(warDuration.hours).padStart(2, "0")}<span class="text-slate-600 text-lg">h</span>
							</div>
							<div class="text-xs text-slate-500 uppercase tracking-wider mt-1">Duration</div>
						</div>
					{:else}
						<div class="font-mono text-center">
							<div class="text-lg font-bold text-slate-400">
								{warDuration.days}d {warDuration.hours}h
							</div>
							<div class="text-xs text-slate-600 uppercase tracking-wider mt-1">Total Duration</div>
						</div>
					{/if}
				</div>

				<!-- Defender -->
				<a href="/state/{data.war.defender.id}" class="group flex flex-col items-center gap-3 text-center">
					<div class="relative">
						<div class="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
						<Logo
							src={data.war.defender.logo}
							alt={data.war.defender.name}
							class="relative size-16 sm:size-20 rounded-lg border-2 border-blue-500/40 group-hover:border-blue-400/60 transition-colors"
						/>
						{#if data.war.defender.capitulated}
							<div
								class="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-red-600 rounded text-[10px] font-bold text-white"
							>
								🏳️
							</div>
						{/if}
					</div>
					<div>
						<div class="text-xs text-blue-400/60 font-mono uppercase tracking-wider mb-1">Defender</div>
						<div class="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
							{data.war.defender.name}
						</div>
						{#if data.war.defenderBloc}
							<div class="text-xs text-slate-500 font-mono">{data.war.defenderBloc.name}</div>
						{/if}
					</div>
				</a>
			</div>
		</div>
	</div>

	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
		<!-- Territory Control Bar -->
		<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4 sm:p-6">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<span class="text-sm font-bold text-red-400">{data.war.attacker.name}</span>
					<span class="text-xs text-red-400/70 font-mono">{data.attackerControl.toFixed(1)}%</span>
				</div>
				<div class="text-xs text-slate-500 font-mono uppercase tracking-wide">Territory Control</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-blue-400/70 font-mono">{data.defenderControl.toFixed(1)}%</span>
					<span class="text-sm font-bold text-blue-400">{data.war.defender.name}</span>
				</div>
			</div>

			<div class="relative h-8 sm:h-10 bg-slate-950/80 rounded-lg border border-slate-700/50 overflow-hidden">
				<div
					class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000"
					style="width: {data.attackerControl}%"
				></div>
				<div
					class="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-1000"
					style="width: {data.defenderControl}%"
				></div>
				<div class="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
					<span class="text-white font-bold text-xs font-mono drop-shadow-lg"
						>{data.totalRegions > 0 ? Math.round((data.attackerControl * data.totalRegions) / 100) : 0} regions</span
					>
					<span class="text-white font-bold text-xs font-mono drop-shadow-lg"
						>{data.totalRegions > 0 ? Math.round((data.defenderControl * data.totalRegions) / 100) : 0} regions</span
					>
				</div>
			</div>

			<!-- Battle Score Strip -->
			<div class="mt-4 grid grid-cols-3 gap-3 text-center">
				<div class="bg-red-950/30 border border-red-500/20 rounded-lg p-2 sm:p-3">
					<div class="text-xl sm:text-2xl font-bold text-red-400 font-mono">{data.battleStats.attacker_won}</div>
					<div class="text-[10px] sm:text-xs text-red-400/60 font-mono uppercase tracking-wider">Victories</div>
				</div>
				<div class="bg-amber-950/30 border border-amber-500/20 rounded-lg p-2 sm:p-3">
					<div class="text-xl sm:text-2xl font-bold text-amber-400 font-mono">{data.battleStats.ongoing}</div>
					<div class="text-[10px] sm:text-xs text-amber-400/60 font-mono uppercase tracking-wider">Active</div>
				</div>
				<div class="bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 sm:p-3">
					<div class="text-xl sm:text-2xl font-bold text-blue-400 font-mono">{data.battleStats.defender_won}</div>
					<div class="text-[10px] sm:text-xs text-blue-400/60 font-mono uppercase tracking-wider">Victories</div>
				</div>
			</div>
		</div>

		<!-- Capitulated States -->
		{#if data.capitulatedStates && data.capitulatedStates.length > 0}
			<div class="bg-gradient-to-r from-red-950/30 to-slate-950/30 border border-red-500/30 rounded-xl p-4 sm:p-5">
				<div class="flex items-center gap-2 mb-3">
					<span class="text-lg">🏳️</span>
					<span class="text-sm font-bold text-red-400 font-mono uppercase tracking-wide">Capitulated States</span>
				</div>
				<div class="flex flex-wrap gap-3">
					{#each data.capitulatedStates as state}
						<div class="flex items-center gap-2 bg-slate-900/50 border border-red-500/20 rounded-lg px-3 py-2">
							<Logo src={state.logo} alt={state.name} class="size-8 rounded" />
							<div>
								<div class="text-sm font-medium text-white">{state.name}</div>
								{#if state.capitulatedAt}
									<div class="text-[10px] text-slate-500 font-mono">{formatDate(state.capitulatedAt)}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Ongoing Battles -->
		{#if ongoingBattles.length > 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-2 border-amber-500/30 rounded-xl overflow-hidden"
			>
				<div class="bg-amber-950/30 border-b border-amber-500/30 px-4 sm:px-6 py-3 sm:py-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="size-2 bg-amber-500 rounded-full animate-pulse"></div>
							<h3 class="text-base sm:text-lg font-bold text-amber-400 font-mono uppercase tracking-wide">
								Active Battles
							</h3>
						</div>
						<div class="px-2 py-1 bg-amber-950/50 border border-amber-500/40 rounded text-amber-400 font-mono text-xs">
							{ongoingBattles.length} ONGOING
						</div>
					</div>
				</div>
				<div class="p-3 sm:p-4 space-y-2">
					{#each ongoingBattles as battle}
						<a
							href="/battle/{battle.id}"
							class="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-amber-500/20 rounded-lg p-3 sm:p-4 hover:border-amber-400/40 transition-all group"
						>
							<Logo
								src="/coats/{battle.region.id}.svg"
								alt={getRegionName(battle.region.id)}
								class="size-10 sm:size-12 rounded border border-slate-700/50"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-amber-500 to-red-500"
							/>
							<div class="flex-1 min-w-0">
								<div
									class="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors truncate"
								>
									{getRegionName(battle.region.id)}
								</div>
								<div class="text-xs text-slate-500 font-mono">
									{battle.attackerState.name} → {battle.defenderState.name}
								</div>
							</div>
							<div class="flex items-center gap-2 flex-shrink-0">
								<span
									class="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-mono font-bold"
								>
									⚔️ LIVE
								</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Completed Battles -->
		{#if completedBattles.length > 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
			>
				<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4">
					<h3 class="text-base sm:text-lg font-bold text-slate-200 font-mono uppercase tracking-wide">
						Battle History
					</h3>
				</div>
				<div class="p-3 sm:p-4 space-y-2 max-h-[32rem] overflow-y-auto">
					{#each completedBattles as battle}
						{@const isAttackerWin = battle.status === "attacker_won"}
						<a
							href="/battle/{battle.id}"
							class="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 sm:p-4 hover:border-slate-600/60 transition-all group"
						>
							<Logo
								src="/coats/{battle.region.id}.svg"
								alt={getRegionName(battle.region.id)}
								class="size-10 sm:size-12 rounded border border-slate-700/50"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-slate-500 to-slate-600"
							/>
							<div class="flex-1 min-w-0">
								<div
									class="text-sm sm:text-base font-bold text-white group-hover:text-slate-300 transition-colors truncate"
								>
									{getRegionName(battle.region.id)}
								</div>
								<div class="text-xs text-slate-500 font-mono">
									{battle.attackerState.name} → {battle.defenderState.name}
									{#if battle.endedAt}
										<span class="text-slate-600">· {formatDate(battle.endedAt)}</span>
									{/if}
								</div>
							</div>
							<div class="flex-shrink-0">
								{#if isAttackerWin}
									<span
										class="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-mono font-bold"
									>
										🔴 CAPTURED
									</span>
								{:else}
									<span
										class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 font-mono font-bold"
									>
										🔵 DEFENDED
									</span>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{:else if totalBattles === 0}
			<div class="bg-slate-900/30 border border-slate-700/30 rounded-xl p-8 sm:p-12 text-center">
				<div class="text-4xl sm:text-6xl mb-4 opacity-20">⚔️</div>
				<p class="text-lg text-slate-400 font-mono">No battles fought yet</p>
			</div>
		{/if}

		<!-- Surrenders -->
		{#if data.war.surrenders && data.war.surrenders.length > 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
			>
				<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4">
					<div class="flex items-center gap-2">
						<FluentFlag20Filled class="size-4 text-slate-400" />
						<h3 class="text-base sm:text-lg font-bold text-slate-200 font-mono uppercase tracking-wide">Surrenders</h3>
					</div>
				</div>
				<div class="p-3 sm:p-4 space-y-2">
					{#each data.war.surrenders as surrender}
						<div class="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 sm:p-4">
							<FluentFlag20Filled class="size-5 text-slate-500 flex-shrink-0" />
							<div class="flex-1 min-w-0">
								<div class="font-bold text-white text-sm">{surrender.state.name}</div>
								<div class="text-xs text-slate-500 font-mono">
									{surrender.surrenderer.profile?.name || "Unknown"} · {formatDate(surrender.surrenderedAt)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showWarAnim}
	<ThreeAnimation variant="battle" onComplete={() => (showWarAnim = false)} />
{/if}
