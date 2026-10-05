<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentTarget from "~icons/fluent/target-24-regular";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";
	import IconClock from "~icons/fluent/clock-24-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import * as m from "#lib/paraglide/messages.js";
	import { getExperienceLevel } from "#lib/config/index.js";

	import Modal from "#lib/component/Modal.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import { Button, IconButton, Badge } from "#lib/component/ui/index.js";

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

	function getExerciseProgress(unit: any): number {
		if (!unit.isExercising || !unit.exerciseStartedAt || !unit.exerciseCompletesAt) return 0;
		const now = new Date().getTime();
		const start = new Date(unit.exerciseStartedAt).getTime();
		const end = new Date(unit.exerciseCompletesAt).getTime();
		const total = end - start;
		const elapsed = now - start;
		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	}

	function getExerciseTimeRemaining(unit: any): string {
		if (!unit.isExercising || !unit.exerciseCompletesAt) return "";
		const now = new Date().getTime();
		const end = new Date(unit.exerciseCompletesAt).getTime();
		const diff = end - now;

		if (diff <= 0) return "Ready!";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}

	const activeUnits = $derived(data.units.filter((u) => !u.isTraining));

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

<PageContainer maxWidth="6xl">
	{#if trainingDisabled}
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{trainingDisabledReason}</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Active Units - Main Focus -->
		<div class="lg:col-span-2 space-y-4">
			<div class="flex items-center gap-3">
				<span class="h-6 w-1 rounded-full bg-[#8fae88]"></span>
				<h2 class="section-title">Active Units</h2>
				{#if activeUnits.length > 0}
					<Badge tone="green" class="ml-auto">{activeUnits.length}</Badge>
				{/if}
			</div>
			{#each activeUnits as unit}
				<div class="panel rounded-sm overflow-hidden">
					<div class="p-5">
						<div class="flex items-center gap-4 mb-4">
							<div class="size-12 shrink-0 flex items-center justify-center">
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-[#fff7e8] text-base mb-0.5">{unit.name}</h3>
								<div class="flex items-center gap-3 mt-2">
									<div class="bg-red-600/10 border border-red-500/30 rounded-sm px-2.5 py-1">
										<span class="text-xs text-red-300 font-medium">ATK</span>
										<span class="text-base font-semibold text-[#fff7e8] ml-1.5"
											>{data.templates[unit.unitType].baseAttack}</span
										>
									</div>
									<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm px-2.5 py-1">
										<span class="text-xs text-[#b7d0e6] font-medium">DEF</span>
										<span class="text-base font-semibold text-[#fff7e8] ml-1.5"
											>{data.templates[unit.unitType].baseDefense}</span
										>
									</div>
								</div>
							</div>
							<IconButton
								icon={IconDelete}
								label="Disband Unit"
								variant="ghost"
								size="sm"
								shape="square"
								onclick={() => confirmDisband(unit)}
								class="text-[#a89e8e] hover:text-red-400 hover:bg-red-500/10 shrink-0"
							/>
						</div>

						<!-- Experience -->
						<div class="mb-3">
							<div class="flex items-center justify-between text-xs mb-1.5">
								<span class="text-[#a89e8e] font-medium"
									>EXP · <span class="text-[#d5c4df]">{getExperienceLevel(unit.experience ?? 0).label}</span></span
								>
								<span class="font-semibold text-[#d9ccb7]">{unit.experience ?? 0}%</span>
							</div>
							<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10">
								<div
									class="h-1.5 rounded-full transition-all duration-500"
									style="width: {unit.experience ?? 0}%; background: #b7a0c5"
								></div>
							</div>
						</div>

						<!-- Compact Status Bars -->
						<div class="grid grid-cols-3 gap-3">
							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-[#a89e8e] font-medium">ORG</span>
									<span class="font-semibold text-[#d9ccb7]">{unit.organization}%</span>
								</div>
								<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.organization}%; background: #7ba0c8"
									></div>
								</div>
							</div>

							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-[#a89e8e] font-medium">STR</span>
									<span class="font-semibold text-[#d9ccb7]">{unit.health}%</span>
								</div>
								<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.health}%; background: #8fae88"
									></div>
								</div>
							</div>

							<div>
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-[#a89e8e] font-medium">SUP</span>
									<span class="font-semibold text-[#d9ccb7]">{unit.supplyLevel}%</span>
								</div>
								<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10">
									<div
										class="h-1.5 rounded-full transition-all duration-500"
										style="width: {unit.supplyLevel}%; background: #e6a527"
									></div>
								</div>
							</div>
						</div>

						<!-- Exercise -->
						{#if unit.isExercising}
							{@const exProgress = getExerciseProgress(unit)}
							{@const exRemaining = getExerciseTimeRemaining(unit)}
							{@const exComplete = unit.exerciseCompletesAt && new Date(unit.exerciseCompletesAt) <= new Date()}
							<div class="mt-4 pt-4 border-t border-[#dfceb0]/10">
								<div class="flex items-center justify-between text-xs mb-1.5">
									<span class="text-[#d5c4df] font-medium">On exercise</span>
									<span class="text-[#a89e8e] font-mono">{exRemaining}</span>
								</div>
								<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10 mb-3">
									<div
										class="h-1.5 rounded-full transition-all duration-700"
										style="width: {exProgress}%; background: #b7a0c5"
									></div>
								</div>
								{#if exComplete}
									<form
										method="POST"
										action="?/completeExercise"
										use:enhance={() => {
											isSubmitting = true;
											return async ({ update }) => {
												await update();
												isSubmitting = false;
											};
										}}
									>
										<input type="hidden" name="unitId" value={unit.id} />
										<Button
											type="submit"
											variant="soft-emerald"
											size="sm"
											block
											disabled={isSubmitting}
											icon={IconCheckmark}
										>
											Complete exercise
										</Button>
									</form>
								{:else}
									<form
										method="POST"
										action="?/cancelExercise"
										use:enhance={() => {
											isSubmitting = true;
											return async ({ update }) => {
												await update();
												isSubmitting = false;
											};
										}}
									>
										<input type="hidden" name="unitId" value={unit.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											block
											disabled={isSubmitting}
											class="hover:text-red-400"
										>
											Cancel exercise
										</Button>
									</form>
								{/if}
							</div>
						{:else}
							<div class="mt-4 pt-4 border-t border-[#dfceb0]/10">
								<form
									method="POST"
									action="?/startExercise"
									use:enhance={() => {
										isSubmitting = true;
										return async ({ update }) => {
											await update();
											isSubmitting = false;
										};
									}}
								>
									<input type="hidden" name="unitId" value={unit.id} />
									<Button
										type="submit"
										variant="secondary"
										size="sm"
										block
										icon={IconClock}
										disabled={isSubmitting ||
											trainingDisabled ||
											unit.organization < data.exerciseConfig.MIN_ORG_TO_START}
										title={unit.organization < data.exerciseConfig.MIN_ORG_TO_START
											? `Needs ${data.exerciseConfig.MIN_ORG_TO_START}% organization to exercise`
											: "Gain experience in exchange for organization, supply and equipment"}
									>
										Send to exercise ({data.exerciseConfig.DURATION_HOURS}h)
									</Button>
								</form>
								<p class="mt-2 text-[11px] leading-snug text-[#a89e8e]">
									+{data.exerciseConfig.EXPERIENCE_GAIN} XP · −{data.exerciseConfig.ORG_COST} org · −{data
										.exerciseConfig.SUPPLY_COST} supply · equipment replaced
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			{#if activeUnits.length === 0}
				<EmptyState icon={FluentTarget} title="No active units" subtitle="Train your first unit to begin" />
			{/if}

			<!-- Unit Templates -->
			<div class="mt-8">
				<div class="flex items-center gap-3 mb-4">
					<span class="h-6 w-1 rounded-full bg-[#7ba0c8]"></span>
					<h2 class="section-title">Train New Units</h2>
				</div>

				<!-- Selectable Unit Type Cards -->
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
					{#each Object.values(data.templates) as template}
						{@const isSelected = selectedTemplate?.id === template.id}
						<button
							type="button"
							class="relative p-3 rounded-sm border transition-colors duration-200 overflow-hidden group {isSelected
								? 'bg-[#e6a527]/12 border-[#e6a527]/55'
								: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#e6a527]/55 hover:bg-[#19304b]'} {trainingDisabled
								? 'opacity-50 cursor-not-allowed'
								: ''}"
							onclick={() => (selectedTemplate = template)}
							disabled={isSubmitting || trainingDisabled}
						>
							<div class="relative flex flex-col gap-2 items-center">
								<!-- Unit Icon -->
								<div class="size-16 flex items-center justify-center">
									<img
										src={getUnitIconPath(template.unitType)}
										alt={template.unitType}
										class="w-full h-full object-contain transition-all duration-200"
										class:[filter:brightness(0)_saturate(100%)_invert(70%)_sepia(10%)_saturate(300%)_hue-rotate(180deg)_brightness(90%)_contrast(90%)]={!isSelected}
										class:[filter:brightness(0)_saturate(100%)_invert(76%)_sepia(58%)_saturate(640%)_hue-rotate(352deg)_brightness(96%)_contrast(92%)]={isSelected}
									/>
								</div>

								<!-- Unit Name -->
								<h3
									class="font-medium text-md transition-colors text-center leading-tight"
									class:text-[#f7c56b]={isSelected}
									class:text-[#d9ccb7]={!isSelected}
								>
									{m[template.unitType]()}
								</h3>
							</div>
						</button>
					{/each}
				</div>

				<!-- Central Training Panel -->
				{#if selectedTemplate}
					<div class="panel rounded-sm p-5 space-y-5">
						<!-- Selected Unit Header -->
						<div class="flex items-center gap-4 mb-5">
							<div class="size-14 flex items-center justify-center shrink-0">
								<img
									src={getUnitIconPath(selectedTemplate.unitType)}
									alt={selectedTemplate.displayName}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(75%)_sepia(15%)_saturate(400%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1">
								<h3 class="text-xl font-semibold text-[#fff7e8] mb-3">{selectedTemplate.displayName}</h3>
								<div class="flex items-center gap-3 text-sm">
									<div class="bg-red-600/10 border border-red-500/30 rounded-sm px-2.5 py-1">
										<span class="text-xs text-red-300">ATK</span>
										<span class="text-base font-semibold text-[#fff7e8] ml-1.5">{selectedTemplate.baseAttack}</span>
									</div>
									<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm px-2.5 py-1">
										<span class="text-xs text-[#b7d0e6]">DEF</span>
										<span class="text-base font-semibold text-[#fff7e8] ml-1.5">{selectedTemplate.baseDefense}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Resource Requirements using ResourceRequirements component -->
						<div class="border-t border-[#dfceb0]/10 pt-4">
							<ResourceRequirements costs={getTemplateCosts(selectedTemplate)} available={getAvailableResources()} />
						</div>

						<div class="flex items-center justify-between p-3 md:p-4 panel-muted rounded-sm">
							<div class="flex items-center gap-2">
								<FluentClock20Filled class="size-4 md:size-5 text-[#a89e8e]" />
								<span class="text-xs md:text-sm text-[#a89e8e]">Training Time</span>
							</div>
							<span class="font-bold text-[#fff7e8] text-base md:text-lg font-mono">
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
							<Button
								type="submit"
								variant="primary"
								block
								icon={IconAdd}
								disabled={!canAfford(selectedTemplate) || trainingDisabled}
								loading={isSubmitting}
								loadingText="Training..."
							>
								Begin Training
							</Button>
						</form>
					</div>
				{:else}
					<EmptyState
						icon={FluentTarget}
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
				<div class="flex items-center gap-3 mb-4">
					<span class="h-6 w-1 rounded-full bg-[#e6a527]"></span>
					<h2 class="section-title">Training Queue</h2>
					{#if trainingUnits.length > 0}
						<Badge tone="amber" class="ml-auto">{trainingUnits.length}</Badge>
					{/if}
				</div>

				{#if activeTrainingUnit}
					{@const progress = getTrainingProgress(activeTrainingUnit)}
					{@const timeRemaining = getTrainingTimeRemaining(activeTrainingUnit)}
					{@const isComplete =
						activeTrainingUnit.trainingCompletesAt && new Date(activeTrainingUnit.trainingCompletesAt) <= new Date()}

					<!-- Active Training Unit -->
					<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm overflow-hidden mb-3">
						<div class="p-3">
							<div class="flex items-center gap-2 mb-2">
								<div class="size-10 shrink-0 flex items-center justify-center">
									<img
										src={getUnitIconPath(activeTrainingUnit.unitType)}
										alt={activeTrainingUnit.unitType}
										class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(75%)_sepia(15%)_saturate(400%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-[#fff7e8] text-xs truncate">{activeTrainingUnit.name}</h3>
									<p class="text-xs text-[#f7c56b] font-mono">{timeRemaining}</p>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="w-full bg-[#0d1d31]/70 rounded-full h-1.5 overflow-hidden border border-[#dfceb0]/10">
								<div
									class="h-1.5 rounded-full transition-all duration-700"
									style="width: {progress}%; background: #e6a527"
								></div>
							</div>
						</div>

						{#if isComplete}
							<div class="border-t border-[#e6a527]/20 p-2.5 bg-[#0d1d31]/60">
								<form method="POST" action="?/completeTraining" use:enhance>
									<input type="hidden" name="unitId" value={activeTrainingUnit.id} />
									<Button type="submit" variant="soft-emerald" size="xs" block icon={IconCheckmark}>
										Finish training
									</Button>
								</form>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Queued Units -->
				{#each queuedUnits as unit, index}
					<div class="panel-muted rounded-sm p-2 mb-2">
						<div class="flex items-center gap-2">
							<div class="size-8 shrink-0 flex items-center justify-center">
								<img
									src={getUnitIconPath(unit.unitType)}
									alt={unit.unitType}
									class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(70%)_sepia(10%)_saturate(300%)_hue-rotate(180deg)_brightness(90%)_contrast(90%)]"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-medium text-[#fff7e8] text-xs truncate">{unit.name}</h3>
								<p class="text-xs text-[#a89e8e]">Queued</p>
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
			<div class="flex items-center gap-3 p-3 panel-muted rounded-sm">
				<div
					class="w-10 h-10 shrink-0 bg-[#0d1d31]/70 rounded-sm border border-[#dfceb0]/15 flex items-center justify-center p-2"
				>
					<img
						src={getUnitIconPath(unitToDisband.unitType)}
						alt={unitToDisband.unitType}
						class="w-full h-full object-contain opacity-90 [filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]"
					/>
				</div>
				<div>
					<h4 class="font-semibold text-[#fff7e8] text-sm">{unitToDisband.name}</h4>
					<p class="text-xs text-[#a89e8e]">ATK {unitToDisband.attack} • DEF {unitToDisband.defense}</p>
				</div>
			</div>

			<p class="text-sm text-[#d9ccb7]">
				Are you sure you want to disband this unit? This action cannot be undone and you will not receive any refunds.
			</p>

			<div class="flex gap-2 pt-2">
				<Button type="button" variant="ghost" grow onclick={() => (disbandModalOpen = false)}>Cancel</Button>
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
					<Button type="submit" variant="danger" block icon={IconDelete}>Disband</Button>
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
