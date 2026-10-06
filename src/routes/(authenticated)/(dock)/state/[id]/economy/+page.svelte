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
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

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

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Ministry of Economy"
		subtitle={data.isPresident ? "👑 Accessing as President" : undefined}
		icon={FluentMoney20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-[#b9f29a]" />
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">State Treasury</p>
					<p class="text-lg font-bold font-mono text-[#f5efd8]">${(data.treasury.balance / 100).toFixed(2)}</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm flex items-center justify-center">
					<FluentFlash20Filled class="size-5 text-[#ffd35c]" />
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Power Output</p>
					<p class="text-lg font-bold text-[#f5efd8]">{totalPowerOutput} MW</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
					<FluentBuildingFactory20Filled class="size-5 text-[#b3dcff]" />
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Power Plants</p>
					<p class="text-lg font-bold text-[#f5efd8]">{data.powerPlants.length}</p>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm flex items-center justify-center">
					<span class="text-lg font-bold text-[#e3cbfb]">{energyUtilization}%</span>
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Energy Utilization</p>
					<p class="text-xs text-[#a8a083]">{data.energyInfo.usedProduction}/{data.energyInfo.totalProduction} MW</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Treasury Overview -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="section-title">
			<FluentMoney20Filled class="size-5 text-[#f2b01e]" />
			Treasury Overview
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="panel-muted rounded-sm p-4">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Current Balance</p>
				<p class="text-2xl font-bold font-mono text-[#ffd35c]">${(data.treasury.balance / 100).toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-4">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Total Collected</p>
				<p class="text-2xl font-bold font-mono text-[#b3dcff]">
					${(data.treasury.totalCollected / 100).toLocaleString()}
				</p>
			</div>
			<div class="panel-muted rounded-sm p-4">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Total Spent</p>
				<p class="text-2xl font-bold font-mono text-red-300">${(data.treasury.totalSpent / 100).toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-3">
			<p class="text-xs text-[#b3dcff]">
				<FluentWarning20Filled class="inline size-3" />
				Treasury funds come from taxes, state exports, and visa fees
			</p>
		</div>
	</div>

	<!-- State Resources -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div class="section-title">
				<FluentBox20Filled class="size-5 text-[#f2b01e]" />
				State Resources
			</div>
			<Button
				href="/state/{data.state.id}/market"
				variant="soft-purple"
				size="sm"
				icon={FluentCart20Filled}
				iconRight={FluentArrowRight20Filled}
			>
				Gov. Market
			</Button>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
			{#each allResources as resource}
				{@const quantity = resourceMap.get(resource) || 0}
				<div class="panel-muted rounded-sm p-4 text-center space-y-2">
					<ResourceIcon name={resource} class="size-7 mx-auto" />
					<p class="text-xs font-medium capitalize text-[#a8a083]">{resource}</p>
					<p class="text-lg font-bold {quantity > 0 ? 'text-[#e3cbfb]' : 'text-[#a8a083]'}">{quantity}</p>
				</div>
			{/each}
		</div>
	</div>
</PageContainer>
