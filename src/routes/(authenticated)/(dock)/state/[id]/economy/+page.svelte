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
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentMoney20Filled class="size-8 text-green-400" />
				Economy Ministry
			</h1>
			<p class="text-gray-400 mt-2">Manage state finances and infrastructure for {data.state.name}</p>
			{#if data.isPresident}
				<p class="text-xs text-yellow-400 mt-1">👑 Accessing as President</p>
			{/if}
		</div>

		<a
			href="/state/{data.state.id}"
			class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
		>
			Back to State
		</a>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">State Treasury</p>
					<p class="text-lg font-bold text-white">${(data.treasury.balance / 100).toFixed(2)}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
					<FluentFlash20Filled class="size-5 text-amber-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Power Output</p>
					<p class="text-lg font-bold text-white">{totalPowerOutput} MW</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentBuildingFactory20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Power Plants</p>
					<p class="text-lg font-bold text-white">{data.powerPlants.length}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<span class="text-lg font-bold text-purple-400">{energyUtilization}%</span>
				</div>
				<div>
					<p class="text-xs text-gray-400">Energy Utilization</p>
					<p class="text-xs text-gray-500">{data.energyInfo.usedProduction}/{data.energyInfo.totalProduction} MW</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Treasury Overview -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentMoney20Filled class="size-5 text-green-400" />
			<h2 class="text-lg font-semibold text-white">Treasury Overview</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-slate-700/30 rounded-lg p-4">
				<p class="text-xs text-gray-400 mb-1">Current Balance</p>
				<p class="text-2xl font-bold text-green-400">${(data.treasury.balance / 100).toLocaleString()}</p>
			</div>
			<div class="bg-slate-700/30 rounded-lg p-4">
				<p class="text-xs text-gray-400 mb-1">Total Collected</p>
				<p class="text-2xl font-bold text-blue-400">${(data.treasury.totalCollected / 100).toLocaleString()}</p>
			</div>
			<div class="bg-slate-700/30 rounded-lg p-4">
				<p class="text-xs text-gray-400 mb-1">Total Spent</p>
				<p class="text-2xl font-bold text-red-400">${(data.treasury.totalSpent / 100).toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3">
			<p class="text-xs text-blue-300">
				<FluentWarning20Filled class="inline size-3" />
				Treasury funds come from taxes, state exports, and visa fees
			</p>
		</div>
	</div>

	<!-- Power Plant Construction -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentFlash20Filled class="size-5 text-amber-400" />
			<h2 class="text-lg font-semibold text-white">Power Infrastructure</h2>
		</div>

		<!-- Build Power Plant Form -->
		<form method="POST" action="?/buildPowerPlant" use:enhance class="space-y-4">
			<div>
				<label for="plantType" class="block text-sm font-medium text-gray-300 mb-2"> Plant Type </label>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
					{#each Object.entries(plantTypeInfo) as [type, info]}
						<button
							type="button"
							class="p-3 rounded-lg border-2 text-left transition-all {selectedPlantType === type
								? 'bg-amber-600/20 border-amber-500/50'
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
							onclick={() => (selectedPlantType = type)}
						>
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xl">{info.icon}</span>
								<span class="font-bold text-white capitalize">{type}</span>
							</div>
							<p class="text-xs text-gray-400">{info.output} MW</p>
							<p class="text-xs text-green-400 font-bold">${(info.cost / 100).toLocaleString()}</p>
						</button>
					{/each}
				</div>
				<input type="hidden" name="plantType" value={selectedPlantType} />
			</div>

			<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
				<p class="text-sm font-semibold text-white mb-1">{selectedPlantInfo.description}</p>
				<div class="grid grid-cols-2 gap-2 text-xs mt-2">
					<div>
						<span class="text-gray-400">Power Output:</span>
						<span class="font-bold text-amber-400 ml-1">{selectedPlantInfo.output} MW</span>
					</div>
					<div>
						<span class="text-gray-400">Construction Cost:</span>
						<span class="font-bold text-green-400 ml-1">${(selectedPlantInfo.cost / 100).toLocaleString()}</span>
					</div>
				</div>
			</div>

			<div>
				<label for="plantName" class="block text-sm font-medium text-gray-300 mb-2"> Plant Name </label>
				<input
					type="text"
					id="plantName"
					name="name"
					bind:value={plantName}
					placeholder="e.g., Central Power Station"
					maxlength="100"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-amber-500/50"
				/>
			</div>

			<button
				type="submit"
				disabled={!canBuildPlant}
				class="btn w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if canBuildPlant}
					<FluentBuildingFactory20Filled class="size-5" />
					Construct Plant - ${(selectedPlantInfo.cost / 100).toLocaleString()}
				{:else if data.treasury.balance < selectedPlantInfo.cost}
					<FluentWarning20Filled class="size-5" />
					Insufficient Treasury Funds
				{:else}
					<FluentWarning20Filled class="size-5" />
					Enter Plant Name (min 3 characters)
				{/if}
			</button>
		</form>

		<!-- Existing Power Plants -->
		{#if data.powerPlants.length > 0}
			<div class="border-t border-white/5 pt-4 space-y-3">
				<h3 class="text-sm font-semibold text-gray-400 uppercase">Existing Plants ({data.powerPlants.length})</h3>
				<div class="grid gap-3">
					{#each data.powerPlants as plant}
						<div
							class="bg-slate-700/30 rounded-lg p-4 border-2 {plant.isOperational
								? 'border-green-500/30'
								: 'border-red-500/30'}"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="text-3xl">{plantTypeInfo[plant.plantType].icon}</span>
									<div>
										<p class="font-bold text-white">{plant.name}</p>
										<p class="text-sm text-gray-400 capitalize">
											{plant.plantType} Plant - {plant.powerOutput} MW
										</p>
										<p class="text-xs text-gray-500">
											Built {new Date(plant.builtAt).toLocaleDateString()} • Cost: ${(
												Number(plant.constructionCost) / 100
											).toLocaleString()}
										</p>
									</div>
								</div>
								<span
									class="badge {plant.isOperational
										? 'bg-green-600/20 text-green-300 border-green-500/30'
										: 'bg-red-600/20 text-red-300 border-red-500/30'}"
								>
									{plant.isOperational ? "Operational" : "Offline"}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6 text-center">
				<FluentBuildingFactory20Filled class="size-12 text-gray-600 mx-auto mb-2" />
				<p class="text-gray-400 text-sm">No power plants built yet</p>
				<p class="text-gray-500 text-xs mt-1">Construct your first power plant to start generating energy</p>
			</div>
		{/if}
	</div>

	<!-- Info Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-green-600/10 border border-green-500/20 rounded-xl p-4">
			<FluentMoney20Filled class="inline size-4 text-green-400 mb-1" />
			<p class="text-xs text-green-300">Treasury funds are managed by the Economy Minister and President</p>
		</div>
		<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
			<FluentFlash20Filled class="inline size-4 text-amber-400 mb-1" />
			<p class="text-xs text-amber-300">Power plants provide energy for state factories and infrastructure</p>
		</div>
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<FluentBuildingFactory20Filled class="inline size-4 text-blue-400 mb-1" />
			<p class="text-xs text-blue-300">More power plants = more industrial capacity for your state</p>
		</div>
	</div>
</div>
