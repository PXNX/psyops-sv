<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";
	import IconClock from "~icons/fluent/clock-24-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import * as m from "$lib/paraglide/messages";

	import Modal from "$lib/component/Modal.svelte";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import EmptyState from "$lib/component/EmptyState.svelte";
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let showTrainingAnim = $state(false);
	let selectedTemplate = $state<any>(null);
	let disbandModalOpen = $state(false);
	let unitToDisband = $state<any>(null);

	const trainingDisabled = $derived(data.isIndependentRegion || data.isTraveling);
	const trainingDisabledReason = $derived(
		data.isIndependentRegion
			? "You live in an independent region. Join or create a state through a political party before training military units."
			: data.isTraveling
				? "You cannot train units while traveling."
				: ""
	);

	function confirmDisband(unit: any) {
		unitToDisband = unit;
		disbandModalOpen = true;
	}

	function getUnitIconPath(unitType: string): string {
		return `/units/${unitType}.svg`;
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

	// Build costs and available objects for ResourceRequirements component
	function getTemplateCosts(template: any): Record<string, number> {
		const costs: Record<string, number> = {};

		if (template.currencyCost > 0) costs.currency = template.currencyCost;
		if (template.ironCost > 0) costs.iron = template.ironCost;
		if (template.steelCost > 0) costs.steel = template.steelCost;
		if (template.gunpowderCost > 0) costs.gunpowder = template.gunpowderCost;
		if (template.riflesCost > 0) costs.rifles = template.riflesCost;
		if (template.ammunitionCost > 0) costs.ammunition = template.ammunitionCost;
		if (template.artilleryCost > 0) costs.artillery = template.artilleryCost;
		if (template.vehiclesCost > 0) costs.vehicles = template.vehiclesCost;
		if (template.explosivesCost > 0) costs.explosives = template.explosivesCost;

		return costs;
	}

	function getAvailableResources(): Record<string, number> {
		return {
			currency: data.inventory.currency,
			iron: data.inventory.resources.iron || 0,
			steel: data.inventory.resources.steel || 0,
			gunpowder: data.inventory.resources.gunpowder || 0,
			rifles: data.inventory.products.rifles || 0,
			ammunition: data.inventory.products.ammunition || 0,
			artillery: data.inventory.products.artillery || 0,
			vehicles: data.inventory.products.vehicles || 0,
			explosives: data.inventory.products.explosives || 0
		};
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

<PageContainer maxWidth="7xl">
	<!-- Header -->
	{#snippet headerActions()}
		{#if data.residence.bloc}
			<div
				class="px-3 sm:px-4 py-2 rounded-lg border font-medium backdrop-blur-sm text-sm"
				style="background-color: {data.residence.bloc.color}15; border-color: {data.residence.bloc.color}40"
			>
				{data.residence.bloc.name}
			</div>
		{/if}
	{/snippet}
	<PageHeader
		title="Military"
		subtitle="{data.residence.stateName ?? 'Independent Region'} • {data.units.filter((u) => !u.isTraining)
			.length} Active • {trainingUnits.length} Training"
		icon={FluentEmojiMilitaryHelmet}
		actions={headerActions}
	/>

	{#if trainingDisabled}
		<div class="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-sm">
			<p class="text-sm text-amber-300 font-medium">{trainingDisabledReason}</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Active Units - Main Focus -->
		<div class="lg:col-span-2 space-y-4">
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
										<span class="text-base font-semibold text-white ml-1.5"
											>{data.templates[unit.unitType].baseAttack}</span
										>
									</div>
									<div class="bg-blue-900/40 border border-blue-700/50 rounded px-2.5 py-1">
										<span class="text-xs text-blue-500 font-medium">DEF</span>
										<span class="text-base font-semibold text-white ml-1.5"
											>{data.templates[unit.unitType].baseDefense}</span
										>
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
				<EmptyState
					icon={FluentEmojiMilitaryHelmet}
					title="No active units"
					subtitle="Train your first unit to begin"
				/>
			{/if}

			<!-- Unit Templates -->
			<div class="mt-8">
				<h2 class="text-2xl font-semibold text-white mb-4">Train New Units</h2>

				<!-- Selectable Unit Type Cards -->
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
					{#each Object.values(data.templates) as template}
						{@const isSelected = selectedTemplate?.id === template.id}
						<button
							type="button"
							class="relative p-3 rounded-lg border-2 transition-all duration-200 overflow-hidden group {isSelected
								? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'} {trainingDisabled
								? 'opacity-50 cursor-not-allowed'
								: ''}"
							onclick={() => (selectedTemplate = template)}
							disabled={isSubmitting || trainingDisabled}
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
										alt={template.unitType}
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
									{m[template.unitType]()}
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
								</div>
							</div>
						</div>

						<!-- Resource Requirements using ResourceRequirements component -->
						<div class="border-t border-slate-700/30 pt-4">
							<ResourceRequirements costs={getTemplateCosts(selectedTemplate)} available={getAvailableResources()} />
						</div>

						<div
							class="flex items-center justify-between p-3 md:p-4 bg-slate-700/30 rounded-lg border border-slate-600/50"
						>
							<div class="flex items-center gap-2">
								<FluentClock20Filled class="size-4 md:size-5 text-gray-400" />
								<span class="text-xs md:text-sm text-gray-400">Training Time</span>
							</div>
							<span class="font-bold text-white text-base md:text-lg">
								{selectedTemplate.trainingDuration}h
							</span>
						</div>

						<!-- Training Button -->
						<form
							method="POST"
							action="?/train"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update, result }) => {
									await update();
									isSubmitting = false;
									selectedTemplate = null;
									if (result.type === "success") showTrainingAnim = true;
								};
							}}
						>
							<input type="hidden" name="unitType" value={selectedTemplate.unitType} />
							<button
								type="submit"
								disabled={isSubmitting || !canAfford(selectedTemplate) || trainingDisabled}
								class="btn w-full gap-2 transition-transform hover:scale-105"
								class:btn-primary={canAfford(selectedTemplate) && !trainingDisabled}
								class:btn-disabled={!canAfford(selectedTemplate) || trainingDisabled}
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
					<EmptyState
						icon={FluentEmojiMilitaryHelmet}
						title="Select a unit type to begin training"
						subtitle="Choose from the available templates above"
					/>
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
					<EmptyState icon={IconClock} title="No units training" class="py-8 p-6 sm:p-8" />
				{/if}
			</div>
		</div>
	</div>
</PageContainer>

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

{#if showTrainingAnim}
	<ThreeAnimation variant="training" onComplete={() => (showTrainingAnim = false)} />
{/if}

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
