<!-- src/routes/(authenticated)/(dock)/region/[id]/TravelBanner.svelte -->
<script lang="ts">
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import { formatDate, getRegionName } from "#lib/utils/formatting.js";

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

<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5">
	<div class="flex items-start gap-4">
		<div class="size-12 bg-[#f2b01e]/15 rounded-sm flex items-center justify-center flex-shrink-0">
			<FluentNavigation20Filled class="size-6 text-[#ffd35c]" />
		</div>
		<div class="flex-1">
			<h2 class="text-lg font-semibold text-[#f5efd8] mb-1">Currently Traveling</h2>
			<p class="text-[#d3caa9] text-sm mb-2">
				You are traveling to {getRegionName(activeTravel.toRegionId)}
			</p>
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-2">
					<FluentClock20Filled class="size-4 text-[#ffd35c]" />
					<span class="text-[#f5efd8]">
						{#if hoursLeft > 0}
							Arrives in {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}
						{:else}
							Arriving now...
						{/if}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<FluentNavigation20Filled class="size-4 text-[#5eaef5]" />
					<span class="text-[#f5efd8]">{activeTravel.distanceKm} km</span>
				</div>
			</div>
			<p class="text-xs text-[#a8a083] mt-2">
				Expected arrival: {formatDate(activeTravel.arrivalTime)}
			</p>
		</div>
	</div>
</div>
