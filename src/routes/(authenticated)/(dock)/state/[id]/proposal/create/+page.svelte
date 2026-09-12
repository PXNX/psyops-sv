<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.svelte -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProposalSchema } from "./schema";
	import { getRegionName } from "$lib/utils/formatting";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";

	const { data } = $props();

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

	type ProposalType =
		"tax" | "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications" | "border_control";
	type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications";

	function getBuildingCount(regionId: string | undefined, buildingType: string | undefined): number {
		if (!regionId || !buildingType) return 0;
		const regionIdNum = parseInt(regionId);
		return data.buildingsByRegion[regionIdNum]?.[buildingType] || 0;
	}

	const proposalTypeColors: Record<string, string> = {
		tax: "bg-[#e6a527]/15 text-[#f7c56b] border-[#e6a527]/35",
		hospital: "bg-pink-600/20 text-pink-300 border-pink-500/30",
		school: "bg-[#8c709b]/20 text-[#d5c4df] border-[#b7a0c5]/30",
		power_plant: "bg-orange-600/20 text-orange-300 border-orange-500/30",
		infrastructure: "bg-[#315d8d]/20 text-[#b7d0e6] border-[#7ba0c8]/30",
		fortifications: "bg-red-600/20 text-red-400 border-red-500/30",
		border_control: "bg-[#587252]/20 text-[#c6dfbf] border-[#8fae88]/30"
	};

	const proposalTypeIcons: Record<string, string> = {
		tax: "💰",
		hospital: "🏥",
		school: "🏫",
		power_plant: "⚡",
		infrastructure: "🛣️",
		fortifications: "🏰",
		border_control: "🛂"
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

	// Check if user can auto-execute this proposal type
	const canAutoExecute = $derived(() => {
		if (!$formData.proposalType) return false;

		if (data.isPresident) {
			return true;
		}

		if (!data.userMinistry) return false;

		const ministryPermissions: Record<string, string[]> = {
			economy: ["tax"],
			foreign_affairs: ["border_control"],
			defense: ["fortifications"],
			infrastructure: ["infrastructure"],
			education: ["school"],
			health: ["hospital"]
		};

		return ministryPermissions[data.userMinistry]?.includes($formData.proposalType) || false;
	});

	const isTaxProposal = $derived($formData.proposalType === "tax");
	const isBorderControlProposal = $derived($formData.proposalType === "border_control");
	const isBuildingProposal = $derived(
		["hospital", "school", "power_plant", "infrastructure", "fortifications"].includes($formData.proposalType || "")
	);

	const isValidBuildingType = (type: string | undefined): type is BuildingType => {
		return (
			type !== undefined && ["hospital", "school", "power_plant", "infrastructure", "fortifications"].includes(type)
		);
	};

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

	const availableResources = $derived(() => {
		return {
			currency: data.treasury?.balance || 0,
			...data.stateResources
		};
	});

	const canAfford = $derived(() => {
		if (!totalCosts) return true;

		const costs = totalCosts();
		if (!costs) return true;

		if (costs.currency > (data.treasury?.balance || 0)) return false;

		for (const [resource, required] of Object.entries(costs)) {
			if (resource === "currency") continue;
			const available = data.stateResources?.[resource] || 0;
			if (available < required) return false;
		}

		return true;
	});

	const selectedRegion = $derived(() => {
		if (!$formData.regionId) return null;
		return data.regions.find((r) => r.id === parseInt($formData.regionId || ""));
	});

	const currentBuildingCount = $derived(getBuildingCount($formData.regionId, $formData.proposalType));
</script>

<div class="max-w-4xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="mb-6">
		<a href="/state/{data.state.id}/parliament" class="text-sm text-[#a89e8e] hover:text-[#d5c4df] transition-colors">
			{data.state.name} — Parliament
		</a>
		<h1 class="text-3xl font-bold text-[#fff7e8] flex items-center gap-3">
			{#if canAutoExecute()}
				<FluentShieldTask20Filled class="size-8 text-[#d5c4df]" />
				Execute Action
			{:else}
				<FluentDocument20Filled class="size-8 text-[#b7d0e6]" />
				Create Proposal
			{/if}
		</h1>
		<p class="text-[#a89e8e] mt-2">
			{#if canAutoExecute()}
				Use your {data.isPresident ? "presidential" : "ministerial"} authority to execute actions immediately
			{:else}
				Submit a proposal for parliamentary vote (1 day voting, 60% majority required)
			{/if}
		</p>
	</div>

	<!-- Authority Notice -->
	{#if data.isPresident || data.userMinistry}
		<div class="panel rounded-xl p-4 mb-6">
			<div class="flex items-center gap-3">
				<FluentShieldTask20Filled class="size-6 text-[#d5c4df]" />
				<div>
					<p class="text-sm font-medium text-[#fff7e8]">
						{data.isPresident ? "Presidential Authority" : `Minister of ${data.userMinistry}`}
					</p>
					<p class="text-xs text-[#a89e8e]">Certain actions can be executed immediately without parliamentary vote</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Info Banner -->
	{#if canAutoExecute()}
		<div class="alert bg-[#8c709b]/15 border border-[#b7a0c5]/30 mb-6">
			<FluentShieldTask20Filled class="size-5 text-[#d5c4df]" />
			<div class="text-sm">
				<p class="font-semibold text-[#fff7e8]">Immediate Execution</p>
				<p class="text-[#d9ccb7]">This action will be executed immediately upon submission.</p>
			</div>
		</div>
	{:else}
		<div class="alert bg-[#315d8d]/18 border border-[#7ba0c8]/30 mb-6">
			<FluentDocument20Filled class="size-5 text-[#b7d0e6]" />
			<div class="text-sm">
				<p class="font-semibold text-[#fff7e8]">Parliamentary Proposal</p>
				<p class="text-[#d9ccb7]">
					This proposal will be voted on for <strong>1 day</strong> and requires <strong>60% majority</strong> to pass.
				</p>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="panel rounded-xl p-6">
		<form method="POST" action="?/createProposal" use:enhance class="space-y-6">
			<!-- Proposal Type -->
			<div>
				<label for="proposalType" class="field-label">
					Proposal Type <span class="text-red-400">*</span>
				</label>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each ["tax", "hospital", "school", "power_plant", "infrastructure", "fortifications", "border_control"] as type}
						<button
							type="button"
							class="p-4 rounded-lg border-2 text-left transition-all {$formData.proposalType === type
								? proposalTypeColors[type]
								: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#dfceb0]/30'}"
							onclick={() => ($formData.proposalType = type as ProposalType)}
							disabled={$submitting}
						>
							<div class="flex flex-col gap-2">
								<span class="text-2xl">{proposalTypeIcons[type]}</span>
								<h4 class="font-bold text-[#fff7e8] capitalize text-sm">{type.replace("_", " ")}</h4>
								{#if canAutoExecute() && ((data.isPresident && ["tax", "border_control", "fortifications"].includes(type)) || (data.userMinistry === "economy" && type === "tax") || (data.userMinistry === "foreign_affairs" && type === "border_control") || (data.userMinistry === "defense" && type === "fortifications") || (data.userMinistry === "infrastructure" && type === "infrastructure") || (data.userMinistry === "education" && type === "school") || (data.userMinistry === "health" && type === "hospital"))}
									<span class="text-xs text-emerald-400">✓ Immediate</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
				<input type="hidden" name="proposalType" value={$formData.proposalType} />
				{#if $errors.proposalType}
					<p class="text-xs text-red-400 mt-1">{$errors.proposalType}</p>
				{/if}
			</div>

			<!-- Tax-Specific Fields -->
			{#if isTaxProposal}
				<div class="border-t border-[#dfceb0]/10 pt-6 space-y-6">
					<div class="bg-[#e6a527]/10 border border-[#e6a527]/25 rounded-xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentMoney20Filled class="size-5 text-[#f7c56b]" />
							<h3 class="text-lg font-semibold text-[#fff7e8]">Tax Configuration</h3>
						</div>
						<p class="text-sm text-[#d9ccb7]">Revenue will be deposited into the state treasury.</p>
					</div>

					<div>
						<label for="taxType" class="field-label">
							Tax Type <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each ["mining", "production", "market_transaction", "income"] as type}
								<button
									type="button"
									class="p-4 rounded-lg border-2 text-left transition-all {$formData.taxType === type
										? 'bg-[#e6a527]/20 border-[#e6a527]/50'
										: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#dfceb0]/30'}"
									onclick={() => ($formData.taxType = type as any)}
									disabled={$submitting}
								>
									<div class="flex items-center gap-3 mb-2">
										<span class="text-2xl">{taxTypeIcons[type]}</span>
										<h4 class="font-bold text-[#fff7e8] capitalize">{type.replace("_", " ")}</h4>
									</div>
									<p class="text-xs text-[#a89e8e]">{taxTypeDescriptions[type]}</p>
								</button>
							{/each}
						</div>
						<input type="hidden" name="taxType" value={$formData.taxType} />
						{#if $errors.taxType}
							<p class="text-xs text-red-400 mt-1">{$errors.taxType}</p>
						{/if}
					</div>

					<div>
						<label for="taxRate" class="field-label">
							Tax Rate: <span class="text-[#fff7e8] font-bold">{$formData.taxRate || 0}%</span>
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
						<div class="flex justify-between text-xs text-[#a89e8e] px-2 mt-1">
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

			<!-- Border Control Fields -->
			{#if isBorderControlProposal}
				<div class="border-t border-[#dfceb0]/10 pt-6 space-y-6">
					<div class="bg-[#587252]/10 border border-[#8fae88]/20 rounded-xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentGlobe20Filled class="size-5 text-[#8fae88]" />
							<h3 class="text-lg font-semibold text-[#fff7e8]">Border Control</h3>
						</div>
						<p class="text-sm text-[#d9ccb7]">
							Manage state border access. Closed borders cost ${data.borderMaintenanceCost.toLocaleString()}/day to
							maintain.
						</p>
					</div>

					<div>
						<label class="field-label">
							Border Status <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								class="p-4 rounded-lg border-2 text-left transition-all {$formData.borderStatus === 'open'
									? 'bg-[#587252]/20 border-[#8fae88]/50'
									: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#dfceb0]/30'}"
								onclick={() => ($formData.borderStatus = "open")}
								disabled={$submitting}
							>
								<div class="flex items-center gap-3 mb-2">
									<span class="text-2xl">🌍</span>
									<h4 class="font-bold text-[#fff7e8]">Open Borders</h4>
								</div>
								<p class="text-xs text-[#a89e8e]">Allow free travel and trade</p>
								{#if data.border?.status === "open"}
									<span class="text-xs text-emerald-400 mt-2 block">✓ Current status</span>
								{/if}
							</button>

							<button
								type="button"
								class="p-4 rounded-lg border-2 text-left transition-all {$formData.borderStatus === 'closed'
									? 'bg-red-600/20 border-red-500/50'
									: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#dfceb0]/30'}"
								onclick={() => ($formData.borderStatus = "closed")}
								disabled={$submitting}
							>
								<div class="flex items-center gap-3 mb-2">
									<span class="text-2xl">🚫</span>
									<h4 class="font-bold text-[#fff7e8]">Closed Borders</h4>
								</div>
								<p class="text-xs text-[#a89e8e]">Restrict travel and trade</p>
								<p class="text-xs text-[#f7c56b] mt-1">
									Costs ${data.borderMaintenanceCost.toLocaleString()}/day
								</p>
								{#if data.border?.status === "closed"}
									<span class="text-xs text-red-400 mt-2 block">✓ Current status</span>
								{/if}
							</button>
						</div>
						<input type="hidden" name="borderStatus" value={$formData.borderStatus} />
						{#if $errors.borderStatus}
							<p class="text-xs text-red-400 mt-1">{$errors.borderStatus}</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Building Construction Fields -->
			{#if isBuildingProposal}
				<div class="border-t border-[#dfceb0]/10 pt-6 space-y-6">
					<div class="bg-[#315d8d]/10 border border-[#7ba0c8]/20 rounded-xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingBank20Filled class="size-5 text-[#7ba0c8]" />
							<h3 class="text-lg font-semibold text-[#fff7e8]">Construction Project</h3>
						</div>
						<p class="text-sm text-[#d9ccb7]">Resources will be taken from the state treasury and inventory.</p>
					</div>

					{#if selectedRegion() && currentBuildingCount > 0}
						<div class="panel-muted rounded-lg p-4">
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-[#d9ccb7]">Existing in Region:</p>
								<div class="bg-[#315d8d]/20 border border-[#7ba0c8]/30 rounded px-3 py-1">
									<p class="text-lg font-bold text-[#fff7e8]">{currentBuildingCount}</p>
								</div>
							</div>
						</div>
					{/if}

					<div>
						<label for="regionId" class="field-label">
							Region <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each data.regions as region}
								{@const buildingCount = $formData.proposalType
									? getBuildingCount(region.id.toString(), $formData.proposalType)
									: 0}
								<button
									type="button"
									class="p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 {$formData.regionId ===
									region.id.toString()
										? 'bg-[#e6a527]/20 border-[#e6a527]/50'
										: 'bg-[#102239]/70 border-[#dfceb0]/15 hover:border-[#dfceb0]/30'}"
									onclick={() => ($formData.regionId = region.id.toString())}
									disabled={$submitting}
								>
									<img src="/coats/{region.id}.svg" alt={getRegionName(region.id)} class="w-12 h-12 rounded" />
									<div class="flex-1">
										<h4 class="font-bold text-[#fff7e8]">{getRegionName(region.id)}</h4>
										<p class="text-xs text-[#a89e8e]">
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

					<div>
						<label for="quantity" class="field-label">
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
							class="input w-full field-control"
							class:input-error={$errors.quantity}
							disabled={$submitting}
						/>
						{#if $errors.quantity}
							<p class="text-xs text-red-400 mt-1">{$errors.quantity}</p>
						{/if}
						{#if $formData.quantity && currentBuildingCount > 0}
							<p class="text-xs text-[#a89e8e] mt-1">
								<FluentInfo20Filled class="inline size-3" />
								After construction: {currentBuildingCount + ($formData.quantity || 0)} total in region
							</p>
						{/if}
					</div>

					{#if totalCosts()}
						{@const costs = totalCosts()}
						{#if costs}
							<ResourceRequirements {costs} available={availableResources()} />
						{/if}
					{/if}

					{#if $formData.quantity && $formData.quantity > 1}
						<div class="bg-[#315d8d]/10 border border-[#7ba0c8]/20 rounded-lg p-3">
							<p class="text-xs text-[#d9ccb7]">
								Buildings will be numbered automatically (e.g., Building 1, Building 2, Building 3...)
							</p>
						</div>
					{/if}

					{#if $formData.proposalType && isValidBuildingType($formData.proposalType)}
						{@const template = data.buildingTemplates[$formData.proposalType]}
						{#if template}
							<div class="grid grid-cols-3 gap-2 text-xs text-[#a89e8e] panel-muted rounded-lg p-4">
								<div>
									<span class="text-[#a89e8e]/70">Construction:</span>
									<div class="text-[#fff7e8]">{template.constructionTime} days</div>
								</div>
								<div>
									<span class="text-[#a89e8e]/70">Infrastructure:</span>
									<div class="text-[#fff7e8]">{template.infrastructureRequired}</div>
								</div>
								<div>
									<span class="text-[#a89e8e]/70">Power:</span>
									<div class="text-[#fff7e8]">{template.powerConsumption} MW</div>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<a
					href="/state/{data.state.id}/parliament"
					class="btn flex-1 bg-[#14283f] hover:bg-[#19304b] border-0 text-[#e5d8c1]"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={$submitting ||
						(isTaxProposal && (!$formData.taxType || !$formData.taxRate)) ||
						(isBorderControlProposal && !$formData.borderStatus) ||
						(isBuildingProposal && (!$formData.regionId || !$formData.quantity || !canAfford()))}
					class="btn flex-1 bg-[#e6a527] hover:bg-[#f2b940] border border-[#f2c463] text-[#172a45] gap-2"
				>
					{#if $delayed}
						<span class="loading loading-spinner loading-sm"></span>
						{canAutoExecute() ? "Executing..." : "Creating..."}
					{:else if canAutoExecute()}
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
