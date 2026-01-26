<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentEmojiMilitaryHelmet from "~icons/fluent-emoji/military-helmet";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";

	let { data }: { data: PageData } = $props();

	let selectedTemplate = $state<any>(null);
	let isSubmitting = $state(false);

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
		const hoursToFull = Math.ceil((100 - organization) / 5); // Assuming 5 org/hour recovery
		return `${hoursToFull}h`;
	}
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-3xl font-bold flex items-center gap-3">
				<FluentEmojiMilitaryHelmet class="w-8 h-8" />
				Military Training
			</h1>
			<p class="text-base-content/70 mt-1">Train and manage your military forces</p>
		</div>
		{#if data.residence.bloc}
			<div
				class="badge badge-lg"
				style="background-color: {data.residence.bloc.color}20; border-color: {data.residence.bloc.color};"
			>
				{data.residence.bloc.name}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
		<!-- Left Column: Unit Templates -->
		<div class="xl:col-span-2">
			<h2 class="text-xl font-bold mb-4">Train New Units</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.templates as template}
					{@const affordable = canAfford(template)}
					{@const resources = getResourceStatus(template)}
					{@const selected = selectedTemplate?.id === template.id}
					<button
						class="card bg-base-200 hover:bg-base-300 transition-all cursor-pointer border-2 {selected
							? 'border-primary shadow-lg'
							: 'border-transparent'}"
						onclick={() => (selectedTemplate = selected ? null : template)}
					>
						<div class="card-body p-4">
							<div class="flex items-center gap-3 mb-3">
								<div class="w-16 h-12 flex-shrink-0">
									<img
										src={getUnitIconPath(template.unitType)}
										alt={template.displayName}
										class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-base truncate">{template.displayName}</h3>
									<p class="text-xs text-base-content/60">{template.description}</p>
								</div>
								{#if selected}
									<IconCheckmark class="w-5 h-5 text-primary flex-shrink-0" />
								{/if}
							</div>

							<div class="grid grid-cols-3 gap-2 text-xs mb-3 bg-base-300 rounded-lg p-2">
								<div class="text-center">
									<div class="text-base-content/60">ATK</div>
									<div class="font-bold text-sm">{template.baseAttack}</div>
								</div>
								<div class="text-center">
									<div class="text-base-content/60">DEF</div>
									<div class="font-bold text-sm">{template.baseDefense}</div>
								</div>
								<div class="text-center">
									<div class="text-base-content/60">Time</div>
									<div class="font-bold text-sm">{template.trainingDuration}h</div>
								</div>
							</div>

							<!-- Compact Resource Display -->
							<div class="flex flex-wrap gap-1">
								{#each resources as resource}
									{@const hasEnough = resource.available >= resource.required}
									<div class="badge badge-sm {hasEnough ? 'badge-outline' : 'badge-error'} gap-1">
										<span>{hasEnough ? "✓" : "✗"}</span>
										<span>{resource.icon}</span>
										<span class="font-mono text-xs">{resource.required}</span>
									</div>
								{/each}
							</div>

							{#if !affordable}
								<div class="text-xs text-error mt-2 font-medium">Insufficient resources</div>
							{/if}
						</div>
					</button>
				{/each}
			</div>

			<!-- Train Button -->
			{#if selectedTemplate}
				<div class="mt-4">
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
							class="btn btn-primary btn-block"
							disabled={isSubmitting || !canAfford(selectedTemplate)}
						>
							{#if isSubmitting}
								<span class="loading loading-spinner"></span>
							{:else}
								<IconAdd class="w-5 h-5" />
							{/if}
							Start Training {selectedTemplate.displayName}
						</button>
					</form>
				</div>
			{/if}
		</div>

		<!-- Right Column: Active Units -->
		<div>
			<h2 class="text-xl font-bold mb-4">Active Units ({data.units.filter((u) => !u.isTraining).length})</h2>
			<div class="space-y-3">
				{#each data.units.filter((u) => !u.isTraining) as unit}
					<div class="card bg-base-200 border border-base-300">
						<div class="card-body p-4">
							<div class="flex items-center gap-3 mb-2">
								<div class="w-12 h-9 flex-shrink-0">
									<img
										src={getUnitIconPath(unit.unitType)}
										alt={unit.unitType}
										class="w-full h-full object-contain [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-sm truncate">{unit.name}</h3>
									<p class="text-xs text-base-content/60 capitalize">{unit.unitType.replace(/_/g, " ")}</p>
								</div>
							</div>

							<!-- Status Bars -->
							<div class="space-y-2">
								<div>
									<div class="flex justify-between text-xs mb-1">
										<span class="text-base-content/70">Organization</span>
										<span class="font-bold">{unit.organization}%</span>
									</div>
									<progress class="progress progress-primary w-full h-2" value={unit.organization} max="100"></progress>
									{#if unit.organization < 100}
										<div class="text-xs text-base-content/60 mt-1">
											Recovers in {calculateOrgaRecoveryTime(unit.organization)}
										</div>
									{/if}
								</div>

								<div>
									<div class="flex justify-between text-xs mb-1">
										<span class="text-base-content/70">Strength</span>
										<span class="font-bold">{unit.health}%</span>
									</div>
									<progress class="progress progress-success w-full h-2" value={unit.health} max="100"></progress>
								</div>

								<div>
									<div class="flex justify-between text-xs mb-1">
										<span class="text-base-content/70">Supply</span>
										<span class="font-bold">{unit.supplyLevel}%</span>
									</div>
									<progress class="progress progress-warning w-full h-2" value={unit.supplyLevel} max="100"></progress>
								</div>
							</div>

							<!-- Stats -->
							<div class="grid grid-cols-2 gap-2 mt-3 text-xs bg-base-300 rounded p-2">
								<div>
									<span class="text-base-content/60">Attack:</span>
									<span class="font-bold ml-1">{unit.attack}</span>
								</div>
								<div>
									<span class="text-base-content/60">Defense:</span>
									<span class="font-bold ml-1">{unit.defense}</span>
								</div>
							</div>

							<!-- Actions -->
							<form method="POST" action="?/disbandUnit" use:enhance class="mt-3">
								<input type="hidden" name="unitId" value={unit.id} />
								<button type="submit" class="btn btn-error btn-sm btn-block">
									<IconDelete class="w-4 h-4" />
									Disband
								</button>
							</form>
						</div>
					</div>
				{/each}

				{#if data.units.filter((u) => !u.isTraining).length === 0}
					<div class="text-center text-base-content/60 py-8">
						<p class="text-sm">No active units</p>
						<p class="text-xs mt-1">Train your first unit to get started</p>
					</div>
				{/if}
			</div>

			<!-- Training Queue -->
			{#if data.units.some((u) => u.isTraining)}
				<h2 class="text-xl font-bold mb-4 mt-6">Training ({data.units.filter((u) => u.isTraining).length})</h2>
				<div class="space-y-3">
					{#each data.units.filter((u) => u.isTraining) as unit}
						<div class="card bg-base-200 border border-warning">
							<div class="card-body p-4">
								<div class="flex items-center gap-3 mb-2">
									<div class="w-8 h-8 flex-shrink-0">
										<img
											src={getUnitIconPath(unit.unitType)}
											alt={unit.unitType}
											class="w-full h-full [filter:brightness(0)_saturate(100%)_invert(38%)_sepia(96%)_saturate(7464%)_hue-rotate(230deg)_brightness(98%)_contrast(143%)]"
										/>
									</div>
									<div class="flex-1 min-w-0">
										<h3 class="font-bold text-sm truncate">{unit.name}</h3>
										<div class="flex items-center gap-2 text-xs text-base-content/60">
											<span class="loading loading-spinner loading-xs"></span>
											<span>Training...</span>
										</div>
									</div>
								</div>

								{#if unit.trainingCompletesAt && new Date(unit.trainingCompletesAt) <= new Date()}
									<form method="POST" action="?/completeTraining" use:enhance>
										<input type="hidden" name="unitId" value={unit.id} />
										<button type="submit" class="btn btn-success btn-sm btn-block">
											<IconCheckmark class="w-4 h-4" />
											Complete Training
										</button>
									</form>
								{:else if unit.trainingCompletesAt}
									<div class="text-xs text-base-content/60 text-center">
										Completes {new Date(unit.trainingCompletesAt).toLocaleString()}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
