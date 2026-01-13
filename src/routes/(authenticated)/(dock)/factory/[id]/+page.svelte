<!-- src/routes/factory/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";

	let { data } = $props();

	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	const productIcons: Record<string, string> = {
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const timeRemaining = $derived.by(() => {
		if (!data.isCurrentlyWorking || !data.shiftEndsAt) return "";
		const remaining = new Date(data.shiftEndsAt).getTime() - Date.now();
		if (remaining <= 0) return "Complete!";

		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	});

	// Auto-refresh when shift completes
	$effect(() => {
		if (data.isCurrentlyWorking && data.shiftEndsAt) {
			const interval = setInterval(() => {
				if (new Date(data.shiftEndsAt!) <= new Date()) {
					invalidateAll();
				}
			}, 60000); // Check every minute

			return () => clearInterval(interval);
		}
	});

	const outputIcon = $derived(
		data.factory.resourceOutput
			? resourceIcons[data.factory.resourceOutput]
			: data.factory.productOutput
				? productIcons[data.factory.productOutput]
				: "📦"
	);

	const outputName = $derived(
		data.factory.resourceOutput || data.factory.productOutput || "Unknown"
	);
</script>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a href="/production" class="btn btn-circle btn-ghost hover:bg-slate-700/50">←</a>
		<div class="flex-1">
			<h1 class="text-3xl font-bold text-white">{data.factory.name}</h1>
			<p class="text-gray-400 capitalize">{data.factory.factoryType} Factory</p>
		</div>
		{#if data.isOwner}
			<div class="badge bg-purple-600/20 text-purple-300 border-purple-500/30 gap-1">
				<FluentBuilding20Filled class="size-4" />
				Owner
			</div>
		{/if}
	</div>

	<!-- Factory Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentBox20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Output</p>
					<div class="flex items-center gap-1">
						<span class="text-lg">{outputIcon}</span>
						<p class="text-lg font-bold text-white capitalize">{outputName}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Wage</p>
					<p class="text-lg font-bold text-white">{data.factory.workerWage.toLocaleString()}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentPeople20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Workers</p>
					<p class="text-lg font-bold text-white">
						{data.workers}/{data.maxWorkers}
					</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
					<FluentFlash20Filled class="size-5 text-yellow-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Production Rate</p>
					<p class="text-lg font-bold text-white">{data.factory.productionRate}/shift</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Energy Status -->
	{#if data.stateEnergy}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<FluentFlash20Filled class="size-5 text-yellow-400" />
					<h3 class="font-semibold text-white">State Energy</h3>
				</div>
				<span class="text-sm text-gray-400">
					{data.stateEnergy.totalProduction - data.stateEnergy.usedProduction} / {data.stateEnergy.totalProduction} MW available
				</span>
			</div>
			<div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
				<div
					class="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
					style="width: {((data.stateEnergy.totalProduction - data.stateEnergy.usedProduction) / data.stateEnergy.totalProduction) * 100}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Work Section -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentClock20Filled class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Work Shift</h2>
		</div>

		{#if data.isCurrentlyWorking}
			<!-- Active Shift -->
			<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-5 space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-xl font-bold text-white">Shift In Progress</h3>
						<p class="text-gray-400">Working for 8 hours</p>
					</div>
					<div class="text-right">
						<p class="text-xs text-gray-400">Time Remaining</p>
						<p class="text-2xl font-bold text-amber-400">{timeRemaining}</p>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="text-sm font-medium text-gray-300">Progress</span>
						<span class="text-sm font-bold text-white">{Math.floor(data.shiftProgress)}%</span>
					</div>
					<div class="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
							style="width: {data.shiftProgress}%"
						></div>
					</div>
				</div>

				{#if data.shiftProgress >= 100}
					<form method="POST" action="?/collectPayment" use:enhance>
						<button
							type="submit"
							class="btn w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 border-0 text-white gap-2"
						>
							<FluentCheckmark20Filled class="size-5" />
							Collect Payment ({data.factory.workerWage.toLocaleString()})
						</button>
					</form>
				{/if}
			</div>
		{:else if data.currentUserJob && data.currentUserJob.factoryId === data.factory.id}
			<!-- Ready for Next Shift -->
			<div class="bg-green-600/10 border border-green-500/20 rounded-xl p-5 space-y-3">
				<div class="flex items-center gap-2">
					<FluentCheckmark20Filled class="size-5 text-green-400" />
					<h3 class="font-semibold text-green-300">Ready for Next Shift</h3>
				</div>
				<p class="text-gray-300 text-sm">You can start a new 8-hour shift at this factory.</p>
				<form method="POST" action="?/startShift" use:enhance>
					<button
						type="submit"
						class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
					>
						<FluentPlay20Filled class="size-5" />
						Start New Shift
					</button>
				</form>
			</div>
		{:else}
			<!-- Not Working Here -->
			<div class="space-y-4">
				<div class="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
					<h3 class="font-semibold text-white mb-2">Shift Details</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-400">Duration:</span>
							<span class="text-white font-medium">8 hours</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Payment:</span>
							<span class="text-green-400 font-medium">{data.factory.workerWage.toLocaleString()}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Production:</span>
							<span class="text-white font-medium">{data.factory.productionRate} units</span>
						</div>
					</div>
				</div>

				{#if data.workers >= data.maxWorkers}
					<div class="bg-red-600/10 border border-red-500/20 rounded-xl p-4">
						<div class="flex items-center gap-2">
							<FluentWarning20Filled class="size-5 text-red-400" />
							<p class="text-red-300 text-sm">Factory is at maximum capacity</p>
						</div>
					</div>
				{:else if data.currentUserJob}
					<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
						<div class="flex items-center gap-2">
							<FluentWarning20Filled class="size-5 text-amber-400" />
							<p class="text-amber-300 text-sm">
								You'll be transferred from your current factory if you start a shift here.
							</p>
						</div>
					</div>
				{/if}

				<form method="POST" action="?/startShift" use:enhance>
					<button
						type="submit"
						disabled={data.workers >= data.maxWorkers}
						class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
					>
						<FluentPlay20Filled class="size-5" />
						{data.currentUserJob ? "Transfer & Start Shift" : "Start Shift"}
					</button>
				</form>
			</div>
		{/if}
	</div>

	<!-- Company Info -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5">
		<div class="flex items-center gap-2 mb-3">
			<FluentBuilding20Filled class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Company</h2>
		</div>
		<a href="/company/{data.factory.companyId}" class="block hover:bg-slate-700/30 rounded-lg p-3 transition-colors">
			<p class="font-semibold text-white">{data.factory.companyName}</p>
			<p class="text-sm text-gray-400">View company details →</p>
		</a>
	</div>

	<!-- Location -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5">
		<div class="flex items-center gap-2 mb-3">
			<FluentFactory20Filled class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Location</h2>
		</div>
		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium text-white">{data.factory.stateName}</p>
				<p class="text-sm text-gray-400">Region ID: {data.factory.regionId}</p>
			</div>
		</div>
	</div>
</div>