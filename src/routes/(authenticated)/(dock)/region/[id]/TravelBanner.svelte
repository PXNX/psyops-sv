<!-- src/routes/(authenticated)/(dock)/region/[id]/TravelBanner.svelte -->
<script lang="ts">
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import { formatDate, getRegionName } from "$lib/utils/formatting";

	const { activeTravel } = $props<{
		activeTravel: {
			toRegionId: number;
			arrivalTime: string;
			distanceKm: number;
		};
	}>();

	const arrivalDate = $derived(new Date(activeTravel.arrivalTime));
	const now = $derived(new Date());
	const timeLeftMs = $derived(arrivalDate.getTime() - now.getTime());
	const hoursLeft = $derived(Math.max(0, Math.ceil(timeLeftMs / (1000 * 60 * 60))));
</script>

<div class="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-6">
	<div class="flex items-start gap-4">
		<div class="size-12 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
			<FluentNavigation20Filled class="size-6 text-amber-400" />
		</div>
		<div class="flex-1">
			<h2 class="text-xl font-bold text-white mb-2">Currently Traveling</h2>
			<p class="text-gray-300 text-sm mb-2">
				You are traveling to {getRegionName(activeTravel.toRegionId)}
			</p>
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<FluentClock20Filled class="size-4 text-amber-400" />
					<span class="text-white">
						{#if hoursLeft > 0}
							Arrives in {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}
						{:else}
							Arriving now...
						{/if}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<FluentNavigation20Filled class="size-4 text-blue-400" />
					<span class="text-white">{activeTravel.distanceKm} km</span>
				</div>
			</div>
			<p class="text-xs text-gray-500 mt-2">
				Expected arrival: {formatDate(activeTravel.arrivalTime)}
			</p>
		</div>
	</div>
</div>
