<!-- src/lib/component/TravelProgress.svelte -->
<script lang="ts">
	import FluentVehicleAirplaneTakeOff20Filled from "~icons/fluent/airplane-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import { calculateTravelProgress, formatDuration, getTimeRemaining } from "$lib/utils/travel";
	import * as m from "$lib/paraglide/messages";
	import type { UserTravel } from "$lib/server/schema";

	interface Props {
		travel: UserTravel;
		showCancel?: boolean;
		onComplete?: () => void;
		onCancel?: () => void;
	}

	let { travel, showCancel = false, onComplete, onCancel }: Props = $props();

	let progress = $state(0);
	let timeRemaining = $state(0);

	// Update progress every second
	$effect(() => {
		const interval = setInterval(() => {
			const newProgress = calculateTravelProgress(new Date(travel.departureTime), new Date(travel.arrivalTime));
			progress = newProgress;
			timeRemaining = getTimeRemaining(new Date(travel.arrivalTime));

			// Check if travel is complete
			if (newProgress >= 1) {
				clearInterval(interval);
				if (onComplete) onComplete();
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	const fromRegionName = $derived(() => {
		const key = `region_${travel.fromRegionId}` as keyof typeof m;
		return m[key]?.() ?? `Region ${travel.fromRegionId}`;
	});

	const toRegionName = $derived(() => {
		const key = `region_${travel.toRegionId}` as keyof typeof m;
		return m[key]?.() ?? `Region ${travel.toRegionId}`;
	});

	const progressPercent = $derived(Math.round(progress * 100));

	async function handleCancel() {
		if (!onCancel) return;

		try {
			const response = await fetch("/api/travel/cancel", {
				method: "POST"
			});

			if (response.ok) {
				onCancel();
			}
		} catch (error) {
			console.error("Cancel travel error:", error);
		}
	}
</script>

<div class="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4">
	<div class="flex items-start gap-3">
		<!-- Airplane Icon -->
		<div class="size-10 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0 animate-pulse">
			<FluentVehicleAirplaneTakeOff20Filled class="size-5 text-blue-400" />
		</div>

		<div class="flex-1 space-y-3">
			<!-- Header -->
			<div class="flex items-start justify-between">
				<div>
					<p class="font-semibold text-white">Traveling to {toRegionName()}</p>
					<p class="text-sm text-gray-400">From {fromRegionName()}</p>
				</div>
				{#if showCancel}
					<button onclick={handleCancel} class="btn btn-ghost btn-sm btn-circle" title="Cancel travel">
						<FluentDismiss20Filled class="size-4" />
					</button>
				{/if}
			</div>

			<!-- Progress Bar with Icons -->
			<div class="relative">
				<!-- From Region Logo -->
				<div class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10">
					<img
						src={`/coats/${travel.fromRegionId}.svg`}
						alt="From"
						class="size-8 rounded-lg border-2 border-blue-500 bg-slate-800"
					/>
				</div>

				<!-- Progress Bar -->
				<div class="h-3 bg-slate-700/50 rounded-full overflow-hidden mx-6">
					<div
						class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 relative"
						style="width: {progressPercent}%"
					>
						<!-- Animated Arrow -->
						<div
							class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white rounded-full size-5 flex items-center justify-center shadow-lg animate-bounce"
						>
							<span class="text-xs">✈️</span>
						</div>
					</div>
				</div>

				<!-- To Region Logo -->
				<div class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10">
					<img
						src={`/coats/${travel.toRegionId}.svg`}
						alt="To"
						class="size-8 rounded-lg border-2 border-cyan-500 bg-slate-800"
					/>
				</div>
			</div>

			<!-- Stats -->
			<div class="flex items-center justify-between text-sm">
				<div class="flex items-center gap-4">
					<div>
						<span class="text-gray-400">Progress:</span>
						<span class="text-white font-semibold ml-1">{progressPercent}%</span>
					</div>
					<div>
						<span class="text-gray-400">Distance:</span>
						<span class="text-white font-semibold ml-1">{travel.distanceKm} km</span>
					</div>
				</div>
				<div>
					<span class="text-gray-400">ETA:</span>
					<span class="text-blue-400 font-semibold ml-1">{formatDuration(timeRemaining)}</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: translateY(-50%) translateX(50%);
		}
		50% {
			transform: translateY(-60%) translateX(50%);
		}
	}

	.animate-bounce {
		animation: bounce 1s ease-in-out infinite;
	}
</style>
