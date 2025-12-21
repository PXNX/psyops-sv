<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageData, ActionData } from "./$types";
	import Modal from "$lib/component/Modal.svelte";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentVehicleTruckProfile20Regular from "~icons/fluent/vehicle-truck-profile-20-regular";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentEmojiShoppingCart from "~icons/fluent-emoji/shopping-cart";

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let selectedTemplateId = $state("");
	let disbandModalOpen = $state(false);
	let unitToDisband = $state<string | null>(null);

	const unitTypeIcons: Record<string, string> = {
		air_defence: "🚀",
		heavy_armor: "🛡️",
		ifv: "🚙",
		artillery: "💣",
		light_infantry: "🪖",
		bomber_squadron: "✈️",
		fighter_squadron: "🛩️"
	};

	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		steel: "⚙️",
		gunpowder: "💥"
	};

	const productIcons: Record<string, string> = {
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const selectedTemplate = $derived(data.templates.find((t) => t.id === selectedTemplateId));

	const costs = $derived(
		selectedTemplate
			? {
					currency: selectedTemplate.currencyCost,
					iron: selectedTemplate.ironCost,
					steel: selectedTemplate.steelCost,
					gunpowder: selectedTemplate.gunpowderCost,
					rifles: selectedTemplate.riflesCost,
					ammunition: selectedTemplate.ammunitionCost,
					artillery: selectedTemplate.artilleryCost,
					vehicles: selectedTemplate.vehiclesCost,
					explosives: selectedTemplate.explosivesCost
				}
			: null
	);

	const canAfford = $derived(
		costs
			? data.inventory.currency >= costs.currency &&
					(data.inventory.resources.iron || 0) >= costs.iron &&
					(data.inventory.resources.steel || 0) >= costs.steel &&
					(data.inventory.resources.gunpowder || 0) >= costs.gunpowder &&
					(data.inventory.products.rifles || 0) >= costs.rifles &&
					(data.inventory.products.ammunition || 0) >= costs.ammunition &&
					(data.inventory.products.artillery || 0) >= costs.artillery &&
					(data.inventory.products.vehicles || 0) >= costs.vehicles &&
					(data.inventory.products.explosives || 0) >= costs.explosives
			: false
	);

	function showDisbandModal(unitId: string) {
		unitToDisband = unitId;
		disbandModalOpen = true;
	}

	$effect(() => {
		const interval = setInterval(() => {
			const hasCompleted = data.units.some(
				(unit) => unit.isTraining && unit.trainingCompletesAt && new Date(unit.trainingCompletesAt) <= new Date()
			);
			if (hasCompleted) {
				window.location.reload();
			}
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Military Training Center</h1>
			<p class="text-gray-400">Train and manage your military forces</p>
		</div>

		<a
			href="/market"
			class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
		>
			<FluentEmojiShoppingCart class="size-5" />
			Market
		</a>
	</div>

	{#if form?.success}
		<div class="alert alert-success bg-green-600/10 border-green-500/20">
			<FluentCheckmark20Filled class="size-5 text-green-400" />
			<span class="text-green-300">{form.message}</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error bg-red-600/10 border-red-500/20">
			<FluentWarning20Filled class="size-5 text-red-400" />
			<span class="text-red-300">{form.error}</span>
		</div>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Balance</p>
					<p class="text-lg font-bold text-white">{data.inventory.currency.toLocaleString()}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentShield20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Active Units</p>
					<p class="text-lg font-bold text-white">{data.units.length}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentLocation20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Base Location</p>
					<p class="text-sm font-bold text-white truncate">{data.residence.regionName}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2">
			<form
				method="POST"
				action="?/train"
				use:enhance
				class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-5"
			>
				<div class="flex items-center gap-2">
					<FluentVehicleTruckProfile20Regular class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Train New Unit</h2>
				</div>

				<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
					<div class="flex items-center gap-2">
						<FluentLocation20Filled class="size-4 text-blue-400" />
						<span class="text-sm text-blue-300">
							Training Location: <strong>{data.residence.regionName}, {data.residence.stateName}</strong>
						</span>
					</div>
				</div>

				<div>
					<label for="templateId" class="block text-sm font-medium text-gray-300 mb-2">
						Battalion Type <span class="text-red-400">*</span>
					</label>
					<select
						id="templateId"
						name="templateId"
						bind:value={selectedTemplateId}
						class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						required
					>
						<option value="">Select a battalion type...</option>
						{#each data.templates as template}
							<option value={template.id}>
								{unitTypeIcons[template.unitType] || "⚔️"}
								{template.displayName} (ATK: {template.baseAttack}, DEF: {template.baseDefense})
							</option>
						{/each}
					</select>
					{#if selectedTemplate?.description}
						<p class="text-xs text-gray-400 mt-1">{selectedTemplate.description}</p>
					{/if}
				</div>

				{#if selectedTemplate && costs}
					<div class="bg-slate-700/30 rounded-xl p-5 space-y-4 border border-slate-600/30">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-white">Training Requirements</h3>
							<div class="badge bg-purple-600/20 text-purple-300 border-purple-500/30">Battalion</div>
						</div>

						<div class="bg-green-600/10 border-2 border-green-500/30 rounded-lg p-4">
							<p class="text-xs font-semibold text-green-400 mb-2">BATTALION STATS</p>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<p class="text-xs text-gray-400">Attack</p>
									<p class="text-2xl font-bold text-green-400">
										{selectedTemplate.baseAttack}
									</p>
								</div>
								<div>
									<p class="text-xs text-gray-400">Defense</p>
									<p class="text-2xl font-bold text-green-400">
										{selectedTemplate.baseDefense}
									</p>
								</div>
							</div>
						</div>

						<div class="space-y-2">
							<p class="text-xs font-semibold text-gray-400">RESOURCE COSTS</p>

							<div
								class="flex items-center justify-between p-3 rounded-lg border-2 {data.inventory.currency >=
								costs.currency
									? 'bg-green-600/5 border-green-500/20'
									: 'bg-red-600/5 border-red-500/20'}"
							>
								<div class="flex items-center gap-2">
									<FluentMoney20Filled class="size-5 text-yellow-400" />
									<span class="font-medium text-gray-300">Currency</span>
								</div>
								<div class="text-right">
									<p class="font-bold {data.inventory.currency >= costs.currency ? 'text-green-400' : 'text-red-400'}">
										{costs.currency.toLocaleString()} needed
									</p>
									<p class="text-xs text-gray-400">{data.inventory.currency.toLocaleString()} available</p>
								</div>
							</div>

							{#each Object.entries(costs) as [resource, amount]}
								{#if resource !== "currency" && amount > 0}
									{@const isResource = ["iron", "steel", "gunpowder"].includes(resource)}
									{@const available = isResource
										? data.inventory.resources[resource] || 0
										: data.inventory.products[resource] || 0}
									{@const hasEnough = available >= amount}
									<div
										class="flex items-center justify-between p-3 rounded-lg border-2 {hasEnough
											? 'bg-green-600/5 border-green-500/20'
											: 'bg-red-600/5 border-red-500/20'}"
									>
										<div class="flex items-center gap-2">
											<span class="text-lg">
												{isResource ? resourceIcons[resource] : productIcons[resource]}
											</span>
											<span class="font-medium capitalize text-gray-300">{resource}</span>
										</div>
										<div class="text-right">
											<p class="font-bold {hasEnough ? 'text-green-400' : 'text-red-400'}">
												{amount} needed
											</p>
											<p class="text-xs text-gray-400">{available} available</p>
										</div>
									</div>
								{/if}
							{/each}
						</div>

						<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
							<div class="flex items-center gap-2">
								<FluentClock20Filled class="size-4 text-gray-400" />
								<span class="text-sm text-gray-400">Training Time</span>
							</div>
							<span class="font-bold text-white">
								{selectedTemplate.trainingDuration} hours
							</span>
						</div>
					</div>
				{/if}

				<button
					type="submit"
					disabled={!selectedTemplate || !canAfford}
					class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
				>
					{#if canAfford && selectedTemplate}
						<FluentCheckmark20Filled class="size-5" />
						Start Training Battalion
					{:else}
						<FluentWarning20Filled class="size-5" />
						{!selectedTemplate ? "Select Battalion Type" : "Insufficient Resources"}
					{/if}
				</button>

				{#if selectedTemplate && !canAfford}
					<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
						<p class="text-sm text-amber-300">
							<FluentWarning20Filled class="inline size-4" />
							You need more resources to train this unit. Visit the market or work at a factory to earn resources.
						</p>
					</div>
				{/if}
			</form>
		</div>

		<div class="space-y-4">
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<h2 class="text-lg font-semibold text-white mb-4">Your Battalions ({data.units.length})</h2>

				{#if data.units.length === 0}
					<div class="text-center py-8">
						<div class="size-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
							<FluentShield20Filled class="size-8 text-gray-400" />
						</div>
						<p class="text-gray-400 text-sm">No units yet</p>
						<p class="text-gray-500 text-xs">Train your first unit!</p>
					</div>
				{:else}
					<div class="space-y-3 max-h-[600px] overflow-y-auto">
						{#each data.units as unit}
							<div class="bg-slate-700/50 rounded-lg border border-slate-600/30 p-4 space-y-3">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-2">
										<span class="text-2xl">{unitTypeIcons[unit.unitType] || "⚔️"}</span>
										<div>
											<h3 class="font-semibold text-white">{unit.name}</h3>
											<p class="text-xs text-gray-400">
												{unit.unitType.replace(/_/g, " ").toUpperCase()}
											</p>
											<p class="text-xs text-gray-500">{unit.regionName}</p>
										</div>
									</div>
									<div class="badge {unit.isTraining ? 'badge-warning' : 'badge-success'} badge-sm">
										{unit.isTraining ? "Training" : "Ready"}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-2 text-xs">
									<div class="bg-slate-800/50 rounded p-2">
										<p class="text-gray-400">ATK</p>
										<p class="font-bold text-white">{unit.attack}</p>
									</div>
									<div class="bg-slate-800/50 rounded p-2">
										<p class="text-gray-400">DEF</p>
										<p class="font-bold text-white">{unit.defense}</p>
									</div>
									<div class="bg-slate-800/50 rounded p-2">
										<p class="text-gray-400">ORG</p>
										<p class="font-bold text-white">{unit.organization}%</p>
									</div>
									<div class="bg-slate-800/50 rounded p-2">
										<p class="text-gray-400">SUP</p>
										<p class="font-bold text-white">{unit.supplyLevel}%</p>
									</div>
								</div>

								{#if unit.isTraining && unit.trainingCompletesAt}
									{@const remaining = new Date(unit.trainingCompletesAt).getTime() - Date.now()}
									{@const isComplete = remaining <= 0}

									{#if isComplete}
										<form method="POST" action="?/completeTraining" use:enhance>
											<input type="hidden" name="unitId" value={unit.id} />
											<button type="submit" class="btn btn-sm btn-success w-full gap-2">
												<FluentCheckmark20Filled class="size-4" />
												Complete Training
											</button>
										</form>
									{:else}
										{@const hours = Math.floor(remaining / 3600000)}
										{@const minutes = Math.floor((remaining % 3600000) / 60000)}
										<div class="text-center py-2 bg-amber-600/10 rounded border border-amber-500/20">
											<p class="text-xs text-gray-400">Completes in</p>
											<p class="font-bold text-amber-400">
												{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
											</p>
										</div>
									{/if}
								{:else}
									<button
										type="button"
										onclick={() => showDisbandModal(unit.id)}
										class="btn btn-sm btn-error btn-outline w-full gap-2"
									>
										<FluentDelete20Filled class="size-4" />
										Disband
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Disband Confirmation Modal -->
<Modal bind:open={disbandModalOpen} title="Confirm Disbanding" size="small">
	<div class="space-y-4">
		<p class="text-gray-300">
			Are you sure you want to disband this unit? This action cannot be undone and you will not receive any refunds.
		</p>
		<div class="flex gap-3 justify-end">
			<button type="button" onclick={() => (disbandModalOpen = false)} class="btn btn-ghost"> Cancel </button>
			<form
				method="POST"
				action="?/disbandUnit"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === "success") {
							disbandModalOpen = false;
							unitToDisband = null;
						}
					};
				}}
			>
				<input type="hidden" name="unitId" value={unitToDisband} />
				<button type="submit" class="btn btn-error gap-2">
					<FluentDelete20Filled class="size-4" />
					Disband Unit
				</button>
			</form>
		</div>
	</div>
</Modal>
