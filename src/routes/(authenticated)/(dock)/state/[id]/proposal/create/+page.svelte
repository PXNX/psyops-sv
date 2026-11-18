<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.svelte -->
<!-- Drafting a bill: a legislative form with a subject to tick, the
     provisions for that subject, and the signature line. -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProposalSchema } from "./schema";
	import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, SearchSelect } from "#lib/component/ui/index.js";
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

	const PROPOSAL_TYPES: { type: ProposalType; label: string }[] = [
		{ type: "tax", label: "Taxation" },
		{ type: "hospital", label: "Hospital" },
		{ type: "school", label: "School" },
		{ type: "power_plant", label: "Power plant" },
		{ type: "infrastructure", label: "Infrastructure" },
		{ type: "fortifications", label: "Fortifications" },
		{ type: "border_control", label: "Border control" },
		{ type: "exploitation", label: "Resource law" },
		{ type: "declare_war", label: "Declaration of war" }
	];
	const typeLabel = (t: string | undefined) => PROPOSAL_TYPES.find((p) => p.type === t)?.label ?? "";

	const TAX_TYPES: { type: "mining" | "production" | "market_transaction" | "income"; label: string; hint: string }[] =
		[
			{ type: "mining", label: "Mining", hint: "on mined resources" },
			{ type: "production", label: "Production", hint: "on manufactured goods" },
			{ type: "market_transaction", label: "Market sales", hint: "paid by the seller" },
			{ type: "income", label: "Income", hint: "on wages" }
		];

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

	/** A box on the form: ticked when chosen. */
	const box = (on: boolean) =>
		`size-5 shrink-0 rounded-[2px] border-2 flex items-center justify-center transition-colors ${
			on ? "border-primary bg-primary/20 text-primary-fg" : "border-line/40 text-transparent"
		}`;
	const option = (on: boolean) =>
		`press-spring tap-target w-full flex items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors ${
			on ? "border-primary/60 bg-primary/10" : "border-line/15 bg-surface-4/60 hover:border-primary/40"
		}`;
</script>

