<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProposalSchema } from "./schema";
	import { getRegionName } from "$lib/utils/formatting";

	const { data } = $props();

	let isMinisterialAction = $state(false);

	const form = superForm(data.form, {
		validators: valibotClient(createProposalSchema)
	});

	const { form: formData, errors, enhance, delayed, submitting } = form;

	// Set default quantity to 1
	$effect(() => {
		if (!$formData.quantity) {
			$formData.quantity = 1;
		}
	});

	type ProposalType = "tax" | "hospital" | "school" | "power_plant" | "infrastructure";
	type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure";

	// Helper function to format building costs
	function formatBuildingCosts(type: BuildingType): string {
		const template = data.buildingTemplates[type];
		if (!template) return "";

		const costs: string[] = [];
		for (const [resource, amount] of Object.entries(template.costs)) {
			if (resource === "currency") {
				costs.push(`${(amount as number).toLocaleString()} 💰`);
			} else {
				const icon = getResourceIcon(resource);
				costs.push(`${amount as number} ${icon} ${resource}`);
			}
		}
		return costs.join(", ");
	}

	function getResourceIcon(resource: string): string {
		const icons: Record<string, string> = {
			iron: "⚙️",
			copper: "🔶",
			steel: "🔩",
			gunpowder: "💥",
			wood: "🪵",
			coal: "⚫"
		};
		return icons[resource] || "📦";
	}

	// Get building count for selected region and type
	function getBuildingCount(regionId: string | undefined, buildingType: string | undefined): number {
		if (!regionId || !buildingType) return 0;
		const regionIdNum = parseInt(regionId);
		const count = data.buildingsByRegion[regionIdNum]?.[buildingType] || 0;
		console.log(`Getting count for region ${regionId}, type ${buildingType}:`, count);
		return count;
	}

	const proposalTypeColors: Record<string, string> = {
		tax: "bg-amber-600/20 text-amber-400 border-amber-500/30",
		hospital: "bg-pink-600/20 text-pink-400 border-pink-500/30",
		school: "bg-purple-600/20 text-purple-400 border-purple-500/30",
		power_plant: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
		infrastructure: "bg-blue-600/20 text-blue-400 border-blue-500/30"
	};

	const proposalTypeIcons: Record<string, string> = {
		tax: "💰",
		hospital: "🏥",
		school: "🏫",
		power_plant: "⚡",
		infrastructure: "🛣️"
	};

	const taxTypeIcons: Record<string, string> = {
		mining: "⛏️",
		production: "🏭",
		market_transaction: "🛒",
		income: "💵"
	};

	const taxTypeDescriptions: Record<string, string> = {
		mining: "Tax applied when workers mine resources from factories",
		production: "Tax applied when manufacturing products",
		market_transaction: "Tax applied on market sales (paid by seller)",
		income: "Tax applied on wages and earnings from work"
	};

	const ministryPermissions: Record<string, string[]> = {
		finance: ["tax"],
		infrastructure: ["infrastructure"],
		education: ["school"],
		health: ["hospital"]
	};

	const canExecuteDirectly = (type: string) => {
		if (!data.userMinistry) return false;
		return ministryPermissions[data.userMinistry]?.includes(type) || false;
	};

	const isTaxProposal = $derived($formData.proposalType === "tax");
	const isBuildingProposal = $derived(
		["hospital", "school", "power_plant", "infrastructure"].includes($formData.proposalType || "")
	);

	// Type guard to check if proposalType is a valid BuildingType
	const isValidBuildingType = (type: string | undefined): type is BuildingType => {
		return type !== undefined && ["hospital", "school", "power_plant", "infrastructure"].includes(type);
	};

	// Calculate total costs based on quantity
	const totalCosts = $derived(() => {
		if (!$formData.proposalType || !isBuildingProposal || !$formData.quantity) return null;
		if (!isValidBuildingType($formData.proposalType)) return null;

		const template = data.buildingTemplates[$formData.proposalType];
		if (!template) return null;

		const quantity = $formData.quantity || 1;
		const costs: Record<string, number> = {};

		for (const [resource, amount] of Object.entries(template.costs)) {
			costs[resource] = (amount as number) * quantity;
		}

		return costs;
	});

	// Check if state has sufficient resources
	const canAfford = $derived(() => {
		if (!totalCosts) return true;

		const costs = totalCosts();
		if (!costs) return true;

		// Check treasury balance
		if (costs.currency > (data.treasury?.balance || 0)) return false;

		// Check each resource
		for (const [resource, required] of Object.entries(costs)) {
			if (resource === "currency") continue;
			const available = data.stateResources?.[resource] || 0;
			if (available < required) return false;
		}

		return true;
	});

	// Get selected region data
	const selectedRegion = $derived(() => {
		if (!$formData.regionId) return null;
		return data.regions.find((r) => r.id === parseInt($formData.regionId || ""));
	});

	// Get current building count in selected region
	const currentBuildingCount = $derived(getBuildingCount($formData.regionId, $formData.proposalType));

	// Debug effect to check data
	$effect(() => {
		console.log("Debug Info:", {
			buildingsByRegion: data.buildingsByRegion,
			selectedRegionId: $formData.regionId,
			proposalType: $formData.proposalType,
			currentCount: currentBuildingCount,
			selectedRegion: selectedRegion()
		});
	});
