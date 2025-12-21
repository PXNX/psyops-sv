<!-- /src/routes/(authenticated)/(dock)/training/TrainingModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import Modal from "$lib/component/Modal.svelte";
	import IconOrganization from "~icons/fluent/organization-24-filled";
	import IconAdd from "~icons/fluent/add-24-filled";

	let {
		open = $bindable(false),
		template = $bindable(null),
		inventory,
		onClose
	}: {
		open: boolean;
		template: any;
		inventory: any;
		onClose: () => void;
	} = $props();

	let unitName = $state("");
	let unitSize = $state<"brigade" | "division" | "corps">("brigade");
	let isSubmitting = $state(false);

	function getUnitIcon(unitType: string): string {
		const iconMap: Record<string, string> = {
			heavy_armor: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
			ifv: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
			artillery: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.43V2H7v8.43c0 .35.18.68.49.86l4.18 2.51-.99 2.34-3.41.29 2.59 2.24L9.07 22 12 20.23 14.93 22l-.78-3.33 2.59-2.24-3.41-.29-.99-2.34 4.18-2.51c.3-.18.48-.5.48-.86z"/></svg>`,
			air_defence: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.81 2.81L1.39 4.22l2.27 2.27C2.61 8.07 2 9.96 2 12c0 5.52 4.48 10 10 10 2.04 0 3.93-.61 5.51-1.66l2.27 2.27 1.41-1.41L2.81 2.81zM12 20c-4.41 0-8-3.59-8-8 0-1.48.41-2.86 1.12-4.06l10.94 10.94C14.86 19.59 13.48 20 12 20zM7.94 5.12L6.49 3.66C8.07 2.61 9.96 2 12 2c5.52 0 10 4.48 10 10 0 2.04-.61 3.93-1.66 5.51l-1.46-1.46C19.59 14.86 20 13.48 20 12c0-4.41-3.59-8-8-8-1.48 0-2.86.41-4.06 1.12z"/></svg>`,
			light_infantry: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>`,
			fighter_squadron: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
			bomber_squadron: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.87 6.453c-.25-.75-.69-1.379-1.313-1.891-.643-.531-1.412-.844-2.313-.969-.901-.125-1.812-.031-2.719.281L11.25 4.75 9.906 2.438C9.531 1.719 8.969 1.344 8.219 1.344c-.312 0-.625.063-.938.188L4.687 2.406c-.375.188-.563.5-.563.938s.188.75.563.938l2.75 1.313-.063 1.594L3.25 8.344c-.281.125-.5.313-.656.563s-.219.531-.188.844c.031.281.125.531.281.719l2.188 2.875 3.313 3.313 2.875 2.188c.188.156.438.25.719.281.313.031.594-.031.844-.188s.438-.375.563-.656l1.156-4.125 1.594-.063 1.313 2.75c.188.375.5.563.938.563s.75-.188.938-.563l.875-2.594c.125-.313.188-.625.188-.938 0-.75-.375-1.313-1.094-1.688L17.78 8.469l.844-2.25c.313-.906.407-1.813.282-2.719-.125-.906-.438-1.688-.969-2.344z"/></svg>`
		};
		return iconMap[unitType] || iconMap.light_infantry;
	}

	function getSizeMultiplier(size: string): number {
		switch (size) {
			case "brigade":
				return 1;
			case "division":
				return 1.5;
			case "corps":
				return 2;
			default:
				return 1;
		}
	}

	function calculateStats(tmpl: any, size: string) {
		if (!tmpl) return { attack: 0, defense: 0, cost: 0, duration: 0 };
		const multiplier = getSizeMultiplier(size);
		return {
			attack: Math.round(tmpl.baseAttack * multiplier),
			defense: Math.round(tmpl.baseDefense * multiplier),
			cost: Math.round(tmpl.currencyCost * multiplier),
			duration: Math.round(tmpl.trainingDuration * multiplier)
		};
	}

	function canAfford(tmpl: any): boolean {
		if (!tmpl || !inventory) return false;
		const multiplier = getSizeMultiplier(unitSize);

		const currency = Math.round(tmpl.currencyCost * multiplier);
		const iron = Math.round(tmpl.ironCost * multiplier);
		const steel = Math.round(tmpl.steelCost * multiplier);
		const gunpowder = Math.round(tmpl.gunpowderCost * multiplier);
		const rifles = Math.round(tmpl.riflesCost * multiplier);
		const ammunition = Math.round(tmpl.ammunitionCost * multiplier);
		const artillery = Math.round(tmpl.artilleryCost * multiplier);
		const vehicles = Math.round(tmpl.vehiclesCost * multiplier);
		const explosives = Math.round(tmpl.explosivesCost * multiplier);

		return (
			inventory.currency >= currency &&
			(inventory.resources.iron || 0) >= iron &&
			(inventory.resources.steel || 0) >= steel &&
			(inventory.resources.gunpowder || 0) >= gunpowder &&
			(inventory.products.rifles || 0) >= rifles &&
			(inventory.products.ammunition || 0) >= ammunition &&
			(inventory.products.artillery || 0) >= artillery &&
			(inventory.products.vehicles || 0) >= vehicles &&
			(inventory.products.explosives || 0) >= explosives
		);
	}

	function formatCurrency(amount: number): string {
		if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
		if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
		return amount.toString();
	}

	function handleClose() {
		unitName = "";
		unitSize = "brigade";
		onClose();
	}

	$effect(() => {
		if (open) {
			unitName = "";
			unitSize = "brigade";
		}
	});
