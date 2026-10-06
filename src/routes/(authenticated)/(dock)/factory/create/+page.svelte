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

	// Resource/product icons
	import GameIconsOre from "~icons/game-icons/ore";
	import GameIconsMinerals from "~icons/game-icons/minerals";
	import GameIconsMetalBar from "~icons/game-icons/metal-bar";
	import GameIconsPowderBag from "~icons/game-icons/powder-bag";
	import GameIconsWoodPile from "~icons/game-icons/wood-pile";
	import GameIconsCoalPile from "~icons/game-icons/coal-pile";
	import GameIconsRifle from "~icons/game-icons/rifle";
	import GameIconsBullets from "~icons/game-icons/bullets";
	import GameIconsArtilleryShell from "~icons/game-icons/artillery-shell";
	import GameIconsTruck from "~icons/game-icons/truck";
	import GameIconsDynamite from "~icons/game-icons/dynamite";

	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { resourceColors } from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

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
		{ value: "iron", label: "Iron", icon: GameIconsOre, color: resourceColors.iron },
		{ value: "copper", label: "Copper", icon: GameIconsMinerals, color: resourceColors.copper },
		{ value: "coal", label: "Coal", icon: GameIconsCoalPile, color: resourceColors.coal },
		{ value: "wood", label: "Wood", icon: GameIconsWoodPile, color: resourceColors.wood }
	];

	const refineryOutputs = [
		{ value: "steel", label: "Steel", icon: GameIconsMetalBar, color: resourceColors.steel },
		{ value: "gunpowder", label: "Gunpowder", icon: GameIconsPowderBag, color: resourceColors.gunpowder }
	];

	const productOutputs = [
		{ value: "rifles", label: "Rifles", icon: GameIconsRifle, color: resourceColors.rifles },
		{ value: "ammunition", label: "Ammunition", icon: GameIconsBullets, color: resourceColors.ammunition },
		{ value: "artillery", label: "Artillery", icon: GameIconsArtilleryShell, color: resourceColors.artillery },
		{ value: "vehicles", label: "Vehicles", icon: GameIconsTruck, color: resourceColors.vehicles },
		{ value: "explosives", label: "Explosives", icon: GameIconsDynamite, color: resourceColors.explosives }
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
			iron: GameIconsOre,
			copper: GameIconsMinerals,
			coal: GameIconsCoalPile,
			wood: GameIconsWoodPile,
			steel: GameIconsMetalBar,
			gunpowder: GameIconsPowderBag,
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

<PageContainer maxWidth="3xl">
	<PageHeader
		title="Create Factory"
		subtitle="Establish a production facility in your region"
		icon={FluentFactory20Filled}
		backHref="/production"
		backLabel="Production"
	/>

	{#if data.error}
		<!-- Error -->
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex items-start gap-3">
				<FluentError20Filled class="size-6 text-red-400 shrink-0" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300">Cannot Create Factory</h3>
					<p class="text-red-300 text-sm">{data.error}</p>
					<div class="flex gap-2 mt-3">
						{#if data.error.includes("company")}
							<Button variant="soft-red" size="sm" href="/company/create">Create Company</Button>
						{/if}
						<Button variant="secondary" size="sm" href="/production">Go Back</Button>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Cooldown -->
		{#if isOnCooldown && data.cooldownEndsAt}
			<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4">
				<div class="flex items-start gap-3">
					<FluentError20Filled class="size-5 text-red-400 shrink-0" />
					<div>
						<h3 class="font-semibold text-red-300">Cooldown Active</h3>
						<p class="text-red-300 text-sm mt-1">
							Next factory available in: <strong class="font-mono">{formatTimeRemaining(data.cooldownEndsAt)}</strong>
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Regional Information -->
		{#if data.region}
			<div class="grid md:grid-cols-2 gap-4">
				<!-- Available Regional Resources -->
				<div class="panel rounded-sm p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentDatabase20Filled class="size-6 text-[#c08cf0]" />
						<div>
							<h2 class="font-semibold text-[#f5efd8]">Regional Resources</h2>
							<p class="text-xs text-[#a8a083]">{data.region.name}</p>
						</div>
					</div>

					{#if regionResources.length > 0}
						<div class="space-y-2">
							{#each regionResources as resource}
								<div class="flex items-center justify-between panel-muted rounded-sm p-2.5">
									<div class="flex items-center gap-2">
										<svelte:component
											this={getResourceIcon(resource.resourceType)}
											class="size-5 {resourceColors[resource.resourceType] ?? ''}"
										/>
										<span class="text-sm font-medium text-[#f5efd8] capitalize">{resource.resourceType}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-bold text-[#e3cbfb]">{resource.amount}%</span>
										<span class="text-xs text-[#a8a083]">yield</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3">
							<p class="text-xs text-[#ffd35c]">No natural resources available in this region</p>
						</div>
					{/if}
				</div>

				<!-- Regional Taxes -->
				<div class="panel rounded-sm p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentReceipt20Filled class="size-6 text-[#ffd35c]" />
						<div>
							<h2 class="font-semibold text-[#f5efd8]">Regional Taxes</h2>
							<p class="text-xs text-[#a8a083]">Applied to operations</p>
						</div>
					</div>

					<div class="space-y-2.5">
						<div class="panel-muted rounded-sm p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-[#e6ddbf]">Income Tax</p>
								<p class="text-lg font-bold text-[#ffd35c]">{data.regionalTaxes?.incomeTax || 0}%</p>
							</div>
							<p class="text-xs text-[#a8a083]">On factory profits</p>
						</div>

						<div class="panel-muted rounded-sm p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-[#e6ddbf]">Sales Tax</p>
								<p class="text-lg font-bold text-[#ffd35c]">{data.regionalTaxes?.salesTax || 0}%</p>
							</div>
							<p class="text-xs text-[#a8a083]">On product sales</p>
						</div>

						<div class="panel-muted rounded-sm p-3">
							<div class="flex items-center justify-between mb-1">
								<p class="text-sm font-medium text-[#e6ddbf]">Property Tax</p>
								<p class="text-lg font-bold text-[#ffd35c]">{data.regionalTaxes?.propertyTax || 0}%</p>
							</div>
							<p class="text-xs text-[#a8a083]">Annual maintenance</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Form -->
		<form method="POST" use:enhance class="space-y-5">
			<!-- Name -->
			<div class="panel rounded-sm p-4">
				<label for="name" class="field-label"> Factory Name </label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={factoryName}
					placeholder="e.g., Steel Works #1"
					maxlength="100"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					disabled={isOnCooldown}
				/>
			</div>

			<!-- Type -->
			<div class="panel rounded-sm p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentBox20Filled class="size-5 text-[#c08cf0]" />
					<h2 class="font-semibold text-[#f5efd8]">Factory Type</h2>
				</div>

				<div class="grid grid-cols-3 gap-3">
					{#each factoryTypes as type}
						<button
							type="button"
							class="p-3 rounded-sm border transition-all {selectedFactoryType === type.value
								? 'bg-[#f2b01e]/12 border-[#f2b01e]/55'
								: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#c8b47a]/30'}"
							onclick={() => {
								selectedFactoryType = type.value;
								selectedOutput = "";
							}}
							disabled={isOnCooldown}
						>
							<type.icon class="size-8 mb-1 mx-auto" />
							<h3 class="font-bold text-[#f5efd8] text-sm">{type.label}</h3>
							<p class="text-xs text-[#a8a083]">{type.desc}</p>
						</button>
					{/each}
				</div>
				<input type="hidden" name="factoryType" value={selectedFactoryType} />
			</div>

			<!-- Output -->
			<div class="panel rounded-sm p-4 space-y-3">
				<h2 class="font-semibold text-[#f5efd8]">
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
								class="p-2 rounded-sm border transition-all {selectedOutput === output.value
									? 'bg-[#f2b01e]/12 border-[#f2b01e]/55'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15'}"
								class:opacity-50={!canMine}
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown || !canMine}
								title={canMine ? `Available in this region` : `Not available in this region`}
							>
								<output.icon class="size-6 mx-auto {output.color}" />
								<div class="text-xs text-[#f5efd8] mt-1">{output.label}</div>
								{#if canMine}
									<div class="text-xs text-[#6fd14a] mt-0.5">✓</div>
								{/if}
							</button>
						{/each}
					{:else if selectedFactoryType === "refinery"}
						{#each refineryOutputs as output}
							<button
								type="button"
								class="p-2 rounded-sm border transition-all {selectedOutput === output.value
									? 'bg-[#f2b01e]/12 border-[#f2b01e]/55'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown}
							>
								<svelte:component this={output.icon} class="size-6 mx-auto {output.color}" />
								<div class="text-xs text-[#f5efd8] mt-1">{output.label}</div>
							</button>
						{/each}
					{:else}
						{#each productOutputs as output}
							<button
								type="button"
								class="p-2 rounded-sm border transition-all {selectedOutput === output.value
									? 'bg-[#f2b01e]/12 border-[#f2b01e]/55'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={isOnCooldown}
							>
								<svelte:component this={output.icon} class="size-6 mx-auto {output.color}" />
								<div class="text-xs text-[#f5efd8] mt-1">{output.label}</div>
							</button>
						{/each}
					{/if}
				</div>
				<input type="hidden" name="output" value={selectedOutput} />
			</div>

			<!-- Workers -->
			<div class="panel rounded-sm p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentPeople20Filled class="size-5 text-[#5eaef5]" />
					<h2 class="font-semibold text-[#f5efd8]">Workers</h2>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="field-label">Max Workers: <span class="font-mono">{maxWorkers}</span></label>
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
						<div class="flex justify-between text-xs text-[#a8a083] mt-1">
							<span>5</span>
							<span>50</span>
						</div>
					</div>
					<div>
						<label class="field-label">Wage: <span class="font-mono">{workerWage.toLocaleString()}</span></label>
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
						<div class="flex justify-between text-xs text-[#a8a083] mt-1">
							<span>1k</span>
							<span>5k</span>
						</div>
					</div>
				</div>

				<div class="panel-muted rounded-sm p-3 mt-2">
					<p class="text-xs text-[#a8a083] mb-1">Estimated monthly payroll:</p>
					<p class="text-lg font-bold text-[#f5efd8] font-mono">{(maxWorkers * workerWage).toLocaleString()}</p>
				</div>
			</div>

			<!-- Construction Costs Summary -->
			{#if selectedFactoryTypeData}
				<div class="panel rounded-sm p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentMoney20Filled class="size-6 text-[#6fd14a]" />
						<h2 class="text-lg font-semibold text-[#f5efd8]">Construction Requirements</h2>
					</div>

					<ResourceRequirements costs={factoryCosts} available={availableResources} />
				</div>
			{/if}

			<!-- Submit -->
			<div class="flex gap-3">
				<Button variant="secondary" grow href="/production">Cancel</Button>
				<Button type="submit" variant="primary" grow disabled={!canCreate} icon={FluentCheckmark20Filled}>
					Create Factory
				</Button>
			</div>
		</form>
	{/if}
</PageContainer>
