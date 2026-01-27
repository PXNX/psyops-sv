<script lang="ts">
	import { enhance } from "$app/forms";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	let isJoining = $state(false);
	let isExecuting = $state(false);
	let selectedUnitId = $state<number | null>(null);

	function getTimeRemaining(endsAt: string): string {
		const now = new Date().getTime();
		const end = new Date(endsAt).getTime();
		const diff = end - now;

		if (diff <= 0) return "Phase Over";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}h ${minutes}m remaining`;
	}

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
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
					</div>
				</div>

				<!-- Phase Timer -->
				{#if data.battle.phase === "preparation"}
					<div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-xl p-6 mb-6">
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-xl font-bold text-blue-300">⏱️ Preparation Phase</h3>
							<div class="text-2xl font-mono font-bold text-white">
								{getTimeRemaining(data.preparationEndsAt)}
							</div>
						</div>
						<p class="text-gray-300">Deploy your units now! Combat begins automatically when the timer ends.</p>
					</div>
				{/if}

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

					<!-- Debug Info -->
					<div class="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
						<div class="text-sm text-gray-400 space-y-1">
							<div>Your Side: <span class="text-white font-medium">{data.userSide}</span></div>
							<div>Available Units: <span class="text-white font-medium">{data.userUnits.length}</span></div>
							<div>Can Join: <span class="text-white font-medium">{data.canJoin ? "YES ✓" : "NO ✗"}</span></div>
							{#if !data.canJoin && data.userSide}
								<div class="text-amber-400 mt-2">
									⚠️ {data.userUnits.length === 0 ? "No eligible units in this region" : "Unknown deployment issue"}
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
												<span class="text-white font-medium">{unit.attack}</span>
											</div>
											<div class="flex items-center gap-1">
												<span class="text-blue-400">🛡️</span>
												<span class="text-white font-medium">{unit.defense}</span>
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
							<p class="text-xl text-gray-400 mb-2">No units available in this region</p>
							<p class="text-sm text-gray-500">Train or move units to Region {data.battle.regionId}</p>
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
					<p class="text-xl text-gray-400">You are not a citizen of either warring state</p>
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
										<div class="text-2xl font-bold text-red-400">{unit.unit.attack}</div>
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
										<div class="text-2xl font-bold text-blue-400">{unit.unit.defense}</div>
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
		{/if}
	</div>
</div>
