<!-- src/routes/(authenticated)/(dock)/war/[id]/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import * as m from "#lib/paraglide/messages.js";
	import { getRegionName, formatDateTime } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
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
				return "bg-[#e6a527]/12 border-[#e6a527]/35 text-[#f7c56b]";
			case "attacker_won":
				return "bg-red-600/10 border-red-500/30 text-red-300";
			case "defender_won":
				return "bg-[#315d8d]/18 border-[#7ba0c8]/30 text-[#b7d0e6]";
			default:
				return "bg-[#102239]/70 border-[#dfceb0]/15 text-[#a89e8e]";
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

<PageContainer maxWidth="5xl">
	<!-- War Room Hero -->
	<div class="panel rounded-sm p-5">
		<!-- Status Bar -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				{#if data.war.status === "active"}
					<div class="size-2.5 bg-red-500 rounded-full animate-pulse"></div>
					<span class="text-red-300 text-xs uppercase tracking-widest font-bold">Active Conflict</span>
				{:else}
					<div class="size-2.5 bg-[#a89e8e] rounded-full"></div>
					<span class="text-[#a89e8e] text-xs uppercase tracking-widest">War Ended</span>
				{/if}
			</div>
			<span class="text-[#a89e8e] font-mono text-xs">WAR #{data.war.id}</span>
		</div>

		<!-- Combatants Face-off -->
		<div class="grid grid-cols-3 gap-4 items-center">
			<!-- Attacker -->
			<a href="/state/{data.war.attacker.id}" class="group flex flex-col items-center gap-3 text-center">
				<Logo
					src={data.war.attacker.logo}
					alt={data.war.attacker.name}
					class="size-16 sm:size-20 rounded-sm border border-red-500/40 group-hover:border-red-400/70 transition-colors"
				/>
				<div>
					<div class="text-[10px] text-red-300/80 uppercase tracking-wide mb-1">Attacker</div>
					<div class="text-base sm:text-lg font-bold text-[#fff7e8] group-hover:text-red-300 transition-colors">
						{data.war.attacker.name}
					</div>
					{#if data.war.attackerBloc}
						<div class="text-xs text-[#a89e8e]">{data.war.attackerBloc.name}</div>
					{/if}
				</div>
			</a>

			<!-- VS Center -->
			<div class="flex flex-col items-center gap-2">
				<div class="text-4xl sm:text-5xl opacity-40">⚔️</div>
				{#if data.war.status === "active"}
					<div class="text-center">
						<div class="text-2xl sm:text-3xl font-bold text-[#fff7e8] font-mono">
							{warDuration.days}<span class="text-[#a89e8e] text-lg">d</span>
							{String(warDuration.hours).padStart(2, "0")}<span class="text-[#a89e8e] text-lg">h</span>
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1">Duration</div>
					</div>
				{:else}
					<div class="text-center">
						<div class="text-lg font-bold text-[#a89e8e] font-mono">
							{warDuration.days}d {warDuration.hours}h
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1">Total Duration</div>
					</div>
				{/if}
			</div>

			<!-- Defender -->
			<a href="/state/{data.war.defender.id}" class="group flex flex-col items-center gap-3 text-center">
				<div class="relative">
					<Logo
						src={data.war.defender.logo}
						alt={data.war.defender.name}
						class="size-16 sm:size-20 rounded-sm border border-[#7ba0c8]/40 group-hover:border-[#7ba0c8]/70 transition-colors"
					/>
					{#if data.war.defender.capitulated}
						<div
							class="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-red-600 rounded-sm text-[10px] font-bold text-[#fff7e8]"
						>
							🏳️
						</div>
					{/if}
				</div>
				<div>
					<div class="text-[10px] text-[#b7d0e6]/80 uppercase tracking-wide mb-1">Defender</div>
					<div class="text-base sm:text-lg font-bold text-[#fff7e8] group-hover:text-[#b7d0e6] transition-colors">
						{data.war.defender.name}
					</div>
					{#if data.war.defenderBloc}
						<div class="text-xs text-[#a89e8e]">{data.war.defenderBloc.name}</div>
					{/if}
				</div>
			</a>
		</div>
	</div>

	<!-- Territory Control Bar -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2">
				<span class="text-sm font-bold text-red-300">{data.war.attacker.name}</span>
				<span class="text-xs text-red-300/70 font-mono">{data.attackerControl.toFixed(1)}%</span>
			</div>
			<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Territory Control</div>
			<div class="flex items-center gap-2">
				<span class="text-xs text-[#b7d0e6]/70 font-mono">{data.defenderControl.toFixed(1)}%</span>
				<span class="text-sm font-bold text-[#b7d0e6]">{data.war.defender.name}</span>
			</div>
		</div>

		<div class="relative h-8 sm:h-10 bg-[#0d1d31]/90 rounded-sm border border-[#dfceb0]/15 overflow-hidden">
			<div
				class="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-1000"
				style="width: {data.attackerControl}%"
			></div>
			<div
				class="absolute right-0 top-0 bottom-0 bg-[#7ba0c8] transition-all duration-1000"
				style="width: {data.defenderControl}%"
			></div>
			<div class="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
				<span class="text-[#fff7e8] font-bold text-xs drop-shadow-lg"
					>{data.totalRegions > 0 ? Math.round((data.attackerControl * data.totalRegions) / 100) : 0} regions</span
				>
				<span class="text-[#fff7e8] font-bold text-xs drop-shadow-lg"
					>{data.totalRegions > 0 ? Math.round((data.defenderControl * data.totalRegions) / 100) : 0} regions</span
				>
			</div>
		</div>

		<!-- Battle Score Strip -->
		<div class="mt-4 grid grid-cols-3 gap-3 text-center">
			<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-2 sm:p-3">
				<div class="text-xl sm:text-2xl font-bold text-red-300">{data.battleStats.attacker_won}</div>
				<div class="text-[10px] text-red-300/70 uppercase tracking-wide">Victories</div>
			</div>
			<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-2 sm:p-3">
				<div class="text-xl sm:text-2xl font-bold text-[#f7c56b]">{data.battleStats.ongoing}</div>
				<div class="text-[10px] text-[#f7c56b]/70 uppercase tracking-wide">Active</div>
			</div>
			<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-2 sm:p-3">
				<div class="text-xl sm:text-2xl font-bold text-[#b7d0e6]">{data.battleStats.defender_won}</div>
				<div class="text-[10px] text-[#b7d0e6]/70 uppercase tracking-wide">Victories</div>
			</div>
		</div>
	</div>

	<!-- Capitulated States -->
	{#if data.capitulatedStates && data.capitulatedStates.length > 0}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex items-center gap-2 mb-3">
				<span class="text-lg">🏳️</span>
				<span class="text-sm font-bold text-red-300 uppercase tracking-wide">Capitulated States</span>
			</div>
			<div class="flex flex-wrap gap-3">
				{#each data.capitulatedStates as state}
					<div class="flex items-center gap-2 panel-muted rounded-sm px-3 py-2">
						<Logo src={state.logo} alt={state.name} class="size-8 rounded-sm" />
						<div>
							<div class="text-sm font-medium text-[#fff7e8]">{state.name}</div>
							{#if state.capitulatedAt}
								<div class="text-[10px] text-[#a89e8e]">{formatDate(state.capitulatedAt)}</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Ongoing Battles -->
	{#if ongoingBattles.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">
					<span class="size-2 bg-[#e6a527] rounded-full animate-pulse"></span>
					Active Battles
				</h2>
				<Badge tone="amber">{ongoingBattles.length} ONGOING</Badge>
			</div>
			<div class="space-y-2">
				{#each ongoingBattles as battle}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 panel-muted rounded-sm p-3 sm:p-4 hover:border-[#e6a527]/55 hover:bg-[#19304b] transition-colors group"
					>
						<Logo
							src="/coats/{battle.region.id}.svg"
							alt={getRegionName(battle.region.id)}
							class="size-10 sm:size-12 rounded-sm border border-[#dfceb0]/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#1f3450] to-[#14283f]"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate"
							>
								{getRegionName(battle.region.id)}
							</div>
							<div class="text-xs text-[#a89e8e]">
								<span class="text-red-300">{battle.attackerState.name}</span> →
								<span class="text-[#b7d0e6]">{battle.defenderState.name}</span>
							</div>
						</div>
						<div class="flex items-center gap-2 shrink-0">
							<Badge tone="amber">⚔️ LIVE</Badge>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Completed Battles -->
	{#if completedBattles.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">Battle History</h2>
			<div class="space-y-2 max-h-[32rem] overflow-y-auto">
				{#each completedBattles as battle}
					{@const isAttackerWin = battle.status === "attacker_won"}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 panel-muted rounded-sm p-3 sm:p-4 hover:border-[#e6a527]/55 hover:bg-[#19304b] transition-colors group"
					>
						<Logo
							src="/coats/{battle.region.id}.svg"
							alt={getRegionName(battle.region.id)}
							class="size-10 sm:size-12 rounded-sm border border-[#dfceb0]/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#1f3450] to-[#14283f]"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate"
							>
								{getRegionName(battle.region.id)}
							</div>
							<div class="text-xs text-[#a89e8e]">
								{battle.attackerState.name} → {battle.defenderState.name}
								{#if battle.endedAt}
									<span class="text-[#a89e8e]/70">· {formatDate(battle.endedAt)}</span>
								{/if}
							</div>
						</div>
						<div class="shrink-0">
							{#if isAttackerWin}
								<Badge tone="red">🔴 CAPTURED</Badge>
							{:else}
								<Badge tone="blue">🔵 DEFENDED</Badge>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else if totalBattles === 0}
		<div class="panel-muted rounded-sm p-8 sm:p-12 text-center">
			<div class="text-4xl sm:text-6xl mb-4 opacity-20">⚔️</div>
			<p class="text-lg text-[#a89e8e]">No battles fought yet</p>
		</div>
	{/if}

	<!-- Surrenders -->
	{#if data.war.surrenders && data.war.surrenders.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentFlag20Filled class="size-4 text-[#a89e8e]" />
				Surrenders
			</h2>
			<div class="space-y-2">
				{#each data.war.surrenders as surrender}
					<div class="flex items-center gap-3 panel-muted rounded-sm p-3 sm:p-4">
						<FluentFlag20Filled class="size-5 text-[#a89e8e] shrink-0" />
						<div class="flex-1 min-w-0">
							<div class="font-bold text-[#fff7e8] text-sm">{surrender.state.name}</div>
							<div class="text-xs text-[#a89e8e]">
								{surrender.surrenderer.profile?.name || "Unknown"} · {formatDate(surrender.surrenderedAt)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</PageContainer>

{#if showWarAnim}
	<ThreeAnimation variant="battle" onComplete={() => (showWarAnim = false)} />
{/if}