</script>

<div class="max-w-4xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/state/{data.state.id}/parliament"
			class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors"
		>
			<FluentArrowLeft20Filled class="size-4" />
			Back to Parliament
		</a>
		<h1 class="text-3xl font-bold text-white flex items-center gap-3">
			{#if isMinisterialAction}
				<FluentShieldTask20Filled class="size-8 text-purple-400" />
				Execute Ministerial Action
			{:else}
				<FluentDocument20Filled class="size-8 text-blue-400" />
				Create Proposal
			{/if}
		</h1>
		<p class="text-gray-400 mt-2">
			{#if isMinisterialAction}
				Use your ministerial authority to execute actions immediately
			{:else}
				Submit a proposal for parliamentary vote (1 day voting, 60% majority required)
			{/if}
		</p>
	</div>

	<!-- Mode Toggle -->
	{#if data.userMinistry}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4 mb-6">
			<div class="flex items-center justify-between">
				<div class="flex-1">
					<p class="text-sm font-medium text-white mb-1">Submission Mode</p>
					<p class="text-xs text-gray-400">
						As Minister of <span class="capitalize font-medium">{data.userMinistry}</span>, you can execute certain
						actions immediately
					</p>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => (isMinisterialAction = false)}
						class="btn btn-sm gap-2"
						class:bg-blue-600={!isMinisterialAction}
						class:text-white={!isMinisterialAction}
						class:bg-slate-700-50={isMinisterialAction}
						class:text-gray-300={isMinisterialAction}
					>
						<FluentDocument20Filled class="size-4" />
						Proposal
					</button>
					<button
						onclick={() => (isMinisterialAction = true)}
						class="btn btn-sm gap-2"
						class:bg-purple-600={isMinisterialAction}
						class:text-white={isMinisterialAction}
						class:bg-slate-700-50={!isMinisterialAction}
						class:text-gray-300={!isMinisterialAction}
					>
						<FluentShieldTask20Filled class="size-4" />
						Ministerial
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Info Banner -->
	{#if isMinisterialAction}
		<div class="alert bg-purple-600/20 border border-purple-500/30 mb-6">
			<FluentShieldTask20Filled class="size-5 text-purple-400" />
			<div class="text-sm">
				<p class="font-semibold text-white">Ministerial Authority</p>
				<p class="text-gray-300">
					As Minister of <span class="capitalize">{data.userMinistry}</span>, certain actions can be executed
					immediately without a parliamentary vote.
				</p>
			</div>
		</div>
	{:else}
		<div class="alert bg-blue-600/20 border border-blue-500/30 mb-6">
			<FluentDocument20Filled class="size-5 text-blue-400" />
			<div class="text-sm">
				<p class="font-semibold text-white">Parliamentary Proposal</p>
				<p class="text-gray-300">
					This proposal will be voted on for <strong>1 day</strong> and requires <strong>60% majority</strong> to pass.
				</p>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		<form
			method="POST"
			action={isMinisterialAction ? "?/executeMinisterialAction" : "?/createProposal"}
			use:enhance
			class="space-y-6"
		>
			<!-- Proposal Type -->
			<div>
				<label for="proposalType" class="block text-sm font-medium text-gray-300 mb-2">
					Proposal Type <span class="text-red-400">*</span>
				</label>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each ["tax", "hospital", "school", "power_plant", "infrastructure"] as type}
						<button
							type="button"
							class="p-4 rounded-lg border-2 text-left transition-all {$formData.proposalType === type
								? proposalTypeColors[type]
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
							onclick={() => ($formData.proposalType = type as ProposalType)}
							disabled={$submitting}
						>
							<div class="flex flex-col gap-2">
								<span class="text-2xl">{proposalTypeIcons[type]}</span>
								<h4 class="font-bold text-white capitalize text-sm">{type.replace("_", " ")}</h4>
								{#if isMinisterialAction && canExecuteDirectly(type)}
									<span class="text-xs text-green-400">✓ Direct execution</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
				<input type="hidden" name="proposalType" value={$formData.proposalType} />
				{#if $errors.proposalType}
					<p class="text-xs text-red-400 mt-1">{$errors.proposalType}</p>
				{/if}

				{#if isMinisterialAction && $formData.proposalType && !canExecuteDirectly($formData.proposalType)}
					<div class="alert alert-warning mt-3">
						<span class="text-sm">
							⚠️ Your ministry cannot execute {$formData.proposalType} actions directly. This will require a parliamentary
							vote.
						</span>
					</div>
				{/if}
			</div>

			<!-- Tax-Specific Fields -->
			{#if isTaxProposal}
				<div class="border-t border-white/5 pt-6 space-y-6">
					<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentMoney20Filled class="size-5 text-amber-400" />
							<h3 class="text-lg font-semibold text-white">Tax Configuration</h3>
						</div>
						<p class="text-sm text-gray-300">Revenue will be deposited into the state treasury.</p>
					</div>

					<!-- Tax Type -->
					<div>
						<label for="taxType" class="block text-sm font-medium text-gray-300 mb-2">
							Tax Type <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each ["mining", "production", "market_transaction", "income"] as type}
								<button
									type="button"
									class="p-4 rounded-lg border-2 text-left transition-all {$formData.taxType === type
										? 'bg-amber-600/20 border-amber-500/50'
										: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
									onclick={() => ($formData.taxType = type as any)}
									disabled={$submitting}
								>
									<div class="flex items-center gap-3 mb-2">
										<span class="text-2xl">{taxTypeIcons[type]}</span>
										<h4 class="font-bold text-white capitalize">{type.replace("_", " ")}</h4>
									</div>
									<p class="text-xs text-gray-400">{taxTypeDescriptions[type]}</p>
								</button>
							{/each}
						</div>
						<input type="hidden" name="taxType" value={$formData.taxType} />
						{#if $errors.taxType}
							<p class="text-xs text-red-400 mt-1">{$errors.taxType}</p>
						{/if}
					</div>

					<!-- Tax Rate -->
					<div>
						<label for="taxRate" class="block text-sm font-medium text-gray-300 mb-2">
							Tax Rate: <span class="text-white font-bold">{$formData.taxRate || 0}%</span>
						</label>
						<input
							type="range"
							id="taxRate"
							name="taxRate"
							min="1"
							max="50"
							bind:value={$formData.taxRate}
							class="range range-warning w-full"
							disabled={$submitting}
						/>
						<div class="flex justify-between text-xs text-gray-400 px-2 mt-1">
							<span>1%</span>
							<span>10%</span>
							<span>25%</span>
							<span>50%</span>
						</div>
						{#if $errors.taxRate}
							<p class="text-xs text-red-400 mt-1">{$errors.taxRate}</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Building Construction Fields -->
			{#if isBuildingProposal}
				<div class="border-t border-white/5 pt-6 space-y-6">
					<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingBank20Filled class="size-5 text-blue-400" />
							<h3 class="text-lg font-semibold text-white">Construction Project</h3>
						</div>
						<p class="text-sm text-gray-300">Resources will be taken from the state treasury and inventory.</p>
					</div>

					<!-- Building Cost Display -->
					{#if $formData.proposalType && isValidBuildingType($formData.proposalType)}
						{@const template = data.buildingTemplates[$formData.proposalType]}
						<div class="bg-slate-700/30 rounded-lg p-4 space-y-3">
							{#if selectedRegion() && currentBuildingCount > 0}
								<div class="flex items-center justify-between mb-2">
									<p class="text-sm font-medium text-gray-300">Existing in Region:</p>
									<div class="bg-blue-600/20 border border-blue-500/30 rounded px-3 py-1">
										<p class="text-lg font-bold text-white">{currentBuildingCount}</p>
									</div>
								</div>
							{/if}

							{#if template}
								<div class="grid grid-cols-3 gap-2 text-xs text-gray-400 pt-2 border-t border-white/5">
									<div>
										<span class="text-gray-500">Construction:</span>
										<div class="text-white">{template.constructionTime} days</div>
									</div>
									<div>
										<span class="text-gray-500">Infrastructure:</span>
										<div class="text-white">{template.infrastructureRequired}</div>
									</div>
									<div>
										<span class="text-gray-500">Power:</span>
										<div class="text-white">{template.powerConsumption} MW</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Region Selection -->
					<div>
						<label for="regionId" class="block text-sm font-medium text-gray-300 mb-2">
							Region <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each data.regions as region}
								{@const buildingCount = $formData.proposalType
									? getBuildingCount(region.id.toString(), $formData.proposalType)
									: 0}
								<button
									type="button"
									class="p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3"
									class:bg-blue-600-20={$formData.regionId === region.id.toString()}
									class:border-blue-500-50={$formData.regionId === region.id.toString()}
									class:bg-slate-700-30={$formData.regionId !== region.id.toString()}
									class:border-slate-600-30={$formData.regionId !== region.id.toString()}
									class:hover:border-slate-500-50={$formData.regionId !== region.id.toString()}
									onclick={() => ($formData.regionId = region.id.toString())}
									disabled={$submitting}
								>
									<img src="/coats/{region.id}.svg" alt={getRegionName(region.id)} class="w-12 h-12 rounded" />
									<div class="flex-1">
										<h4 class="font-bold text-white">{getRegionName(region.id)}</h4>
										<p class="text-xs text-gray-400">
											Infrastructure: {region.infrastructure ?? 0}
											{#if buildingCount > 0}
												• {proposalTypeIcons[$formData.proposalType || ""]} {buildingCount}
											{/if}
										</p>
									</div>
								</button>
							{/each}
						</div>
						<input type="hidden" name="regionId" value={$formData.regionId} />
						{#if $errors.regionId}
							<p class="text-xs text-red-400 mt-1">{$errors.regionId}</p>
						{/if}
					</div>

					<!-- Quantity -->
					<div>
						<label for="quantity" class="block text-sm font-medium text-gray-300 mb-2">
							Quantity <span class="text-red-400">*</span>
						</label>
						<input
							type="number"
							id="quantity"
							name="quantity"
							bind:value={$formData.quantity}
							min="1"
							max="100"
							placeholder="1"
							class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50"
							class:input-error={$errors.quantity}
							disabled={$submitting}
						/>
						{#if $errors.quantity}
							<p class="text-xs text-red-400 mt-1">{$errors.quantity}</p>
						{/if}
						{#if $formData.quantity && currentBuildingCount > 0}
							<p class="text-xs text-gray-400 mt-1">
								<FluentInfo20Filled class="inline size-3" />
								After construction: {currentBuildingCount + ($formData.quantity || 0)} total in region
							</p>
						{/if}
					</div>

					<!-- Total Cost Display -->
					{#if totalCosts()}
						{@const costs = totalCosts()}
						{#if costs}
							<div class="bg-slate-700/30 rounded-lg p-4 space-y-2">
								<p class="text-sm font-medium text-gray-300">Total Cost ({$formData.quantity || 1}x):</p>
								{#each Object.entries(costs) as [resource, amount]}
									{@const available =
										resource === "currency" ? data.treasury?.balance || 0 : data.stateResources?.[resource] || 0}
									{@const hasEnough = (amount as number) <= available}
									<div class="flex justify-between text-sm items-center">
										<span class="text-gray-400 capitalize flex items-center gap-2">
											{#if resource === "currency"}
												<FluentMoney20Filled class="size-4 text-amber-400" />
											{:else}
												<span>{getResourceIcon(resource)}</span>
											{/if}
											{resource}:
										</span>
										<span class="font-mono" class:text-white={hasEnough} class:text-red-400={!hasEnough}>
											{(amount as number).toLocaleString()}
											<span class="text-gray-500">/ {available.toLocaleString()}</span>
											{#if hasEnough}
												<span class="text-green-400 ml-1">✓</span>
											{:else}
												<span class="text-red-400 ml-1">✗</span>
											{/if}
										</span>
									</div>
								{/each}

								{#if !canAfford()}
									<div class="alert alert-error mt-2">
										<span class="text-sm"
											>⚠️ Insufficient state resources to build {$formData.quantity || 1} building(s)!</span
										>
									</div>
								{/if}
							</div>
						{/if}
					{/if}

					{#if $formData.quantity && $formData.quantity > 1}
						<div class="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3">
							<p class="text-xs text-gray-300">
								Buildings will be numbered automatically (e.g., Building 1, Building 2, Building 3...)
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<a
					href="/state/{data.state.id}/parliament"
					class="btn flex-1 bg-slate-700 hover:bg-slate-600 border-0 text-white"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={$submitting ||
						(isTaxProposal && (!$formData.taxType || !$formData.taxRate)) ||
						(isBuildingProposal && (!$formData.regionId || !$formData.quantity || !canAfford()))}
					class="btn flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 text-white gap-2"
				>
					{#if $delayed}
						<span class="loading loading-spinner loading-sm"></span>
						{isMinisterialAction ? "Executing..." : "Creating..."}
					{:else if isMinisterialAction && $formData.proposalType && canExecuteDirectly($formData.proposalType)}
						<FluentShieldTask20Filled class="size-5" />
						Execute Immediately
					{:else}
						<FluentDocument20Filled class="size-5" />
						Submit Proposal
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
