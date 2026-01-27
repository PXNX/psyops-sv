<script lang="ts">
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { enhance } from "$app/forms";

	const { data } = $props();

	let isJoining = $state(false);
	let isExecuting = $state(false);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function getRegionName(id: number) {
		const key = `region_${id}`;
		return m[key]?.() || `Region ${id}`;
	}

	function getPhaseColor(phase: string) {
		switch (phase) {
			case "preparation":
				return "bg-blue-500/20 border-blue-500/30 text-blue-400";
			case "active":
				return "bg-amber-500/20 border-amber-500/30 text-amber-400";
			case "ended":
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
			default:
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case "ongoing":
				return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
			case "attacker_won":
				return "bg-red-500/20 border-red-500/30 text-red-400";
			case "defender_won":
				return "bg-blue-500/20 border-blue-500/30 text-blue-400";
			default:
				return "bg-gray-500/20 border-gray-500/30 text-gray-400";
		}
	}

	function getStrengthColor(percent: number) {
		if (percent > 70) return "bg-emerald-500";
		if (percent > 30) return "bg-amber-500";
		return "bg-red-500";
	}

	function getCombatWidthColor(current: number, max: number): string {
		const percent = (current / max) * 100;
		if (percent > 90) return "text-red-400";
		if (percent > 75) return "text-amber-400";
		return "text-emerald-400";
	}

	function getUnitWidth(unitType: string): number {
		const widths: Record<string, number> = {
			infantry: 2,
			armor: 3,
			mechanized: 2,
			artillery: 3,
			air_defence: 2,
			bomber_squadron: 0,
			fighter_squadron: 0
		};
		return widths[unitType] || 2;
	}

	function getTimeRemaining(endsAt: string): string {
		const now = new Date().getTime();
		const end = new Date(endsAt).getTime();
		const diff = end - now;

		if (diff <= 0) return "Ready";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}h ${minutes}m`;
	}

	const attackerUnits = $derived(
		data.battle.participants.filter((p) => p.side === "attacker" && p.currentStrength > 0)
	);
	const defenderUnits = $derived(
		data.battle.participants.filter((p) => p.side === "defender" && p.currentStrength > 0)
	);

	const engagedAttackers = $derived(attackerUnits.filter((p) => p.isEngaged));
	const engagedDefenders = $derived(defenderUnits.filter((p) => p.isEngaged));
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Battle Header -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<div class="flex items-start justify-between mb-4">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<FluentFire20Filled class="size-8 text-red-500" />
					<h1 class="text-3xl font-bold text-white">
						Battle of {getRegionName(data.battle.region.id)}
					</h1>
					<span class="px-3 py-1 rounded-full text-sm font-medium border {getPhaseColor(data.battle.phase)}">
						{data.battle.phase}
					</span>
					<span class="px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(data.battle.status)}">
						{data.battle.status.replace("_", " ")}
					</span>
				</div>
				<div class="flex items-center gap-4 text-sm">
					<div class="flex items-center gap-2 text-gray-400">
						<FluentCalendar20Filled class="size-4" />
						<span>Started {formatDate(data.battle.startedAt)}</span>
					</div>
					<div class="px-3 py-1 bg-slate-700 rounded-lg text-gray-300">
						Terrain: <span class="text-white font-medium capitalize">{data.battle.terrain}</span>
					</div>
					{#if data.fortificationBonus > 0}
						<div class="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
							<FluentShield20Filled class="size-4 inline mr-1" />
							Fortifications: Lv{data.fortificationBonus}
						</div>
					{/if}
				</div>
			</div>
			<a
				href="/war/{data.battle.war.id}"
				class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
			>
				View War
			</a>
		</div>

		<!-- Phase Information -->
		{#if data.battle.phase === "preparation"}
			<div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2 text-blue-400">
						<FluentWarning20Filled class="size-5" />
						<span class="font-medium">Preparation Phase (24 hours)</span>
					</div>
					<div class="text-white font-mono text-lg">
						{getTimeRemaining(data.preparationEndsAt)}
					</div>
				</div>
				<p class="text-sm text-gray-300">
					Both sides can deploy units. Combat begins automatically when preparation ends.
				</p>
			</div>
		{:else if data.battle.phase === "active"}
			<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
				<div class="flex items-center gap-2 text-amber-400 mb-2">
					<FluentFire20Filled class="size-5" />
					<span class="font-medium">Active Combat</span>
				</div>
				<p class="text-sm text-gray-300">
					Battle is active! Units deal damage each round. Earliest deployed units fight first (within combat width).
				</p>
			</div>
		{/if}

		<!-- Fortification Info -->
		{#if data.fortificationBonus > 0}
			<div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
				<div class="flex items-center gap-2 text-blue-400 mb-2">
					<FluentShield20Filled class="size-5" />
					<span class="font-medium">Defender Fortification Bonus</span>
				</div>
				<p class="text-sm text-gray-300">
					Fortifications reduce damage to defenders by {Math.min(50, data.fortificationBonus * 2)}%
				</p>
			</div>
		{/if}

		<!-- Combat Width -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<div class="bg-slate-700/30 rounded-lg p-4 border border-red-500/20">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-red-400">Attacker Combat Width</span>
					<span
						class={getCombatWidthColor(data.attackerStats.combatWidth, data.attackerStats.maxCombatWidth) +
							" font-mono font-bold"}
					>
						{data.attackerStats.combatWidth}/{data.attackerStats.maxCombatWidth}
					</span>
				</div>
				<div class="w-full h-3 bg-slate-600 rounded-full overflow-hidden mb-2">
					<div
						class="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all"
						style="width: {Math.min(100, (data.attackerStats.combatWidth / data.attackerStats.maxCombatWidth) * 100)}%"
					></div>
				</div>
				<div class="grid grid-cols-2 gap-2 text-xs">
					<div class="text-gray-400">
						Engaged: <span class="text-white">{data.attackerStats.engagedUnits}</span>
					</div>
					<div class="text-gray-400">
						Reserve: <span class="text-white">{data.attackerStats.activeUnits - data.attackerStats.engagedUnits}</span>
					</div>
				</div>
			</div>

			<div class="bg-slate-700/30 rounded-lg p-4 border border-blue-500/20">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-blue-400">Defender Combat Width</span>
					<span
						class={getCombatWidthColor(data.defenderStats.combatWidth, data.defenderStats.maxCombatWidth) +
							" font-mono font-bold"}
					>
						{data.defenderStats.combatWidth}/{data.defenderStats.maxCombatWidth}
					</span>
				</div>
				<div class="w-full h-3 bg-slate-600 rounded-full overflow-hidden mb-2">
					<div
						class="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
						style="width: {Math.min(100, (data.defenderStats.combatWidth / data.defenderStats.maxCombatWidth) * 100)}%"
					></div>
				</div>
				<div class="grid grid-cols-2 gap-2 text-xs">
					<div class="text-gray-400">
						Engaged: <span class="text-white">{data.defenderStats.engagedUnits}</span>
					</div>
					<div class="text-gray-400">
						Reserve: <span class="text-white">{data.defenderStats.activeUnits - data.defenderStats.engagedUnits}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Battle Statistics -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="bg-slate-700/30 rounded-lg p-4 border border-red-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-red-500" />
					<span class="text-sm font-medium text-red-400">Attacker - {data.battle.attackerState.name}</span>
				</div>
				<div class="grid grid-cols-3 gap-2 text-xs">
					<div class="text-center">
						<div class="text-gray-400">Units</div>
						<div class="text-white font-bold text-lg">{data.attackerStats.activeUnits}</div>
					</div>
					<div class="text-center">
						<div class="text-gray-400">Damage Dealt</div>
						<div class="text-white font-bold text-lg">{data.attackerStats.totalDamageDealt}</div>
					</div>
					<div class="text-center">
						<div class="text-gray-400">Losses</div>
						<div class="text-red-400 font-bold text-lg">{data.attackerStats.destroyedUnits}</div>
					</div>
				</div>
			</div>

			<div class="bg-slate-700/30 rounded-lg p-4 border border-blue-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-blue-500" />
					<span class="text-sm font-medium text-blue-400">Defender - {data.battle.defenderState.name}</span>
				</div>
				<div class="grid grid-cols-3 gap-2 text-xs">
					<div class="text-center">
						<div class="text-gray-400">Units</div>
						<div class="text-white font-bold text-lg">{data.defenderStats.activeUnits}</div>
					</div>
					<div class="text-center">
						<div class="text-gray-400">Damage Dealt</div>
						<div class="text-white font-bold text-lg">{data.defenderStats.totalDamageDealt}</div>
					</div>
					<div class="text-center">
						<div class="text-gray-400">Losses</div>
						<div class="text-red-400 font-bold text-lg">{data.defenderStats.destroyedUnits}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Assign Units -->
	{#if data.canJoin && data.userUnits.length > 0}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentAdd20Filled class="size-6" />
				Deploy Units to Battle
			</h2>
			<form
				method="POST"
				action="?/assignUnit"
				use:enhance={() => {
					isJoining = true;
					return async ({ update }) => {
						await update();
						isJoining = false;
					};
				}}
				class="space-y-4"
			>
				<select
					name="unitId"
					required
					class="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
				>
					<option value="">Select a unit...</option>
					{#each data.userUnits as unit}
						<option value={unit.id}>
							{unit.name} - {unit.unitType} (Width: {getUnitWidth(unit.unitType)}) - ATK: {unit.attack} | DEF: {unit.defense}
						</option>
					{/each}
				</select>
				<button
					type="submit"
					disabled={isJoining}
					class="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
				>
					{isJoining ? "Deploying..." : "Deploy Unit"}
				</button>
			</form>
		</div>
	{/if}

	<!-- Combat Controls -->
	{#if data.battle.phase === "active"}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentFire20Filled class="size-6 text-red-500" />
				Combat Control
			</h2>

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
					class="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
				>
					<FluentFire20Filled class="size-5" />
					{isExecuting ? "Executing..." : "Execute Combat Round"}
				</button>
			</form>
		</div>
	{/if}

	<!-- Battle Participants -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		<!-- Attackers -->
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentShield20Filled class="size-5 text-red-500" />
				Attacking Forces ({attackerUnits.length})
			</h2>
			<div class="space-y-2 max-h-96 overflow-y-auto">
				{#each attackerUnits as participant, index}
					<div
						class="bg-slate-700/30 rounded-lg p-3 border {participant.isEngaged
							? 'border-red-500/50'
							: 'border-white/5'}"
					>
						<div class="flex items-center justify-between mb-2">
							<div class="font-medium text-white flex items-center gap-2">
								<span class="text-xs text-gray-500">#{index + 1}</span>
								{participant.unit.name}
								<span class="text-sm text-gray-400">
									- {participant.unit.owner.profile?.name || "Unknown"}
								</span>
							</div>
							<div class="flex items-center gap-2">
								{#if participant.isEngaged}
									<span class="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
										ENGAGED
									</span>
								{/if}
								<span class="text-xs px-2 py-1 bg-slate-600 rounded text-gray-300">
									W:{getUnitWidth(participant.unit.unitType)}
								</span>
							</div>
						</div>
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-24">Strength:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getStrengthColor(participant.currentStrength)}"
										style="width: {participant.currentStrength}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentStrength}%</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-gray-400">
								<span>ATK: {participant.unit.attack}</span>
								<span>•</span>
								<span>Joined: {formatDate(participant.joinedAt)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Defenders -->
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentShield20Filled class="size-5 text-blue-500" />
				Defending Forces ({defenderUnits.length})
			</h2>
			<div class="space-y-2 max-h-96 overflow-y-auto">
				{#each defenderUnits as participant, index}
					<div
						class="bg-slate-700/30 rounded-lg p-3 border {participant.isEngaged
							? 'border-blue-500/50'
							: 'border-white/5'}"
					>
						<div class="flex items-center justify-between mb-2">
							<div class="font-medium text-white flex items-center gap-2">
								<span class="text-xs text-gray-500">#{index + 1}</span>
								{participant.unit.name}
								<span class="text-sm text-gray-400">
									- {participant.unit.owner.profile?.name || "Unknown"}
								</span>
							</div>
							<div class="flex items-center gap-2">
								{#if participant.isEngaged}
									<span class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400">
										ENGAGED
									</span>
								{/if}
								<span class="text-xs px-2 py-1 bg-slate-600 rounded text-gray-300">
									W:{getUnitWidth(participant.unit.unitType)}
								</span>
							</div>
						</div>
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-24">Strength:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getStrengthColor(participant.currentStrength)}"
										style="width: {participant.currentStrength}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentStrength}%</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-gray-400">
								<span>DEF: {participant.unit.defense}</span>
								<span>•</span>
								<span>Joined: {formatDate(participant.joinedAt)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Battle Log -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Combat Rounds</h2>
		<div class="space-y-3 max-h-96 overflow-y-auto">
			{#each data.battle.rounds as round}
				<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-3">
							<span class="text-lg font-bold text-white">Round {round.roundNumber}</span>
							<span class="px-2 py-1 rounded text-xs border {getPhaseColor(round.battlePhase)}">
								{round.battlePhase}
							</span>
						</div>
						<span class="text-sm text-gray-400">{formatDate(round.roundedAt)}</span>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<div class="text-sm font-medium text-red-400">Attackers</div>
							<div class="grid grid-cols-2 gap-2 text-xs">
								<div>
									<div class="text-gray-400">Engaged</div>
									<div class="text-white font-medium">{round.attackerUnitsEngaged}</div>
								</div>
								<div>
									<div class="text-gray-400">Damage</div>
									<div class="text-red-400 font-medium">{round.attackerTotalDamage}</div>
								</div>
							</div>
						</div>

						<div class="space-y-2">
							<div class="text-sm font-medium text-blue-400">Defenders</div>
							<div class="grid grid-cols-2 gap-2 text-xs">
								<div>
									<div class="text-gray-400">Engaged</div>
									<div class="text-white font-medium">{round.defenderUnitsEngaged}</div>
								</div>
								<div>
									<div class="text-gray-400">Damage</div>
									<div class="text-red-400 font-medium">{round.defenderTotalDamage}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if data.battle.rounds.length === 0}
				<div class="text-center py-12 text-gray-400">
					<FluentWarning20Filled class="size-12 mx-auto mb-2 opacity-50" />
					<p>No combat rounds yet</p>
				</div>
			{/if}
		</div>
	</div>
</div>
