<script lang="ts">
	import TravelProgress from "$lib/component/TravelProgress.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import * as m from "$lib/paraglide/messages";
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
		<PageHeader
			title="Dashboard"
			subtitle="Welcome back, {data.account.profile?.name || 'User'}!"
		/>

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
									{data.systemBroadcast.issuer?.profile?.name || "Admin"} · {new Date(data.systemBroadcast.createdAt).toLocaleDateString()}
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
									{data.stateBroadcast.issuer?.profile?.name || "President"} · {new Date(data.stateBroadcast.createdAt).toLocaleDateString()}
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
									{data.partyBroadcast.issuer?.profile?.name || "Party Leader"} · {new Date(data.partyBroadcast.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
					</div>
				{/if}
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
