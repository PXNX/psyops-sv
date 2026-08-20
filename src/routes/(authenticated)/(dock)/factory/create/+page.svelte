<!-- src/routes/factory/create/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentError20Filled from "~icons/fluent/error-circle-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentDatabase20Filled from "~icons/fluent/database-20-filled";
	import FluentReceipt20Filled from "~icons/fluent/receipt-20-filled";

	// Fluent Emoji icons
	import PickaxeEmoji from "~icons/fluent-emoji/pick";
	import HammerWrenchEmoji from "~icons/fluent-emoji/hammer-and-wrench";
	import GemStoneEmoji from "~icons/fluent-emoji/gem-stone";
	import OrangeCircleEmoji from "~icons/fluent-emoji/orange-circle";
	import BlackCircleEmoji from "~icons/fluent-emoji/black-circle";
	import WoodEmoji from "~icons/fluent-emoji/wood";
	import HammerEmoji from "~icons/fluent-emoji/hammer";
	import FireEmoji from "~icons/fluent-emoji/fire";

	import BombEmoji from "~icons/fluent-emoji/bomb";
	import AutomobileEmoji from "~icons/fluent-emoji/automobile";
	import FireworksEmoji from "~icons/fluent-emoji/fireworks";

	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import BackLink from "$lib/component/ui/BackLink.svelte";

	let { data } = $props();

	let selectedFactoryType = $state("mine");
	let selectedOutput = $state("");
	let factoryName = $state("");
	let maxWorkers = $state(10);
	let workerWage = $state(1500);

	const COOLDOWN_DAYS = 7;

	const factoryTypes = [
		{
			value: "mine",
			label: "Mine",
			icon: PickaxeEmoji,
			desc: "Extract raw resources",
			costs: { currency: 50000, energy: 50 }
		},
		{
			value: "refinery",
			label: "Refinery",
			icon: HammerWrenchEmoji,
			desc: "Process raw materials",
			costs: { currency: 50000, energy: 50 }
		},
		{
			value: "armaments",
			label: "Armaments",
			icon: FluentFactory20Filled,
			desc: "Manufacture weapons",
			costs: { currency: 50000, energy: 50, iron: 100, steel: 50, gunpowder: 25 }
		}
	];

	const resourceOutputs = [
		{ value: "iron", label: "Iron", icon: GemStoneEmoji },
		{ value: "copper", label: "Copper", icon: OrangeCircleEmoji },
		{ value: "coal", label: "Coal", icon: BlackCircleEmoji },
		{ value: "wood", label: "Wood", icon: WoodEmoji }
	];

	const refineryOutputs = [
		{ value: "steel", label: "Steel", icon: HammerEmoji },
		{ value: "gunpowder", label: "Gunpowder", icon: FireEmoji }
	];

	const productOutputs = [
		{ value: "rifles", label: "Rifles", icon: FluentFactory20Filled },
		{ value: "ammunition", label: "Ammunition", icon: FluentFactory20Filled },
		{ value: "artillery", label: "Artillery", icon: BombEmoji },
		{ value: "vehicles", label: "Vehicles", icon: AutomobileEmoji },
		{ value: "explosives", label: "Explosives", icon: FireworksEmoji }
	];

	const selectedFactoryTypeData = $derived(factoryTypes.find((t) => t.value === selectedFactoryType));
	const regionResources = $derived(data.region?.resources || []);
	const isOnCooldown = $derived(data.isOnCooldown);

	const hasEnoughCurrency = $derived(
		selectedFactoryTypeData ? data.userBalance >= selectedFactoryTypeData.costs.currency : false
	);
	const hasEnoughEnergy = $derived.by(() => {
		if (!data.stateEnergy || !selectedFactoryTypeData) return false;
		return data.stateEnergy.totalProduction - data.stateEnergy.usedProduction >= selectedFactoryTypeData.costs.energy;
	});

	const canResourceBeMined = $derived.by(() => {
		if (selectedFactoryType !== "mine" || !selectedOutput) return false;
		return regionResources.some((r) => r.resourceType === selectedOutput && r.amount > 0);
	});

	const canCreate = $derived(
		hasEnoughCurrency &&
			hasEnoughEnergy &&
			!isOnCooldown &&
			factoryName.trim() &&
			data.region &&
			data.companyId &&
			(selectedFactoryType !== "mine" || canResourceBeMined) &&
			selectedOutput
	);

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return `${days}d ${hours}h`;
	}

	function getResourceIcon(resourceType: string) {
		const iconMap: Record<string, any> = {
			iron: GemStoneEmoji,
			copper: OrangeCircleEmoji,
			coal: BlackCircleEmoji,
			wood: WoodEmoji,
			steel: HammerEmoji,
			gunpowder: FireEmoji,
			oil: BlackCircleEmoji,
			aluminium: GemStoneEmoji,
			rubber: BlackCircleEmoji,
			tungsten: GemStoneEmoji,
			chromium: GemStoneEmoji
		};
		return iconMap[resourceType] || GemStoneEmoji;
	}

	// Prepare costs and available resources for ResourceRequirements component
	const factoryCosts = $derived.by(() => {
		if (!selectedFactoryTypeData) return {};
		return selectedFactoryTypeData.costs;
	});

	const availableResources = $derived.by(() => {
		const available: Record<string, number> = {
			currency: data.userBalance,
			energy: data.stateEnergy ? data.stateEnergy.totalProduction - data.stateEnergy.usedProduction : 0
		};

		// Add material resources from user's inventory
		if (data.userInventory) {
			Object.entries(data.userInventory).forEach(([resource, quantity]) => {
				available[resource] = quantity as number;
			});
		}

		return available;
	});
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<BackLink href="/production" />
		<div>
			<h1 class="text-3xl font-bold text-white">Create Factory</h1>
			<p class="text-gray-400">Establish a production facility in your region</p>
		</div>
	</div>

	{#if data.error}
		<!-- Error -->
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5">
			<div class="flex items-start gap-3">
				<FluentError20Filled class="size-6 text-red-400 shrink-0" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300">Cannot Create Factory</h3>
					<p class="text-red-200 text-sm">{data.error}</p>
					<div class="flex gap-2 mt-3">
						{#if data.error.includes("company")}
							<a href="/company/create" class="btn btn-sm bg-red-600/30 border-red-500/50 text-red-100">
								Create Company
							</a>
						{/if}
						<a href="/production" class="btn btn-sm bg-slate-700/50 border-slate-600/30 text-gray-300"> Go Back </a>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Cooldown -->
		{#if isOnCooldown && data.cooldownEndsAt}
			<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
				<div class="flex items-start gap-3">
					<FluentError20Filled class="size-5 text-red-400 shrink-0" />
					<div>
						<h3 class="font-semibold text-red-300">Cooldown Active</h3>
						<p class="text-red-200 text-sm mt-1">
							Next factory available in: <strong>{formatTimeRemaining(data.cooldownEndsAt)}</strong>
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Regional Information -->
		{#if data.region}
			<div class="grid md:grid-cols-2 gap-4">
				<!-- Available Regional Resources -->
				<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentDatabase20Filled class="size-6 text-purple-400" />
						<div>
							<h2 class="font-semibold text-white">Regional Resources</h2>
							<p class="text-xs text-gray-400">{data.region.name}</p>
						</div>
					</div>

					{#if regionResources.length > 0}
						<div class="space-y-2">
							{#each regionResources as resource}
								<div class="flex items-center justify-between bg-slate-700/30 rounded-lg p-2.5">
									<div class="flex items-center gap-2">
										<svelte:component this={getResourceIcon(resource.resourceType)} class="size-5" />
										<span class="text-sm font-medium text-white capitalize">{resource.resourceType}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-bold text-purple-400">{resource.amount}%</span>
										<span class="text-xs text-gray-500">yield</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-3">
							<p class="text-xs text-amber-300">No natural resources available in this region</p>
						</div>
					{/if}
				</div>

				<!-- Regional Taxes -->
				<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentReceipt20Filled class="size-6 text-amber-400" />
						<div>
							<h2 class="font-semibold text-white">Regional Taxes</h2>
							<p class="text-xs text-gray-400">Applied to operations</p>
						</div>
					</div>

					<div class="space-y-2.5">
						<div class="bg-slate-700/30 rounded-lg p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-gray-300">Income Tax</p>
								<p class="text-lg font-bold text-amber-400">{data.regionalTaxes?.incomeTax || 0}%</p>
							</div>
							<p class="text-xs text-gray-500">On factory profits</p>
						</div>

						<div class="bg-slate-700/30 rounded-lg p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-gray-300">Sales Tax</p>
								<p class="text-lg font-bold text-amber-400">{data.regionalTaxes?.salesTax || 0}%</p>
							</div>
							<p class="text-xs text-gray-500">On product sales</p>
						</div>

						<div class="bg-slate-700/30 rounded-lg p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-gray-300">Property Tax</p>
								<p class="text-lg font-bold text-amber-400">{data.regionalTaxes?.propertyTax || 0}%</p>
							</div>
							<p class="text-xs text-gray-500">Annual maintenance</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Form -->
		<form method="POST" use:enhance class="space-y-5">
			<!-- Name -->
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2"> Factory Name </label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={factoryName}
					placeholder="e.g., Steel Works #1"
					maxlength="100"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
					disabled={isOnCooldown}
				/>
			</div>

			<!-- Type -->
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentBox20Filled class="size-5 text-purple-400" />
					<h2 class="font-semibold text-white">Factory Type</h2>
				</div>

				<div class="grid grid-cols-3 gap-3">
					{#each factoryTypes as type}
						<button
							type="button"
							class="p-3 rounded-lg border-2 transition-all {selectedFactoryType === type.value
								? 'bg-purple-600/20 border-purple-500/50'
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
							onclick={() => {
								selectedFactoryType = type.value;
								selectedOutput = "";
							}}
							disabled={isOnCooldown}
						>
							<type.icon class="size-8 mb-1 mx-auto" />
							<h3 class="font-bold text-white text-sm">{type.label}</h3>
							<p class="text-xs text-gray-400">{type.desc}</p>
						</button>
					{/each}
				</div>
				<input type="hidden" name="factoryType" value={selectedFactoryType} />
			</div>

			<!-- Output -->
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 space-y-3">
				<h2 class="font-semibold text-white">
					{selectedFactoryType === "mine"
						? "Resource to Extract"
						: selectedFactoryType === "refinery"
							? "Product to Refine"
							: "Armament to Produce"}
				</h2>

				<div class="grid grid-cols-4 gap-2">
					{#if selectedFactoryType === "mine"}
						{#each resourceOutputs as output}
							{@const canMine = regionResources.some((r) => r.resourceType === output.value && r.amount > 0)}
							<button
								type="button"
								class="p-2 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								class:opacity-50={!canMine}
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown || !canMine}
								title={canMine ? `Available in this region` : `Not available in this region`}
							>
								<output.icon class="size-6 mx-auto" />
								<div class="text-xs text-white mt-1">{output.label}</div>
								{#if canMine}
									<div class="text-xs text-green-400 mt-0.5">✓</div>
								{/if}
							</button>
						{/each}
					{:else if selectedFactoryType === "refinery"}
						{#each refineryOutputs as output}
							<button
								type="button"
								class="p-2 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown}
							>
								<svelte:component this={output.icon} class="size-6 mx-auto" />
								<div class="text-xs text-white mt-1">{output.label}</div>
							</button>
						{/each}
					{:else}
						{#each productOutputs as output}
							<button
								type="button"
								class="p-2 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown}
							>
								<svelte:component this={output.icon} class="size-6 mx-auto" />
								<div class="text-xs text-white mt-1">{output.label}</div>
							</button>
						{/each}
					{/if}
				</div>
				<input type="hidden" name="output" value={selectedOutput} />
			</div>

			<!-- Workers -->
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentPeople20Filled class="size-5 text-purple-400" />
					<h2 class="font-semibold text-white">Workers</h2>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm text-gray-300 mb-2">Max Workers: {maxWorkers}</label>
						<input
							type="range"
							name="maxWorkers"
							min="5"
							max="50"
							step="5"
							bind:value={maxWorkers}
							class="range range-primary"
							disabled={isOnCooldown}
						/>
						<div class="flex justify-between text-xs text-gray-500 mt-1">
							<span>5</span>
							<span>50</span>
						</div>
					</div>
					<div>
						<label class="block text-sm text-gray-300 mb-2">Wage: {workerWage.toLocaleString()}</label>
						<input
							type="range"
							name="workerWage"
							min="1000"
							max="5000"
							step="100"
							bind:value={workerWage}
							class="range range-primary"
							disabled={isOnCooldown}
						/>
						<div class="flex justify-between text-xs text-gray-500 mt-1">
							<span>1k</span>
							<span>5k</span>
						</div>
					</div>
				</div>

				<div class="bg-slate-700/30 rounded-lg p-3 mt-2">
					<p class="text-xs text-gray-400 mb-1">Estimated monthly payroll:</p>
					<p class="text-lg font-bold text-white">{(maxWorkers * workerWage).toLocaleString()}</p>
				</div>
			</div>

			<!-- Construction Costs Summary -->
			{#if selectedFactoryTypeData}
				<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentMoney20Filled class="size-6 text-purple-400" />
						<h2 class="text-xl font-bold text-white">Construction Requirements</h2>
					</div>

					<ResourceRequirements costs={factoryCosts} available={availableResources} />
				</div>
			{/if}

			<!-- Submit -->
			<div class="flex gap-3">
				<a href="/production" class="btn flex-1 bg-slate-700/50 border-slate-600/30 text-gray-300"> Cancel </a>
				<button
					type="submit"
					disabled={!canCreate}
					class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white gap-2 disabled:opacity-50"
				>
					<FluentCheckmark20Filled class="size-5" />
					Create Factory
				</button>
			</div>
		</form>
	{/if}
</div>
