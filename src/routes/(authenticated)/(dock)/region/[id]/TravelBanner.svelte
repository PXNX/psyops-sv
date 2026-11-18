<!-- src/routes/(authenticated)/(dock)/region/[id]/TravelBanner.svelte -->
<!-- The player's journey in progress, as a boarding pass with a tear-off stub. -->
<script lang="ts">
	import FluentAirplaneTakeOff20Filled from "~icons/fluent/airplane-take-off-20-filled";
	import { formatDateTime, getRegionName } from "#lib/utils/formatting.js";

	interface Props {
		activeTravel: {
			toRegionId: number;
			arrivalTime: string;
			distanceKm: number;
		};
	}

	const { activeTravel }: Props = $props();

	const arrivalDate = $derived(new Date(activeTravel.arrivalTime));
	const now = $derived(new Date());
	const timeLeftMs = $derived(arrivalDate.getTime() - now.getTime());
	const hoursLeft = $derived(Math.max(0, Math.ceil(timeLeftMs / (1000 * 60 * 60))));
	const destination = $derived(getRegionName(activeTravel.toRegionId));
</script>

<div
	id="boarding-pass"
	class="animate-rise-in relative flex rounded-sm overflow-hidden border border-[#f5a524]/40 bg-[#f5a524]/10 shadow-[0_8px_22px_rgba(0,0,0,0.4)]"
>
	<!-- Main part -->
	<div class="flex-1 min-w-0 p-4 sm:p-5">
		<div class="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#ffcb6b]">
			<FluentAirplaneTakeOff20Filled class="size-4" />
			Boarding pass
		</div>
		<p class="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">To</p>
		<a
			href="/region/{activeTravel.toRegionId}"
			class="block font-serif text-2xl font-bold text-[#eef2ff] hover:text-[#ffc857] transition-colors truncate"
		>
			{destination}
		</a>
		<dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
			<div>
				<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Arrival</dt>
				<dd class="font-mono text-[#dbe2f4]">{formatDateTime(activeTravel.arrivalTime)}</dd>
			</div>
			<div>
				<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Distance</dt>
				<dd class="font-mono text-[#dbe2f4]">{activeTravel.distanceKm} km</dd>
			</div>
		</dl>
	</div>

	<!-- Perforation -->
	<div class="relative w-0 border-l-2 border-dashed border-[#f5a524]/35" aria-hidden="true">
		<span class="absolute -top-2 -left-2 size-4 rounded-full bg-[#0c1222]"></span>
		<span class="absolute -bottom-2 -left-2 size-4 rounded-full bg-[#0c1222]"></span>
	</div>

	<!-- Stub -->
	<div class="w-24 sm:w-32 shrink-0 p-3 flex flex-col items-center justify-center text-center">
		{#if hoursLeft > 0}
			<p class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Arrives in</p>
			<p class="font-mono text-3xl font-bold text-[#ffcb6b] leading-none mt-1">
				{hoursLeft}<span class="text-sm">h</span>
			</p>
		{:else}
			<p class="font-mono text-sm font-bold text-[#ffcb6b]">Arriving</p>
		{/if}
		<div
			class="mt-2 h-6 w-full opacity-50"
			style="background: repeating-linear-gradient(90deg, #eef2ff 0 2px, transparent 2px 4px, #eef2ff 4px 5px, transparent 5px 8px);"
			aria-hidden="true"
		></div>
	</div>
</div>
