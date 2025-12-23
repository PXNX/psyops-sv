<!-- src/routes/(authenticated)/(dock)/dashboard/+page.svelte -->
<script lang="ts">
	import TravelProgress from "$lib/component/TravelProgress.svelte";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentNews20Filled from "~icons/fluent/news-20-filled";
	import * as m from "$lib/paraglide/messages";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const currentRegionName = $derived(() => {
		if (!data.userLocation) return "Unknown";
		const key = `region_${data.userLocation.regionId}` as keyof typeof m;
		return m[key]?.() ?? `Region ${data.userLocation.regionId}`;
	});

	function handleTravelComplete() {
		window.location.reload();
	}

	function handleTravelCancel() {
		window.location.reload();
	}
</script>

<div class="container mx-auto px-4 py-6 max-w-4xl">
	<div class="space-y-6">
		<!-- Header -->
		<div>
			<h1 class="text-3xl font-bold text-white mb-2">Dashboard</h1>
			<p class="text-gray-400">Welcome back, {data.account.profile?.name || "User"}!</p>
		</div>

		<!-- Active Travel Banner -->
		{#if data.activeTravel}
			<TravelProgress
				travel={data.activeTravel}
				showCancel={true}
				onComplete={handleTravelComplete}
				onCancel={handleTravelCancel}
			/>
		{/if}

		<!-- Quick Actions -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<h2 class="text-xl font-bold text-white mb-4">Quick Actions</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<a href="/map" class="btn btn-ghost justify-start">
					<FluentHome20Filled class="size-5" />
					Explore Map
				</a>
			</div>
		</div>
	</div>
</div>
