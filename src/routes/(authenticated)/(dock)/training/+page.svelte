<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";
	import IconClock from "~icons/fluent/clock-24-filled";

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let selectedTemplate = $state<any>(null);

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

	function getQueuePosition(index: number): string {
		const pos = index + 1;
		const suffix = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
		return `${pos}${suffix}`;
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
			<p class="text-gray-400 mt-1">
				{data.residence.stateName} • {data.units.filter((u) => !u.isTraining).length} Active • {trainingUnits.length} Training
			</p>
		</div>
		{#if data.residence.bloc}
			<div
				class="px-4 py-2 rounded-lg border font-medium"
				style="background-color: {data.residence.bloc.color}20; border-color: {data.residence.bloc.color}50"
			>
				{data.residence.bloc.name}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Active Units - Main Focus -->
		<div class="lg:col-span-2 space-y-4">
			<h2 class="text-2xl font-bold text-white">Active Units ({data.units.filter((u) => !u.isTraining).length})</h2>

			{#each data.units.filter((u) => !u.isTraining) as unit}
				<div
					class="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
				>
					<div class="p-5">
						<div class="flex items-start gap-4 mb-4">
							<div
								class="w-16 h-12 flex-shrink-0 bg-slate-900/50 rounded-lg border border-white/10 flex items-center justify-center p-2"
							>
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-white text-xl mb-1">{unit.name}</h3>
								<p class="text-sm text-gray-400 capitalize mb-3">{unit.unitType.replace(/_/g, " ")}</p>

								<div class="flex items-center gap-4">
									<div
										class="bg-gradient-to-br from-red-600/30 to-red-700/20 border border-red-500/40 rounded-lg px-3 py-2"
									>
										<span class="text-xs text-red-300">Attack</span>
										<span class="text-xl font-bold text-white ml-2">{unit.attack}</span>
									</div>
									<div
										class="bg-gradient-to-br from-blue-600/30 to-blue-700/20 border border-blue-500/40 rounded-lg px-3 py-2"
									>
										<span class="text-xs text-blue-300">Defense</span>
										<span class="text-xl font-bold text-white ml-2">{unit.defense}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Status Bars -->
						<div class="space-y-3 mb-4">
							<div>
								<div class="flex justify-between text-sm mb-2">
									<span class="text-gray-400 font-medium">Organization</span>
									<span class="font-bold text-white">{unit.organization}%</span>
								</div>
								<div class="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden shadow-inner">
									<div
										class="h-3 rounded-full transition-all relative overflow-hidden"
										style="width: {unit.organization}%; background: linear-gradient(90deg, #3b82f6, #2563eb)"
									>
										<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
									</div>
								</div>
								{#if unit.organization < 100}
									<p class="text-xs text-gray-500 mt-1">Recovers in {calculateOrgaRecoveryTime(unit.organization)}</p>
								{/if}
							</div>

							<div>
								<div class="flex justify-between text-sm mb-2">
									<span class="text-gray-400 font-medium">Strength</span>
									<span class="font-bold text-white">{unit.health}%</span>
								</div>
								<div class="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden shadow-inner">
									<div
										class="h-3 rounded-full transition-all relative overflow-hidden"
										style="width: {unit.health}%; background: linear-gradient(90deg, #10b981, #059669)"
									>
										<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
									</div>
								</div>
							</div>

							<div>
								<div class="flex justify-between text-sm mb-2">
									<span class="text-gray-400 font-medium">Supply</span>
									<span class="font-bold text-white">{unit.supplyLevel}%</span>
								</div>
								<div class="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden shadow-inner">
									<div
										class="h-3 rounded-full transition-all relative overflow-hidden"
										style="width: {unit.supplyLevel}%; background: linear-gradient(90deg, #f59e0b, #d97706)"
									>
										<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
									</div>
								</div>
							</div>
						</div>

						<form method="POST" action="?/disbandUnit" use:enhance>
							<input type="hidden" name="unitId" value={unit.id} />
							<button type="submit" class="btn btn-error btn-sm gap-2">
								<IconDelete class="size-4" />
								Disband Unit
							</button>
						</form>
					</div>
				</div>
			{/each}

			{#if data.units.filter((u) => !u.isTraining).length === 0}
				<div
					class="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-white/5 p-16 text-center"
				>
					<FluentEmojiMilitaryHelmet class="size-16 mx-auto mb-4 opacity-30" />
					<p class="text-gray-400 text-lg">No active units</p>
					<p class="text-sm text-gray-500 mt-2">Train your first unit to begin</p>
				</div>
			{/if}

			<!-- Unit Templates -->
			<div class="mt-8">
				<h2 class="text-2xl font-bold text-white mb-4">Train New Units</h2>

				<!-- Selectable Unit Type Cards -->
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
					{#each data.templates as template}
						<button
							type="button"
							class="p-4 rounded-lg border-2 text-center transition-all group"
							class:bg-blue-600-20={selectedTemplate?.id === template.id}
							class:border-blue-500-50={selectedTemplate?.id === template.id}
							class:bg-slate-700-30={selectedTemplate?.id !== template.id}
							class:border-slate-600-30={selectedTemplate?.id !== template.id}
							class:hover:border-slate-500-50={selectedTemplate?.id !== template.id}
							onclick={() => (selectedTemplate = template)}
							disabled={isSubmitting}
						>
							<div class="flex flex-col gap-3 items-center">
								<!-- Unit Icon -->
								<div class="w-20 h-20 flex items-center justify-center p-3">
									<img
										src={getUnitIconPath(template.unitType)}
										alt={template.displayName}
										class="w-full h-full object-contain transition-all"
										class:[filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]={selectedTemplate?.id !==
											template.id}
										class:[filter:brightness(0)_saturate(100%)_invert(70%)_sepia(100%)_saturate(2000%)_hue-rotate(200deg)_brightness(100%)_contrast(100%)]={selectedTemplate?.id ===
											template.id}
									/>
								</div>

								<!-- Unit Name -->
								<h3
									class="font-bold text-sm transition-colors"
									class:text-white={selectedTemplate?.id === template.id}
									class:text-gray-300={selectedTemplate?.id !== template.id}
								>
									{template.displayName}
								</h3>
							</div>
						</button>
					{/each}
				</div>

				<!-- Central Training Panel -->
				{#if selectedTemplate}
					<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 space-y-6">
						<!-- Selected Unit Header -->
						<div class="flex items-start gap-4">
							<div
								class="w-16 h-16 rounded-lg border border-blue-500/30 bg-blue-600/10 flex items-center justify-center p-3 flex-shrink-0"
							>
								<img
									src={getUnitIconPath(selectedTemplate.unitType)}
									alt={selectedTemplate.displayName}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(50%)_sepia(100%)_saturate(1000%)_hue-rotate(200deg)_brightness(100%)_contrast(100%)]"
								/>
							</div>
							<div class="flex-1">
								<h3 class="text-2xl font-bold text-white mb-1">{selectedTemplate.displayName}</h3>
								<p class="text-sm text-gray-400 mb-3">{selectedTemplate.description}</p>
								<div class="flex items-center gap-4 text-sm">
									<div class="bg-red-600/20 border border-red-500/30 rounded px-3 py-1">
										<span class="text-xs text-red-300">Attack</span>
										<span class="text-lg font-bold text-white ml-2">{selectedTemplate.baseAttack}</span>
									</div>
									<div class="bg-blue-600/20 border border-blue-500/30 rounded px-3 py-1">
										<span class="text-xs text-blue-300">Defense</span>
										<span class="text-lg font-bold text-white ml-2">{selectedTemplate.baseDefense}</span>
									</div>
									<div class="bg-purple-600/20 border border-purple-500/30 rounded px-3 py-1">
										<span class="text-xs text-purple-300">Training</span>
										<span class="text-lg font-bold text-white ml-2">{selectedTemplate.trainingDuration}h</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Resource Requirements -->
						<div class="border-t border-white/5 pt-6">
							<h4 class="text-sm font-medium text-gray-300 mb-3">Required Resources</h4>
							<div class="bg-slate-700/30 rounded-lg p-4 space-y-2">
								{#each getResourceStatus(selectedTemplate) as resource}
									{@const hasEnough = resource.available >= resource.required}
									<div class="flex justify-between text-sm items-center">
										<span class="text-gray-400 flex items-center gap-2">
											<span class="text-base">{resource.icon}</span>
											{resource.name}:
										</span>
										<span class="font-mono" class:text-white={hasEnough} class:text-red-400={!hasEnough}>
											{resource.required.toLocaleString()}
											<span class="text-gray-500">/ {resource.available.toLocaleString()}</span>
											{#if hasEnough}
												<span class="text-green-400 ml-1">✓</span>
											{:else}
												<span class="text-red-400 ml-1">✗</span>
											{/if}
										</span>
									</div>
								{/each}
							</div>

							{#if !canAfford(selectedTemplate)}
								<div class="alert alert-error mt-4">
									<span class="text-sm">⚠️ Insufficient resources to train this unit!</span>
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
								class="btn w-full gap-2"
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
					<div class="bg-slate-800/30 rounded-xl border border-white/5 p-12 text-center">
						<FluentEmojiMilitaryHelmet class="size-16 mx-auto mb-4 opacity-30" />
						<p class="text-gray-400 text-lg">Select a unit type to begin training</p>
						<p class="text-sm text-gray-500 mt-2">Choose from the available templates above</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<!-- Training Queue -->
			<div>
				<h2 class="text-xl font-bold text-white mb-4">Training Queue</h2>

				{#if activeTrainingUnit}
					{@const progress = getTrainingProgress(activeTrainingUnit)}
					{@const timeRemaining = getTrainingTimeRemaining(activeTrainingUnit)}
					{@const isComplete =
						activeTrainingUnit.trainingCompletesAt && new Date(activeTrainingUnit.trainingCompletesAt) <= new Date()}

					<!-- Active Training Unit -->
					<div
						class="bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-500/50 rounded-xl overflow-hidden mb-3"
					>
						<div class="p-4">
							<div class="flex items-center gap-2 mb-3">
								<div
									class="size-5 rounded-full bg-amber-500 text-amber-900 flex items-center justify-center font-bold text-xs"
								>
									1
								</div>
								<span class="text-xs font-semibold text-amber-300">TRAINING NOW</span>
							</div>

							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-8 flex-shrink-0">
									<img
										src={getUnitIconPath(activeTrainingUnit.unitType)}
										alt={activeTrainingUnit.unitType}
										class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-white text-sm truncate">{activeTrainingUnit.name}</h3>
									<p class="text-xs text-gray-400">{timeRemaining}</p>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
								<div
									class="h-2 rounded-full transition-all duration-700 relative overflow-hidden"
									style="width: {progress}%; background: linear-gradient(90deg, #f59e0b, #f59e0bcc)"
								>
									<div
										class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
									></div>
								</div>
							</div>
						</div>

						{#if isComplete}
							<div class="border-t border-amber-500/30 p-3 bg-slate-900/30">
								<form method="POST" action="?/completeTraining" use:enhance>
									<input type="hidden" name="unitId" value={activeTrainingUnit.id} />
									<button type="submit" class="btn btn-success btn-sm w-full gap-2">
										<IconCheckmark class="size-4" />
										Complete
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Queued Units -->
				{#each queuedUnits as unit, index}
					<div class="bg-slate-800/50 border border-slate-600/30 rounded-lg p-3 mb-2">
						<div class="flex items-center gap-3">
							<div
								class="size-5 rounded-full bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0"
							>
								{index + 2}
							</div>
							<div class="w-8 h-6 flex-shrink-0">
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-medium text-white text-sm truncate">{unit.name}</h3>
								<p class="text-xs text-gray-500">Queued</p>
							</div>
						</div>
					</div>
				{/each}

				{#if trainingUnits.length === 0}
					<div class="text-center text-gray-500 py-8 text-sm">
						<IconClock class="size-10 mx-auto mb-2 opacity-30" />
						<p>No units training</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

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