</script>

<Modal bind:open size="large">
	{#snippet children()}
		{#if template}
			{@const stats = calculateStats(template, unitSize)}
			{@const affordable = canAfford(template)}
			{@const multiplier = getSizeMultiplier(unitSize)}

			<div class="flex items-center gap-3 mb-6">
				<div class="w-12 h-12 flex items-center justify-center">
					{@html getUnitIcon(template.unitType)}
				</div>
				<h3 class="text-2xl font-bold">Train {template.displayName}</h3>
			</div>

			<form
				method="POST"
				action="?/train"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
						handleClose();
					};
				}}
			>
				<input type="hidden" name="templateId" value={template.id} />

				<div class="space-y-4">
					<!-- Unit Name -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Unit Name</span>
						</label>
						<input
							type="text"
							name="unitName"
							bind:value={unitName}
							placeholder="e.g., 1st Armored Brigade"
							class="input input-bordered w-full"
							maxlength="100"
							required
						/>
					</div>

					<!-- Unit Size Selection -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Unit Size</span>
						</label>
						<input type="hidden" name="unitSize" value={unitSize} />
						<div class="grid grid-cols-3 gap-2">
							<button
								type="button"
								class="btn btn-outline {unitSize === 'brigade' ? 'btn-primary' : ''}"
								onclick={() => (unitSize = "brigade")}
							>
								Brigade
								<span class="badge badge-sm">×1</span>
							</button>
							<button
								type="button"
								class="btn btn-outline {unitSize === 'division' ? 'btn-primary' : ''}"
								onclick={() => (unitSize = "division")}
							>
								Division
								<span class="badge badge-sm">×1.5</span>
							</button>
							<button
								type="button"
								class="btn btn-outline {unitSize === 'corps' ? 'btn-primary' : ''}"
								onclick={() => (unitSize = "corps")}
							>
								Corps
								<span class="badge badge-sm">×2</span>
							</button>
						</div>
					</div>

					<!-- Calculated Stats -->
					<div class="alert alert-info">
						<IconOrganization class="w-5 h-5" />
						<div class="w-full">
							<div class="font-semibold mb-2">Final Unit Stats</div>
							<div class="grid grid-cols-2 gap-2 text-sm">
								<div>Attack: <span class="font-bold">{stats.attack}</span></div>
								<div>Defense: <span class="font-bold">{stats.defense}</span></div>
								<div>Cost: <span class="font-bold">💰 {formatCurrency(stats.cost)}</span></div>
								<div>Duration: <span class="font-bold">⏱️ {stats.duration}h</span></div>
							</div>
						</div>
					</div>

					<!-- Requirements -->
					<div class="card bg-base-200">
						<div class="card-body p-4">
							<h4 class="font-semibold mb-2">Resource Requirements</h4>
							<div class="grid grid-cols-2 gap-2 text-sm">
								{#if template.currencyCost > 0}
									{@const required = Math.round(template.currencyCost * multiplier)}
									<div class:text-error={inventory.currency < required}>
										💰 Currency: <span class="font-bold">{formatCurrency(required)}</span>
									</div>
								{/if}
								{#if template.ironCost > 0}
									{@const required = Math.round(template.ironCost * multiplier)}
									<div class:text-error={(inventory.resources.iron || 0) < required}>
										⚙️ Iron: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.steelCost > 0}
									{@const required = Math.round(template.steelCost * multiplier)}
									<div class:text-error={(inventory.resources.steel || 0) < required}>
										🔩 Steel: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.gunpowderCost > 0}
									{@const required = Math.round(template.gunpowderCost * multiplier)}
									<div class:text-error={(inventory.resources.gunpowder || 0) < required}>
										💥 Gunpowder: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.riflesCost > 0}
									{@const required = Math.round(template.riflesCost * multiplier)}
									<div class:text-error={(inventory.products.rifles || 0) < required}>
										🔫 Rifles: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.ammunitionCost > 0}
									{@const required = Math.round(template.ammunitionCost * multiplier)}
									<div class:text-error={(inventory.products.ammunition || 0) < required}>
										📦 Ammunition: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.artilleryCost > 0}
									{@const required = Math.round(template.artilleryCost * multiplier)}
									<div class:text-error={(inventory.products.artillery || 0) < required}>
										🎯 Artillery: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.vehiclesCost > 0}
									{@const required = Math.round(template.vehiclesCost * multiplier)}
									<div class:text-error={(inventory.products.vehicles || 0) < required}>
										🚗 Vehicles: <span class="font-bold">{required}</span>
									</div>
								{/if}
								{#if template.explosivesCost > 0}
									{@const required = Math.round(template.explosivesCost * multiplier)}
									<div class:text-error={(inventory.products.explosives || 0) < required}>
										💣 Explosives: <span class="font-bold">{required}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>

					{#if !affordable}
						<div class="alert alert-warning">
							<span>⚠️ Insufficient resources to train this unit</span>
						</div>
					{/if}
				</div>

				<div class="modal-action mt-6">
					<button type="button" class="btn btn-ghost" onclick={handleClose} disabled={isSubmitting}> Cancel </button>
					<button type="submit" class="btn btn-primary" disabled={isSubmitting || !unitName.trim() || !affordable}>
						{#if isSubmitting}
							<span class="loading loading-spinner"></span>
						{:else}
							<IconAdd class="w-5 h-5" />
						{/if}
						Start Training
					</button>
				</div>
			</form>
		{/if}
	{/snippet}
</Modal>
