<!-- src/routes/(authenticated)/(dock)/state/[id]/economy/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentBuildingFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import ResourceIcon from "$lib/component/ResourceIcon.svelte";
	import { buttonClass } from "$lib/component/ui/styles";

	let { data } = $props();

	// Power plant form state
	let selectedPlantType = $state("coal");
	let plantName = $state("");

	const plantTypeInfo: Record<string, { icon: string; output: number; cost: number; description: string }> = {
		coal: {
			icon: "🏭",
			output: 100,
			cost: 500000,
			description: "Basic coal-fired power plant. Reliable but polluting."
		},
		gas: {
			icon: "🔥",
			output: 150,
			cost: 750000,
			description: "Natural gas plant. Efficient and cleaner than coal."
		},
		nuclear: {
			icon: "⚛️",
			output: 500,
			cost: 2500000,
			description: "Nuclear reactor. Massive output but very expensive."
		},
		solar: {
			icon: "☀️",
			output: 50,
			cost: 400000,
			description: "Solar farm. Clean energy but weather-dependent."
		},
		wind: {
			icon: "💨",
			output: 75,
			cost: 600000,
			description: "Wind turbines. Renewable but variable output."
		},
		hydro: {
			icon: "🌊",
			output: 200,
			cost: 1000000,
			description: "Hydroelectric dam. Excellent output and reliability."
		}
	};

	const selectedPlantInfo = $derived(plantTypeInfo[selectedPlantType]);
	const canBuildPlant = $derived(data.treasury.balance >= selectedPlantInfo.cost && plantName.trim().length >= 3);

	const totalPowerOutput = $derived(
		data.powerPlants.reduce((sum, plant) => sum + (plant.isOperational ? plant.powerOutput : 0), 0)
	);

	const energyUtilization = $derived(
		data.energyInfo.totalProduction > 0
			? Math.round((data.energyInfo.usedProduction / data.energyInfo.totalProduction) * 100)
			: 0
	);

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";

	const allResources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}" class="text-sm text-[#a89e8e] hover:text-[#e6a527] transition-colors">
			{data.state.name}
		</a>
		<h1 class="text-3xl font-bold text-[#fff7e8] flex items-center gap-3 mt-1">
			<FluentMoney20Filled class="size-8 text-[#e6a527]" />
			Ministry of Economy
		</h1>
		{#if data.isPresident}
			<p class="text-xs text-[#f7c56b] mt-1">👑 Accessing as President</p>
		{/if}
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-[#c6dfbf]" />
				</div>
				<div>
					<p class="text-xs text-[#a89e8e]">State Treasury</p>
					<p class="text-lg font-bold text-[#fff7e8]">${(data.treasury.balance / 100).toFixed(2)}</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm flex items-center justify-center">
					<FluentFlash20Filled class="size-5 text-[#f7c56b]" />
				</div>
				<div>
					<p class="text-xs text-[#a89e8e]">Power Output</p>
					<p class="text-lg font-bold text-[#fff7e8]">{totalPowerOutput} MW</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm flex items-center justify-center">
					<FluentBuildingFactory20Filled class="size-5 text-[#b7d0e6]" />
				</div>
				<div>
					<p class="text-xs text-[#a89e8e]">Power Plants</p>
					<p class="text-lg font-bold text-[#fff7e8]">{data.powerPlants.length}</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm flex items-center justify-center">
					<span class="text-lg font-bold text-[#d5c4df]">{energyUtilization}%</span>
				</div>
				<div>
					<p class="text-xs text-[#a89e8e]">Energy Utilization</p>
					<p class="text-xs text-[#a89e8e]">{data.energyInfo.usedProduction}/{data.energyInfo.totalProduction} MW</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Treasury Overview -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="section-title">
			<FluentMoney20Filled class="size-5 text-[#e6a527]" />
			Treasury Overview
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="panel-muted rounded-sm p-4">
				<p class="text-xs text-[#a89e8e] mb-1">Current Balance</p>
				<p class="text-2xl font-bold text-[#f7c56b]">${(data.treasury.balance / 100).toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-4">
				<p class="text-xs text-[#a89e8e] mb-1">Total Collected</p>
				<p class="text-2xl font-bold text-[#b7d0e6]">${(data.treasury.totalCollected / 100).toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-4">
				<p class="text-xs text-[#a89e8e] mb-1">Total Spent</p>
				<p class="text-2xl font-bold text-red-400">${(data.treasury.totalSpent / 100).toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-[#315d8d]/10 border border-[#7ba0c8]/25 rounded-sm p-3">
			<p class="text-xs text-[#b7d0e6]">
				<FluentWarning20Filled class="inline size-3" />
				Treasury funds come from taxes, state exports, and visa fees
			</p>
		</div>
	</div>

	<!-- State Resources -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="flex items-center justify-between">
			<div class="section-title">
				<FluentBox20Filled class="size-5 text-[#e6a527]" />
				State Resources
			</div>
			<a href="/state/{data.state.id}/market" class={buttonClass({ variant: "soft-purple", size: "sm" })}>
				<FluentCart20Filled class="size-4" />
				Gov. Market
				<FluentArrowRight20Filled class="size-4" />
			</a>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
			{#each allResources as resource}
				{@const quantity = resourceMap.get(resource) || 0}
				<div class="panel-muted rounded-sm p-4 text-center space-y-2">
					<ResourceIcon name={resource} class="size-7 mx-auto" />
					<p class="text-xs font-medium capitalize text-[#a89e8e]">{resource}</p>
					<p class="text-lg font-bold {quantity > 0 ? 'text-[#d5c4df]' : 'text-[#a89e8e]'}">{quantity}</p>
				</div>
			{/each}
		</div>
	</div>
</div>
