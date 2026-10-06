<!-- src/routes/factory/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editFactorySchema } from "./schema";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentArrowTrending20Filled from "~icons/fluent/arrow-trending-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editFactorySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();

		const minutes = Math.floor(diff / (1000 * 60));

		if (minutes >= 60) {
			return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		const d = new Date(cooldownEnd);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function getWagePosition(): string {
		if (!data.wageStats.highestInRegion) return "Unknown";

		const current = $form.workerWage;
		const highest = data.wageStats.highestInRegion;
		const average = data.wageStats.averageInRegion || 0;

		if (current >= highest) return "Highest";
		if (current >= average) return "Above Average";
		if (current >= average * 0.8) return "Average";
		return "Below Average";
	}

	function getWageColor(): string {
		const position = getWagePosition();
		if (position === "Highest") return "text-[#b9f29a]";
		if (position === "Above Average") return "text-[#b3dcff]";
		if (position === "Average") return "text-[#ffd35c]";
		return "text-red-300";
	}

	const canEdit = $derived(!data.isOnCooldown && data.canAfford);

	// Reactive wage comparison
	const wageComparison = $derived.by(() => {
		const current = $form.workerWage;
		const highest = data.wageStats.highestInRegion || 0;
		const average = data.wageStats.averageInRegion || 0;

		return {
			vsHighest: highest > 0 ? Math.round(((current - highest) / highest) * 100) : 0,
			vsAverage: average > 0 ? Math.round(((current - average) / average) * 100) : 0,
			isCompetitive: current >= average * 0.9
		};
	});
</script>

<PageContainer maxWidth="3xl">
	<PageHeader
		title="Edit Factory"
		subtitle={data.factory.name}
		icon={FluentFactory20Filled}
		backHref="/factory/{data.factory.id}"
		backLabel="Factory"
	/>

	<!-- Factory Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Workers -->
		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<div class="size-10 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
				<FluentPeople20Filled class="size-5 text-[#5eaef5]" />
			</div>
			<div class="min-w-0">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Workers</p>
				<p class="text-lg font-bold text-[#f5efd8]">{data.factory.currentWorkers}/{data.factory.maxWorkers}</p>
			</div>
		</div>

		<!-- Current Wage -->
		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<div class="size-10 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm flex items-center justify-center">
				<FluentMoney20Filled class="size-5 text-[#6fd14a]" />
			</div>
			<div class="min-w-0">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Current Wage</p>
				<p class="text-lg font-bold text-[#f5efd8] font-mono">{data.factory.workerWage.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<!-- Regional Wage Analysis -->
	{#if data.wageStats.highestInRegion || data.wageStats.averageInRegion}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentChartMultiple20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Regional Wage Analysis</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Highest Wage -->
				{#if data.wageStats.highestInRegion}
					<div class="panel-muted rounded-sm p-4">
						<div class="flex items-center justify-between mb-2">
							<p class="text-sm text-[#a8a083]">Highest in Region</p>
							<FluentArrowTrending20Filled class="size-4 text-[#6fd14a]" />
						</div>
						<p class="text-2xl font-bold text-[#f5efd8] font-mono">{data.wageStats.highestInRegion.toLocaleString()}</p>
						<p class="text-xs text-[#a8a083] mt-1">
							{data.wageStats.highestInRegion > data.factory.workerWage
								? `${(((data.wageStats.highestInRegion - data.factory.workerWage) / data.factory.workerWage) * 100).toFixed(0)}% more`
								: "You're at the top!"}
						</p>
					</div>
				{/if}

				<!-- Average Wage -->
				{#if data.wageStats.averageInRegion}
					<div class="panel-muted rounded-sm p-4">
						<div class="flex items-center justify-between mb-2">
							<p class="text-sm text-[#a8a083]">Regional Average</p>
							<FluentChartMultiple20Filled class="size-4 text-[#5eaef5]" />
						</div>
						<p class="text-2xl font-bold text-[#f5efd8] font-mono">{data.wageStats.averageInRegion.toLocaleString()}</p>
						<p class="text-xs text-[#a8a083] mt-1">
							Based on {data.wageStats.totalFactoriesInRegion} factories
						</p>
					</div>
				{/if}

				<!-- Your Position -->
				<div class="panel-muted rounded-sm p-4">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm text-[#a8a083]">Your Position</p>
						<FluentLocation20Filled class="size-4 text-[#c08cf0]" />
					</div>
					<p class="text-2xl font-bold {getWageColor()}">{getWagePosition()}</p>
					<p class="text-xs text-[#a8a083] mt-1">
						{data.wageStats.factoriesPayingMore} factories pay more
					</p>
				</div>
			</div>

			<!-- Live Wage Comparison -->
			{#if data.wageStats.highestInRegion && data.wageStats.averageInRegion}
				<div class="bg-[#2369b5]/18 rounded-sm p-4 border border-[#5eaef5]/30">
					<div class="flex items-center gap-2 mb-3">
						<FluentInfo20Filled class="size-4 text-[#5eaef5]" />
						<h3 class="text-sm font-semibold text-[#b3dcff]">Live Comparison</h3>
					</div>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-[#a8a083]">vs. Highest:</p>
							<p class="text-[#f5efd8] font-semibold">
								{wageComparison.vsHighest > 0 ? "+" : ""}{wageComparison.vsHighest}%
							</p>
						</div>
						<div>
							<p class="text-[#a8a083]">vs. Average:</p>
							<p class="text-[#f5efd8] font-semibold">
								{wageComparison.vsAverage > 0 ? "+" : ""}{wageComparison.vsAverage}%
							</p>
						</div>
					</div>
					{#if !wageComparison.isCompetitive}
						<p class="text-xs text-[#b3dcff] mt-3">
							💡 Tip: Increasing wages to at least {Math.round(data.wageStats.averageInRegion * 0.9).toLocaleString()} would
							make your factory more competitive.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Top Paying Factories -->
			{#if data.wageStats.topFactories.length > 0}
				<div>
					<h3 class="text-sm font-semibold text-[#e6ddbf] mb-3">Top Paying Factories in Region</h3>
					<div class="space-y-2">
						{#each data.wageStats.topFactories as factory, i}
							<div class="flex items-center justify-between panel-muted rounded-sm p-3">
								<div class="flex items-center gap-3">
									<span class="text-xs font-bold text-[#a8a083]">#{i + 1}</span>
									<div>
										<p class="text-sm font-medium text-[#f5efd8]">{factory.name}</p>
										<p class="text-xs text-[#a8a083] capitalize">{factory.type}</p>
									</div>
								</div>
								<span class="text-sm font-bold text-[#b9f29a] font-mono">{factory.wage.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Edit Cooldown Active</h3>
					<p class="text-red-300 text-sm leading-relaxed">
						You recently made changes to a factory. You must wait before editing again.
					</p>
					<div class="bg-red-600/10 border border-red-500/20 rounded-sm p-3 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-red-200 text-sm font-medium">Time Remaining:</span>
							<span class="text-red-200 text-sm font-bold font-mono">{formatTimeRemaining(data.cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-red-300/70">Available on:</span>
							<span class="text-red-300 font-mono">{formatCooldownDate(data.cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford && !data.isOnCooldown}
		<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-[#ffd35c] shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-[#ffd35c] text-lg">Insufficient Funds</h3>
					<p class="text-[#e6ddbf] text-sm leading-relaxed">
						You need <strong>{data.editCost.toLocaleString()}</strong> currency to edit the factory. Current balance:
						<strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-[#f2b01e]/10 border border-[#f2b01e]/20 rounded-sm p-3">
						<p class="text-[#ffd35c] text-sm font-medium">
							Needed: {(data.editCost - data.userBalance).toLocaleString()} more currency
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success Message -->
	{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("wait") && !$message.includes("Insufficient")}
		<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("wait") || $message.includes("Insufficient"))}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" action="?/update" use:enhance class="space-y-6">
		<!-- Factory Details -->
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentFactory20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Factory Details</h2>
			</div>

			<!-- Factory Info (Read-only) -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 panel-muted rounded-sm p-4">
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Company</p>
					<a
						href="/company/{data.factory.company.id}"
						class="text-sm text-[#b3dcff] hover:text-[#ffcf47] transition-colors"
					>
						{data.factory.company.name}
					</a>
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Type</p>
					<p class="text-sm text-[#f5efd8] capitalize">{data.factory.factoryType}</p>
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Output</p>
					<p class="text-sm text-[#f5efd8] capitalize">{data.factory.resourceOutput || data.factory.productOutput}</p>
				</div>
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Production Rate</p>
					<p class="text-sm text-[#f5efd8]">{data.factory.productionRate} per shift</p>
				</div>
			</div>

			<!-- Editable Fields -->
			<div class="space-y-4">
				<div>
					<label for="name" class="field-label">
						Factory Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Northern Steel Mill"
						maxlength="100"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						class:input-error={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>

				<div>
					<label for="workerWage" class="field-label">
						Worker Wage per Shift <span class="text-red-400">*</span>
					</label>
					<div class="relative">
						<input
							type="number"
							id="workerWage"
							name="workerWage"
							bind:value={$form.workerWage}
							min="100"
							max="1000000"
							step="100"
							class="field-control rounded-sm pr-3 py-2.5 w-full pl-8"
							class:input-error={$errors.workerWage}
							disabled={$submitting || !canEdit}
						/>
						<FluentMoney20Filled class="size-4 text-[#a8a083] absolute left-3 top-1/2 -translate-y-1/2" />
					</div>
					{#if $errors.workerWage}
						<p class="field-error">{$errors.workerWage}</p>
					{:else}
						<div class="flex items-center justify-between text-xs text-[#a8a083] mt-1">
							<span>Min: 100 • Max: 1,000,000</span>
							<span class={getWageColor()}>{getWagePosition()}</span>
						</div>
					{/if}

					<!-- Wage Impact Preview -->
					{#if data.factory.currentWorkers > 0}
						<div class="mt-3 panel-muted rounded-sm p-3">
							<p class="text-xs text-[#a8a083] mb-2">💰 Cost Impact per Shift:</p>
							<div class="flex items-center justify-between">
								<span class="text-sm text-[#d3caa9]">Current:</span>
								<span class="text-sm font-semibold text-[#f5efd8] font-mono">
									{(data.factory.workerWage * data.factory.currentWorkers).toLocaleString()}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-[#d3caa9]">New:</span>
								<span class="text-sm font-semibold text-[#b9f29a] font-mono">
									{($form.workerWage * data.factory.currentWorkers).toLocaleString()}
								</span>
							</div>
							<div class="flex items-center justify-between pt-2 border-t border-[#c8b47a]/15 mt-2">
								<span class="text-sm font-medium text-[#e6ddbf]">Difference:</span>
								<span
									class="text-sm font-bold font-mono {$form.workerWage - data.factory.workerWage > 0
										? 'text-red-400'
										: 'text-[#b9f29a]'}"
								>
									{$form.workerWage - data.factory.workerWage > 0 ? "+" : ""}
									{(($form.workerWage - data.factory.workerWage) * data.factory.currentWorkers).toLocaleString()}
								</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Resource Requirements -->
		<div class="panel rounded-sm p-5 space-y-2">
			<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
			<div class="flex gap-3">
				<Button variant="secondary" grow href="/factory/{data.factory.id}" disabled={$submitting}>Cancel</Button>
				<Button
					type="submit"
					variant="primary"
					grow
					disabled={$submitting || !canEdit}
					loading={$delayed}
					loadingText="Saving..."
					icon={FluentCheckmark20Filled}
				>
					Save Changes
				</Button>
			</div>
		</div>

		<!-- Info Box -->
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
			<p class="text-sm text-[#b3dcff]">
				💡 <strong>Note:</strong> Changes cost {data.editCost.toLocaleString()} from your personal wallet and have a {data.cooldownHours}-hour
				cooldown. Competitive wages attract better workers!
			</p>
		</div>
	</form>
</PageContainer>
