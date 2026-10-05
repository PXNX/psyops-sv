<!-- src/routes/factory/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { refreshAll } from "$app/navigation";
	import { getRegionName } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button } from "#lib/component/ui/index.js";
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
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";

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
					refreshAll();
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

<PageContainer maxWidth="5xl">
	<!-- Factory Hero -->
	<div class="panel rounded-sm p-5">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div class="flex items-center gap-4 w-full sm:w-auto">
				<Logo
					src={data.companyLogoUrl}
					alt={data.factory.companyName}
					class="size-14 sm:size-18 rounded-sm border border-[#dfceb0]/15 shrink-0"
					placeholderIcon={FluentImageOff20Filled}
				/>
				<div class="flex-1 min-w-0">
					<h1 class="text-3xl font-bold text-[#fff7e8] break-words">{data.factory.name}</h1>
					<div class="flex items-center gap-2 text-sm text-[#a89e8e] mt-1">
						<span class="capitalize">{data.factory.factoryType}</span>
						<span class="text-[#a89e8e]/50">·</span>
						<a href="/company/{data.factory.companyId}" class="text-[#d5c4df] hover:text-[#f2c463] transition-colors">
							{data.factory.companyName}
						</a>
					</div>
				</div>
			</div>

			{#if data.isOwner}
				<Button variant="secondary" size="sm" href="/factory/{data.factory.id}/edit" icon={FluentEdit20Filled}>
					Edit
				</Button>
			{/if}
		</div>
	</div>

	<!-- Location -->
	<a href="/region/{data.factory.regionId}" class="flex items-center gap-3 panel-interactive rounded-sm p-4 group">
		<img
			src="/coats/{data.factory.regionId}.svg"
			alt="{regionName} coat of arms"
			class="size-10 sm:size-12 object-contain"
		/>
		<div class="flex-1 min-w-0">
			<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Location</div>
			<div class="text-sm sm:text-base font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors">
				{regionName}, <span class="text-[#a89e8e]">{data.factory.stateName}</span>
			</div>
		</div>
		<FluentLocation20Filled class="size-4 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
	</a>

	<!-- Budget Warning -->
	{#if !data.canAffordWage}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 shrink-0" />
			<div class="text-sm">
				<span class="font-bold">Budget Low</span>
				<span class="text-red-300/70 font-mono">
					— {data.companyBudget.toLocaleString()} / {data.factory.workerWage.toLocaleString()} required</span
				>
			</div>
		</div>
	{/if}

	<!-- Stats Strip -->
	<div class="grid grid-cols-3 gap-3">
		<div class="panel-muted rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentBox20Filled class="size-4 text-[#b7a0c5]" />
				<span class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Output</span>
			</div>
			<div class="flex items-center gap-1.5">
				{#if data.output}
					<ResourceIcon name={data.output.name} class="size-5" />
				{/if}
				<span class="text-sm font-bold text-[#fff7e8] capitalize">{data.output?.name || "—"}</span>
			</div>
			<div class="text-xs text-[#a89e8e] mt-0.5">{data.output?.amount || 0}/shift</div>
		</div>

		<div class="panel-muted rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentMoney20Filled class="size-4 text-[#8fae88]" />
				<span class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Wage</span>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-lg sm:text-xl font-bold text-[#fff7e8] font-mono">{displayWage.toLocaleString()}</span>
				{#if hasLockedWage}
					<FluentLockClosed20Filled class="size-3.5 text-[#b7a0c5]" />
				{/if}
			</div>
			{#if hasLockedWage && data.factory.workerWage !== displayWage}
				<div class="text-xs text-[#a89e8e] mt-0.5">
					Current: <span class="font-mono">{data.factory.workerWage.toLocaleString()}</span>
				</div>
			{/if}
		</div>

		<div class="panel-muted rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 mb-2">
				<FluentPeople20Filled class="size-4 text-[#7ba0c8]" />
				<span class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Workers</span>
			</div>
			<div class="text-lg sm:text-xl font-bold text-[#fff7e8]">
				{data.workers}<span class="text-[#a89e8e]">/{data.maxWorkers}</span>
			</div>
		</div>
	</div>

	<!-- Energy -->
	{#if data.stateEnergy}
		<div class="panel rounded-sm p-5">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-2">
					<FluentFlash20Filled class="size-4 text-[#f7c56b]" />
					<span class="text-sm font-bold text-[#fff7e8]">State Energy</span>
				</div>
				<span class="text-xs text-[#a89e8e]">
					{data.stateEnergy.totalProduction - data.stateEnergy.usedProduction}/{data.stateEnergy.totalProduction} MW
				</span>
			</div>
			<div class="h-2 bg-[#102239] rounded-full overflow-hidden border border-[#dfceb0]/10">
				<div
					class="h-full bg-[#e6a527] transition-all rounded-full"
					style="width: {((data.stateEnergy.totalProduction - data.stateEnergy.usedProduction) /
						data.stateEnergy.totalProduction) *
						100}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Shift Status -->
	{#if data.isCurrentlyWorking}
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-5">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<div class="size-2 bg-[#e6a527] rounded-full animate-pulse"></div>
					<span class="text-sm font-bold text-[#f7c56b] uppercase tracking-wide">Shift In Progress</span>
				</div>
				<span class="text-xl sm:text-2xl font-bold text-[#f7c56b] font-mono">{timeRemaining}</span>
			</div>

			{#if hasLockedWage}
				<div class="text-xs text-[#c6dfbf] mb-3 flex items-center gap-1.5">
					<FluentMoney20Filled class="size-3.5 text-[#8fae88]" />
					Earning <span class="font-mono">{displayWage.toLocaleString()}</span>
				</div>
			{/if}

			<div class="h-3 bg-[#102239] rounded-full overflow-hidden border border-[#e6a527]/20">
				<div
					class="h-full bg-[#e6a527] transition-all duration-1000 rounded-full"
					style="width: {data.shiftProgress}%"
				></div>
			</div>

			{#if data.shiftProgress >= 100}
				<form method="POST" action="?/collectPayment" use:enhance class="mt-4">
					<Button type="submit" variant="primary" block icon={FluentCheckmark20Filled}>
						Collect {displayWage.toLocaleString()}
					</Button>
				</form>
			{/if}
		</div>
	{:else if data.isWorkingHere}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm p-5">
			<div class="flex items-center gap-2 mb-3">
				<FluentCheckmark20Filled class="size-5 text-[#8fae88]" />
				<span class="text-sm font-bold text-[#c6dfbf] uppercase tracking-wide">Ready for Shift</span>
			</div>

			{#if data.embargoReason}
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 mb-3 flex items-center gap-2">
					<FluentWarning20Filled class="size-4 text-red-400 shrink-0" />
					<p class="text-xs">{data.embargoReason}</p>
				</div>
			{:else if !data.canAffordWage}
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 mb-3">
					<p class="text-xs">Cannot start — company budget insufficient</p>
				</div>
			{:else}
				<form method="POST" action="?/startShift" use:enhance>
					<Button type="submit" variant="primary" block icon={FluentPlay20Filled}>Start Shift</Button>
				</form>
			{/if}
		</div>
	{:else}
		<div class="panel rounded-sm p-5 space-y-4">
			<!-- Shift Details -->
			<div class="grid grid-cols-3 gap-3 text-center">
				<div>
					<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Duration</div>
					<div class="text-base font-bold text-[#fff7e8]">8h</div>
				</div>
				<div>
					<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Payment</div>
					<div class="text-base font-bold text-[#c6dfbf] font-mono">{data.factory.workerWage.toLocaleString()}</div>
				</div>
				{#if data.output}
					<div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Output</div>
						<div class="flex items-center justify-center gap-1.5 text-base font-bold text-[#fff7e8]">
							<ResourceIcon name={data.output.name} class="size-4" />
							{data.output.amount}
						</div>
					</div>
				{/if}
			</div>

			<!-- Warnings -->
			{#if data.embargoReason}
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 flex items-center gap-2">
					<FluentWarning20Filled class="size-4 text-red-400 shrink-0" />
					<p class="text-xs">{data.embargoReason}</p>
				</div>
			{:else if !data.canAffordWage}
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 flex items-center gap-2">
					<FluentWarning20Filled class="size-4 text-red-400 shrink-0" />
					<p class="text-xs">Company cannot afford wages</p>
				</div>
			{:else if data.workers >= data.maxWorkers}
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 flex items-center gap-2">
					<FluentWarning20Filled class="size-4 text-red-400 shrink-0" />
					<p class="text-xs">Factory at maximum capacity</p>
				</div>
			{:else if data.currentUserJob}
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-3 flex items-center gap-2">
					<FluentWarning20Filled class="size-4 text-[#f7c56b] shrink-0" />
					<p class="text-xs">You'll be transferred from your current factory</p>
				</div>
			{/if}

			<form method="POST" action="?/startShift" use:enhance>
				<Button
					type="submit"
					variant="primary"
					block
					icon={FluentPlay20Filled}
					disabled={data.workers >= data.maxWorkers || !data.canAffordWage || !!data.embargoReason}
				>
					{data.currentUserJob ? "Transfer & Start Shift" : "Start Shift"}
				</Button>
			</form>
		</div>
	{/if}
</PageContainer>
