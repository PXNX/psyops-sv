<!-- src/routes/factory/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { getRegionName } from "$lib/utils/formatting";
	import Logo from "$lib/component/Logo.svelte";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";

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
		data.output
			? data.output.type === "resource"
				? resourceIcons[data.output.name]
				: productIcons[data.output.name]
			: "📦"
	);

	const outputDisplay = $derived(data.output ? `${data.output.amount} ${data.output.name}/shift` : "Unknown");

	const regionName = $derived(getRegionName(data.factory.regionId));

	// Determine wage to display
	const displayWage = $derived(data.lockedWage || data.factory.workerWage);
	const hasLockedWage = $derived(data.lockedWage !== null);
</script>

<div class="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
	<!-- Header with Company Logo -->
	<div
		class="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-4 md:p-6"
	>
		<div class="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl"></div>

		<div class="relative flex flex-col sm:flex-row items-start justify-between gap-4">
			<div class="flex items-start gap-4">
				<div class="flex items-center gap-4">
					<Logo
						src={data.companyLogoUrl}
						alt={data.factory.companyName}
						class="size-16 md:size-20 object-cover"
						placeholderIcon={FluentImageOff20Filled}
					/>

					<div>
						<h1 class="text-2xl md:text-3xl font-bold text-white mb-1">{data.factory.name}</h1>
						<p class="text-gray-400 capitalize text-sm md:text-base">{data.factory.factoryType} Factory</p>
						<a href="/company/{data.factory.companyId}" class="text-purple-400 hover:text-purple-300 text-sm">
							{data.factory.companyName} →
						</a>
					</div>
				</div>
			</div>

			<div class="flex gap-2 flex-wrap">
				{#if data.isOwner}
					<a
						href="/factory/{data.factory.id}/edit"
						class="px-3 md:px-4 py-2 bg-gradient-to-br from-purple-700/80 to-purple-800/80 hover:from-purple-600/80 hover:to-purple-700/80
						       border border-purple-500/20 rounded-lg text-purple-300 hover:text-white transition-all duration-300 flex items-center gap-2 text-sm"
					>
						<FluentEdit20Filled class="size-4" />
						Edit Factory
					</a>
				{/if}
			</div>
		</div>
	</div>

	<!-- Location Info with Region Coat of Arms -->
	<a
		href="/region/{data.factory.regionId}"
		class="block relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-4 md:p-5 hover:border-purple-500/30 transition-all group"
	>
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3 md:gap-4">
				<img
					src="/coats/{data.factory.regionId}.svg"
					alt="{regionName} coat of arms"
					class="size-12 md:size-14 object-contain"
				/>
				<div>
					<div class="flex items-center gap-2 mb-1">
						<FluentLocation20Filled class="size-4 text-purple-400" />
						<h3 class="text-base md:text-lg font-semibold text-white">Location</h3>
					</div>
					<p class="text-sm md:text-base text-gray-300 group-hover:text-purple-300 transition-colors">
						{regionName},
						<span class="text-gray-400 group-hover:text-purple-400 transition-colors">{data.factory.stateName}</span>
						<span class="text-purple-400 ml-1">→</span>
					</p>
				</div>
			</div>
		</div>
	</a>

	<!-- Budget Warning -->
	{#if !data.canAffordWage}
		<div class="bg-red-600/10 border border-red-500/20 rounded-xl p-4">
			<div class="flex items-center gap-2">
				<FluentWarning20Filled class="size-5 text-red-400" />
				<div>
					<p class="text-red-300 font-semibold">Company Budget Low</p>
					<p class="text-red-300/80 text-sm">
						Budget: {data.companyBudget.toLocaleString()} / Required: {data.factory.workerWage.toLocaleString()}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Factory Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentBox20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Produces</p>
					<div class="flex items-center gap-1">
						<span class="text-lg">{outputIcon}</span>
						<p class="text-base font-bold text-white capitalize">{outputDisplay}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div class="flex-1">
					<p class="text-xs text-gray-400">Wage per Shift</p>
					<div class="flex items-center gap-2">
						<p class="text-lg font-bold text-white">{displayWage.toLocaleString()}</p>
						{#if hasLockedWage}
							<div class="relative group">
								<FluentLockClosed20Filled class="size-4 text-purple-400" />
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
									<div
										class="bg-slate-900 border border-purple-500/30 rounded-lg p-2 whitespace-nowrap text-xs text-gray-300"
									>
										Wage locked for your shift
									</div>
								</div>
							</div>
						{/if}
					</div>
					{#if hasLockedWage && data.factory.workerWage !== displayWage}
						<p class="text-xs text-gray-500">
							Current: {data.factory.workerWage.toLocaleString()}
						</p>
					{/if}
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
					style="width: {((data.stateEnergy.totalProduction - data.stateEnergy.usedProduction) /
						data.stateEnergy.totalProduction) *
						100}%"
				></div>
			</div>
		</div>
	{/if}

	{#if data.isCurrentlyWorking}
		<!-- Active Shift -->
		<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-xl font-bold text-white">Shift In Progress</h3>
					{#if hasLockedWage}
						<p class="text-sm text-green-400 mt-1 flex flex-row">
							<FluentMoney20Filled class="size-5 text-green-400" />
							{displayWage.toLocaleString()}
						</p>
					{/if}
				</div>
				<div class="text-right">
					<p class="text-2xl font-bold text-amber-400">{timeRemaining}</p>
				</div>
			</div>

			<div class="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
				<div
					class="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
					style="width: {data.shiftProgress}%"
				></div>
			</div>

			{#if data.shiftProgress >= 100}
				<form method="POST" action="?/collectPayment" use:enhance>
					<button
						type="submit"
						class="btn w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 border-0 text-white gap-2"
					>
						<FluentCheckmark20Filled class="size-5" />
						Collect Payment ({displayWage.toLocaleString()})
					</button>
				</form>
			{/if}
		</div>
	{:else if data.isWorkingHere}
		<!-- Ready for Next Shift -->
		<div class="bg-green-600/10 border border-green-500/20 rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentCheckmark20Filled class="size-5 text-green-400" />
				<h3 class="font-semibold text-green-300">Ready for Next Shift</h3>
			</div>
			<p class="text-gray-300 text-sm">You can start a new 8-hour shift at this factory.</p>

			{#if !data.canAffordWage}
				<div class="bg-red-600/10 border border-red-500/20 rounded-lg p-3">
					<p class="text-red-300 text-sm">Cannot start shift - company budget insufficient</p>
				</div>
			{:else}
				<form method="POST" action="?/startShift" use:enhance>
					<button
						type="submit"
						class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
					>
						<FluentPlay20Filled class="size-5" />
						Start New Shift
					</button>
				</form>
			{/if}
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
					{#if data.output}
						<div class="flex justify-between">
							<span class="text-gray-400">Produces:</span>
							<span class="text-white font-medium">{outputIcon} {outputDisplay}</span>
						</div>
					{/if}
				</div>
			</div>

			{#if !data.canAffordWage}
				<div class="bg-red-600/10 border border-red-500/20 rounded-xl p-4">
					<div class="flex items-center gap-2">
						<FluentWarning20Filled class="size-5 text-red-400" />
						<p class="text-red-300 text-sm">Company cannot afford to pay wages at this time</p>
					</div>
				</div>
			{:else if data.workers >= data.maxWorkers}
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
					disabled={data.workers >= data.maxWorkers || !data.canAffordWage}
					class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
				>
					<FluentPlay20Filled class="size-5" />
					{data.currentUserJob ? "Transfer & Start Shift" : "Start Shift"}
				</button>
			</form>
		</div>
	{/if}
</div>