<PageContainer maxWidth="3xl">
	<PageHeader
		title={canAutoExecute() ? "Decree" : "Draft a Bill"}
		subtitle={canAutoExecute() ? "Takes effect on signing" : "1 day of voting · 60% to pass"}
		icon={canAutoExecute() ? FluentShieldTask20Filled : FluentDocument20Filled}
		backHref="/state/{data.state.id}/parliament"
		backLabel="Parliament"
	/>

	<form method="POST" action="?/createProposal" use:enhance class="panel rounded-sm overflow-hidden">
		<!-- Paper heading -->
		<div class="px-5 pt-5 pb-4 text-center border-b-2 border-double border-line/30">
			<p class="text-[10px] uppercase tracking-[0.3em] text-fg-muted">Parliament of {data.state.name}</p>
			<h2 class="mt-1 font-serif text-2xl font-black text-fg">
				{#if $formData.proposalType}
					{#key $formData.proposalType}
						<span class="inline-block animate-pop-in">{typeLabel($formData.proposalType)} Bill</span>
					{/key}
				{:else}
					A Bill
				{/if}
			</h2>
		</div>

		<div class="p-5 space-y-6">
			<!-- Clause 1: subject -->
			<fieldset>
				<legend class="field-label">
					<span class="font-serif text-fg-muted mr-1">§ 1</span> Subject <span class="text-red-400">*</span>
				</legend>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each PROPOSAL_TYPES as { type, label } (type)}
						{@const on = $formData.proposalType === type}
						<button
							type="button"
							class={option(on)}
							onclick={() => ($formData.proposalType = type)}
							disabled={$submitting}
							aria-pressed={on}
						>
							<span class={box(on)}><FluentCheckmark20Filled class="size-4" /></span>
							<span
								class="flex-1 min-w-0 text-sm font-semibold truncate {type === 'declare_war'
									? 'text-red-300'
									: 'text-fg'}">{label}</span
							>
							{#if autoFor(type)}
								<span class="shrink-0 text-[10px] uppercase tracking-wide text-positive-fg">Decree</span>
							{/if}
						</button>
					{/each}
				</div>
				<input type="hidden" name="proposalType" value={$formData.proposalType} />
				{#if $errors.proposalType}
					<p class="field-error">{$errors.proposalType}</p>
				{/if}
			</fieldset>

			<!-- Clause 2: provisions -->
			{#if isTaxProposal}
				<div class="pt-6 border-t border-dashed border-line/20 space-y-5 animate-rise-in">
					<fieldset>
						<legend class="field-label">
							<span class="font-serif text-fg-muted mr-1">§ 2</span> Tax <span class="text-red-400">*</span>
						</legend>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each TAX_TYPES as tax (tax.type)}
								{@const on = $formData.taxType === tax.type}
								<button
									type="button"
									class={option(on)}
									onclick={() => ($formData.taxType = tax.type)}
									disabled={$submitting}
									aria-pressed={on}
								>
									<span class={box(on)}><FluentCheckmark20Filled class="size-4" /></span>
									<span class="min-w-0">
										<span class="block text-sm font-semibold text-fg">{tax.label}</span>
										<span class="block text-xs text-fg-muted">{tax.hint}</span>
									</span>
								</button>
							{/each}
						</div>
						<input type="hidden" name="taxType" value={$formData.taxType} />
						{#if $errors.taxType}
							<p class="field-error">{$errors.taxType}</p>
						{/if}
					</fieldset>

					<div>
						<label for="taxRate" class="field-label flex items-baseline justify-between">
							<span><span class="font-serif text-fg-muted mr-1">§ 3</span> Rate</span>
							{#key $formData.taxRate}
								<span class="font-mono text-lg font-bold text-primary-fg animate-tick">{$formData.taxRate || 0}%</span>
							{/key}
						</label>
						<input
							type="range"
							id="taxRate"
							name="taxRate"
							min="1"
							max="50"
							bind:value={$formData.taxRate}
							class="range range-sm w-full text-primary"
							disabled={$submitting}
						/>
						<div class="flex justify-between text-[10px] font-mono text-fg-muted px-1 mt-1">
							<span>1%</span>
							<span>25%</span>
							<span>50%</span>
						</div>
						{#if $errors.taxRate}
							<p class="field-error">{$errors.taxRate}</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if isWarProposal}
				<div class="pt-6 border-t border-dashed border-red-500/30 space-y-2 animate-rise-in">
					<label for="targetStateId" class="field-label">
						<span class="font-serif text-fg-muted mr-1">§ 2</span> War is declared on
						<span class="text-red-400">*</span>
					</label>
					{#if data.warTargets.length}
						<SearchSelect
							id="targetStateId"
							name="targetStateId"
							items={data.warTargets}
							bind:value={$formData.targetStateId}
							placeholder="Choose a state…"
							searchPlaceholder="Search states…"
							empty="No state by that name."
							disabled={$submitting}
						/>
						{#if $errors.targetStateId}
							<p class="field-error">{$errors.targetStateId}</p>
						{/if}
					{:else}
						<p class="text-sm text-fg-muted">No state you could declare war on.</p>
					{/if}
				</div>
			{/if}

			{#if isBorderControlProposal}
				<fieldset class="pt-6 border-t border-dashed border-line/20 animate-rise-in">
					<legend class="field-label">
						<span class="font-serif text-fg-muted mr-1">§ 2</span> The borders shall be
						<span class="text-red-400">*</span>
					</legend>
					<div class="grid grid-cols-2 gap-2">
						{#each [{ v: "open" as const, label: "Open", hint: "Visas approved automatically" }, { v: "closed" as const, label: "Closed", hint: `$${data.borderMaintenanceCost.toLocaleString()}/day` }] as opt (opt.v)}
							{@const on = $formData.borderStatus === opt.v}
							<button
								type="button"
								class={option(on)}
								onclick={() => ($formData.borderStatus = opt.v)}
								disabled={$submitting}
								aria-pressed={on}
							>
								<span class={box(on)}><FluentCheckmark20Filled class="size-4" /></span>
								<span class="min-w-0">
									<span class="block text-sm font-semibold text-fg">
										{opt.label}
										{#if data.border?.status === opt.v}
											<span class="text-[10px] font-normal uppercase tracking-wide text-fg-muted"> · now</span>
										{/if}
									</span>
									<span class="block text-xs text-fg-muted truncate">{opt.hint}</span>
								</span>
							</button>
						{/each}
					</div>
					<input type="hidden" name="borderStatus" value={$formData.borderStatus} />
					{#if $errors.borderStatus}
						<p class="field-error">{$errors.borderStatus}</p>
					{/if}
				</fieldset>
			{/if}

			{#if isExploitationProposal}
				<fieldset class="pt-6 border-t border-dashed border-line/20 animate-rise-in">
					<legend class="field-label">
						<span class="font-serif text-fg-muted mr-1">§ 2</span> Mines may work deposits under
						<span class="text-red-400">*</span>
					</legend>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each EXPLOITATION_POLICY_KEYS as key (key)}
							{@const policy = EXPLOITATION_POLICIES[key]}
							{@const on = $formData.exploitationPolicy === key}
							<button
								type="button"
								class={option(on)}
								onclick={() => ($formData.exploitationPolicy = key)}
								disabled={$submitting}
								aria-pressed={on}
							>
								<span class={box(on)}><FluentCheckmark20Filled class="size-4" /></span>
								<span class="min-w-0 flex-1">
									<span class="block text-sm font-semibold text-fg">
										{policy.label}
										{#if data.exploitationPolicy === key}
											<span class="text-[10px] font-normal uppercase tracking-wide text-fg-muted"> · in force</span>
										{/if}
									</span>
									<span class="block text-xs font-mono">
										<span class="text-positive-fg">output ×{policy.outputMultiplier}</span>
										<span class="text-primary-fg ml-2">drain ×{policy.depletionMultiplier}</span>
									</span>
								</span>
							</button>
						{/each}
					</div>
					<input type="hidden" name="exploitationPolicy" value={$formData.exploitationPolicy ?? ""} />
					{#if $errors.exploitationPolicy}
						<p class="field-error">{$errors.exploitationPolicy}</p>
					{/if}
				</fieldset>
			{/if}

			{#if isBuildingProposal}
				<div class="pt-6 border-t border-dashed border-line/20 space-y-5 animate-rise-in">
					<fieldset>
						<legend class="field-label">
							<span class="font-serif text-fg-muted mr-1">§ 2</span> To be built in
							<span class="text-red-400">*</span>
						</legend>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each data.regions as region (region.id)}
								{@const p = regionProgress(region.id.toString(), $formData.proposalType)}
								{@const on = $formData.regionId === region.id.toString()}
								<button
									type="button"
									class={option(on)}
									onclick={() => ($formData.regionId = region.id.toString())}
									disabled={$submitting}
									aria-pressed={on}
								>
									<span class={box(on)}><FluentCheckmark20Filled class="size-4" /></span>
									<img
										loading="lazy"
										decoding="async"
										src={regionCoatUrl(region.id)}
										alt=""
										class="size-8 rounded-sm shrink-0"
									/>
									<span class="min-w-0">
										<span class="block text-sm font-semibold text-fg truncate">{getRegionName(region.id)}</span>
										<span class="block text-xs text-fg-muted truncate">
											Infra {region.infrastructure ?? 0}{#if p && $formData.proposalType !== "infrastructure"}
												· level {p.level}/{p.max}{/if}{#if p && p.infrastructure < p.infrastructureRequired}
												<span class="text-red-300"> · needs infra {p.infrastructureRequired}</span>{/if}
										</span>
									</span>
								</button>
							{/each}
						</div>
						<input type="hidden" name="regionId" value={$formData.regionId} />
						{#if $errors.regionId}
							<p class="field-error">{$errors.regionId}</p>
						{/if}
					</fieldset>

					{#if progress}
						{@const statLabel = data.buildingTemplates[$formData.proposalType as BuildingType].statLabel}
						<div class="panel-muted rounded-sm p-3 space-y-2">
							<div class="flex items-center justify-between gap-3">
								<span class="text-[10px] text-fg-muted uppercase tracking-wide">{statLabel}</span>
								<span class="font-mono text-sm text-fg">
									Level {progress.level}
									{#if !blocked}<span class="text-positive"> → {progress.level + 1}</span>{/if}
									<span class="text-fg-muted">/ {progress.max}</span>
								</span>
							</div>
							<div class="flex gap-0.5" aria-hidden="true">
								{#each Array(progress.max) as _, i (i)}
									<div
										class="h-2 flex-1 rounded-full {i < progress.level
											? 'bg-positive'
											: i === progress.level && !blocked
												? 'bg-primary animate-pulse'
												: 'bg-surface-4'}"
									></div>
								{/each}
							</div>
							{#if progress.pending}
								<p class="text-xs text-primary-fg">Level {progress.level + 1} is still under construction.</p>
							{:else if progress.infrastructure < progress.infrastructureRequired}
								<p class="text-xs text-red-300">
									Needs infrastructure {progress.infrastructureRequired} (has {progress.infrastructure}).
								</p>
							{:else if progress.level >= progress.max}
								<p class="text-xs text-red-300">Already at the maximum level.</p>
							{/if}
						</div>
					{/if}

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
							<dl class="grid grid-cols-3 gap-2 text-xs">
								<div class="panel-muted rounded-sm p-2.5">
									<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Build time</dt>
									<dd class="font-mono text-fg">{template.constructionTime} days</dd>
								</div>
								<div class="panel-muted rounded-sm p-2.5">
									<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Infra needed</dt>
									<dd class="font-mono text-fg">{template.infrastructureRequired}</dd>
								</div>
								<div class="panel-muted rounded-sm p-2.5 min-w-0">
									<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Adds</dt>
									<dd class="text-fg truncate">+1 {template.statLabel.toLowerCase()}</dd>
								</div>
							</dl>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Signature line -->
		<div
			class="px-5 py-4 border-t-2 border-double border-line/30 bg-surface-4/50 flex flex-col-reverse sm:flex-row gap-3"
		>
			<Button href="/state/{data.state.id}/parliament" variant="secondary" grow>Cancel</Button>
			<Button
				type="submit"
				variant="primary"
				grow
				icon={canAutoExecute() ? FluentShieldTask20Filled : FluentDocument20Filled}
				loading={$delayed}
				loadingText={canAutoExecute() ? "Signing..." : "Tabling..."}
				disabled={$submitting ||
					(isTaxProposal && (!$formData.taxType || !$formData.taxRate)) ||
					(isBorderControlProposal && !$formData.borderStatus) ||
					(isWarProposal && !$formData.targetStateId) ||
					(isExploitationProposal &&
						(!$formData.exploitationPolicy || $formData.exploitationPolicy === data.exploitationPolicy)) ||
					(isBuildingProposal && (!$formData.regionId || blocked || (canAutoExecute() && !canAfford())))}
			>
				{canAutoExecute() ? "Sign into Law" : "Table the Bill"}
			</Button>
		</div>
	</form>
</PageContainer>
