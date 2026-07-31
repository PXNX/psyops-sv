<!-- src/routes/factory/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { getRegionName } from "$lib/utils/formatting";
	import Logo from "$lib/component/Logo.svelte";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";
	import ResourceIcon from "$lib/component/ResourceIcon.svelte";

	let { data } = $props();

	const timeRemaining = $derived.by(() => {
		if (!data.isCurrentlyWorking || !data.shiftEndsAt) return "";
		const remaining = new Date(data.shiftEndsAt).getTime() - Date.now();
		if (remaining <= 0) return "Complete!";

		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	});

	$effect(() => {
		if (data.isCurrentlyWorking && data.shiftEndsAt) {
			const interval = setInterval(() => {
				if (new Date(data.shiftEndsAt!) <= new Date()) {
					invalidateAll();
				}
			}, 60000);
			return () => clearInterval(interval);
		}
	});

	const outputDisplay = $derived(data.output ? `${data.output.amount} ${data.output.name}/shift` : "Unknown");

	const regionName = $derived(getRegionName(data.factory.regionId));

	const displayWage = $derived(data.lockedWage || data.factory.workerWage);
	const hasLockedWage = $derived(data.lockedWage !== null);
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Factory Header -->
	<div class="border-b border-purple-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div class="flex items-center gap-4 w-full sm:w-auto">
					<div class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
						<Logo
							src={data.companyLogoUrl}
							alt={data.factory.companyName}
							class="relative size-14 sm:size-18 rounded-lg border-2 border-purple-500/30"
							placeholderIcon={FluentImageOff20Filled}
						/>
					</div>
					<div class="flex-1 min-w-0">
						<h1 class="text-xl sm:text-2xl font-bold text-white tracking-wide">{data.factory.name}</h1>
						<div class="flex items-center gap-2 text-sm text-slate-400 font-mono mt-1">
							<span class="capitalize">{data.factory.factoryType}</span>
							<span class="text-slate-600">·</span>
							<a
								href="/company/{data.factory.companyId}"
								class="text-purple-400 hover:text-purple-300 transition-colors"
							>
								{data.factory.companyName}
							</a>
						</div>
					</div>
				</div>

				{#if data.isOwner}
					<a
						href="/factory/{data.factory.id}/edit"
						class="px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-purple-500/20 hover:border-purple-500/40 rounded-lg text-purple-300 hover:text-white transition-all flex items-center gap-2 text-sm font-mono"
					>
						<FluentEdit20Filled class="size-4" />
						Edit
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
		<!-- Location -->
		<a
			href="/region/{data.factory.regionId}"
			class="flex items-center gap-3 bg-gradient-to-r from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4 hover:border-purple-500/30 transition-all group"
		>
			<img
				src="/coats/{data.factory.regionId}.svg"
				alt="{regionName} coat of arms"
				class="size-10 sm:size-12 object-contain"
			/>
			<div class="flex-1 min-w-0">
				<div class="text-xs text-slate-500 font-mono uppercase tracking-wider">Location</div>
				<div class="text-sm sm:text-base font-bold text-white group-hover:text-purple-400 transition-colors">
					{regionName}, <span class="text-slate-400">{data.factory.stateName}</span>
				</div>
			</div>
			<FluentLocation20Filled class="size-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
		</a>

		<!-- Budget Warning -->
		{#if !data.canAffordWage}
			<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
				<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0" />
				<div class="text-sm font-mono">
					<span class="text-red-300 font-bold">Budget Low</span>
					<span class="text-red-400/70">
						— {data.companyBudget.toLocaleString()} / {data.factory.workerWage.toLocaleString()} required</span
					>
				</div>
			</div>
		{/if}

		<!-- Stats Strip -->
		<div class="grid grid-cols-3 gap-3">
			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-2">
					<FluentBox20Filled class="size-4 text-purple-400" />
					<span class="text-xs text-slate-500 font-mono uppercase tracking-wider">Output</span>
				</div>
				<div class="flex items-center gap-1.5">
					{#if data.output}
						<ResourceIcon name={data.output.name} class="size-5" />
					{/if}
					<span class="text-sm font-bold text-white capitalize font-mono">{data.output?.name || "—"}</span>
				</div>
				<div class="text-xs text-slate-500 font-mono mt-0.5">{data.output?.amount || 0}/shift</div>
			</div>

			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-2">
					<FluentMoney20Filled class="size-4 text-emerald-400" />
					<span class="text-xs text-slate-500 font-mono uppercase tracking-wider">Wage</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-lg sm:text-xl font-bold text-white font-mono">{displayWage.toLocaleString()}</span>
					{#if hasLockedWage}
						<FluentLockClosed20Filled class="size-3.5 text-purple-400" />
					{/if}
				</div>
				{#if hasLockedWage && data.factory.workerWage !== displayWage}
					<div class="text-xs text-slate-600 font-mono mt-0.5">Current: {data.factory.workerWage.toLocaleString()}</div>
				{/if}
			</div>

			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-2">
					<FluentPeople20Filled class="size-4 text-blue-400" />
					<span class="text-xs text-slate-500 font-mono uppercase tracking-wider">Workers</span>
				</div>
				<div class="text-lg sm:text-xl font-bold text-white font-mono">
					{data.workers}<span class="text-slate-600">/{data.maxWorkers}</span>
				</div>
			</div>
		</div>

		<!-- Energy -->
		{#if data.stateEnergy}
			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<FluentFlash20Filled class="size-4 text-yellow-400" />
						<span class="text-sm font-bold text-white font-mono">State Energy</span>
					</div>
					<span class="text-xs text-slate-500 font-mono">
						{data.stateEnergy.totalProduction - data.stateEnergy.usedProduction}/{data.stateEnergy.totalProduction} MW
					</span>
				</div>
				<div class="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
					<div
						class="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all rounded-full"
						style="width: {((data.stateEnergy.totalProduction - data.stateEnergy.usedProduction) /
							data.stateEnergy.totalProduction) *
							100}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Shift Status -->
		{#if data.isCurrentlyWorking}
			<div
				class="bg-gradient-to-br from-amber-950/30 to-slate-950/30 border-2 border-amber-500/30 rounded-xl p-4 sm:p-5"
			>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-amber-500 rounded-full animate-pulse"></div>
						<span class="text-sm font-bold text-amber-400 font-mono uppercase tracking-wide">Shift In Progress</span>
					</div>
					<span class="text-xl sm:text-2xl font-bold text-amber-400 font-mono">{timeRemaining}</span>
				</div>

				{#if hasLockedWage}
					<div class="text-xs text-emerald-400/70 font-mono mb-3 flex items-center gap-1.5">
						<FluentMoney20Filled class="size-3.5" />
						Earning {displayWage.toLocaleString()}
					</div>
				{/if}

				<div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-amber-500/20">
					<div
						class="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all duration-1000 relative rounded-full"
						style="width: {data.shiftProgress}%"
					>
						<div
							class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
						></div>
					</div>
				</div>

				{#if data.shiftProgress >= 100}
					<form method="POST" action="?/collectPayment" use:enhance class="mt-4">
						<button
							type="submit"
							class="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold font-mono uppercase tracking-wide transition-all"
						>
							<span class="flex items-center justify-center gap-2">
								<FluentCheckmark20Filled class="size-5" />
								Collect {displayWage.toLocaleString()}
							</span>
						</button>
					</form>
				{/if}
			</div>
		{:else if data.isWorkingHere}
			<div
				class="bg-gradient-to-br from-emerald-950/30 to-slate-950/30 border border-emerald-500/30 rounded-xl p-4 sm:p-5"
			>
				<div class="flex items-center gap-2 mb-3">
					<FluentCheckmark20Filled class="size-5 text-emerald-400" />
					<span class="text-sm font-bold text-emerald-400 font-mono uppercase tracking-wide">Ready for Shift</span>
				</div>

				{#if !data.canAffordWage}
					<div class="bg-red-950/30 border border-red-500/20 rounded-lg p-3 mb-3">
						<p class="text-red-300 text-xs font-mono">Cannot start — company budget insufficient</p>
					</div>
				{:else}
					<form method="POST" action="?/startShift" use:enhance>
						<button
							type="submit"
							class="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold font-mono uppercase tracking-wide transition-all"
						>
							<span class="flex items-center justify-center gap-2">
								<FluentPlay20Filled class="size-5" />
								Start Shift
							</span>
						</button>
					</form>
				{/if}
			</div>
		{:else}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4 sm:p-5 space-y-4"
			>
				<!-- Shift Details -->
				<div class="grid grid-cols-3 gap-3 text-center">
					<div>
						<div class="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Duration</div>
						<div class="text-base font-bold text-white font-mono">8h</div>
					</div>
					<div>
						<div class="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Payment</div>
						<div class="text-base font-bold text-emerald-400 font-mono">{data.factory.workerWage.toLocaleString()}</div>
					</div>
					{#if data.output}
						<div>
							<div class="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">Output</div>
							<div class="flex items-center gap-1.5 text-base font-bold text-white font-mono">
								<ResourceIcon name={data.output.name} class="size-4" />
								{data.output.amount}
							</div>
						</div>
					{/if}
				</div>

				<!-- Warnings -->
				{#if !data.canAffordWage}
					<div class="bg-red-950/30 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
						<FluentWarning20Filled class="size-4 text-red-400 flex-shrink-0" />
						<p class="text-red-300 text-xs font-mono">Company cannot afford wages</p>
					</div>
				{:else if data.workers >= data.maxWorkers}
					<div class="bg-red-950/30 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
						<FluentWarning20Filled class="size-4 text-red-400 flex-shrink-0" />
						<p class="text-red-300 text-xs font-mono">Factory at maximum capacity</p>
					</div>
				{:else if data.currentUserJob}
					<div class="bg-amber-950/30 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2">
						<FluentWarning20Filled class="size-4 text-amber-400 flex-shrink-0" />
						<p class="text-amber-300 text-xs font-mono">You'll be transferred from your current factory</p>
					</div>
				{/if}

				<form method="POST" action="?/startShift" use:enhance>
					<button
						type="submit"
						disabled={data.workers >= data.maxWorkers || !data.canAffordWage}
						class="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold font-mono uppercase tracking-wide transition-all"
					>
						<span class="flex items-center justify-center gap-2">
							<FluentPlay20Filled class="size-5" />
							{data.currentUserJob ? "Transfer & Start Shift" : "Start Shift"}
						</span>
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
