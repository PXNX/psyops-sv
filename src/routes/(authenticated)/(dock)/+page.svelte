<script lang="ts">
	import TravelProgress from "$lib/component/TravelProgress.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import * as m from "$lib/paraglide/messages";
	import { formatDateTime, formatDate, getRegionName } from "$lib/utils/formatting.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	async function handleTravelComplete() {
		try {
			const response = await fetch("/api/travel/arrive", {
				method: "POST"
			});
			const result = await response.json();
			if (result.success) {
				window.location.reload();
			} else if (result.timeRemaining && result.timeRemaining > 0) {
				setTimeout(handleTravelComplete, result.timeRemaining * 1000 + 500);
			} else {
				window.location.reload();
			}
		} catch {
			window.location.reload();
		}
	}

	function handleTravelCancel() {
		window.location.reload();
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader title="Dashboard" subtitle="Welcome back, {data.account.profile?.name || 'User'}!" />

	<!-- Active Travel Banner -->
	{#if data.activeTravel}
		<TravelProgress
			travel={data.activeTravel}
			showCancel={true}
			onComplete={handleTravelComplete}
			onCancel={handleTravelCancel}
		/>
	{/if}

	<!-- Active Broadcasts -->
	{#if data.systemBroadcast || data.stateBroadcast || data.partyBroadcast}
		<div class="space-y-3">
			{#if data.systemBroadcast}
				<div class="bg-red-600/10 rounded-xl border border-red-500/20 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-red-600/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentMegaphone20Filled class="size-5 text-red-400" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-red-400 uppercase tracking-wide">System Broadcast</span>
							</div>
							<h3 class="text-white font-bold">{data.systemBroadcast.title}</h3>
							<p class="text-gray-300 text-sm whitespace-pre-wrap mt-1">{data.systemBroadcast.content}</p>
							<p class="text-xs text-gray-500 mt-2">
								{data.systemBroadcast.issuer?.profile?.name || "Admin"} · {formatDate(data.systemBroadcast.createdAt)}
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.stateBroadcast}
				<div class="bg-purple-600/10 rounded-xl border border-purple-500/20 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentBuildingGovernment20Filled class="size-5 text-purple-400" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-purple-400 uppercase tracking-wide">
									{data.stateBroadcast.state?.name || "State"} Broadcast
								</span>
							</div>
							<h3 class="text-white font-bold">{data.stateBroadcast.title}</h3>
							<p class="text-gray-300 text-sm whitespace-pre-wrap mt-1">{data.stateBroadcast.content}</p>
							<p class="text-xs text-gray-500 mt-2">
								{data.stateBroadcast.issuer?.profile?.name || "President"} · {formatDate(data.stateBroadcast.createdAt)}
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.partyBroadcast}
				<div class="bg-emerald-600/10 rounded-xl border border-emerald-500/20 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-emerald-600/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentPeople20Filled class="size-5 text-emerald-400" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-emerald-400 uppercase tracking-wide">
									{data.partyBroadcast.party?.name || "Party"} Broadcast
								</span>
							</div>
							<h3 class="text-white font-bold">{data.partyBroadcast.title}</h3>
							<p class="text-gray-300 text-sm whitespace-pre-wrap mt-1">{data.partyBroadcast.content}</p>
							<p class="text-xs text-gray-500 mt-2">
								{data.partyBroadcast.issuer?.profile?.name || "Party Leader"} · {formatDate(
									data.partyBroadcast.createdAt
								)}
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Ongoing Battles in Region -->
	{#if data.ongoingBattles.length > 0}
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-2 border-amber-500/30 rounded-xl overflow-hidden"
		>
			<div class="bg-amber-950/30 border-b border-amber-500/30 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-amber-500 rounded-full animate-pulse"></div>
						<h2 class="text-base font-bold text-amber-400 font-mono uppercase tracking-wide">Active Battles</h2>
					</div>
					<div class="px-2 py-1 bg-amber-950/50 border border-amber-500/40 rounded text-amber-400 font-mono text-xs">
						{data.ongoingBattles.length} ONGOING
					</div>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.ongoingBattles as battle}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-amber-500/20 rounded-lg p-3 sm:p-4 hover:border-amber-400/40 transition-all group"
					>
						<Logo
							src="/coats/{battle.regionId}.svg"
							alt={getRegionName(battle.regionId)}
							class="size-10 sm:size-12 rounded border border-slate-700/50"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-amber-500 to-red-500"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-white group-hover:text-amber-400 transition-colors truncate"
							>
								{getRegionName(battle.regionId)}
							</div>
							<div class="text-xs text-slate-500 font-mono">
								{battle.attackerState.name} → {battle.defenderState.name}
							</div>
						</div>
						<div class="flex items-center gap-2 flex-shrink-0">
							<span
								class="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-mono font-bold"
							>
								⚔️ LIVE
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quick Actions -->
	<SectionCard>
		<h2 class="text-xl font-bold text-white mb-4">Quick Actions</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<a href="/map" class="btn btn-ghost justify-start">
				<FluentHome20Filled class="size-5" />
				Explore Map
			</a>
			<a href="/chat" class="btn btn-ghost justify-start"> Chat </a>
		</div>
	</SectionCard>
</PageContainer>
