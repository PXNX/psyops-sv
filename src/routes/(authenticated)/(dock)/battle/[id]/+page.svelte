<!-- /src/routes/(authenticated)/(dock)/battle/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { MILITARY_UNIT_TEMPLATES } from "#lib/config/index.js";
	import { formatDate, formatDateTime, getRegionName } from "#lib/utils/formatting.js";
	import { onMount, onDestroy } from "svelte";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { scaleLinear } from "d3-scale";
	import { Area, Axis, Highlight, RectClipPath } from "layerchart";
	import * as m from "#lib/paraglide/messages.js";
	import Logo from "#lib/component/Logo.svelte";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

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

{#snippet unitBars(health: number, organization: number, supply: number | null, orgLabel: string)}
	<div class="space-y-2">
		<!-- Health -->
		<div>
			<div class="flex items-center justify-between text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">
				<span>HEALTH</span>
				<span class="text-[#b3dcff] font-medium text-xs">{health}%</span>
			</div>
			<div class="h-1.5 bg-[#0f120c]/70 rounded-full overflow-hidden border border-[#c8b47a]/10">
				<div class="h-full rounded-full transition-all duration-500 bg-[#5eaef5]" style="width: {health}%"></div>
			</div>
		</div>

		<!-- Organization -->
		<div>
			<div class="flex items-center justify-between text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">
				<span>{orgLabel}</span>
				<span class="text-[#b9f29a] font-medium text-xs">{organization}%</span>
			</div>
			<div class="h-1.5 bg-[#0f120c]/70 rounded-full overflow-hidden border border-[#c8b47a]/10">
				<div class="h-full rounded-full transition-all duration-500 bg-[#6fd14a]" style="width: {organization}%"></div>
			</div>
		</div>

		{#if supply !== null}
			<!-- Supply -->
			<div>
				<div class="flex items-center justify-between text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">
					<span>SUPPLY</span>
					<span class="text-[#ffd35c] font-medium text-xs">{supply}%</span>
				</div>
				<div class="h-1.5 bg-[#0f120c]/70 rounded-full overflow-hidden border border-[#c8b47a]/10">
					<div class="h-full rounded-full transition-all duration-500 bg-[#f2b01e]" style="width: {supply}%"></div>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet unitIcon(unitType: string)}
	<div
		class="size-10 sm:size-12 shrink-0 flex items-center justify-center bg-[#0f120c] rounded-sm border border-[#c8b47a]/20 p-1.5 sm:p-2"
	>
		<img
			src={getUnitIconPath(unitType)}
			alt={unitType}
			class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
		/>
	</div>
{/snippet}

{#snippet atkDef(attack: number, defense: number)}
	<span class="text-xs text-red-300 font-mono">⚔️ {attack}</span>
	<span class="text-xs text-[#b3dcff] font-mono">🛡️ {defense}</span>
{/snippet}

<PageContainer maxWidth="5xl">
	<!-- Command Hero -->
	<div class="panel rounded-sm p-5">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div class="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
				<!-- Region Emblem -->
				<a
					href="/region/{data.battle.regionId}"
					class="size-16 sm:size-20 shrink-0 panel-muted rounded-sm p-2 flex items-center justify-center hover:border-[#f2b01e]/55 transition-colors"
				>
					<Logo
						src={getRegionCoatPath(data.battle.regionId)}
						alt={getRegionName(data.battle.regionId)}
						class="w-full h-full object-contain opacity-80"
					/>
				</a>

				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-2 mb-1">
						<h1 class="text-2xl sm:text-3xl font-bold">
							<a
								href="/region/{data.battle.regionId}"
								class="transition-colors hover:text-[#ffcf47]"
								class:text-[#f5efd8]={!data.userSide}
								class:text-red-300={data.userSide === "attacker"}
								class:text-[#b3dcff]={data.userSide === "defender"}
							>
								{#if data.userSide === "attacker"}
									Assault of
								{:else if data.userSide === "defender"}
									Defense of
								{/if}
								{getRegionName(data.battle.regionId)}
							</a>
						</h1>
						{#if data.battle.phase === "ended"}
							{#if data.battle.status === "attacker_won"}
								<Badge tone="red" size="md" class="whitespace-nowrap font-bold">VICTORY - ATTACKER</Badge>
							{:else if data.battle.status === "defender_won"}
								<Badge tone="blue" size="md" class="whitespace-nowrap font-bold">VICTORY - DEFENDER</Badge>
							{/if}
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#a8a083]">
						<span class="uppercase">{data.battle.terrain}</span>
						<span class="text-[#a8a083]/50 hidden sm:inline">|</span>
						<span class="hidden sm:inline">{formatDateTime(data.battle.startedAt)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Mission Timer -->
		{#if data.battle.phase === "preparation"}
			<div class="mt-5 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-3 sm:p-4">
				<div class="flex items-center justify-between mb-2 sm:mb-3">
					<div class="text-[#b3dcff] text-xs sm:text-sm font-medium uppercase tracking-wide">Time Until Combat</div>
				</div>
				<div class="flex items-center justify-center gap-2 sm:gap-3">
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#b3dcff] bg-[#0f120c]/90 rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#5eaef5]/20"
						>
							{String(timeRemaining.hours).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">HRS</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#5eaef5]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#b3dcff] bg-[#0f120c]/90 rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#5eaef5]/20"
						>
							{String(timeRemaining.minutes).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">MIN</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#5eaef5]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#b3dcff] bg-[#0f120c]/90 rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#5eaef5]/20"
						>
							{String(timeRemaining.seconds).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">SEC</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Battle Progress Bar -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2 sm:gap-3">
				<a href="/state/{data.battle.attackerState.id}" class="flex items-center gap-2 group">
					{#if data.attackerStateLogo}
						<img
							src={data.attackerStateLogo}
							alt={data.battle.attackerState.name}
							class="size-8 sm:size-10 rounded-sm border border-red-500/30"
						/>
					{/if}
					<span class="text-sm sm:text-base font-bold text-red-300 group-hover:text-red-200 transition-colors"
						>{data.battle.attackerState.name}</span
					>
				</a>
			</div>
			<div class="text-[10px] sm:text-xs text-[#a8a083] uppercase tracking-wide">BATTLE MOMENTUM</div>
			<div class="flex items-center gap-2 sm:gap-3">
				<a href="/state/{data.battle.defenderState.id}" class="flex items-center gap-2 group">
					<span class="text-sm sm:text-base font-bold text-[#b3dcff] group-hover:text-[#e3f2ff] transition-colors"
						>{data.battle.defenderState.name}</span
					>
					{#if data.defenderStateLogo}
						<img
							src={data.defenderStateLogo}
							alt={data.battle.defenderState.name}
							class="size-8 sm:size-10 rounded-sm border border-[#5eaef5]/30"
						/>
					{/if}
				</a>
			</div>
		</div>

		<!-- Horizontal Progress Bar -->
		<div class="relative h-12 sm:h-16 bg-[#0f120c]/90 rounded-sm border border-[#c8b47a]/15 overflow-hidden">
			<!-- Defender territory (left side) -->
			<div
				class="absolute left-0 top-0 bottom-0 bg-[#5eaef5] transition-all duration-1000"
				style="width: {100 - battleMomentum()}%"
			></div>

			<!-- Attacker territory (right side) -->
			<div
				class="absolute right-0 top-0 bottom-0 bg-red-500 transition-all duration-1000"
				style="width: {battleMomentum()}%"
			></div>

			<!-- Center line -->
			<div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#c8b47a]/30 transform -translate-x-1/2"></div>

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
				<div class="text-[#f5efd8] font-bold text-xs sm:text-sm font-mono drop-shadow-lg">
					{data.defenderStats.totalDamageDealt} DMG
				</div>
				<div class="text-[#f5efd8] font-bold text-xs sm:text-sm font-mono drop-shadow-lg">
					{data.attackerStats.totalDamageDealt} DMG
				</div>
			</div>
		</div>

		<div class="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
			<div class="text-center">
				<div class="text-[10px] sm:text-xs text-red-300 uppercase tracking-wide mb-1">Attacker Pressure</div>
				<div class="text-[#f5efd8] font-bold text-lg sm:text-xl">{battleMomentum()}%</div>
			</div>
			<div class="text-center">
				<div class="text-[10px] sm:text-xs text-[#b3dcff] uppercase tracking-wide mb-1">Defender Resistance</div>
				<div class="text-[#f5efd8] font-bold text-lg sm:text-xl">{100 - battleMomentum()}%</div>
			</div>
		</div>
	</div>

	<!-- Fortifications Info -->
	{#if data.fortificationBonus > 0}
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="text-3xl sm:text-4xl">🏰</div>
				<div class="flex-1">
					<div class="flex flex-wrap items-center gap-2 mb-1">
						<span class="text-[#b3dcff] font-bold text-sm sm:text-base"
							>Fortification Level {data.fortificationBonus}</span
						>
						<Badge tone="blue" class="font-mono">
							-{Math.min(50, data.fortificationBonus * 2)}% DEFENDER DMG
						</Badge>
					</div>
					<div class="text-xs sm:text-sm text-[#b3dcff]/70">
						Defensive structures reduce incoming damage by {Math.min(50, data.fortificationBonus * 2)}%
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Unit Deployment Section -->
	{#if data.userSide}
		<div class="panel rounded-sm p-5">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
				<h2 class="section-title">Deploy Forces</h2>
				<div
					class="px-3 py-1 border rounded-sm text-xs sm:text-sm w-fit {data.userSide === 'attacker'
						? 'bg-red-600/10 border-red-500/30'
						: 'bg-[#2369b5]/18 border-[#5eaef5]/30'}"
				>
					<span class="text-[#a8a083]">FIGHTING AS:</span>
					<span class="ml-2 font-bold uppercase {data.userSide === 'attacker' ? 'text-red-300' : 'text-[#b3dcff]'}"
						>{data.userSide}</span
					>
				</div>
			</div>

			{#if data.canJoin && data.userUnits.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
					{#each data.userUnits as unit}
						{@const template = MILITARY_UNIT_TEMPLATES[unit.unitType]}
						<button
							type="button"
							onclick={() => toggleUnitSelection(unit.id)}
							class="relative group text-left rounded-sm border p-3 sm:p-4 transition-colors duration-200 {selectedUnitIds.has(
								unit.id
							)
								? 'bg-[#3f8a2a]/18 border-[#6fd14a]/55'
								: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55 hover:bg-[#2e3524]'}"
						>
							{#if selectedUnitIds.has(unit.id)}
								<div class="absolute top-2 right-2">
									<div class="w-5 h-5 bg-[#6fd14a] rounded-full flex items-center justify-center">
										<svg class="w-3 h-3 text-[#12150f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
										</svg>
									</div>
								</div>
							{/if}

							<div class="flex items-center gap-2 sm:gap-3 mb-3">
								{@render unitIcon(unit.unitType)}
								<div class="flex-1 min-w-0">
									<div class="text-xs text-[#a8a083] mb-0.5">{m[unit.unitType]()}</div>
									<div class="text-sm sm:text-base font-bold text-[#f5efd8] truncate">{unit.name}</div>
									<div class="flex items-center gap-2 mt-1">
										{@render atkDef(template.baseAttack, template.baseDefense)}
									</div>
								</div>
							</div>

							{@render unitBars(unit.health, unit.organization, unit.supplyLevel, "ORGANIZATION")}
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
						<Button type="submit" variant="primary" size="lg" block disabled={isJoining}>
							{isJoining
								? "⚡ Deploying..."
								: `⚡ Deploy ${selectedUnitIds.size} Unit${selectedUnitIds.size > 1 ? "s" : ""}`}
						</Button>
					</form>
				{:else}
					<div class="text-center py-6 sm:py-8 text-[#a8a083] text-sm">← Select units to deploy</div>
				{/if}
			{:else if data.userUnits.length === 0}
				<div class="text-center py-8 sm:py-12 panel-muted rounded-sm">
					<div class="text-4xl sm:text-6xl mb-4 opacity-30">🚫</div>
					<p class="text-base sm:text-lg text-[#e6ddbf] font-semibold mb-2">No eligible units</p>
					<p class="text-xs sm:text-sm text-[#a8a083]">
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
		<div class="panel-muted rounded-sm p-8 sm:p-12 text-center">
			<div class="text-4xl sm:text-6xl mb-4 opacity-20">⛔</div>
			<p class="text-lg sm:text-xl text-[#e6ddbf] font-semibold mb-2">Cannot Deploy</p>
			<p class="text-xs sm:text-sm text-[#a8a083]">{data.canJoinReason || "Unknown reason"}</p>
		</div>
	{/if}

	<!-- Combat Execution -->
	{#if data.battle.phase === "active"}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
				<div>
					<h2 class="text-lg font-semibold text-red-300 mb-1">Execute Combat Round</h2>
					<p class="text-xs sm:text-sm text-red-300/70">Simulate next round of combat</p>
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
						if (result.type === "success") showBattleAnim = true;
					};
				}}
			>
				<Button type="submit" variant="danger" size="lg" block disabled={isExecuting}>
					{isExecuting ? "⚔️ Executing..." : "⚔️ Execute Round"}
				</Button>
			</form>
		</div>
	{/if}

	<!-- My Engaged Units -->
	{#if myUnits.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center justify-between">
				<h2
					class="flex items-center gap-2 text-lg font-semibold {data.userSide === 'attacker'
						? 'text-red-300'
						: data.userSide === 'defender'
							? 'text-[#b3dcff]'
							: 'text-[#f5efd8]'}"
				>
					Your Units in Battle
				</h2>
				<Badge
					tone={data.userSide === "attacker" ? "red" : data.userSide === "defender" ? "blue" : "neutral"}
					class="font-mono"
				>
					{myUnits.length} UNIT{myUnits.length > 1 ? "S" : ""}
				</Badge>
			</div>
			<div class="space-y-2 sm:space-y-3">
				{#each myUnits as participant}
					{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
					{@const isAttacker = participant.side === "attacker"}
					<div
						class="relative overflow-hidden border rounded-sm p-3 sm:p-4 {participant.isEngaged
							? isAttacker
								? 'bg-red-600/10 border-red-500/30'
								: 'bg-[#2369b5]/18 border-[#5eaef5]/30'
							: 'bg-[#1a1f15]/70 border-[#c8b47a]/10'}"
					>
						{#if participant.isEngaged}
							<div class="absolute top-2 right-2">
								<Badge tone={isAttacker ? "red" : "blue"} class="font-bold">⚔️ ENGAGED</Badge>
							</div>
						{/if}

						<div class="flex items-center gap-2 sm:gap-3 mb-3">
							{@render unitIcon(participant.unit.unitType)}
							<div class="flex-1 min-w-0">
								<div class="text-xs text-[#a8a083] mb-0.5">{m[participant.unit.unitType]()}</div>
								<div class="font-bold text-[#f5efd8] text-sm sm:text-base truncate">{participant.unit.name}</div>
								<div class="flex items-center gap-2 mt-1">
									{@render atkDef(template.baseAttack, template.baseDefense)}
								</div>
							</div>
						</div>

						{@render unitBars(
							participant.currentStrength,
							participant.currentOrganization,
							participant.unit.supplyLevel,
							"ORGANIZATION"
						)}
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
				<div class="panel rounded-sm p-5 space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="flex items-center gap-2 text-lg font-semibold text-red-300">Attackers</h2>
						<Badge tone="red" class="font-mono">{otherAttackerUnits.length} UNITS</Badge>
					</div>
					<div class="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
						{#each otherAttackerUnits as participant}
							{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
							<div
								class="relative overflow-hidden border rounded-sm p-3 sm:p-4 {participant.isEngaged
									? 'bg-red-600/10 border-red-500/30'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/10'}"
							>
								{#if participant.isEngaged}
									<div class="absolute top-2 right-2">
										<Badge tone="red" class="font-bold">⚔️ ENGAGED</Badge>
									</div>
								{/if}

								<div class="flex items-center gap-2 sm:gap-3 mb-3">
									{@render unitIcon(participant.unit.unitType)}
									<div class="flex-1 min-w-0">
										<div class="text-xs text-[#a8a083] mb-0.5">{m[participant.unit.unitType]()}</div>
										<div class="font-bold text-[#f5efd8] text-sm sm:text-base truncate">{participant.unit.name}</div>
										<div class="text-xs text-[#a8a083]">{participant.unit.owner.profile?.name || "Unknown"}</div>
										<div class="flex items-center gap-2 mt-0.5">
											{@render atkDef(template.baseAttack, template.baseDefense)}
										</div>
									</div>
								</div>

								{@render unitBars(participant.currentStrength, participant.currentOrganization, null, "ORG")}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Other Defenders -->
			{#if otherDefenderUnits.length > 0}
				<div class="panel rounded-sm p-5 space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="flex items-center gap-2 text-lg font-semibold text-[#b3dcff]">Defenders</h2>
						<Badge tone="blue" class="font-mono">{otherDefenderUnits.length} UNITS</Badge>
					</div>
					<div class="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
						{#each otherDefenderUnits as participant}
							{@const template = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]}
							<div
								class="relative overflow-hidden border rounded-sm p-3 sm:p-4 {participant.isEngaged
									? 'bg-[#2369b5]/18 border-[#5eaef5]/30'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/10'}"
							>
								{#if participant.isEngaged}
									<div class="absolute top-2 right-2">
										<Badge tone="blue" class="font-bold">⚔️ ENGAGED</Badge>
									</div>
								{/if}

								<div class="flex items-center gap-2 sm:gap-3 mb-3">
									{@render unitIcon(participant.unit.unitType)}
									<div class="flex-1 min-w-0">
										<div class="text-xs text-[#a8a083] mb-0.5">{m[participant.unit.unitType]()}</div>
										<div class="font-bold text-[#f5efd8] text-sm sm:text-base truncate">{participant.unit.name}</div>
										<div class="text-xs text-[#a8a083]">{participant.unit.owner.profile?.name || "Unknown"}</div>
										<div class="flex items-center gap-2 mt-0.5">
											{@render atkDef(template.baseAttack, template.baseDefense)}
										</div>
									</div>
								</div>

								{@render unitBars(participant.currentStrength, participant.currentOrganization, null, "ORG")}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Combat Log -->
	{#if data.battle.rounds.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">Combat Log</h2>
			<div class="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
				{#each data.battle.rounds as round}
					<div class="panel-muted rounded-sm p-3 sm:p-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
							<div class="flex items-center gap-2 sm:gap-3">
								<div class="px-2 py-1 bg-[#0f120c] border border-[#c8b47a]/20 rounded-sm">
									<span class="text-[#a8a083] text-[10px] uppercase tracking-wide">ROUND</span>
									<span class="text-[#f5efd8] font-bold font-mono text-sm ml-2">{round.roundNumber}</span>
								</div>
							</div>
							<span class="text-xs text-[#a8a083]">{formatDateTime(round.roundedAt)}</span>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
							<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-2 sm:p-3">
								<div class="text-red-300/80 text-[10px] mb-1 uppercase tracking-wide">Attackers</div>
								<div class="text-[#a8a083]">
									<span class="text-[#f5efd8] font-bold">{round.attackerUnitsEngaged}</span> units dealt
									<span class="text-red-300 font-bold">{round.attackerTotalDamage}</span> damage
								</div>
							</div>
							<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-2 sm:p-3">
								<div class="text-[#b3dcff]/80 text-[10px] mb-1 uppercase tracking-wide">Defenders</div>
								<div class="text-[#a8a083]">
									<span class="text-[#f5efd8] font-bold">{round.defenderUnitsEngaged}</span> units dealt
									<span class="text-[#b3dcff] font-bold">{round.defenderTotalDamage}</span> damage
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Battle Statistics Chart -->
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">Damage Analysis</h2>
			<div>
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
									grid={{ style: "stroke: rgb(223, 206, 176); stroke-opacity: 0.1;" }}
									rule={{ style: "stroke: rgb(223, 206, 176); stroke-opacity: 0.3;" }}
									label={{ style: "fill: rgb(168, 158, 142); font-family: monospace; font-size: 10px;" }}
								/>
								<Axis
									placement="bottom"
									rule={{ style: "stroke: rgb(223, 206, 176); stroke-opacity: 0.3;" }}
									label={{ style: "fill: rgb(168, 158, 142); font-family: monospace; font-size: 10px;" }}
								/>

								<Area y="attackerDamage" line={{ class: "stroke-red-500 stroke-2" }} fill="url(#attackerGradient)" />
								<Area y="defenderDamage" line={{ class: "stroke-[#5eaef5] stroke-2" }} fill="url(#defenderGradient)" />

								<defs>
									<linearGradient id="attackerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" style="stop-color:rgb(239, 68, 68);stop-opacity:0.3" />
										<stop offset="100%" style="stop-color:rgb(239, 68, 68);stop-opacity:0.05" />
									</linearGradient>
									<linearGradient id="defenderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" style="stop-color:rgb(123, 160, 200);stop-opacity:0.3" />
										<stop offset="100%" style="stop-color:rgb(123, 160, 200);stop-opacity:0.05" />
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
										valueClass="text-red-300 font-bold font-mono"
									/>
									<Tooltip.Item
										label="Defender"
										value={data.defenderDamage}
										valueClass="text-[#b3dcff] font-bold font-mono"
									/>
								</Tooltip.List>
							</Tooltip.Root>
						</Chart>
					</div>

					<div class="flex items-center justify-center gap-4 sm:gap-8 mt-4 sm:mt-6">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full"></div>
							<span class="text-xs sm:text-sm text-[#a8a083]">Attacker</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 sm:w-4 sm:h-4 bg-[#5eaef5] rounded-full"></div>
							<span class="text-xs sm:text-sm text-[#a8a083]">Defender</span>
						</div>
					</div>
				{:else}
					<div class="text-center py-8 sm:py-12 text-[#a8a083] text-sm">No combat data yet</div>
				{/if}
			</div>
		</div>
	{/if}
</PageContainer>

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
