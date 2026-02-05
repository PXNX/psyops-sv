<script lang="ts">
	import { enhance } from "$app/forms";
	import { MILITARY_UNIT_TEMPLATES } from "$lib/config/militaryUnits.js";
	import { formatDate } from "$lib/utils/formatting.js";
	import { onMount, onDestroy } from "svelte";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { scaleTime, scaleLinear } from "d3-scale";
	import { Area, Axis, Highlight, RectClipPath } from "layerchart";

	const { data } = $props();

	let isJoining = $state(false);
	let isExecuting = $state(false);
	let selectedUnitId = $state<number | null>(null);
	let currentTime = $state(new Date());
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		// Update countdown every second
		countdownInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});

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
	const canAttack = $derived(data.battle.phase === "active");

	// Prepare chart data from battle rounds
	const chartData = $derived(() => {
		if (data.battle.rounds.length === 0) return [];

		// Reverse to get chronological order
		const rounds = [...data.battle.rounds].reverse();

		return rounds.map((round, index) => ({
			round: round.roundNumber,
			attackerDamage: round.attackerTotalDamage,
			defenderDamage: round.defenderTotalDamage,
			time: new Date(round.roundedAt)
		}));
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

	// Determine eligibility message
	const eligibilityMessage = $derived(() => {
		if (!data.userSide && data.canJoinReason) {
			return data.canJoinReason;
		}
		if (data.userSide === "attacker") {
			return "You can attack - your region borders the battle region";
		}
		if (data.userSide === "defender") {
			return "You can defend - you are in the battle region";
		}
		return "Unknown status";
	});
</script>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Battle Header with Gradient -->
	<div
		class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
	>
		<div class="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5"></div>
		<div class="relative p-8">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1
						class="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
					>
						Battle of Region {data.battle.regionId}
					</h1>
					{#if data.battle.phase === "ended"}
						<div class="flex items-center gap-3 mt-2">
							{#if data.battle.status === "attacker_won"}
								<span class="px-4 py-2 bg-red-500/20 border border-red-400/50 rounded-lg text-red-300 font-bold">
									🏆 Attacker Victory
								</span>
								<span class="text-gray-400">
									{data.battle.attackerState.name} captured the region
								</span>
							{:else if data.battle.status === "defender_won"}
								<span class="px-4 py-2 bg-blue-500/20 border border-blue-400/50 rounded-lg text-blue-300 font-bold">
									🏆 Defender Victory
								</span>
								<span class="text-gray-400">
									{data.battle.defenderState.name} held the region
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Enhanced Phase Timer -->
			<div class="mb-6">
				{#if data.battle.phase === "preparation"}
					<div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-xl p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-xl font-bold text-blue-300">⏱️ Preparation Phase</h3>
							<div class="text-xs text-gray-400">Combat starts when timer ends</div>
						</div>

						<!-- Countdown Display -->
						<div class="flex items-center justify-center gap-4 mb-4">
							<div class="text-center">
								<div class="text-4xl font-mono font-bold text-white bg-slate-800/50 rounded-lg px-4 py-2 min-w-[80px]">
									{String(timeRemaining.hours).padStart(2, "0")}
								</div>
								<div class="text-xs text-gray-400 mt-1">Hours</div>
							</div>
							<div class="text-3xl font-bold text-gray-500">:</div>
							<div class="text-center">
								<div class="text-4xl font-mono font-bold text-white bg-slate-800/50 rounded-lg px-4 py-2 min-w-[80px]">
									{String(timeRemaining.minutes).padStart(2, "0")}
								</div>
								<div class="text-xs text-gray-400 mt-1">Minutes</div>
							</div>
							<div class="text-3xl font-bold text-gray-500">:</div>
							<div class="text-center">
								<div class="text-4xl font-mono font-bold text-white bg-slate-800/50 rounded-lg px-4 py-2 min-w-[80px]">
									{String(timeRemaining.seconds).padStart(2, "0")}
								</div>
								<div class="text-xs text-gray-400 mt-1">Seconds</div>
							</div>
						</div>

						<p class="text-center text-gray-300">
							Deploy your units now! Combat begins automatically when the timer ends.
						</p>
					</div>
				{:else if data.battle.phase === "active"}
					<div
						class="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-400/30 rounded-xl p-6 relative overflow-hidden"
					>
						<!-- Pulsing background effect -->
						<div class="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 animate-pulse"></div>

						<div class="relative flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="relative">
									<div class="w-4 h-4 bg-red-500 rounded-full animate-ping absolute"></div>
									<div class="w-4 h-4 bg-red-500 rounded-full"></div>
								</div>
								<h3 class="text-xl font-bold text-red-300">⚔️ Battle Active - Combat Ongoing</h3>
							</div>
							<div class="text-sm text-gray-300">Attacks are now possible</div>
						</div>
					</div>
				{:else if data.battle.phase === "ended"}
					<div class="bg-gradient-to-r from-gray-500/10 to-slate-500/10 border border-gray-400/30 rounded-xl p-6">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<h3 class="text-xl font-bold text-gray-300">🏁 Battle Ended</h3>
								{#if data.battle.endedAt}
									<span class="text-sm text-gray-500">
										{formatDate(data.battle.endedAt)}
									</span>
								{/if}
							</div>
							<div class="text-right">
								{#if data.battle.status === "attacker_won"}
									<div class="text-lg font-bold text-red-400">
										⚔️ {data.battle.attackerState.name}
									</div>
									<div class="text-xs text-gray-500">Region captured</div>
								{:else if data.battle.status === "defender_won"}
									<div class="text-lg font-bold text-blue-400">
										🛡️ {data.battle.defenderState.name}
									</div>
									<div class="text-xs text-gray-500">Region defended</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Battle Stats -->
			<div class="grid grid-cols-2 gap-4 mb-6">
				<div class="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-6">
					<div class="text-red-400 text-sm font-medium mb-2">⚔️ ATTACKERS</div>
					<div class="text-3xl font-bold text-white mb-1">{attackerUnits.length}</div>
					<div class="text-sm text-gray-400">{data.battle.attackerState.name}</div>
				</div>
				<div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6">
					<div class="text-blue-400 text-sm font-medium mb-2">🛡️ DEFENDERS</div>
					<div class="text-3xl font-bold text-white mb-1">{defenderUnits.length}</div>
					<div class="text-sm text-gray-400">{data.battle.defenderState.name}</div>
				</div>
			</div>

			{#if data.fortificationBonus > 0}
				<div class="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-xl p-4">
					<div class="flex items-center gap-2 text-blue-300">
						<span class="text-lg">🏰</span>
						<span class="font-medium">Fortification Level {data.fortificationBonus}</span>
						<span class="text-sm text-gray-400"
							>(-{Math.min(50, data.fortificationBonus * 2)}% damage to defenders)</span
						>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Deploy Units Section -->
	{#if data.userSide}
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
			<div class="relative p-8">
				<h2
					class="text-2xl font-bold text-white mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
				>
					🚀 Deploy Your Units
				</h2>

				<!-- Eligibility Info -->
				<div class="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
					<div class="text-sm text-gray-400 space-y-1">
						<div>Your Side: <span class="text-white font-medium uppercase">{data.userSide}</span></div>
						<div>
							Status: <span class="text-emerald-400 font-medium">{eligibilityMessage()}</span>
						</div>
						<div>Your Region: <span class="text-white font-medium">#{data.userResidenceRegionId}</span></div>
						<div>Battle Region: <span class="text-white font-medium">#{data.battle.regionId}</span></div>
						<div>Available Units: <span class="text-white font-medium">{data.userUnits.length}</span></div>
						<div>Can Join: <span class="text-white font-medium">{data.canJoin ? "YES ✓" : "NO ✗"}</span></div>
						{#if !data.canJoin && data.userSide}
							<div class="text-amber-400 mt-2">
								⚠️ {data.userUnits.length === 0
									? "No eligible units in the required region"
									: "Unknown deployment issue"}
							</div>
						{/if}
					</div>
				</div>

				{#if data.canJoin && data.userUnits.length > 0}
					<!-- Unit Selection -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
						{#each data.userUnits as unit}
							<button
								type="button"
								onclick={() => (selectedUnitId = unit.id)}
								class="relative group p-5 rounded-xl border-2 transition-all duration-300 text-left {selectedUnitId ===
								unit.id
									? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50 scale-[1.02]'
									: 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 hover:scale-[1.01]'}"
							>
								<div
									class="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
								></div>
								<div class="relative">
									<div class="text-sm font-medium text-gray-400 mb-1">{unit.unitType}</div>
									<div class="text-lg font-bold text-white mb-3">{unit.name}</div>
									<div class="flex items-center gap-3 text-sm">
										<div class="flex items-center gap-1">
											<span class="text-red-400">⚔️</span>
											<span class="text-white font-medium">{MILITARY_UNIT_TEMPLATES[unit.unitType].baseAttack!}</span>
										</div>
										<div class="flex items-center gap-1">
											<span class="text-blue-400">🛡️</span>
											<span class="text-white font-medium">{MILITARY_UNIT_TEMPLATES[unit.unitType].baseDefense!}</span>
										</div>
										<div class="flex items-center gap-1">
											<span class="text-emerald-400">❤️</span>
											<span class="text-white font-medium">{unit.health}%</span>
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>

					<!-- Deploy Button -->
					{#if selectedUnitId}
						<form
							method="POST"
							action="?/assignUnit"
							use:enhance={() => {
								isJoining = true;
								return async ({ update }) => {
									await update();
									isJoining = false;
									selectedUnitId = null;
								};
							}}
						>
							<input type="hidden" name="unitId" value={selectedUnitId} />
							<button
								type="submit"
								disabled={isJoining}
								class="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-bold text-lg shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100"
							>
								{isJoining ? "🚀 Deploying..." : "🚀 Deploy Selected Unit"}
							</button>
						</form>
					{:else}
						<div class="text-center py-6 text-gray-400">👆 Select a unit above to deploy</div>
					{/if}
				{:else if data.userUnits.length === 0}
					<div class="text-center py-12">
						<div class="text-6xl mb-4">🏜️</div>
						<p class="text-xl text-gray-400 mb-2">No units available in the required region</p>
						<p class="text-sm text-gray-500">
							{#if data.userSide === "defender"}
								Train or move units to Region {data.battle.regionId} (battle region)
							{:else}
								Train or move units to Region {data.userResidenceRegionId} (your region, which borders the battle)
							{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="relative p-12 text-center">
				<div class="text-6xl mb-4">🚫</div>
				<p class="text-xl text-gray-400 mb-2">Cannot Join This Battle</p>
				<p class="text-sm text-gray-500">{data.canJoinReason || "Unknown reason"}</p>
			</div>
		</div>
	{/if}

	<!-- Combat Control -->
	{#if data.battle.phase === "active"}
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-800/90 to-orange-900/90 backdrop-blur-xl border border-red-500/30 shadow-2xl"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10"></div>
			<div class="relative p-8">
				<h2 class="text-2xl font-bold text-white mb-6">⚡ Execute Combat Round</h2>
				<form
					method="POST"
					action="?/executeCombatRound"
					use:enhance={() => {
						isExecuting = true;
						return async ({ update }) => {
							await update();
							isExecuting = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={isExecuting}
						class="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-bold text-lg shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100"
					>
						{isExecuting ? "⚔️ Fighting..." : "⚔️ Execute Combat Round"}
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Battle Participants -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Attackers -->
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/5"></div>
			<div class="relative p-6">
				<h3 class="text-xl font-bold text-red-400 mb-4">⚔️ Attackers ({attackerUnits.length})</h3>
				<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
					{#each attackerUnits as unit, index}
						<div
							class="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border {unit.isEngaged
								? 'border-red-400/50 shadow-lg shadow-red-500/20'
								: 'border-slate-700/50'}"
						>
							{#if unit.isEngaged}
								<div class="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
							{/if}
							<div class="relative flex items-center justify-between mb-2">
								<div>
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-mono text-gray-500">#{index + 1}</span>
										<span class="font-bold text-white">{unit.unit.name}</span>
										{#if unit.isEngaged}
											<span
												class="px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded text-xs text-red-300 font-medium"
											>
												ENGAGED
											</span>
										{/if}
									</div>
									<div class="text-sm text-gray-400">
										{unit.unit.owner.profile?.name || "Unknown"}
									</div>
								</div>
								<div class="text-right">
									<div class="text-xs text-gray-400">ATK</div>
									<div class="text-2xl font-bold text-red-400">
										{MILITARY_UNIT_TEMPLATES[unit.unit.unitType].baseAttack!}
									</div>
								</div>
							</div>
							<div class="relative">
								<div class="flex items-center justify-between text-xs text-gray-400 mb-1">
									<span>Strength</span>
									<span class="text-white font-medium">{unit.currentStrength}%</span>
								</div>
								<div class="h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
										style="width: {unit.currentStrength}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Defenders -->
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5"></div>
			<div class="relative p-6">
				<h3 class="text-xl font-bold text-blue-400 mb-4">🛡️ Defenders ({defenderUnits.length})</h3>
				<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
					{#each defenderUnits as unit, index}
						<div
							class="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border {unit.isEngaged
								? 'border-blue-400/50 shadow-lg shadow-blue-500/20'
								: 'border-slate-700/50'}"
						>
							{#if unit.isEngaged}
								<div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
							{/if}
							<div class="relative flex items-center justify-between mb-2">
								<div>
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-mono text-gray-500">#{index + 1}</span>
										<span class="font-bold text-white">{unit.unit.name}</span>
										{#if unit.isEngaged}
											<span
												class="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-xs text-blue-300 font-medium"
											>
												ENGAGED
											</span>
										{/if}
									</div>
									<div class="text-sm text-gray-400">
										{unit.unit.owner.profile?.name || "Unknown"}
									</div>
								</div>
								<div class="text-right">
									<div class="text-xs text-gray-400">DEF</div>
									<div class="text-2xl font-bold text-blue-400">
										{MILITARY_UNIT_TEMPLATES[unit.unit.unitType].baseDefense!}
									</div>
								</div>
							</div>
							<div class="relative">
								<div class="flex items-center justify-between text-xs text-gray-400 mb-1">
									<span>Strength</span>
									<span class="text-white font-medium">{unit.currentStrength}%</span>
								</div>
								<div class="h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
										style="width: {unit.currentStrength}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Combat Log -->
	{#if data.battle.rounds.length > 0}
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="relative p-6">
				<h3 class="text-xl font-bold text-white mb-4">📜 Combat Log</h3>
				<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
					{#each data.battle.rounds as round}
						<div class="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
							<div class="flex items-center justify-between mb-3">
								<span class="text-lg font-bold text-white">Round {round.roundNumber}</span>
								<span class="text-sm text-gray-400">{formatDate(round.roundedAt)}</span>
							</div>
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<div class="text-red-400 font-medium mb-1">Attackers</div>
									<div class="text-gray-400">
										{round.attackerUnitsEngaged} units → {round.attackerTotalDamage} damage
									</div>
								</div>
								<div>
									<div class="text-blue-400 font-medium mb-1">Defenders</div>
									<div class="text-gray-400">
										{round.defenderUnitsEngaged} units → {round.defenderTotalDamage} damage
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Battle Statistics Chart -->
		<div
			class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
		>
			<div class="relative p-6">
				<h3 class="text-xl font-bold text-white mb-6">📊 Battle Statistics - Damage Over Time</h3>

				{#if chartData().length > 0}
					<div class="h-96 w-full">
						<Chart
							data={chartData()}
							x="round"
							xScale={scaleLinear()}
							y={[0, Math.max(...chartData().map((d) => Math.max(d.attackerDamage, d.defenderDamage))) * 1.1]}
							yScale={scaleLinear()}
							padding={{ left: 60, bottom: 40, top: 20, right: 20 }}
						>
							<Svg>
								<RectClipPath x="round" y={[0, null]} spring />
								<Axis
									placement="left"
									grid={{ style: "stroke: rgb(71, 85, 105); stroke-opacity: 0.3;" }}
									rule={{ style: "stroke: rgb(100, 116, 139);" }}
									label={{ style: "fill: rgb(148, 163, 184);" }}
								/>
								<Axis
									placement="bottom"
									rule={{ style: "stroke: rgb(100, 116, 139);" }}
									label={{ style: "fill: rgb(148, 163, 184);" }}
								/>

								<!-- Attacker damage area -->
								<Area y="attackerDamage" line={{ class: "stroke-red-500 stroke-2" }} fill="url(#attackerGradient)" />

								<!-- Defender damage area -->
								<Area y="defenderDamage" line={{ class: "stroke-blue-500 stroke-2" }} fill="url(#defenderGradient)" />

								<!-- Gradients -->
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
										label="Attacker Damage"
										value={data.attackerDamage}
										valueClass="text-red-400 font-bold"
									/>
									<Tooltip.Item
										label="Defender Damage"
										value={data.defenderDamage}
										valueClass="text-blue-400 font-bold"
									/>
								</Tooltip.List>
							</Tooltip.Root>
						</Chart>
					</div>

					<!-- Legend -->
					<div class="flex items-center justify-center gap-8 mt-6">
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 bg-red-500 rounded-full"></div>
							<span class="text-sm text-gray-400">Attacker Damage</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 bg-blue-500 rounded-full"></div>
							<span class="text-sm text-gray-400">Defender Damage</span>
						</div>
					</div>
				{:else}
					<div class="text-center py-12 text-gray-500">No combat data yet</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

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
