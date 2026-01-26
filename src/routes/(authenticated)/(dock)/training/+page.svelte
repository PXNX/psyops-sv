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
				name: "Ammunition",
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
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-3xl font-bold flex items-center gap-3">
				<FluentEmojiMilitaryHelmet class="w-8 h-8" />
				Military Training
			</h1>
			<p class="text-base-content/70 mt-1">Train military units for your nation</p>
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

	<!-- Unit Templates Grid -->
	<div class="mb-8">
		<h2 class="text-xl font-bold mb-4">Available Unit Types</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each data.templates as template}
				{@const affordable = canAfford(template)}
				{@const resources = getResourceStatus(template)}
				<button
					class="card bg-base-200 hover:bg-base-300 transition-all cursor-pointer border-2 {selectedTemplate?.id ===
					template.id
						? 'border-primary shadow-lg'
						: 'border-transparent'}"
					onclick={() => (selectedTemplate = selectedTemplate?.id === template.id ? null : template)}
				>
					<div class="card-body p-4">
						<div class="flex items-start justify-between mb-2">
							<img src={getUnitIconPath(template.unitType)} alt={template.displayName} class="w-10 h-10" />
							{#if selectedTemplate?.id === template.id}
								<div class="badge badge-primary badge-sm">
									<IconCheckmark class="w-4 h-4" />
								</div>
							{/if}
						</div>

						<h3 class="font-bold text-lg">{template.displayName}</h3>
						<p class="text-sm text-base-content/70 mb-3">{template.description}</p>

						<div class="grid grid-cols-2 gap-2 text-sm mb-3">
							<div>
								<span class="text-base-content/70">Attack:</span>
								<span class="font-bold ml-1">{template.baseAttack}</span>
							</div>
							<div>
								<span class="text-base-content/70">Defense:</span>
								<span class="font-bold ml-1">{template.baseDefense}</span>
							</div>
							<div>
								<span class="text-base-content/70">Cost:</span>
								<span class="font-bold ml-1">{formatCurrency(template.currencyCost)}</span>
							</div>
							<div>
								<span class="text-base-content/70">Time:</span>
								<span class="font-bold ml-1">{template.trainingDuration}h</span>
							</div>
						</div>

						<div class="divider my-2"></div>

						<!-- Resource Requirements -->
						<div class="space-y-1">
							{#each resources as resource}
								{@const hasEnough = resource.available >= resource.required}
								<div class="flex items-center justify-between text-xs {hasEnough ? 'text-success' : 'text-error'}">
									<span class="flex items-center gap-1">
										<span>{resource.icon}</span>
										<span>{resource.name}</span>
									</span>
									<span class="font-mono">
										{resource.available >= resource.required ? "✓" : "✗"}
										{resource.available}/{resource.required}
									</span>
								</div>
							{/each}
						</div>

						{#if !affordable}
							<div class="badge badge-error badge-sm mt-2 w-full">Insufficient Resources</div>
						{:else}
							<div class="badge badge-success badge-sm mt-2 w-full">Can Afford</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Train Button -->
	{#if selectedTemplate}
		<div class="alert alert-info mb-6">
			<div class="flex-1">
				<h3 class="font-bold">Selected: {selectedTemplate.displayName}</h3>
				<p class="text-sm">Click the button below to begin training this unit</p>
			</div>
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
				<button type="submit" class="btn btn-primary" disabled={isSubmitting || !canAfford(selectedTemplate)}>
					{#if isSubmitting}
						<span class="loading loading-spinner"></span>
					{:else}
						<IconAdd class="w-5 h-5" />
					{/if}
					Start Training
				</button>
			</form>
		</div>
	{/if}

	<!-- Current Units -->
	{#if data.units.length > 0}
		<div class="mb-6">
			<h2 class="text-xl font-bold mb-4">Your Units</h2>
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Attack</th>
							<th>Defense</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.units as unit}
							<tr>
								<td class="font-medium">{unit.name}</td>
								<td>
									<div class="flex items-center gap-2">
										<img src={getUnitIconPath(unit.unitType)} alt={unit.unitType} class="w-6 h-6" />
										<span class="capitalize">{unit.unitType.replace(/_/g, " ")}</span>
									</div>
								</td>
								<td>{unit.attack}</td>
								<td>{unit.defense}</td>
								<td>
									{#if unit.isTraining}
										<div class="flex items-center gap-2">
											<span class="loading loading-spinner loading-xs"></span>
											<span class="text-sm">Training...</span>
										</div>
									{:else}
										<span class="badge badge-success">Ready</span>
									{/if}
								</td>
								<td>
									<div class="flex gap-2">
										{#if unit.isTraining && unit.trainingCompletesAt && new Date(unit.trainingCompletesAt) <= new Date()}
											<form method="POST" action="?/completeTraining" use:enhance>
												<input type="hidden" name="unitId" value={unit.id} />
												<button type="submit" class="btn btn-success btn-sm">
													<IconCheckmark class="w-4 h-4" />
													Complete
												</button>
											</form>
										{/if}
										<form method="POST" action="?/disbandUnit" use:enhance>
											<input type="hidden" name="unitId" value={unit.id} />
											<button type="submit" class="btn btn-error btn-sm">
												<IconDelete class="w-4 h-4" />
												Disband
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
