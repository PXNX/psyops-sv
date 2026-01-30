<!-- src/routes/factory/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editFactorySchema } from "./schema";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
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
		return new Date(cooldownEnd).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
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
		if (position === "Highest") return "text-green-400";
		if (position === "Above Average") return "text-blue-400";
		if (position === "Average") return "text-yellow-400";
		return "text-orange-400";
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

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/factory/{data.factory.id}" class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit Factory</h1>
				<p class="text-gray-400">{data.factory.name}</p>
			</div>
		</div>
	</div>

	<!-- Factory Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Workers -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentPeople20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Workers</p>
					<p class="text-lg font-bold text-white">{data.factory.currentWorkers}/{data.factory.maxWorkers}</p>
				</div>
			</div>
		</div>

		<!-- Current Wage -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Current Wage</p>
					<p class="text-lg font-bold text-white">{data.factory.workerWage.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Regional Wage Analysis -->
	{#if data.wageStats.highestInRegion || data.wageStats.averageInRegion}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-4">
			<div class="flex items-center gap-2">
				<FluentChartMultiple20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Regional Wage Analysis</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Highest Wage -->
				{#if data.wageStats.highestInRegion}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
						<div class="flex items-center justify-between mb-2">
							<p class="text-sm text-gray-400">Highest in Region</p>
							<FluentArrowTrending20Filled class="size-4 text-green-400" />
						</div>
						<p class="text-2xl font-bold text-white">{data.wageStats.highestInRegion.toLocaleString()}</p>
						<p class="text-xs text-gray-500 mt-1">
							{data.wageStats.highestInRegion > data.factory.workerWage
								? `${(((data.wageStats.highestInRegion - data.factory.workerWage) / data.factory.workerWage) * 100).toFixed(0)}% more`
								: "You're at the top!"}
						</p>
					</div>
				{/if}

				<!-- Average Wage -->
				{#if data.wageStats.averageInRegion}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
						<div class="flex items-center justify-between mb-2">
							<p class="text-sm text-gray-400">Regional Average</p>
							<FluentChartMultiple20Filled class="size-4 text-blue-400" />
						</div>
						<p class="text-2xl font-bold text-white">{data.wageStats.averageInRegion.toLocaleString()}</p>
						<p class="text-xs text-gray-500 mt-1">
							Based on {data.wageStats.totalFactoriesInRegion} factories
						</p>
					</div>
				{/if}

				<!-- Your Position -->
				<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm text-gray-400">Your Position</p>
						<FluentLocation20Filled class="size-4 text-purple-400" />
					</div>
					<p class="text-2xl font-bold {getWageColor()}">{getWagePosition()}</p>
					<p class="text-xs text-gray-500 mt-1">
						{data.wageStats.factoriesPayingMore} factories pay more
					</p>
				</div>
			</div>

			<!-- Live Wage Comparison -->
			{#if data.wageStats.highestInRegion && data.wageStats.averageInRegion}
				<div class="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
					<div class="flex items-center gap-2 mb-3">
						<FluentInfo20Filled class="size-4 text-blue-400" />
						<h3 class="text-sm font-semibold text-blue-300">Live Comparison</h3>
					</div>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-blue-200/70">vs. Highest:</p>
							<p class="text-blue-100 font-semibold">
								{wageComparison.vsHighest > 0 ? "+" : ""}{wageComparison.vsHighest}%
							</p>
						</div>
						<div>
							<p class="text-blue-200/70">vs. Average:</p>
							<p class="text-blue-100 font-semibold">
								{wageComparison.vsAverage > 0 ? "+" : ""}{wageComparison.vsAverage}%
							</p>
						</div>
					</div>
					{#if !wageComparison.isCompetitive}
						<p class="text-xs text-blue-200/80 mt-3">
							💡 Tip: Increasing wages to at least {Math.round(data.wageStats.averageInRegion * 0.9).toLocaleString()} would
							make your factory more competitive.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Top Paying Factories -->
			{#if data.wageStats.topFactories.length > 0}
				<div>
					<h3 class="text-sm font-semibold text-gray-300 mb-3">Top Paying Factories in Region</h3>
					<div class="space-y-2">
						{#each data.wageStats.topFactories as factory, i}
							<div class="flex items-center justify-between bg-slate-700/20 rounded-lg p-3">
								<div class="flex items-center gap-3">
									<span class="text-xs font-bold text-gray-500">#{i + 1}</span>
									<div>
										<p class="text-sm font-medium text-white">{factory.name}</p>
										<p class="text-xs text-gray-400 capitalize">{factory.type}</p>
									</div>
								</div>
								<span class="text-sm font-bold text-green-400">{factory.wage.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Edit Cooldown Active</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						You recently made changes to a factory. You must wait before editing again.
					</p>
					<div class="bg-red-900/30 rounded-lg p-3 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-red-100 text-sm font-medium">Time Remaining:</span>
							<span class="text-red-100 text-sm font-bold">{formatTimeRemaining(data.cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-red-200/70">Available on:</span>
							<span class="text-red-200/90">{formatCooldownDate(data.cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford && !data.isOnCooldown}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
					<p class="text-amber-200/90 text-sm leading-relaxed">
						You need <strong>{data.editCost.toLocaleString()}</strong> currency to edit the factory. Current balance:
						<strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium">
							Needed: {(data.editCost - data.userBalance).toLocaleString()} more currency
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success Message -->
	{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("wait") && !$message.includes("Insufficient")}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("wait") || $message.includes("Insufficient"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" action="?/update" use:enhance class="space-y-6">
		<!-- Factory Details -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentFactory20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Factory Details</h2>
			</div>

			<!-- Factory Info (Read-only) -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-700/20 rounded-lg p-4 border border-slate-600/20">
				<div>
					<p class="text-xs text-gray-500 uppercase font-semibold mb-1">Company</p>
					<a
						href="/company/{data.factory.company.id}"
						class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
					>
						{data.factory.company.name}
					</a>
				</div>
				<div>
					<p class="text-xs text-gray-500 uppercase font-semibold mb-1">Type</p>
					<p class="text-sm text-white capitalize">{data.factory.factoryType}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500 uppercase font-semibold mb-1">Output</p>
					<p class="text-sm text-white capitalize">{data.factory.resourceOutput || data.factory.productOutput}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500 uppercase font-semibold mb-1">Production Rate</p>
					<p class="text-sm text-white">{data.factory.productionRate} per shift</p>
				</div>
			</div>

			<!-- Editable Fields -->
			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
						Factory Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Northern Steel Mill"
						maxlength="100"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>

				<div>
					<label for="workerWage" class="block text-sm font-medium text-gray-300 mb-2">
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
							class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 pl-8"
							class:input-error={$errors.workerWage}
							disabled={$submitting || !canEdit}
						/>
						<FluentMoney20Filled class="size-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
					</div>
					{#if $errors.workerWage}
						<p class="text-xs text-red-400 mt-1">{$errors.workerWage}</p>
					{:else}
						<div class="flex items-center justify-between text-xs text-gray-400 mt-1">
							<span>Min: 100 • Max: 1,000,000</span>
							<span class={getWageColor()}>{getWagePosition()}</span>
						</div>
					{/if}

					<!-- Wage Impact Preview -->
					{#if data.factory.currentWorkers > 0}
						<div class="mt-3 bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
							<p class="text-xs text-gray-400 mb-2">💰 Cost Impact per Shift:</p>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-300">Current:</span>
								<span class="text-sm font-semibold text-white">
									{(data.factory.workerWage * data.factory.currentWorkers).toLocaleString()}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-300">New:</span>
								<span class="text-sm font-semibold text-green-400">
									{($form.workerWage * data.factory.currentWorkers).toLocaleString()}
								</span>
							</div>
							<div class="flex items-center justify-between pt-2 border-t border-slate-600/30 mt-2">
								<span class="text-sm font-medium text-gray-200">Difference:</span>
								<span
									class="text-sm font-bold {$form.workerWage - data.factory.workerWage > 0
										? 'text-red-400'
										: 'text-green-400'}"
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
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-2">
			<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
			<div class="flex gap-3">
				<a
					href="/factory/{data.factory.id}"
					class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
					class:btn-disabled={$submitting}
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={$submitting || !canEdit}
					class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
				>
					{#if $delayed}
						<span class="loading loading-spinner loading-sm"></span>
						Saving...
					{:else}
						<FluentCheckmark20Filled class="size-5" />
						Save Changes
					{/if}
				</button>
			</div>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Changes cost {data.editCost.toLocaleString()} from your personal wallet and have a {data.cooldownHours}-hour
				cooldown. Competitive wages attract better workers!
			</p>
		</div>
	</form>
</div>
