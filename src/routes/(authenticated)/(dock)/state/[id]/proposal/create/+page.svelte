<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/create/+page.svelte -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProposalSchema } from "./schema";

	const { data } = $props();

	let isMinisterialAction = $state(false);

	const form = superForm(data.form, {
		validators: valibotClient(createProposalSchema)
	});

	const { form: formData, errors, enhance, delayed, submitting } = form;

	const proposalTypeColors: Record<string, string> = {
		tax: "bg-amber-600/20 text-amber-400 border-amber-500/30",
		hospital: "bg-pink-600/20 text-pink-400 border-pink-500/30",
		school: "bg-purple-600/20 text-purple-400 border-purple-500/30",
		power_plant: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
		road: "bg-blue-600/20 text-blue-400 border-blue-500/30",
		bridge: "bg-cyan-600/20 text-cyan-400 border-cyan-500/30"
	};

	const proposalTypeIcons: Record<string, string> = {
		tax: "💰",
		hospital: "🏥",
		school: "🏫",
		power_plant: "⚡",
		road: "🛣️",
		bridge: "🌉"
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
		infrastructure: ["road", "bridge", "power_plant"],
		education: ["school"],
		health: ["hospital"]
	};

	const canExecuteDirectly = (type: string) => {
		if (!data.userMinistry) return false;
		return ministryPermissions[data.userMinistry]?.includes(type) || false;
	};

	const isTaxProposal = $derived($formData.proposalType === "tax");
	const isBuildingProposal = $derived(
		["hospital", "school", "power_plant", "road", "bridge"].includes($formData.proposalType || "")
	);
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
			<!-- Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-300 mb-2">
					Description <span class="text-red-400">*</span>
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={$formData.description}
					rows="10"
					placeholder="Provide a detailed description of the proposal, including objectives, methods, and expected outcomes..."
					maxlength="2000"
					class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
					class:textarea-error={$errors.description}
					disabled={$submitting}
				></textarea>
				{#if $errors.description}
					<p class="text-xs text-red-400 mt-1">{$errors.description}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$formData.description?.length || 0}/2000 characters</p>
				{/if}
			</div>

			<!-- Proposal Type -->
			<div>
				<label for="proposalType" class="block text-sm font-medium text-gray-300 mb-2">
					Proposal Type <span class="text-red-400">*</span>
				</label>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each ["tax", "hospital", "school", "power_plant", "road", "bridge"] as type}
						<button
							type="button"
							class="p-4 rounded-lg border-2 text-left transition-all {$formData.proposalType === type
								? proposalTypeColors[type]
								: 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'}"
							onclick={() => ($formData.proposalType = type)}
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

					<!-- Tax Name -->
					<div>
						<label for="taxName" class="block text-sm font-medium text-gray-300 mb-2">
							Tax Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="taxName"
							name="taxName"
							bind:value={$formData.taxName}
							placeholder="e.g., Regional Mining Tax"
							maxlength="100"
							class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50"
							class:input-error={$errors.taxName}
							disabled={$submitting}
						/>
						{#if $errors.taxName}
							<p class="text-xs text-red-400 mt-1">{$errors.taxName}</p>
						{/if}
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
									onclick={() => ($formData.taxType = type)}
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
							class="range range-warning"
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

						<!-- Tax Impact Preview -->
						{#if $formData.taxRate && $formData.taxType}
							<div class="bg-slate-700/30 rounded-lg p-4 mt-3 space-y-2">
								<p class="text-sm font-semibold text-white">Tax Impact Example:</p>
								{#if $formData.taxType === "mining"}
									<p class="text-sm text-gray-300">
										On 1,500 currency wage: <strong class="text-amber-400"
											>{Math.floor(1500 * ($formData.taxRate / 100))} tax</strong
										>, worker receives <strong>{1500 - Math.floor(1500 * ($formData.taxRate / 100))}</strong>
									</p>
								{:else if $formData.taxType === "production"}
									<p class="text-sm text-gray-300">
										On 10,000 currency cost: <strong class="text-amber-400"
											>{Math.floor(10000 * ($formData.taxRate / 100))} tax</strong
										>
									</p>
								{:else if $formData.taxType === "market_transaction"}
									<p class="text-sm text-gray-300">
										On 5,000 currency sale: <strong class="text-amber-400"
											>{Math.floor(5000 * ($formData.taxRate / 100))} tax</strong
										>, seller receives <strong>{5000 - Math.floor(5000 * ($formData.taxRate / 100))}</strong>
									</p>
								{:else if $formData.taxType === "income"}
									<p class="text-sm text-gray-300">
										On 2,000 currency income: <strong class="text-amber-400"
											>{Math.floor(2000 * ($formData.taxRate / 100))} tax</strong
										>, earner receives <strong>{2000 - Math.floor(2000 * ($formData.taxRate / 100))}</strong>
									</p>
								{/if}
							</div>
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
						<p class="text-sm text-gray-300">Funds will be taken from the state treasury.</p>
					</div>

					<!-- Building Name -->
					<div>
						<label for="buildingName" class="block text-sm font-medium text-gray-300 mb-2">
							Building Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="buildingName"
							name="buildingName"
							bind:value={$formData.buildingName}
							placeholder="e.g., Central City Hospital"
							maxlength="100"
							class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50"
							class:input-error={$errors.buildingName}
							disabled={$submitting}
						/>
						{#if $errors.buildingName}
							<p class="text-xs text-red-400 mt-1">{$errors.buildingName}</p>
						{/if}
					</div>

					<!-- Region Selection -->
					<div>
						<label for="regionId" class="block text-sm font-medium text-gray-300 mb-2">
							Region <span class="text-red-400">*</span>
						</label>
						<select
							id="regionId"
							name="regionId"
							bind:value={$formData.regionId}
							class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-blue-500/50"
							class:select-error={$errors.regionId}
							disabled={$submitting}
						>
							<option value="" disabled>Select region</option>
							{#each data.regions as region}
								<option value={region.id}>{region.name}</option>
							{/each}
						</select>
						{#if $errors.regionId}
							<p class="text-xs text-red-400 mt-1">{$errors.regionId}</p>
						{/if}
					</div>

					<!-- Estimated Cost -->
					<div>
						<label for="estimatedCost" class="block text-sm font-medium text-gray-300 mb-2">
							Estimated Cost (currency) <span class="text-red-400">*</span>
						</label>
						<input
							type="number"
							id="estimatedCost"
							name="estimatedCost"
							bind:value={$formData.estimatedCost}
							min="1000"
							placeholder="50000"
							class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50"
							class:input-error={$errors.estimatedCost}
							disabled={$submitting}
						/>
						{#if $errors.estimatedCost}
							<p class="text-xs text-red-400 mt-1">{$errors.estimatedCost}</p>
						{/if}
					</div>

					<input type="hidden" name="buildingType" value={$formData.proposalType} />
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
						(isTaxProposal && (!$formData.taxType || !$formData.taxRate || !$formData.taxName)) ||
						(isBuildingProposal && (!$formData.buildingName || !$formData.regionId || !$formData.estimatedCost))}
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
