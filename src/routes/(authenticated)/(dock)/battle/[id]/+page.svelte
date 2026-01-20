<!-- src/routes/(authenticated)/(dock)/battle/[id]/+page.svelte -->
<script lang="ts">
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { enhance } from "$app/forms";

	const { data } = $props();

	let selectedUnit = $state<number | null>(null);
	let selectedTarget = $state<number | null>(null);
	let isJoining = $state(false);
	let isAttacking = $state(false);

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

	function getStatusColor(status: string) {
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

	function getHealthColor(percent: number) {
		if (percent > 70) return "bg-emerald-500";
		if (percent > 30) return "bg-amber-500";
		return "bg-red-500";
	}

	function getOrgColor(percent: number) {
		if (percent > 70) return "bg-blue-500";
		if (percent > 30) return "bg-purple-500";
		return "bg-pink-500";
	}

	const attackerUnits = $derived(data.battle.participants.filter((p) => p.side === "attacker" && p.currentHealth > 0));
	const defenderUnits = $derived(data.battle.participants.filter((p) => p.side === "defender" && p.currentHealth > 0));

	const enemySide = $derived(data.userSide === "attacker" ? "defender" : "attacker");
	const enemyUnits = $derived(
		data.battle.participants.filter((p) => p.side === enemySide && p.currentHealth > 0 && p.currentOrganization > 0)
	);

	function canAttack(unitId: number) {
		const unit = data.userParticipants.find((p) => p.unitId === unitId);
		return unit && unit.currentOrganization > 0 && unit.currentHealth > 0;
	}
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
					<span class="px-3 py-1 rounded-full text-sm font-medium border {getStatusColor(data.battle.status)}">
						{data.battle.status.replace("_", " ")}
					</span>
				</div>
				<div class="flex items-center gap-2 text-sm text-gray-400">
					<FluentCalendar20Filled class="size-4" />
					<span>Started {formatDate(data.battle.startedAt)}</span>
					{#if data.battle.endedAt}
						<span>• Ended {formatDate(data.battle.endedAt)}</span>
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

		<!-- Combatants -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="bg-slate-700/30 rounded-lg p-4 border border-red-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-red-500" />
					<span class="text-sm font-medium text-red-400">Attacker</span>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-lg font-bold text-white">{data.battle.attackerState.name}</span>
						<span class="text-sm text-gray-400">{data.attackerStats.activeUnits} active units</span>
					</div>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-gray-400">Damage Dealt: {data.attackerStats.totalDamageDealt}</div>
						<div class="text-gray-400">Damage Taken: {data.attackerStats.totalDamageTaken}</div>
					</div>
				</div>
			</div>

			<div class="bg-slate-700/30 rounded-lg p-4 border border-blue-500/20">
				<div class="flex items-center gap-2 mb-3">
					<FluentShield20Filled class="size-5 text-blue-500" />
					<span class="text-sm font-medium text-blue-400">Defender</span>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-lg font-bold text-white">{data.battle.defenderState.name}</span>
						<span class="text-sm text-gray-400">{data.defenderStats.activeUnits} active units</span>
					</div>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-gray-400">Damage Dealt: {data.defenderStats.totalDamageDealt}</div>
						<div class="text-gray-400">Damage Taken: {data.defenderStats.totalDamageTaken}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Join Battle -->
	{#if data.canParticipate && data.userUnits.length > 0 && data.battle.status === "ongoing"}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentAdd20Filled class="size-6" />
				Join Battle
			</h2>
			<form
				method="POST"
				action="?/joinBattle"
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
							{unit.name} - {unit.unitType} ({unit.unitSize}) - Health: {unit.health || 100}%, Org: {unit.organization}%
						</option>
					{/each}
				</select>
				<button
					type="submit"
					disabled={isJoining}
					class="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
				>
					{isJoining ? "Joining..." : "Join Battle"}
				</button>
			</form>
		</div>
	{/if}

	<!-- Attack Interface -->
	{#if data.userParticipants.length > 0 && data.battle.status === "ongoing"}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentFire20Filled class="size-6 text-red-500" />
				Attack
			</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
				<!-- Your Units -->
				<div>
					<label class="block text-sm font-medium text-gray-400 mb-2">Your Unit</label>
					<div class="space-y-2">
						{#each data.userParticipants as participant}
							{#if canAttack(participant.unitId)}
								<button
									type="button"
									onclick={() => (selectedUnit = participant.unitId)}
									class="w-full text-left p-3 rounded-lg border transition-all {selectedUnit === participant.unitId
										? 'bg-purple-500/20 border-purple-500'
										: 'bg-slate-700/30 border-white/10 hover:border-purple-500/50'}"
								>
									<div class="font-medium text-white mb-2">{participant.unit.name}</div>
									<div class="space-y-1">
										<div class="flex items-center gap-2 text-xs">
											<span class="text-gray-400">Health:</span>
											<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
												<div
													class="h-full {getHealthColor(participant.currentHealth)}"
													style="width: {participant.currentHealth}%"
												></div>
											</div>
											<span class="text-white w-12">{participant.currentHealth}%</span>
										</div>
										<div class="flex items-center gap-2 text-xs">
											<span class="text-gray-400">Organization:</span>
											<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
												<div
													class="h-full {getOrgColor(participant.currentOrganization)}"
													style="width: {participant.currentOrganization}%"
												></div>
											</div>
											<span class="text-white w-12">{participant.currentOrganization}%</span>
										</div>
									</div>
								</button>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Enemy Units -->
				<div>
					<label class="block text-sm font-medium text-gray-400 mb-2">Target</label>
					<div class="space-y-2">
						{#each enemyUnits as participant}
							<button
								type="button"
								onclick={() => (selectedTarget = participant.unitId)}
								class="w-full text-left p-3 rounded-lg border transition-all {selectedTarget === participant.unitId
									? 'bg-red-500/20 border-red-500'
									: 'bg-slate-700/30 border-white/10 hover:border-red-500/50'}"
							>
								<div class="font-medium text-white mb-2">
									{participant.unit.name} - {participant.unit.owner.profile?.name || "Unknown"}
								</div>
								<div class="space-y-1">
									<div class="flex items-center gap-2 text-xs">
										<span class="text-gray-400">Health:</span>
										<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
											<div
												class="h-full {getHealthColor(participant.currentHealth)}"
												style="width: {participant.currentHealth}%"
											></div>
										</div>
										<span class="text-white w-12">{participant.currentHealth}%</span>
									</div>
									<div class="flex items-center gap-2 text-xs">
										<span class="text-gray-400">Organization:</span>
										<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
											<div
												class="h-full {getOrgColor(participant.currentOrganization)}"
												style="width: {participant.currentOrganization}%"
											></div>
										</div>
										<span class="text-white w-12">{participant.currentOrganization}%</span>
									</div>
								</div>
							</button>
						{/each}

						{#if enemyUnits.length === 0}
							<div class="text-center py-8 text-gray-400">No active enemy units</div>
						{/if}
					</div>
				</div>
			</div>

			<form
				method="POST"
				action="?/attack"
				use:enhance={() => {
					isAttacking = true;
					return async ({ update }) => {
						await update();
						isAttacking = false;
						selectedUnit = null;
						selectedTarget = null;
					};
				}}
			>
				<input type="hidden" name="attackingUnitId" value={selectedUnit || ""} />
				<input type="hidden" name="defendingUnitId" value={selectedTarget || ""} />
				<button
					type="submit"
					disabled={isAttacking || !selectedUnit || !selectedTarget}
					class="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
				>
					<FluentFire20Filled class="size-5" />
					{isAttacking ? "Attacking..." : "Execute Attack"}
				</button>
			</form>

			{#if !selectedUnit || !selectedTarget}
				<div class="mt-4 flex items-center gap-2 text-sm text-amber-400">
					<FluentWarning20Filled class="size-4" />
					<span>Select both your unit and a target to attack</span>
				</div>
			{/if}
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
			<div class="space-y-2">
				{#each attackerUnits as participant}
					<div class="bg-slate-700/30 rounded-lg p-3 border border-white/5">
						<div class="font-medium text-white mb-2">
							{participant.unit.name}
							<span class="text-sm text-gray-400">
								- {participant.unit.owner.profile?.name || "Unknown"}
							</span>
						</div>
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-20">Health:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getHealthColor(participant.currentHealth)}"
										style="width: {participant.currentHealth}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentHealth}%</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-20">Organization:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getOrgColor(participant.currentOrganization)}"
										style="width: {participant.currentOrganization}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentOrganization}%</span>
							</div>
							<div class="flex justify-between text-gray-400">
								<span>Dealt: {participant.damageDealt}</span>
								<span>Taken: {participant.damageTaken}</span>
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
			<div class="space-y-2">
				{#each defenderUnits as participant}
					<div class="bg-slate-700/30 rounded-lg p-3 border border-white/5">
						<div class="font-medium text-white mb-2">
							{participant.unit.name}
							<span class="text-sm text-gray-400">
								- {participant.unit.owner.profile?.name || "Unknown"}
							</span>
						</div>
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-20">Health:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getHealthColor(participant.currentHealth)}"
										style="width: {participant.currentHealth}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentHealth}%</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-gray-400 w-20">Organization:</span>
								<div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
									<div
										class="h-full {getOrgColor(participant.currentOrganization)}"
										style="width: {participant.currentOrganization}%"
									></div>
								</div>
								<span class="text-white w-12">{participant.currentOrganization}%</span>
							</div>
							<div class="flex justify-between text-gray-400">
								<span>Dealt: {participant.damageDealt}</span>
								<span>Taken: {participant.damageTaken}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Battle Log -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Battle Log</h2>
		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each data.battle.rounds as round}
				<div class="bg-slate-700/30 rounded-lg p-3 border border-white/5 text-sm">
					<div class="flex items-center gap-2 text-gray-400 mb-1">
						<FluentCalendar20Filled class="size-3" />
						<span>{formatDate(round.roundedAt)}</span>
					</div>
					<div class="text-white">
						<span class="font-medium">
							{round.attackingUnit.name} ({round.attackingUnit.owner.profile?.name || "Unknown"})
						</span>
						<FluentArrowRight20Filled class="inline size-4 mx-1" />
						<span class="font-medium">
							{round.defendingUnit.name} ({round.defendingUnit.owner.profile?.name || "Unknown"})
						</span>
					</div>
					<div class="flex gap-4 mt-2 text-xs">
						<span class="text-red-400">Damage: {round.attackerDamage} / {round.defenderDamage}</span>
						<span class="text-purple-400">
							Org Loss: {round.attackerOrganizationLoss}% / {round.defenderOrganizationLoss}%
						</span>
					</div>
				</div>
			{/each}

			{#if data.battle.rounds.length === 0}
				<div class="text-center py-8 text-gray-400">No combat rounds yet</div>
			{/if}
		</div>
	</div>
</div>
