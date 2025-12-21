<!-- src/routes/factory/create/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentFactory20Filled from "~icons/fluent/factory-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";

	let { data } = $props();

	let selectedRegion = $state("");
	let selectedFactoryType = $state("mine");
	let selectedOutput = $state("");
	let factoryName = $state("");
	let maxWorkers = $state(10);
	let workerWage = $state(1500);

	const FACTORY_COST = 50000;
	const COOLDOWN_DAYS = 7;

	const factoryTypes = [
		{ value: "mine", label: "Mine", icon: "⛏️", desc: "Extract raw resources from the region" },
		{ value: "refinery", label: "Refinery", icon: "⚙️", desc: "Process raw materials into refined resources" },
		{ value: "armaments", label: "Armaments", icon: "🔫", desc: "Manufacture weapons and military equipment" }
	];

	const resourceOutputs = [
		{ value: "iron", label: "Iron", icon: "⛏️" },
		{ value: "copper", label: "Copper", icon: "🔶" },
		{ value: "coal", label: "Coal", icon: "🪨" },
		{ value: "wood", label: "Wood", icon: "🪵" }
	];

	const refineryOutputs = [
		{ value: "steel", label: "Steel", icon: "⚙️", requires: ["iron", "coal"] },
		{ value: "gunpowder", label: "Gunpowder", icon: "💥", requires: ["coal"] }
	];

	const productOutputs = [
		{ value: "rifles", label: "Rifles", icon: "🔫" },
		{ value: "ammunition", label: "Ammunition", icon: "🔫" },
		{ value: "artillery", label: "Artillery", icon: "💣" },
		{ value: "vehicles", label: "Vehicles", icon: "🚗" },
		{ value: "explosives", label: "Explosives", icon: "💥" }
	];

	const selectedRegionData = $derived(data.regions.find((r) => r.id === parseInt(selectedRegion)));

	const availableResources = $derived(selectedRegionData?.resources || []);

	const canAfford = $derived(data.userBalance >= FACTORY_COST);
	const isOnCooldown = $derived(data.isOnCooldown);
	const hasEnoughEnergy = $derived.by(() => {
		if (!selectedRegionData) return false;
		const energyNeeded = 50; // Base energy requirement
		return data.stateEnergy.totalProduction - data.stateEnergy.usedProduction >= energyNeeded;
	});

	const canResourceBeMined = $derived.by(() => {
		if (selectedFactoryType !== "mine" || !selectedOutput || !selectedRegionData) return false;
		return availableResources.some((r) => r.resourceType === selectedOutput && r.remainingReserves > 0);
	});

	const canCreate = $derived(
		canAfford &&
			!isOnCooldown &&
			factoryName.trim() &&
			selectedRegion &&
			selectedFactoryType &&
			hasEnoughEnergy &&
			(selectedFactoryType !== "mine" || canResourceBeMined) &&
			((selectedFactoryType === "mine" && selectedOutput) ||
				(selectedFactoryType === "refinery" && selectedOutput) ||
				(selectedFactoryType === "armaments" && selectedOutput))
	);

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return `${days}d ${hours}h`;
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/production" class="btn btn-circle btn-ghost hover:bg-slate-700/50">←</a>
			<div>
				<h1 class="text-3xl font-bold text-white">Create Factory</h1>
				<p class="text-gray-400">Establish a new production facility</p>
			</div>
		</div>
	</div>

	<!-- Cost & Balance -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Balance</p>
					<p class="text-lg font-bold text-white">{data.userBalance.toLocaleString()}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentFactory20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Creation Cost</p>
					<p class="text-lg font-bold text-white">{FACTORY_COST.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Cooldown Warning -->
	{#if isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Factory Creation Cooldown</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						You recently created a factory. You must wait {COOLDOWN_DAYS} days between factory creations.
					</p>
					<div class="bg-red-900/30 rounded-lg p-3">
						<div class="flex items-center justify-between">
							<span class="text-red-100 text-sm font-medium">Time Remaining:</span>
							<span class="text-red-100 text-sm font-bold">{formatTimeRemaining(data.cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Insufficient Funds -->
	{#if !canAfford && !isOnCooldown}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2">
					<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
					<p class="text-amber-200/90 text-sm">
						You need <strong>{FACTORY_COST.toLocaleString()}</strong> to create a factory. You currently have
						<strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium">
							Needed: {(FACTORY_COST - data.userBalance).toLocaleString()} more
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Energy Status -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentFlash20Filled class="size-5 text-yellow-400" />
			<h2 class="text-lg font-semibold text-white">State Energy Grid</h2>
		</div>

		<div class="space-y-3">
			<div class="flex justify-between items-center">
				<span class="text-gray-400">Available Energy</span>
				<span class="font-bold text-white">
					{(data.stateEnergy.totalProduction - data.stateEnergy.usedProduction).toLocaleString()} /
					{data.stateEnergy.totalProduction.toLocaleString()} MW
				</span>
			</div>

			<div class="w-full bg-slate-700 rounded-full h-3">
				<div
					class="h-full rounded-full {hasEnoughEnergy
						? 'bg-gradient-to-r from-green-600 to-green-400'
						: 'bg-gradient-to-r from-red-600 to-red-400'}"
					style="width: {(data.stateEnergy.usedProduction / data.stateEnergy.totalProduction) * 100}%"
				></div>
			</div>

			{#if !hasEnoughEnergy}
				<div class="bg-red-600/10 border border-red-500/20 rounded-lg p-3">
					<p class="text-sm text-red-300">
						<FluentWarning20Filled class="inline size-4" />
						Insufficient energy capacity. Your state needs to increase energy production before more factories can be built.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Form -->
	<form method="POST" use:enhance class="space-y-6">
		<!-- Factory Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFactory20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Factory Details</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Factory Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={factoryName}
					placeholder="e.g., Steel Works #1"
					maxlength="100"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50"
					disabled={!canAfford || isOnCooldown}
				/>
			</div>
		</div>

		<!-- Region Selection -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentLocation20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Location</h2>
			</div>

			<div>
				<label for="region" class="block text-sm font-medium text-gray-300 mb-2">
					Select Region <span class="text-red-400">*</span>
				</label>
				<select
					id="region"
					name="regionId"
					bind:value={selectedRegion}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
					disabled={!canAfford || isOnCooldown}
				>
					<option value="">Choose a region...</option>
					{#each data.regions as region}
						<option value={region.id}>{region.name} ({region.stateName})</option>
					{/each}
				</select>
			</div>

			{#if selectedRegionData}
				<div class="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 space-y-2">
					<h3 class="font-semibold text-white">{selectedRegionData.name}</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span class="text-gray-400">Population:</span>
							<span class="font-medium text-white ml-2">{selectedRegionData.population.toLocaleString()}</span>
						</div>
						<div>
							<span class="text-gray-400">Development:</span>
							<span class="font-medium text-white ml-2">{selectedRegionData.development}%</span>
						</div>
					</div>

					{#if availableResources.length > 0}
						<div class="mt-3">
							<p class="text-xs font-semibold text-gray-400 mb-2">AVAILABLE RESOURCES</p>
							<div class="flex flex-wrap gap-2">
								{#each availableResources as resource}
									<div class="badge bg-purple-600/20 text-purple-300 border-purple-500/30">
										{resource.resourceType}: {resource.remainingReserves.toLocaleString()} / {resource.totalReserves.toLocaleString()}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="mt-3 bg-amber-600/10 border border-amber-500/20 rounded-lg p-3">
							<p class="text-sm text-amber-300">
								<FluentWarning20Filled class="inline size-4" />
								This region has no minable resources available.
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Factory Type -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBox20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Factory Type</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				{#each factoryTypes as type}
					<button
						type="button"
						class="p-4 rounded-lg border-2 transition-all {selectedFactoryType === type.value
							? 'bg-purple-600/20 border-purple-500/50'
							: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
						onclick={() => {
							selectedFactoryType = type.value;
							selectedOutput = "";
						}}
						disabled={!canAfford || isOnCooldown}
					>
						<div class="text-3xl mb-2">{type.icon}</div>
						<h3 class="font-bold text-white">{type.label}</h3>
						<p class="text-xs text-gray-400 mt-1">{type.desc}</p>
					</button>
				{/each}
			</div>

			<input type="hidden" name="factoryType" value={selectedFactoryType} />
		</div>

		<!-- Output Selection -->
		{#if selectedFactoryType}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
				<h2 class="text-lg font-semibold text-white">
					{selectedFactoryType === "mine"
						? "Resource to Mine"
						: selectedFactoryType === "refinery"
							? "Refined Product"
							: "Military Product"}
				</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#if selectedFactoryType === "mine"}
						{#each resourceOutputs as output}
							{@const canMine = availableResources.some(
								(r) => r.resourceType === output.value && r.remainingReserves > 0
							)}
							<button
								type="button"
								class="p-3 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								class:opacity-50={!canMine}
								onclick={() => (selectedOutput = output.value)}
								disabled={!canAfford || isOnCooldown || !canMine}
							>
								<div class="text-2xl mb-1">{output.icon}</div>
								<div class="font-medium text-white text-sm">{output.label}</div>
								{#if !canMine}
									<div class="text-xs text-red-400 mt-1">Not available</div>
								{/if}
							</button>
						{/each}
					{:else if selectedFactoryType === "refinery"}
						{#each refineryOutputs as output}
							<button
								type="button"
								class="p-3 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={!canAfford || isOnCooldown}
							>
								<div class="text-2xl mb-1">{output.icon}</div>
								<div class="font-medium text-white text-sm">{output.label}</div>
							</button>
						{/each}
					{:else}
						{#each productOutputs as output}
							<button
								type="button"
								class="p-3 rounded-lg border-2 transition-all {selectedOutput === output.value
									? 'bg-purple-600/20 border-purple-500/50'
									: 'bg-slate-700/30 border-slate-600/30'}"
								onclick={() => (selectedOutput = output.value)}
								disabled={!canAfford || isOnCooldown}
							>
								<div class="text-2xl mb-1">{output.icon}</div>
								<div class="font-medium text-white text-sm">{output.label}</div>
							</button>
						{/each}
					{/if}
				</div>

				<input type="hidden" name="output" value={selectedOutput} />
			</div>
		{/if}

		<!-- Worker Settings -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentPeople20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Worker Configuration</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="maxWorkers" class="block text-sm font-medium text-gray-300 mb-2">
						Max Workers: {maxWorkers}
					</label>
					<input
						type="range"
						id="maxWorkers"
						name="maxWorkers"
						min="5"
						max="50"
						step="5"
						bind:value={maxWorkers}
						class="range range-primary"
						disabled={!canAfford || isOnCooldown}
					/>
				</div>

				<div>
					<label for="workerWage" class="block text-sm font-medium text-gray-300 mb-2">
						Worker Wage: {workerWage.toLocaleString()}
					</label>
					<input
						type="range"
						id="workerWage"
						name="workerWage"
						min="1000"
						max="5000"
						step="100"
						bind:value={workerWage}
						class="range range-primary"
						disabled={!canAfford || isOnCooldown}
					/>
				</div>
			</div>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a href="/production" class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300">
				Cancel
			</a>
			<button
				type="submit"
				disabled={!canCreate}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				<FluentCheckmark20Filled class="size-5" />
				Create Factory ({FACTORY_COST.toLocaleString()})
			</button>
		</div>

		<!-- Info -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Factory creation costs {FACTORY_COST.toLocaleString()} and has a {COOLDOWN_DAYS}-day
				cooldown. Factories require energy to operate and can only mine resources available in their region.
			</p>
		</div>
	</form>
</div>
