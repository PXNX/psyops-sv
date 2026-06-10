<!-- /src/routes/(authenticated)/(dock)/battle/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { MILITARY_UNIT_TEMPLATES } from "$lib/config";
	import { formatDate, formatDateTime, getRegionName } from "$lib/utils/formatting.js";
	import { onMount, onDestroy } from "svelte";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { scaleLinear } from "d3-scale";
	import { Area, Axis, Highlight, RectClipPath } from "layerchart";
	import * as m from "$lib/paraglide/messages";
	import Logo from "$lib/component/Logo.svelte";
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";

	const { data } = $props();

	let isJoining = $state(false);
	let isExecuting = $state(false);
	let showBattleAnim = $state(false);
	let selectedUnitIds = $state<Set<number>>(new Set());
	let currentTime = $state(new Date());
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		countdownInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});



	function getUnitIconPath(unitType: string): string {
		return `/units/${unitType}.svg`;
	}

	function getRegionCoatPath(regionId: number): string {
		return `/coats/${regionId}.svg`;
	}

	function toggleUnitSelection(unitId: number) {
		const newSet = new Set(selectedUnitIds);
		if (newSet.has(unitId)) {
			newSet.delete(unitId);
		} else {
			newSet.add(unitId);
		}
		selectedUnitIds = newSet;
	}

	interface TimeRemaining {
		hours: number;
		minutes: number;
		seconds: number;
		total: number;
		isOver: boolean;
	}

	function getTimeRemaining(endsAt: string): TimeRemaining {
		const now = currentTime.getTime();
		const end = new Date(endsAt).getTime();
		const diff = end - now;

		if (diff <= 0) {
			return { hours: 0, minutes: 0, seconds: 0, total: 0, isOver: true };
		}

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		return { hours, minutes, seconds, total: diff, isOver: false };
	}

	const timeRemaining = $derived(getTimeRemaining(data.preparationEndsAt));

	const chartData = $derived(() => {
		if (data.battle.rounds.length === 0) return [];
		const rounds = [...data.battle.rounds].reverse();
		return rounds.map((round) => ({
			round: round.roundNumber,
			attackerDamage: round.attackerTotalDamage,
			defenderDamage: round.defenderTotalDamage,
			time: new Date(round.roundedAt)
		}));
	});

	// Calculate battle momentum (0-100, 50 is neutral)
	const battleMomentum = $derived(() => {
		const totalAttackerDamage = data.attackerStats.totalDamageDealt;
		const totalDefenderDamage = data.defenderStats.totalDamageDealt;
		const totalDamage = totalAttackerDamage + totalDefenderDamage;

		if (totalDamage === 0) return 50; // Neutral

		// Calculate percentage (0-100 scale where 50 is neutral)
		// Higher values = attacker winning, lower = defender winning
		const ratio = totalAttackerDamage / totalDamage;
		return Math.round(ratio * 100);
	});

	const attackerUnits = $derived(
		data.battle.participants
			.filter((p) => p.side === "attacker" && p.currentStrength > 0)
			.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())
	);

	const defenderUnits = $derived(
		data.battle.participants
			.filter((p) => p.side === "defender" && p.currentStrength > 0)
			.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())
	);

	const myUnits = $derived(data.userParticipants.filter((p) => p.currentStrength > 0));

	const otherAttackerUnits = $derived(attackerUnits.filter((p) => !data.userParticipants.some((up) => up.id === p.id)));

	const otherDefenderUnits = $derived(defenderUnits.filter((p) => !data.userParticipants.some((up) => up.id === p.id)));

	// Get user side indicator color
	const userSideColor = $derived(() => {
		if (!data.userSide) return "slate";
		return data.userSide === "attacker" ? "red" : "blue";
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-8">
	<!-- Command Header -->
	<div class="border-b border-red-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div class="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
					<!-- Region Emblem -->
					<div class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
						<a
							href="/region/{data.battle.regionId}"
							class="relative size-16 sm:size-20 bg-slate-800/50 rounded-lg border-2 border-red-500/30 p-2 flex items-center justify-center hover:border-red-500/50 transition-colors"
						>
							<Logo
								src={getRegionCoatPath(data.battle.regionId)}
								alt={getRegionName(data.battle.regionId)}
								class="w-full h-full object-contain opacity-80"
							/>
						</a>
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-2 mb-2">
							<a
								href="/region/{data.battle.regionId}"
								class="text-xl sm:text-3xl font-bold tracking-wider uppercase font-mono"
								class:text-red-500={data.userSide === "attacker"}
								class:text-blue-500={data.userSide === "defender"}
							>
								{#if data.userSide === "attacker"}
									Assault of
								{:else if data.userSide === "defender"}
									Defense of
								{/if}
								{getRegionName(data.battle.regionId)}
							</a>
							{#if data.battle.phase === "ended"}
								{#if data.battle.status === "attacker_won"}
									<span
										class="px-2 sm:px-3 py-1 bg-red-500/30 border border-red-400/50 rounded text-red-300 font-bold text-xs sm:text-sm whitespace-nowrap"
									>
										VICTORY - ATTACKER
									</span>
								{:else if data.battle.status === "defender_won"}
									<span
										class="px-2 sm:px-3 py-1 bg-blue-500/30 border border-blue-400/50 rounded text-blue-300 font-bold text-xs sm:text-sm whitespace-nowrap"
									>
										VICTORY - DEFENDER
									</span>
								{/if}
							{/if}
						</div>
						<div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 font-mono">
							<span class="uppercase">{data.battle.terrain}</span>
							<span class="text-slate-600 hidden sm:inline">|</span>
							<span class="hidden sm:inline">{formatDateTime(data.battle.startedAt)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Mission Timer -->
			{#if data.battle.phase === "preparation"}
				<div
					class="mt-4 sm:mt-6 bg-gradient-to-r from-blue-950/50 to-slate-950/50 border border-blue-500/20 rounded-lg p-3 sm:p-4"
				>
					<div class="flex items-center justify-between mb-2 sm:mb-3">
						<div class="text-blue-400 font-mono text-xs sm:text-sm font-medium uppercase tracking-wide">
							Time Until Combat
						</div>
					</div>
					<div class="flex items-center justify-center gap-2 sm:gap-3">
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-blue-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-blue-500/20"
							>
								{String(timeRemaining.hours).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">HRS</div>
						</div>
						<div class="text-xl sm:text-2xl font-bold text-blue-500/50">:</div>
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-blue-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-blue-500/20"
							>
								{String(timeRemaining.minutes).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">MIN</div>
						</div>
						<div class="text-xl sm:text-2xl font-bold text-blue-500/50">:</div>
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-blue-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-blue-500/20"
							>
								{String(timeRemaining.seconds).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">SEC</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
		<!-- Battle Progress Bar -->
		<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4 sm:p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<a
						href="/state/{data.battle.attackerState.id}"
						class="flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						{#if data.attackerStateLogo}
							<img
								src={data.attackerStateLogo}
								alt={data.battle.attackerState.name}
								class="size-8 sm:size-10 rounded border border-red-500/30"
							/>
						{/if}
						<span class="text-sm sm:text-base font-bold text-red-400">{data.battle.attackerState.name}</span>
					</a>
				</div>
				<div class="text-xs sm:text-sm text-slate-500 font-mono">BATTLE MOMENTUM</div>
				<div class="flex items-center gap-2 sm:gap-3">
					<a
						href="/state/{data.battle.defenderState.id}"
						class="flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						<span class="text-sm sm:text-base font-bold text-blue-400">{data.battle.defenderState.name}</span>
						{#if data.defenderStateLogo}
							<img
								src={data.defenderStateLogo}
								alt={data.battle.defenderState.name}
								class="size-8 sm:size-10 rounded border border-blue-500/30"
							/>
						{/if}
					</a>
				</div>
			</div>

			<!-- Horizontal Progress Bar -->
			<div class="relative h-12 sm:h-16 bg-slate-950/80 rounded-lg border border-slate-700/50 overflow-hidden">
				<!-- Defender territory (left side) -->
				<div
					class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-1000"
					style="width: {100 - battleMomentum()}%"
				></div>

				<!-- Attacker territory (right side) -->
				<div
					class="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-red-500 transition-all duration-1000"
					style="width: {battleMomentum()}%"
				></div>

				<!-- Center line -->
				<div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400/50 transform -translate-x-1/2"></div>

				<!-- Battle icon at momentum point -->
				<div
					class="absolute top-1/2 transform -translate-y-1/2 transition-all duration-1000 z-10"
					style="left: {battleMomentum()}%"
				>
					<div class="relative transform -translate-x-1/2">
						<div class="text-2xl sm:text-3xl">⚔️</div>
					</div>
				</div>

				<!-- Damage stats -->
				<div class="absolute inset-0 flex items-center justify-between px-4 sm:px-6 pointer-events-none">
					<div class="text-white font-bold text-xs sm:text-sm font-mono drop-shadow-lg">
						{data.defenderStats.totalDamageDealt} DMG
					</div>
					<div class="text-white font-bold text-xs sm:text-sm font-mono drop-shadow-lg">
						{data.attackerStats.totalDamageDealt} DMG
					</div>
				</div>
			</div>

			<div class="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
				<div class="text-center">
					<div class="text-red-400 font-mono mb-1">Attacker Pressure</div>
					<div class="text-white font-bold text-lg sm:text-xl">{battleMomentum()}%</div>
				</div>
				<div class="text-center">
					<div class="text-blue-400 font-mono mb-1">Defender Resistance</div>
					<div class="text-white font-bold text-lg sm:text-xl">{100 - battleMomentum()}%</div>
				</div>
			</div>
		</div>

		<!-- Fortifications Info -->
		{#if data.fortificationBonus > 0}
			<div class="bg-gradient-to-r from-blue-950/30 to-slate-950/30 border border-blue-500/30 rounded-lg p-3 sm:p-4">
				<div class="flex items-center gap-3">
					<div class="text-3xl sm:text-4xl">🏰</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-1">
							<span class="text-blue-300 font-bold text-sm sm:text-base"
								>Fortification Level {data.fortificationBonus}</span
							>
							<span
								class="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-mono"
							>
								-{Math.min(50, data.fortificationBonus * 2)}% DEFENDER DMG
							</span>
						</div>
						<div class="text-xs sm:text-sm text-blue-400/60">
							Defensive structures reduce incoming damage by {Math.min(50, data.fortificationBonus * 2)}%
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Unit Deployment Section -->
		{#if data.userSide}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-{userSideColor()}-500/30 rounded-xl p-4 sm:p-6"
			>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
					<h2 class="text-lg sm:text-xl font-bold text-slate-200 font-mono uppercase tracking-wide">Deploy Forces</h2>
					<div
						class="px-3 py-1 bg-{userSideColor()}-500/20 border border-{userSideColor()}-500/50 rounded text-xs sm:text-sm w-fit"
					>
						<span class="text-slate-400 font-mono">FIGHTING AS:</span>
						<span class="ml-2 text-{userSideColor()}-300 font-bold uppercase">{data.userSide}</span>
					</div>
				</div>

				{#if data.canJoin && data.userUnits.length > 0}
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
						{#each data.userUnits as unit}
							{@const template = MILITARY_UNIT_TEMPLATES[unit.unitType]}
							<button
								type="button"
								onclick={() => toggleUnitSelection(unit.id)}
								class="relative group text-left transition-all duration-300 {selectedUnitIds.has(unit.id)
									? 'scale-[1.02]'
									: 'hover:scale-[1.01]'}"
							>
								<div
									class="relative overflow-hidden bg-slate-800/40 border-2 rounded-xl p-3 sm:p-4 {selectedUnitIds.has(
										unit.id
									)
										? 'border-emerald-500/50 bg-emerald-950/20'
										: 'border-slate-700/50 hover:border-slate-600/50'}"
								>
									{#if selectedUnitIds.has(unit.id)}
										<div class="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
										<div class="absolute top-2 right-2">
											<div class="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
												<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"
													></path>
												</svg>
											</div>
										</div>
									{/if}

									<div class="relative flex items-center gap-2 sm:gap-3 mb-3">
										<div
											class="size-10 sm:size-12 flex-shrink-0 flex items-center justify-center bg-slate-900/60 rounded border border-slate-700/60 p-1.5 sm:p-2"
										>
											<img
												src={getUnitIconPath(unit.unitType)}
												alt={unit.unitType}
												class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
											/>
										</div>
										<div class="flex-1 min-w-0">
											<div class="text-xs text-slate-500 font-mono mb-0.5">{m[unit.unitType]()}</div>
											<div class="text-sm sm:text-base font-bold text-white truncate">{unit.name}</div>
											<div class="flex items-center gap-2 mt-1">
												<span class="text-xs text-red-400 font-mono">⚔️ {template.baseAttack}</span>
												<span class="text-xs text-blue-400 font-mono">🛡️ {template.baseDefense}</span>
											</div>
										</div>
									</div>

									<div class="relative space-y-2">
										<!-- Health (Blue) -->
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>HEALTH</span>
												<span class="text-blue-400 font-medium">{unit.health}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-400"
													style="width: {unit.health}%"
												></div>
											</div>
										</div>

										<!-- Organization (Green) -->
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>ORGANIZATION</span>
												<span class="text-emerald-400 font-medium">{unit.organization}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
													style="width: {unit.organization}%"
												></div>
											</div>
										</div>

										<!-- Supply (Orange) -->
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>SUPPLY</span>
												<span class="text-orange-400 font-medium">{unit.supplyLevel}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-500 to-orange-400"
													style="width: {unit.supplyLevel}%"
												></div>
											</div>
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>

					{#if selectedUnitIds.size > 0}
						<form
							method="POST"
							action="?/assignUnits"
							use:enhance={() => {
								isJoining = true;
								return async ({ update }) => {
									await update();
									isJoining = false;
									selectedUnitIds = new Set();
								};
							}}
						>
							{#each Array.from(selectedUnitIds) as unitId}
								<input type="hidden" name="unitIds" value={unitId} />
							{/each}
							<button
								type="submit"
								disabled={isJoining}
								class="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-800 rounded-lg text-white font-bold text-base sm:text-lg shadow-lg transition-all duration-300 hover:scale-[1.01] disabled:scale-100 font-mono uppercase tracking-wide"
							>
								{isJoining
									? "⚡ Deploying..."
									: `⚡ Deploy ${selectedUnitIds.size} Unit${selectedUnitIds.size > 1 ? "s" : ""}`}
							</button>
						</form>
					{:else}
						<div class="text-center py-6 sm:py-8 text-slate-500 font-mono text-sm">← Select units to deploy</div>
					{/if}
				{:else if data.userUnits.length === 0}
					<div class="text-center py-8 sm:py-12 bg-slate-900/30 rounded-lg border border-slate-700/30">
						<div class="text-4xl sm:text-6xl mb-4 opacity-30">🚫</div>
						<p class="text-base sm:text-lg text-slate-400 font-mono mb-2">No eligible units</p>
						<p class="text-xs sm:text-sm text-slate-600">
							{#if data.userSide === "defender"}
								Units must be in Region #{data.battle.regionId}
							{:else}
								Units must be in Region #{data.userResidenceRegionId}
							{/if}
						</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="bg-slate-900/30 border border-slate-700/30 rounded-xl p-8 sm:p-12 text-center">
				<div class="text-4xl sm:text-6xl mb-4 opacity-20">⛔</div>
				<p class="text-lg sm:text-xl text-slate-400 font-mono mb-2">Cannot Deploy</p>
				<p class="text-xs sm:text-sm text-slate-600">{data.canJoinReason || "Unknown reason"}</p>
			</div>
		{/if}

		<!-- Combat Execution -->
		{#if data.battle.phase === "active"}
			<div class="bg-gradient-to-r from-red-950/30 to-orange-950/30 border-2 border-red-500/40 rounded-xl p-4 sm:p-6">
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
					<div>
						<h2 class="text-lg sm:text-xl font-bold text-red-400 font-mono uppercase tracking-wide mb-1">
							Execute Combat Round
						</h2>
						<p class="text-xs sm:text-sm text-red-400/60">Simulate next round of combat</p>
					</div>
					<div class="text-3xl sm:text-5xl opacity-20">⚔️</div>
				</div>
				<form
					method="POST"
					action="?/executeCombatRound"
					use:enhance={() => {
						isExecuting = true;
						return async ({ update, result }) => {
							await update();
							isExecuting = false;
							if (result.type === 'success') showBattleAnim = true;
						};
					}}
				>
					<button
						type="submit"
						disabled={isExecuting}
						class="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-800 rounded-lg text-white font-bold text-base sm:text-lg shadow-lg transition-all duration-300 hover:scale-[1.01] disabled:scale-100 font-mono uppercase tracking-wide"
					>
						{isExecuting ? "⚔️ Executing..." : "⚔️ Execute Round"}
					</button>
				</form>
			</div>
		{/if}

		<!-- My Engaged Units -->
		{#if myUnits.length > 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-2 border-{userSideColor()}-500/50 rounded-xl"
			>
				<div class="bg-{userSideColor()}-950/30 border-b border-{userSideColor()}-500/30 px-4 sm:px-6 py-3 sm:py-4">
					<div class="flex items-center justify-between">
						<h3 class="text-base sm:text-lg font-bold text-{userSideColor()}-400 font-mono uppercase tracking-wide">
							Your Units in Battle
						</h3>
						<div
							class="px-2 sm:px-3 py-1 bg-{userSideColor()}-950/50 border border-{userSideColor()}-500/40 rounded text-{userSideColor()}-400 font-mono text-xs sm:text-sm"
						>
							{myUnits.length} UNIT{myUnits.length > 1 ? "S" : ""}
						</div>
					</div>
				</div>
				<div class="p-3 sm:p-4 space-y-2 sm:space-y-3">
					{#each myUnits as participant}
						{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
						{@const sideColor = participant.side === "attacker" ? "red" : "blue"}
						<div
							class="relative overflow-hidden bg-slate-900/40 border rounded-lg p-3 sm:p-4 {participant.isEngaged
								? `border-${sideColor}-500/50 bg-${sideColor}-950/10`
								: 'border-slate-700/50'}"
						>
							{#if participant.isEngaged}
								<div class="absolute top-2 right-2">
									<div
										class="px-2 py-0.5 bg-{sideColor}-500/30 border border-{sideColor}-400/50 rounded text-xs text-{sideColor}-300 font-mono font-bold"
									>
										⚔️ ENGAGED
									</div>
								</div>
							{/if}

							<div class="flex items-center gap-2 sm:gap-3 mb-3">
								<div
									class="size-10 sm:size-12 flex-shrink-0 flex items-center justify-center bg-slate-950/60 rounded border border-slate-700/60 p-1.5 sm:p-2"
								>
									<img
										src={getUnitIconPath(participant.unit.unitType)}
										alt={participant.unit.unitType}
										class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-xs text-slate-500 font-mono mb-0.5">{m[participant.unit.unitType]()}</div>
									<div class="font-bold text-white text-sm sm:text-base truncate">{participant.unit.name}</div>
									<div class="flex items-center gap-2 mt-1">
										<span class="text-xs text-red-400 font-mono">⚔️ {template.baseAttack}</span>
										<span class="text-xs text-blue-400 font-mono">🛡️ {template.baseDefense}</span>
									</div>
								</div>
							</div>

							<div class="space-y-2">
								<!-- Health -->
								<div>
									<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
										<span>HEALTH</span>
										<span class="text-blue-400 font-medium">{participant.currentStrength}%</span>
									</div>
									<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
										<div
											class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-400"
											style="width: {participant.currentStrength}%"
										></div>
									</div>
								</div>

								<!-- Organization -->
								<div>
									<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
										<span>ORGANIZATION</span>
										<span class="text-emerald-400 font-medium">{participant.currentOrganization}%</span>
									</div>
									<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
										<div
											class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
											style="width: {participant.currentOrganization}%"
										></div>
									</div>
								</div>

								<!-- Supply -->
								<div>
									<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
										<span>SUPPLY</span>
										<span class="text-orange-400 font-medium">{participant.unit.supplyLevel}%</span>
									</div>
									<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
										<div
											class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-500 to-orange-400"
											style="width: {participant.unit.supplyLevel}%"
										></div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Other Players' Units -->
		{#if otherAttackerUnits.length > 0 || otherDefenderUnits.length > 0}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				<!-- Other Attackers -->
				{#if otherAttackerUnits.length > 0}
					<div
						class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-red-500/30 rounded-xl overflow-hidden"
					>
						<div class="bg-red-950/30 border-b border-red-500/30 px-4 sm:px-6 py-3 sm:py-4">
							<div class="flex items-center justify-between">
								<h3 class="text-base sm:text-lg font-bold text-red-400 font-mono uppercase tracking-wide">Attackers</h3>
								<div
									class="px-2 sm:px-3 py-1 bg-red-950/50 border border-red-500/40 rounded text-red-400 font-mono text-xs sm:text-sm"
								>
									{otherAttackerUnits.length} UNITS
								</div>
							</div>
						</div>
						<div class="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
							{#each otherAttackerUnits as participant}
								{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
								<div
									class="relative overflow-hidden bg-slate-900/40 border rounded-lg p-3 sm:p-4 {participant.isEngaged
										? 'border-red-500/50 bg-red-950/10'
										: 'border-slate-700/50'}"
								>
									{#if participant.isEngaged}
										<div class="absolute top-2 right-2">
											<div
												class="px-2 py-0.5 bg-red-500/30 border border-red-400/50 rounded text-xs text-red-300 font-mono font-bold"
											>
												⚔️ ENGAGED
											</div>
										</div>
									{/if}

									<div class="flex items-center gap-2 sm:gap-3 mb-3">
										<div
											class="size-10 sm:size-12 flex-shrink-0 flex items-center justify-center bg-slate-950/60 rounded border border-slate-700/60 p-1.5 sm:p-2"
										>
											<img
												src={getUnitIconPath(participant.unit.unitType)}
												alt={participant.unit.unitType}
												class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
											/>
										</div>
										<div class="flex-1 min-w-0">
											<div class="text-xs text-slate-500 font-mono mb-0.5">{m[participant.unit.unitType]()}</div>
											<div class="font-bold text-white text-sm sm:text-base truncate">{participant.unit.name}</div>
											<div class="text-xs text-slate-600">{participant.unit.owner.profile?.name || "Unknown"}</div>
											<div class="flex items-center gap-2 mt-0.5">
												<span class="text-xs text-red-400 font-mono">⚔️ {template.baseAttack}</span>
												<span class="text-xs text-blue-400 font-mono">🛡️ {template.baseDefense}</span>
											</div>
										</div>
									</div>

									<div class="space-y-2">
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>HEALTH</span>
												<span class="text-blue-400 font-medium">{participant.currentStrength}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-400"
													style="width: {participant.currentStrength}%"
												></div>
											</div>
										</div>
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>ORG</span>
												<span class="text-emerald-400 font-medium">{participant.currentOrganization}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
													style="width: {participant.currentOrganization}%"
												></div>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Other Defenders -->
				{#if otherDefenderUnits.length > 0}
					<div
						class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-blue-500/30 rounded-xl overflow-hidden"
					>
						<div class="bg-blue-950/30 border-b border-blue-500/30 px-4 sm:px-6 py-3 sm:py-4">
							<div class="flex items-center justify-between">
								<h3 class="text-base sm:text-lg font-bold text-blue-400 font-mono uppercase tracking-wide">
									Defenders
								</h3>
								<div
									class="px-2 sm:px-3 py-1 bg-blue-950/50 border border-blue-500/40 rounded text-blue-400 font-mono text-xs sm:text-sm"
								>
									{otherDefenderUnits.length} UNITS
								</div>
							</div>
						</div>
						<div class="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
							{#each otherDefenderUnits as participant}
								{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
								<div
									class="relative overflow-hidden bg-slate-900/40 border rounded-lg p-3 sm:p-4 {participant.isEngaged
										? 'border-blue-500/50 bg-blue-950/10'
										: 'border-slate-700/50'}"
								>
									{#if participant.isEngaged}
										<div class="absolute top-2 right-2">
											<div
												class="px-2 py-0.5 bg-blue-500/30 border border-blue-400/50 rounded text-xs text-blue-300 font-mono font-bold"
											>
												⚔️ ENGAGED
											</div>
										</div>
									{/if}

									<div class="flex items-center gap-2 sm:gap-3 mb-3">
										<div
											class="size-10 sm:size-12 flex-shrink-0 flex items-center justify-center bg-slate-950/60 rounded border border-slate-700/60 p-1.5 sm:p-2"
										>
											<img
												src={getUnitIconPath(participant.unit.unitType)}
												alt={participant.unit.unitType}
												class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
											/>
										</div>
										<div class="flex-1 min-w-0">
											<div class="text-xs text-slate-500 font-mono mb-0.5">{m[participant.unit.unitType]()}</div>
											<div class="font-bold text-white text-sm sm:text-base truncate">{participant.unit.name}</div>
											<div class="text-xs text-slate-600">{participant.unit.owner.profile?.name || "Unknown"}</div>
											<div class="flex items-center gap-2 mt-0.5">
												<span class="text-xs text-red-400 font-mono">⚔️ {template.baseAttack}</span>
												<span class="text-xs text-blue-400 font-mono">🛡️ {template.baseDefense}</span>
											</div>
										</div>
									</div>

									<div class="space-y-2">
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>HEALTH</span>
												<span class="text-blue-400 font-medium">{participant.currentStrength}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-400"
													style="width: {participant.currentStrength}%"
												></div>
											</div>
										</div>
										<div>
											<div class="flex items-center justify-between text-xs text-slate-500 mb-1 font-mono">
												<span>ORG</span>
												<span class="text-emerald-400 font-medium">{participant.currentOrganization}%</span>
											</div>
											<div class="h-1.5 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/30">
												<div
													class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
													style="width: {participant.currentOrganization}%"
												></div>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Combat Log -->
		{#if data.battle.rounds.length > 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
			>
				<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4">
					<h3 class="text-base sm:text-lg font-bold text-slate-200 font-mono uppercase tracking-wide">Combat Log</h3>
				</div>
				<div class="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
					{#each data.battle.rounds as round}
						<div class="bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 sm:p-4">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
								<div class="flex items-center gap-2 sm:gap-3">
									<div class="px-2 py-1 bg-slate-800/50 border border-slate-600/50 rounded">
										<span class="text-slate-400 font-mono text-xs">ROUND</span>
										<span class="text-white font-bold font-mono text-sm ml-2">{round.roundNumber}</span>
									</div>
								</div>
								<span class="text-xs text-slate-600 font-mono">{formatDateTime(round.roundedAt)}</span>
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
								<div class="bg-red-950/20 border border-red-800/30 rounded p-2 sm:p-3">
									<div class="text-red-400/70 font-mono text-xs mb-1 uppercase">Attackers</div>
									<div class="text-slate-400">
										<span class="text-white font-bold">{round.attackerUnitsEngaged}</span> units dealt
										<span class="text-red-400 font-bold">{round.attackerTotalDamage}</span> damage
									</div>
								</div>
								<div class="bg-blue-950/20 border border-blue-800/30 rounded p-2 sm:p-3">
									<div class="text-blue-400/70 font-mono text-xs mb-1 uppercase">Defenders</div>
									<div class="text-slate-400">
										<span class="text-white font-bold">{round.defenderUnitsEngaged}</span> units dealt
										<span class="text-blue-400 font-bold">{round.defenderTotalDamage}</span> damage
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Battle Statistics Chart -->
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
			>
				<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4">
					<h3 class="text-base sm:text-lg font-bold text-slate-200 font-mono uppercase tracking-wide">
						Damage Analysis
					</h3>
				</div>
				<div class="p-3 sm:p-6">
					{#if chartData().length > 0}
						<div class="h-64 sm:h-96 w-full">
							<Chart
								data={chartData()}
								x="round"
								xScale={scaleLinear()}
								y={[0, Math.max(...chartData().map((d) => Math.max(d.attackerDamage, d.defenderDamage))) * 1.1]}
								yScale={scaleLinear()}
								padding={{ left: 40, bottom: 30, top: 20, right: 20 }}
							>
								<Svg>
									<RectClipPath x="round" y={[0, null]} spring />
									<Axis
										placement="left"
										grid={{ style: "stroke: rgb(71, 85, 105); stroke-opacity: 0.3;" }}
										rule={{ style: "stroke: rgb(100, 116, 139);" }}
										label={{ style: "fill: rgb(148, 163, 184); font-family: monospace; font-size: 10px;" }}
									/>
									<Axis
										placement="bottom"
										rule={{ style: "stroke: rgb(100, 116, 139);" }}
										label={{ style: "fill: rgb(148, 163, 184); font-family: monospace; font-size: 10px;" }}
									/>

									<Area y="attackerDamage" line={{ class: "stroke-red-500 stroke-2" }} fill="url(#attackerGradient)" />
									<Area y="defenderDamage" line={{ class: "stroke-blue-500 stroke-2" }} fill="url(#defenderGradient)" />

									<defs>
										<linearGradient id="attackerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" style="stop-color:rgb(239, 68, 68);stop-opacity:0.3" />
											<stop offset="100%" style="stop-color:rgb(239, 68, 68);stop-opacity:0.05" />
										</linearGradient>
										<linearGradient id="defenderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" style="stop-color:rgb(59, 130, 246);stop-opacity:0.3" />
											<stop offset="100%" style="stop-color:rgb(59, 130, 246);stop-opacity:0.05" />
										</linearGradient>
									</defs>

									<Highlight points lines />
								</Svg>
								<Tooltip.Root let:data>
									<Tooltip.Header>
										Round {data.round}
									</Tooltip.Header>
									<Tooltip.List>
										<Tooltip.Item
											label="Attacker"
											value={data.attackerDamage}
											valueClass="text-red-400 font-bold font-mono"
										/>
										<Tooltip.Item
											label="Defender"
											value={data.defenderDamage}
											valueClass="text-blue-400 font-bold font-mono"
										/>
									</Tooltip.List>
								</Tooltip.Root>
							</Chart>
						</div>

						<div class="flex items-center justify-center gap-4 sm:gap-8 mt-4 sm:mt-6">
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full"></div>
								<span class="text-xs sm:text-sm text-slate-400 font-mono">Attacker</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full"></div>
								<span class="text-xs sm:text-sm text-slate-400 font-mono">Defender</span>
							</div>
						</div>
					{:else}
						<div class="text-center py-8 sm:py-12 text-slate-600 font-mono text-sm">No combat data yet</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showBattleAnim}
	<ThreeAnimation variant="battle" onComplete={() => (showBattleAnim = false)} />
{/if}

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.animate-ping {
		animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
</style>
