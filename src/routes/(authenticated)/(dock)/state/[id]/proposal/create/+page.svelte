<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.svelte -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProposalSchema } from "./schema";
	import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { EXPLOITATION_POLICIES, EXPLOITATION_POLICY_KEYS } from "#lib/config/index.js";

	const { data } = $props();

	const form = superForm(data.form, {
		validators: valibotClient(createProposalSchema),
		// Show why the server refused (e.g. the treasury can't pay for it).
		onResult: ({ result }) => {
			if (result.type === "failure" && typeof result.data?.error === "string") toastResult(result);
		}
	});

	const { form: formData, errors, enhance, delayed, submitting } = form;

	// Default quantity to 1. This runs once at component init (not inside an
	// $effect) so it doesn't fight with the user clearing the field to type a
	// new value — an $effect here would re-fire on every transient empty state.
	if (!$formData.quantity) {
		$formData.quantity = 1;
	}

	type ProposalType =
		| "tax"
		| "hospital"
		| "school"
		| "power_plant"
		| "infrastructure"
		| "fortifications"
		| "border_control"
		| "exploitation"
		| "declare_war";
	type BuildingType = "hospital" | "school" | "power_plant" | "infrastructure" | "fortifications";

	/** Current level and buildings still under construction for a region. */
	function regionProgress(regionId: string | undefined, buildingType: string | undefined) {
		const region = data.regions.find((r) => r.id === Number(regionId));
		if (!region || !buildingType || !isValidBuildingType(buildingType)) return null;
		const template = data.buildingTemplates[buildingType];
		return {
			level: region[template.stat] ?? 0,
			pending: data.pendingByRegion[region.id]?.[buildingType] ?? 0,
			max: template.maxLevel,
			infrastructure: region.infrastructure ?? 0,
			infrastructureRequired: template.infrastructureRequired
		};
	}

	const proposalTypeColors: Record<string, string> = {
		tax: "bg-[#f2b01e]/15 text-[#ffd35c] border-[#f2b01e]/35",
		hospital: "bg-red-600/10 text-red-300 border-red-500/30",
		school: "bg-[#8a4fc0]/20 text-[#e3cbfb] border-[#c08cf0]/30",
		power_plant: "bg-[#f2b01e]/12 text-[#ffd35c] border-[#f2b01e]/35",
		infrastructure: "bg-[#2369b5]/20 text-[#b3dcff] border-[#5eaef5]/30",
		fortifications: "bg-red-600/10 text-red-300 border-red-500/30",
		border_control: "bg-[#3f8a2a]/20 text-[#b9f29a] border-[#6fd14a]/30",
		exploitation: "bg-[#f2b01e]/12 text-[#ffd35c] border-[#f2b01e]/35",
		declare_war: "bg-red-600/15 text-red-300 border-red-500/45"
	};

	const proposalTypeIcons: Record<string, string> = {
		tax: "💰",
		hospital: "🏥",
		school: "🏫",
		power_plant: "⚡",
		infrastructure: "🛣️",
		fortifications: "🏰",
		border_control: "🛂",
		exploitation: "⛏️",
		declare_war: "⚔️"
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

	// Presidents enact anything directly, ministers their own portfolio.
	const MINISTRY_POWERS: Record<string, string[]> = {
		economy: ["tax", "exploitation", "infrastructure", "school", "hospital", "power_plant"],
		foreign_affairs: ["border_control"],
		defense: ["fortifications"]
	};
	const autoFor = (type: string) =>
		data.isPresident || (!!data.userMinistry && (MINISTRY_POWERS[data.userMinistry]?.includes(type) ?? false));
	const canAutoExecute = $derived(() => !!$formData.proposalType && autoFor($formData.proposalType));

	const isTaxProposal = $derived($formData.proposalType === "tax");
	const isBorderControlProposal = $derived($formData.proposalType === "border_control");
	const isWarProposal = $derived($formData.proposalType === "declare_war");
	const isExploitationProposal = $derived($formData.proposalType === "exploitation");
	const isBuildingProposal = $derived(
		["hospital", "school", "power_plant", "infrastructure", "fortifications"].includes($formData.proposalType || "")
	);

	const isValidBuildingType = (type: string | undefined): type is BuildingType => {
		return (
			type !== undefined && ["hospital", "school", "power_plant", "infrastructure", "fortifications"].includes(type)
		);
	};

	const totalCosts = $derived(() => {
		if (!$formData.proposalType || !isBuildingProposal) return null;
		if (!isValidBuildingType($formData.proposalType)) return null;

		const template = data.buildingTemplates[$formData.proposalType];
		if (!template) return null;

		const quantity = 1;
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

	const progress = $derived(regionProgress($formData.regionId, $formData.proposalType));
	// Levels are built one at a time, so a region can take an order only when
	// nothing is going up there and it's below the maximum.
	const blocked = $derived(
		!!progress &&
			(progress.pending > 0 ||
				progress.level >= progress.max ||
				progress.infrastructure < progress.infrastructureRequired)
	);
</script>

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader
		title={canAutoExecute() ? "Enact" : "New Proposal"}
		subtitle={canAutoExecute() ? "Takes effect immediately" : "Parliament votes for 1 day · 60% to pass"}
		icon={canAutoExecute() ? FluentShieldTask20Filled : FluentDocument20Filled}
		backHref="/state/{data.state.id}/parliament"
		backLabel="{data.state.name} — Parliament"
	/>

	<!-- Form -->
	<div class="panel rounded-sm p-5">
		<form method="POST" action="?/createProposal" use:enhance class="space-y-6">
			<!-- Proposal Type -->
			<div>
				<label for="proposalType" class="field-label">
					Proposal Type <span class="text-red-400">*</span>
				</label>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each ["tax", "hospital", "school", "power_plant", "infrastructure", "fortifications", "border_control", "exploitation", "declare_war"] as type}
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
								<h4 class="font-bold text-[#f5efd8] capitalize text-sm">
									{type === "declare_war" ? "Declare war" : type.replace("_", " ")}
								</h4>
								{#if autoFor(type)}
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

			<!-- War declaration -->
			{#if isWarProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-3">
					<label for="targetStateId" class="field-label">
						Declare war on <span class="text-red-400">*</span>
					</label>
					{#if data.warTargets.length}
						<select
							id="targetStateId"
							name="targetStateId"
							bind:value={$formData.targetStateId}
							class="field-control rounded-sm px-3 py-2.5 w-full"
							disabled={$submitting}
						>
							<option value="" disabled selected>Choose a state…</option>
							{#each data.warTargets as target (target.id)}
								<option value={String(target.id)}>{target.name}</option>
							{/each}
						</select>
					{:else}
						<p class="text-sm text-[#a8a083]">There's no state you could declare war on.</p>
					{/if}
				</div>
			{/if}

			<!-- Border Control Fields -->
			{#if isBorderControlProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-6">
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

			<!-- Resource exploitation law -->
			{#if isExploitationProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-4">
					<p class="text-sm text-[#d3caa9]">
						How hard mines in this state may work its deposits. Harsher laws give more per shift now, but use up the
						deposits disproportionately fast; output also falls as a deposit runs low.
					</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each EXPLOITATION_POLICY_KEYS as key (key)}
							{@const policy = EXPLOITATION_POLICIES[key]}
							<button
								type="button"
								class="p-4 rounded-sm border text-left transition-colors {$formData.exploitationPolicy === key
									? 'bg-[#f2b01e]/12 border-[#f2b01e]/60'
									: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
								onclick={() => ($formData.exploitationPolicy = key)}
								disabled={$submitting}
							>
								<h4 class="font-bold text-[#f5efd8]">{policy.label}</h4>
								<p class="text-xs text-[#a8a083] mt-1">{policy.description}</p>
								<div class="mt-3 flex gap-4 text-xs">
									<span class="text-[#b9f29a]">Output ×{policy.outputMultiplier}</span>
									<span class="text-[#ffd35c]">Deposit drain ×{policy.depletionMultiplier}</span>
								</div>
								{#if data.exploitationPolicy === key}
									<span class="text-xs text-[#b9f29a] mt-2 block">✓ Current law</span>
								{/if}
							</button>
						{/each}
					</div>
					<input type="hidden" name="exploitationPolicy" value={$formData.exploitationPolicy ?? ""} />
					{#if $errors.exploitationPolicy}
						<p class="field-error">{$errors.exploitationPolicy}</p>
					{/if}
				</div>
			{/if}

			<!-- Building Construction Fields -->
			{#if isBuildingProposal}
				<div class="border-t border-[#c8b47a]/10 pt-6 space-y-6">
					{#if progress}
						{@const statLabel = data.buildingTemplates[$formData.proposalType as BuildingType].statLabel}
						<div class="panel-muted rounded-sm p-4 space-y-3">
							<div class="flex items-center justify-between gap-3">
								<span class="text-[10px] text-[#a8a083] uppercase tracking-wide">{statLabel}</span>
								<span class="font-mono text-sm text-[#f5efd8]">
									Level {progress.level}
									{#if !blocked}<span class="text-[#6fd14a]"> → {progress.level + 1}</span>{/if}
									<span class="text-[#a8a083]">/ {progress.max}</span>
								</span>
							</div>
							<div class="flex gap-0.5" aria-hidden="true">
								{#each Array(progress.max) as _, i}
									<div
										class="h-2 flex-1 rounded-full {i < progress.level
											? 'bg-[#6fd14a]'
											: i === progress.level && !blocked
												? 'bg-[#f2b01e] animate-pulse'
												: 'bg-[#1a1f15]'}"
									></div>
								{/each}
							</div>
							{#if progress.pending}
								<p class="text-xs text-[#ffd35c]">
									Level {progress.level + 1} is still under construction. The next level can be ordered once it's finished.
								</p>
							{:else if progress.infrastructure < progress.infrastructureRequired}
								<p class="text-xs text-red-300">
									Needs infrastructure level {progress.infrastructureRequired} here first (it has {progress.infrastructure}).
								</p>
							{:else if progress.level >= progress.max}
								<p class="text-xs text-red-300">Already at the maximum level.</p>
							{:else}
								<p class="text-xs text-[#a8a083]">Buildings go up one level at a time.</p>
							{/if}
						</div>
					{/if}

					<div>
						<label for="regionId" class="field-label">
							Region <span class="text-red-400">*</span>
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each data.regions as region}
								{@const p = regionProgress(region.id.toString(), $formData.proposalType)}
								<button
									type="button"
									class="p-4 rounded-sm border text-left transition-colors flex items-center gap-3 {$formData.regionId ===
									region.id.toString()
										? 'bg-[#f2b01e]/12 border-[#f2b01e]/60'
										: 'bg-[#1a1f15]/70 border-[#c8b47a]/15 hover:border-[#f2b01e]/55'}"
									onclick={() => ($formData.regionId = region.id.toString())}
									disabled={$submitting}
								>
									<img
										loading="lazy"
										decoding="async"
										src={regionCoatUrl(region.id)}
										alt={getRegionName(region.id)}
										class="w-12 h-12 rounded-sm"
									/>
									<div class="flex-1">
										<h4 class="font-bold text-[#f5efd8]">{getRegionName(region.id)}</h4>
										<p class="text-xs text-[#a8a083]">
											Infrastructure {region.infrastructure ?? 0}
											{#if p && $formData.proposalType !== "infrastructure"}
												· {proposalTypeIcons[$formData.proposalType || ""]} level {p.level}/{p.max}
											{/if}
											{#if p && p.infrastructure < p.infrastructureRequired}
												<span class="text-red-300">· needs {p.infrastructureRequired}</span>
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

					<input type="hidden" name="quantity" value="1" />

					{#if totalCosts()}
						{@const costs = totalCosts()}
						{#if costs}
							<ResourceRequirements {costs} available={availableResources()} />
						{/if}
					{/if}

					{#if $formData.proposalType && isValidBuildingType($formData.proposalType)}
						{@const template = data.buildingTemplates[$formData.proposalType]}
						{#if template}
							<div class="grid grid-cols-3 gap-2 text-xs text-[#a8a083] panel-muted rounded-sm p-4">
								<div>
									<span class="text-[#a8a083]/70">Takes:</span>
									<div class="text-[#f5efd8]">{template.constructionTime} days</div>
								</div>
								<div>
									<span class="text-[#a8a083]/70">Needs infrastructure:</span>
									<div class="text-[#f5efd8]">{template.infrastructureRequired}</div>
								</div>
								<div>
									<span class="text-[#a8a083]/70">Each adds:</span>
									<div class="text-[#f5efd8]">+1 {template.statLabel.toLowerCase()}</div>
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
						(isWarProposal && !$formData.targetStateId) ||
						(isExploitationProposal &&
							(!$formData.exploitationPolicy || $formData.exploitationPolicy === data.exploitationPolicy)) ||
						(isBuildingProposal && (!$formData.regionId || blocked || (canAutoExecute() && !canAfford())))}
				>
					{canAutoExecute() ? "Execute Immediately" : "Submit Proposal"}
				</Button>
			</div>
		</form>
	</div>
</PageContainer>
