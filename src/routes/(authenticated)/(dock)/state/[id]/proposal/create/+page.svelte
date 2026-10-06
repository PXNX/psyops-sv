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
	import { getRegionName } from "#lib/utils/formatting.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	const { data } = $props();

	const form = superForm(data.form, {
		validators: valibotClient(createProposalSchema)
	});

	const { form: formData, errors, enhance, delayed, submitting } = form;

	// Default quantity to 1. This runs once at component init (not inside an
	// $effect) so it doesn't fight with the user clearing the field to type a
	// new value — an $effect here would re-fire on every transient empty state.
	if (!$formData.quantity) {
		$formData.quantity = 1;
	}

	type ProposalType =
		"tax" | "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications" | "border_control";
	type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications";

	function getBuildingCount(regionId: string | undefined, buildingType: string | undefined): number {
		if (!regionId || !buildingType) return 0;
		const regionIdNum = parseInt(regionId);
		return data.buildingsByRegion[regionIdNum]?.[buildingType] || 0;
	}

	const proposalTypeColors: Record<string, string> = {
		tax: "bg-[#f2b01e]/15 text-[#ffd35c] border-[#f2b01e]/35",
		hospital: "bg-red-600/10 text-red-300 border-red-500/30",
		school: "bg-[#8a4fc0]/20 text-[#e3cbfb] border-[#c08cf0]/30",
		power_plant: "bg-[#f2b01e]/12 text-[#ffd35c] border-[#f2b01e]/35",
		infrastructure: "bg-[#2369b5]/20 text-[#b3dcff] border-[#5eaef5]/30",
		fortifications: "bg-red-600/10 text-red-300 border-red-500/30",
		border_control: "bg-[#3f8a2a]/20 text-[#b9f29a] border-[#6fd14a]/30"
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

	const maxAffordableQuantity = $derived(() => {
		if (!$formData.proposalType || !isValidBuildingType($formData.proposalType)) return 100;

		const template = data.buildingTemplates[$formData.proposalType];
		if (!template) return 100;

		let max = 100;
		for (const [resource, amount] of Object.entries(template.costs)) {
			if (!amount) continue;
			const available = resource === "currency" ? data.treasury?.balance || 0 : data.stateResources?.[resource] || 0;
			max = Math.min(max, Math.floor(available / (amount as number)));
		}

		return Math.max(0, max);
	});

	const selectedRegion = $derived(() => {
		if (!$formData.regionId) return null;
		return data.regions.find((r) => r.id === parseInt($formData.regionId || ""));
	});

	const currentBuildingCount = $derived(getBuildingCount($formData.regionId, $formData.proposalType));
</script>

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader
		title={canAutoExecute() ? "Execute Action" : "Create Proposal"}
		subtitle={canAutoExecute()
			? `Use your ${data.isPresident ? "presidential" : "ministerial"} authority to execute actions immediately`
			: "Submit a proposal for parliamentary vote (1 day voting, 60% majority required)"}
		icon={canAutoExecute() ? FluentShieldTask20Filled : FluentDocument20Filled}
		backHref="/state/{data.state.id}/parliament"
		backLabel="{data.state.name} — Parliament"
	/>

	<!-- Authority Notice -->
	{#if data.isPresident || data.userMinistry}
		<div class="panel-muted rounded-sm p-4">
			<div class="flex items-center gap-3">
				<FluentShieldTask20Filled class="size-6 text-[#c08cf0]" />
				<div>
					<p class="text-sm font-medium text-[#f5efd8]">
						{data.isPresident ? "Presidential Authority" : `Minister of ${data.userMinistry}`}
					</p>
					<p class="text-xs text-[#a8a083]">Certain actions can be executed immediately without parliamentary vote</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Info Banner -->
	{#if canAutoExecute()}
		<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-4 flex items-center gap-3">
			<FluentShieldTask20Filled class="size-5 text-[#c08cf0] shrink-0" />
			<div class="text-sm">
				<p class="font-semibold text-[#f5efd8]">Immediate Execution</p>
				<p class="text-[#d3caa9]">This action will be executed immediately upon submission.</p>
			</div>
		</div>
	{:else}
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4 flex items-center gap-3">
			<FluentDocument20Filled class="size-5 text-[#5eaef5] shrink-0" />
			<div class="text-sm">
				<p class="font-semibold text-[#f5efd8]">Parliamentary Proposal</p>
				<p class="text-[#d3caa9]">
					This proposal will be voted on for <strong>1 day</strong> and requires <strong>60% majority</strong> to pass.
				</p>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="panel rounded-sm p-5">
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
							class="p-4 rounded-sm border text-left transition-colors {$formData.proposalType === type
								? proposalTypeColors[type]
								: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
							onclick={() => ($formData.proposalType = type as ProposalType)}
							disabled={$submitting}
						>
							<div class="flex flex-col gap-2">
								<span class="text-2xl">{proposalTypeIcons[type]}</span>
								<h4 class="font-bold text-[#f5efd8] capitalize text-sm">{type.replace("_", " ")}</h4>
								{#if canAutoExecute() && ((data.isPresident && ["tax", "border_control", "fortifications"].includes(type)) || (data.userMinistry === "economy" && type === "tax") || (data.userMinistry === "foreign_affairs" && type === "border_control") || (data.userMinistry === "defense" && type === "fortifications") || (data.userMinistry === "infrastructure" && type === "infrastructure") || (data.userMinistry === "education" && type === "school") || (data.userMinistry === "health" && type === "hospital"))}
									<span class="text-xs text-[#b9f29a]">✓ Immediate</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
				<input type="hidden" name="proposalType" value={$formData.proposalType} />
				{#if $errors.proposalType}
					<p class="field-error">{$errors.proposalType}</p>
				{/if}
			</div>

			<!-- Tax-Specific Fields -->
			{#if isTaxProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-6">
					<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentMoney20Filled class="size-5 text-[#ffd35c]" />
							<h3 class="text-base font-semibold text-[#f5efd8]">Tax Configuration</h3>
						</div>
						<p class="text-sm text-[#d3caa9]">Revenue will be deposited into the state treasury.</p>
					</div>

					<div>
						<label for="taxType" class="field-label">
							Tax Type <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each ["mining", "production", "market_transaction", "income"] as type}
								<button
									type="button"
									class="p-4 rounded-sm border text-left transition-colors {$formData.taxType === type
										? 'bg-[#f2b01e]/12 border-[#f2b01e]/60'
										: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
									onclick={() => ($formData.taxType = type as any)}
									disabled={$submitting}
								>
									<div class="flex items-center gap-3 mb-2">
										<span class="text-2xl">{taxTypeIcons[type]}</span>
										<h4 class="font-bold text-[#f5efd8] capitalize">{type.replace("_", " ")}</h4>
									</div>
									<p class="text-xs text-[#a8a083]">{taxTypeDescriptions[type]}</p>
								</button>
							{/each}
						</div>
						<input type="hidden" name="taxType" value={$formData.taxType} />
						{#if $errors.taxType}
							<p class="field-error">{$errors.taxType}</p>
						{/if}
					</div>

					<div>
						<label for="taxRate" class="field-label">
							Tax Rate: <span class="text-[#f5efd8] font-bold">{$formData.taxRate || 0}%</span>
						</label>
						<input
							type="range"
							id="taxRate"
							name="taxRate"
							min="1"
							max="50"
							bind:value={$formData.taxRate}
							class="range range-sm w-full text-[#f2b01e]"
							disabled={$submitting}
						/>
						<div class="flex justify-between text-xs text-[#a8a083] px-2 mt-1">
							<span>1%</span>
							<span>10%</span>
							<span>25%</span>
							<span>50%</span>
						</div>
						{#if $errors.taxRate}
							<p class="field-error">{$errors.taxRate}</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Border Control Fields -->
			{#if isBorderControlProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-6">
					<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentGlobe20Filled class="size-5 text-[#6fd14a]" />
							<h3 class="text-base font-semibold text-[#f5efd8]">Border Control</h3>
						</div>
						<p class="text-sm text-[#d3caa9]">
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
								class="p-4 rounded-sm border text-left transition-colors {$formData.borderStatus === 'open'
									? 'bg-[#3f8a2a]/18 border-[#6fd14a]/60'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
								onclick={() => ($formData.borderStatus = "open")}
								disabled={$submitting}
							>
								<div class="flex items-center gap-3 mb-2">
									<span class="text-2xl">🌍</span>
									<h4 class="font-bold text-[#f5efd8]">Open Borders</h4>
								</div>
								<p class="text-xs text-[#a8a083]">Allow free travel and trade</p>
								{#if data.border?.status === "open"}
									<span class="text-xs text-[#b9f29a] mt-2 block">✓ Current status</span>
								{/if}
							</button>

							<button
								type="button"
								class="p-4 rounded-sm border text-left transition-colors {$formData.borderStatus === 'closed'
									? 'bg-red-600/10 border-red-500/60'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
								onclick={() => ($formData.borderStatus = "closed")}
								disabled={$submitting}
							>
								<div class="flex items-center gap-3 mb-2">
									<span class="text-2xl">🚫</span>
									<h4 class="font-bold text-[#f5efd8]">Closed Borders</h4>
								</div>
								<p class="text-xs text-[#a8a083]">Restrict travel and trade</p>
								<p class="text-xs text-[#ffd35c] mt-1">
									Costs ${data.borderMaintenanceCost.toLocaleString()}/day
								</p>
								{#if data.border?.status === "closed"}
									<span class="text-xs text-red-400 mt-2 block">✓ Current status</span>
								{/if}
							</button>
						</div>
						<input type="hidden" name="borderStatus" value={$formData.borderStatus} />
						{#if $errors.borderStatus}
							<p class="field-error">{$errors.borderStatus}</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Building Construction Fields -->
			{#if isBuildingProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-6">
					<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingBank20Filled class="size-5 text-[#5eaef5]" />
							<h3 class="text-base font-semibold text-[#f5efd8]">Construction Project</h3>
						</div>
						<p class="text-sm text-[#d3caa9]">Resources will be taken from the state treasury and inventory.</p>
					</div>

					{#if selectedRegion() && currentBuildingCount > 0}
						<div class="panel-muted rounded-sm p-4">
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-[#d3caa9]">Existing in Region:</p>
								<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm px-3 py-1">
									<p class="text-lg font-bold text-[#f5efd8]">{currentBuildingCount}</p>
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
									class="p-4 rounded-sm border text-left transition-colors flex items-center gap-3 {$formData.regionId ===
									region.id.toString()
										? 'bg-[#f2b01e]/12 border-[#f2b01e]/60'
										: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
									onclick={() => ($formData.regionId = region.id.toString())}
									disabled={$submitting}
								>
									<img src="/coats/{region.id}.svg" alt={getRegionName(region.id)} class="w-12 h-12 rounded-sm" />
									<div class="flex-1">
										<h4 class="font-bold text-[#f5efd8]">{getRegionName(region.id)}</h4>
										<p class="text-xs text-[#a8a083]">
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
							<p class="field-error">{$errors.regionId}</p>
						{/if}
					</div>

					<div>
						<label for="quantity" class="field-label">
							Quantity <span class="text-red-400">*</span>
							<span class="text-[#a8a083] font-normal">(max affordable: {maxAffordableQuantity()})</span>
						</label>
						<div class="join w-full">
							<input
								type="number"
								id="quantity"
								name="quantity"
								bind:value={$formData.quantity}
								min="1"
								max="100"
								placeholder="1"
								class="join-item flex-1 min-w-0 field-control rounded-sm px-3 py-2.5 font-mono"
								class:input-error={$errors.quantity}
								disabled={$submitting}
							/>
							<Button
								type="button"
								variant="secondary"
								class="join-item"
								onclick={() => ($formData.quantity = maxAffordableQuantity())}
								disabled={$submitting || maxAffordableQuantity() < 1}
							>
								MAX
							</Button>
						</div>
						{#if $errors.quantity}
							<p class="field-error">{$errors.quantity}</p>
						{/if}
						{#if $formData.quantity && currentBuildingCount > 0}
							<p class="text-xs text-[#a8a083] mt-1">
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
						<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-3">
							<p class="text-xs text-[#d3caa9]">
								Buildings will be numbered automatically (e.g., Building 1, Building 2, Building 3...)
							</p>
						</div>
					{/if}

					{#if $formData.proposalType && isValidBuildingType($formData.proposalType)}
						{@const template = data.buildingTemplates[$formData.proposalType]}
						{#if template}
							<div class="grid grid-cols-3 gap-2 text-xs text-[#a8a083] panel-muted rounded-sm p-4">
								<div>
									<span class="text-[#a8a083]/70">Construction:</span>
									<div class="text-[#f5efd8]">{template.constructionTime} days</div>
								</div>
								<div>
									<span class="text-[#a8a083]/70">Infrastructure:</span>
									<div class="text-[#f5efd8]">{template.infrastructureRequired}</div>
								</div>
								<div>
									<span class="text-[#a8a083]/70">Power:</span>
									<div class="text-[#f5efd8]">{template.powerConsumption} MW</div>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<Button href="/state/{data.state.id}/parliament" variant="secondary" grow>Cancel</Button>
				<Button
					type="submit"
					variant="primary"
					grow
					icon={canAutoExecute() ? FluentShieldTask20Filled : FluentDocument20Filled}
					loading={$delayed}
					loadingText={canAutoExecute() ? "Executing..." : "Creating..."}
					disabled={$submitting ||
						(isTaxProposal && (!$formData.taxType || !$formData.taxRate)) ||
						(isBorderControlProposal && !$formData.borderStatus) ||
						(isBuildingProposal && (!$formData.regionId || !$formData.quantity || !canAfford()))}
				>
					{canAutoExecute() ? "Execute Immediately" : "Submit Proposal"}
				</Button>
			</div>
		</form>
	</div>
</PageContainer>
