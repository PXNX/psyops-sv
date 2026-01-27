<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";
	import IconClock from "~icons/fluent/clock-24-filled";
	import Modal from "$lib/component/Modal.svelte";

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let selectedTemplate = $state<any>(null);
	let disbandModalOpen = $state(false);
	let unitToDisband = $state<any>(null);

	function confirmDisband(unit: any) {
		unitToDisband = unit;
		disbandModalOpen = true;
	}

	function getUnitIconPath(unitType: string): string {
		return `/units/${unitType}.svg`;
	}

	function formatCurrency(amount: number): string {
		if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
		if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
		return amount.toString();
	}

	function canAfford(template: any): boolean {
		if (!template || !data.inventory) return false;

		return (
			data.inventory.currency >= template.currencyCost &&
			(data.inventory.resources.iron || 0) >= template.ironCost &&
			(data.inventory.resources.steel || 0) >= template.steelCost &&
			(data.inventory.resources.gunpowder || 0) >= template.gunpowderCost &&
			(data.inventory.products.rifles || 0) >= template.riflesCost &&
			(data.inventory.products.ammunition || 0) >= template.ammunitionCost &&
			(data.inventory.products.artillery || 0) >= template.artilleryCost &&
			(data.inventory.products.vehicles || 0) >= template.vehiclesCost &&
			(data.inventory.products.explosives || 0) >= template.explosivesCost
		);
	}

	function getResourceStatus(template: any) {
		const requirements = [
			{
				type: "currency",
				icon: "💰",
				name: "Currency",
				required: template.currencyCost,
				available: data.inventory.currency
			},
			{
				type: "iron",
				icon: "⚙️",
				name: "Iron",
				required: template.ironCost,
				available: data.inventory.resources.iron || 0
			},
			{
				type: "steel",
				icon: "🔩",
				name: "Steel",
				required: template.steelCost,
				available: data.inventory.resources.steel || 0
			},
			{
				type: "gunpowder",
				icon: "💥",
				name: "Gunpowder",
				required: template.gunpowderCost,
				available: data.inventory.resources.gunpowder || 0
			},
			{
				type: "rifles",
				icon: "🔫",
				name: "Rifles",
				required: template.riflesCost,
				available: data.inventory.products.rifles || 0
			},
			{
				type: "ammunition",
				icon: "📦",
				name: "Ammo",
				required: template.ammunitionCost,
				available: data.inventory.products.ammunition || 0
			},
			{
				type: "artillery",
				icon: "🎯",
				name: "Artillery",
				required: template.artilleryCost,
				available: data.inventory.products.artillery || 0
			},
			{
				type: "vehicles",
				icon: "🚗",
				name: "Vehicles",
				required: template.vehiclesCost,
				available: data.inventory.products.vehicles || 0
			},
			{
				type: "explosives",
				icon: "💣",
				name: "Explosives",
				required: template.explosivesCost,
				available: data.inventory.products.explosives || 0
			}
		].filter((r) => r.required > 0);

		return requirements;
	}

	function calculateOrgaRecoveryTime(organization: number): string {
		if (organization >= 100) return "Full";
		const hoursToFull = Math.ceil((100 - organization) / 5);
		return `${hoursToFull}h`;
	}

	// Sort training units by creation date to establish queue order
	const trainingUnits = $derived(
		data.units
			.filter((u) => u.isTraining)
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
	);

	// Only the first unit in queue is actively training
	const activeTrainingUnit = $derived(trainingUnits[0]);
	const queuedUnits = $derived(trainingUnits.slice(1));

	function getTrainingProgress(unit: any): number {
		if (!unit.isTraining || !unit.trainingStartedAt || !unit.trainingCompletesAt) return 100;
		// Only show progress for the active training unit
		if (unit.id !== activeTrainingUnit?.id) return 0;

		const now = new Date().getTime();
		const start = new Date(unit.trainingStartedAt).getTime();
		const end = new Date(unit.trainingCompletesAt).getTime();
		const total = end - start;
		const elapsed = now - start;
		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	}

	function getTrainingTimeRemaining(unit: any): string {
		if (!unit.isTraining || !unit.trainingCompletesAt) return "";
		const now = new Date().getTime();
		const end = new Date(unit.trainingCompletesAt).getTime();
		const diff = end - now;

		if (diff <= 0) return "Ready!";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentEmojiMilitaryHelmet class="size-8" />
				Military Training
			</h1>
			<p class="text-slate-400 mt-1">
				{data.residence.stateName} • {data.units.filter((u) => !u.isTraining).length} Active • {trainingUnits.length} Training
			</p>
		</div>
		{#if data.residence.bloc}
			<div
				class="px-4 py-2 rounded-lg border font-medium backdrop-blur-sm"
				style="background-color: {data.residence.bloc.color}15; border-color: {data.residence.bloc.color}40"
			>
				{data.residence.bloc.name}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Active Units - Main Focus -->
		<div class="lg:col-span-2 space-y-4">
			<h2 class="text-2xl font-semibold text-white">Active Units ({data.units.filter((u) => !u.isTraining).length})</h2>

			{#each data.units.filter((u) => !u.isTraining) as unit}
				<div
					class="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/60 hover:bg-slate-800/50 transition-all duration-300"
				>
					<div class="p-5">
						<div class="flex items-center gap-4 mb-4">
							<div class="size-12 flex-shrink-0 flex items-center justify-center">
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-white text-base mb-0.5 tracking-tight">{unit.name}</h3>
								<div class="flex items-center gap-3 mt-2">
									<div class="bg-red-900/40 border border-red-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-red-500 font-medium">ATK</span>
										<span class="text-base font-semibold text-white ml-1.5">{unit.attack}</span>
									</div>
									<div class="bg-blue-900/40 border border-blue-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-blue-500 font-medium">DEF</span>
										<span class="text-base font-semibold text-white ml-1.5">{unit.defense}</span>
									</div>
								</div>
							</div>
							<button
								type="button"
								onclick={() => confirmDisband(unit)}
								class="btn btn-ghost btn-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
								title="Disband Unit"
							>
								<IconDelete class="size-4" />
							</button>
						</div>

						<!-- Compact Status Bars -->
						<div class="grid grid-cols-3 gap-3">
							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-slate-500 font-medium">ORG</span>
									<span class="font-semibold text-slate-300">{unit.organization}%</span>
								</div>
								<div class="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden border border-slate-700/30">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.organization}%; background: linear-gradient(90deg, #60a5fa, #3b82f6)"
									></div>
								</div>
							</div>

							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-slate-500 font-medium">STR</span>
									<span class="font-semibold text-slate-300">{unit.health}%</span>
								</div>
								<div class="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden border border-slate-700/30">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.health}%; background: linear-gradient(90deg, #34d399, #10b981)"
									></div>
								</div>
							</div>

							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-slate-500 font-medium">SUP</span>
									<span class="font-semibold text-slate-300">{unit.supplyLevel}%</span>
								</div>
								<div class="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden border border-slate-700/30">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.supplyLevel}%; background: linear-gradient(90deg, #fbbf24, #f59e0b)"
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if data.units.filter((u) => !u.isTraining).length === 0}
				<div class="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-16 text-center">
					<FluentEmojiMilitaryHelmet class="size-16 mx-auto mb-4 opacity-20" />
					<p class="text-slate-400 text-lg">No active units</p>
					<p class="text-sm text-slate-500 mt-2">Train your first unit to begin</p>
				</div>
			{/if}

			<!-- Unit Templates -->
			<div class="mt-8">
				<h2 class="text-2xl font-semibold text-white mb-4">Train New Units</h2>

				<!-- Selectable Unit Type Cards -->
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
					{#each data.templates as template}
						{@const isSelected = selectedTemplate?.id === template.id}
						<button
							type="button"
							class="relative p-3 rounded-lg border-2 transition-all duration-200 overflow-hidden group {isSelected
								? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
							onclick={() => (selectedTemplate = template)}
							disabled={isSubmitting}
						>
							<!-- Gradient Background -->
							<div
								class="absolute inset-0 opacity-0 transition-opacity duration-200"
								class:opacity-100={isSelected}
								style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)"
							></div>

							<!-- Hover Gradient -->
							<div
								class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
								class:group-hover:opacity-0={isSelected}
								style="background: linear-gradient(135deg, rgba(71, 85, 105, 0.1) 0%, rgba(51, 65, 85, 0.05) 100%)"
							></div>

							<div class="relative flex flex-col gap-2 items-center">
								<!-- Unit Icon -->
								<div
									class="size-16 flex items-center justify-center transition-transform group-hover:scale-110 duration-200"
								>
									<img
										src={getUnitIconPath(template.unitType)}
										alt={template.displayName}
										class="w-full h-full object-contain transition-all duration-200"
										class:[filter:brightness(0)_saturate(100%)_invert(70%)_sepia(10%)_saturate(300%)_hue-rotate(180deg)_brightness(90%)_contrast(90%)]={!isSelected}
										class:[filter:brightness(0)_saturate(100%)_invert(60%)_sepia(80%)_saturate(1500%)_hue-rotate(200deg)_brightness(100%)_contrast(100%)]={isSelected}
									/>
								</div>

								<!-- Unit Name -->
								<h3
									class="font-medium text-md transition-colors text-center leading-tight"
									class:text-blue-300={isSelected}
									class:text-slate-300={!isSelected}
								>
									{template.displayName}
								</h3>
							</div>
						</button>
					{/each}
				</div>

				<!-- Central Training Panel -->
				{#if selectedTemplate}
					<div class="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 space-y-5">
						<!-- Selected Unit Header -->
						<div class="flex items-center gap-4 mb-5">
							<div class="size-14 flex items-center justify-center flex-shrink-0">
								<img
									src={getUnitIconPath(selectedTemplate.unitType)}
									alt={selectedTemplate.displayName}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(75%)_sepia(15%)_saturate(400%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1">
								<h3 class="text-xl font-semibold text-white mb-3 tracking-tight">{selectedTemplate.displayName}</h3>
								<div class="flex items-center gap-3 text-sm">
									<div class="bg-red-900/40 border border-red-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-red-500">ATK</span>
										<span class="text-base font-semibold text-white ml-1.5">{selectedTemplate.baseAttack}</span>
									</div>
									<div class="bg-blue-900/40 border border-blue-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-blue-500">DEF</span>
										<span class="text-base font-semibold text-white ml-1.5">{selectedTemplate.baseDefense}</span>
									</div>

									<div class="bg-slate-900/40 border border-slate-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-slate-500">TIME</span>
										<span class="text-base font-semibold text-white ml-1.5">{selectedTemplate.trainingDuration}h</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Resource Requirements -->
						<div class="border-t border-slate-700/30 pt-4">
							<h4 class="text-xs font-medium text-slate-400 mb-2.5 uppercase tracking-wide">Resources Required</h4>
							<div class="bg-slate-900/30 rounded-lg p-3 space-y-1.5 border border-slate-700/30">
								{#each getResourceStatus(selectedTemplate) as resource}
									{@const hasEnough = resource.available >= resource.required}
									<div class="flex justify-between text-xs items-center">
										<span class="text-slate-400 flex items-center gap-1.5">
											<span class="text-sm opacity-80">{resource.icon}</span>
											{resource.name}
										</span>
										<span class="font-mono text-xs" class:text-white={hasEnough} class:text-red-400={!hasEnough}>
											{resource.required.toLocaleString()}
											<span class="text-slate-600">/ {resource.available.toLocaleString()}</span>
											{#if hasEnough}
												<span class="text-emerald-400 ml-1">✓</span>
											{:else}
												<span class="text-red-400 ml-1">✗</span>
											{/if}
										</span>
									</div>
								{/each}
							</div>

							{#if !canAfford(selectedTemplate)}
								<div class="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
									<span class="text-xs text-red-400">⚠️ Insufficient resources</span>
								</div>
							{/if}
						</div>

						<!-- Training Button -->
						<form
							method="POST"
							action="?/train"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									await update();
									isSubmitting = false;
									selectedTemplate = null;
								};
							}}
						>
							<input type="hidden" name="templateId" value={selectedTemplate.id} />
							<button
								type="submit"
								disabled={isSubmitting || !canAfford(selectedTemplate)}
								class="btn w-full gap-2 transition-transform hover:scale-105"
								class:btn-primary={canAfford(selectedTemplate)}
								class:btn-disabled={!canAfford(selectedTemplate)}
							>
								{#if isSubmitting}
									<span class="loading loading-spinner loading-sm"></span>
									Training...
								{:else}
									<IconAdd class="size-5" />
									Begin Training
								{/if}
							</button>
						</form>
					</div>
				{:else}
					<div class="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-12 text-center">
						<FluentEmojiMilitaryHelmet class="size-16 mx-auto mb-4 opacity-20" />
						<p class="text-slate-400 text-lg">Select a unit type to begin training</p>
						<p class="text-sm text-slate-500 mt-2">Choose from the available templates above</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<!-- Training Queue -->
			<div>
				<h2 class="text-xl font-semibold text-white mb-4">Training Queue</h2>

				{#if activeTrainingUnit}
					{@const progress = getTrainingProgress(activeTrainingUnit)}
					{@const timeRemaining = getTrainingTimeRemaining(activeTrainingUnit)}
					{@const isComplete =
						activeTrainingUnit.trainingCompletesAt && new Date(activeTrainingUnit.trainingCompletesAt) <= new Date()}

					<!-- Active Training Unit -->
					<div class="bg-slate-800/40 border border-amber-500/40 rounded-xl overflow-hidden mb-3 backdrop-blur-sm">
						<div class="p-3">
							<div class="flex items-center gap-2 mb-2">
								<div class="size-10 flex-shrink-0 flex items-center justify-center">
									<img
										src={getUnitIconPath(activeTrainingUnit.unitType)}
										alt={activeTrainingUnit.unitType}
										class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(75%)_sepia(15%)_saturate(400%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-white text-xs truncate">{activeTrainingUnit.name}</h3>
									<p class="text-xs text-slate-400">{timeRemaining}</p>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden border border-slate-700/30">
								<div
									class="h-1.5 rounded-full transition-all duration-700"
									style="width: {progress}%; background: linear-gradient(90deg, #fbbf24, #f59e0b)"
								></div>
							</div>
						</div>

						{#if isComplete}
							<div class="border-t border-amber-500/20 p-2.5 bg-slate-900/20">
								<form method="POST" action="?/completeTraining" use:enhance>
									<input type="hidden" name="unitId" value={activeTrainingUnit.id} />
									<button type="submit" class="btn btn-success btn-xs w-full gap-1.5">
										<IconCheckmark class="size-3.5" />
										Finish training
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Queued Units -->
				{#each queuedUnits as unit, index}
					<div class="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2 mb-2 backdrop-blur-sm">
						<div class="flex items-center gap-2">
							<div class="size-8 flex-shrink-0 flex items-center justify-center">
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(70%)_sepia(10%)_saturate(300%)_hue-rotate(180deg)_brightness(90%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-medium text-white text-xs truncate">{unit.name}</h3>
								<p class="text-xs text-slate-500">Queued</p>
							</div>
						</div>
					</div>
				{/each}

				{#if trainingUnits.length === 0}
					<div class="text-center text-slate-500 py-8 text-sm">
						<IconClock class="size-10 mx-auto mb-2 opacity-20" />
						<p>No units training</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Disband Confirmation Modal -->
<Modal bind:open={disbandModalOpen} title="Disband Unit" size="small">
	{#if unitToDisband}
		<div class="space-y-4">
			<div class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
				<div
					class="w-10 h-10 flex-shrink-0 bg-slate-900/60 rounded border border-slate-700/60 flex items-center justify-center p-2"
				>
					<img
						src={getUnitIconPath(unitToDisband.unitType)}
						alt={unitToDisband.unitType}
						class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
					/>
				</div>
				<div>
					<h4 class="font-semibold text-white text-sm">{unitToDisband.name}</h4>
					<p class="text-xs text-slate-400">ATK {unitToDisband.attack} • DEF {unitToDisband.defense}</p>
				</div>
			</div>

			<p class="text-sm text-slate-300">
				Are you sure you want to disband this unit? This action cannot be undone and you will not receive any refunds.
			</p>

			<div class="flex gap-2 pt-2">
				<button type="button" onclick={() => (disbandModalOpen = false)} class="btn btn-ghost flex-1"> Cancel </button>
				<form
					method="POST"
					action="?/disbandUnit"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							disbandModalOpen = false;
							unitToDisband = null;
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="unitId" value={unitToDisband.id} />
					<button type="submit" class="btn btn-error w-full gap-2">
						<IconDelete class="size-4" />
						Disband
					</button>
				</form>
			</div>
		</div>
	{/if}
</Modal>

<style>
	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}
	.animate-shimmer {
		animation: shimmer 2s infinite;
	}
</style>
