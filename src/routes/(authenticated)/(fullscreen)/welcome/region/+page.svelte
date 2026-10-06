<!-- src/routes/(authenticated)/welcome/region/+page.svelte -->
<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import { enhance } from "$app/forms";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { getRegionName } from "#lib/utils/formatting.js";
	import confetti from "canvas-confetti";

	let { data } = $props();

	let isSubmitting = $state(false);

	function formatPopulation(count: number): string {
		if (count >= 1000000) {
			return `${(count / 1000000).toFixed(1)}M`;
		} else if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}K`;
		}
		return count.toString();
	}

	function getPopulationColor(count: number): string {
		if (count === 0) return "text-[#b9f29a]";
		if (count < 10) return "text-[#6fd14a]";
		if (count < 50) return "text-[#ffd35c]";
		if (count < 100) return "text-[#f2b01e]";
		return "text-red-400";
	}
</script>

<div class="max-w-5xl w-full space-y-8" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<div class="text-center space-y-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div class="flex justify-center">
			<div class="size-20 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
				<FluentGlobe20Filled class="size-10 text-[#5eaef5]" />
			</div>
		</div>
		<h1 class="text-4xl font-bold text-[#f5efd8]">Choose Your Starting Region</h1>
		<p class="text-lg text-[#d3caa9] max-w-2xl mx-auto">
			Pick a region to call home. These are the closest regions to your location.
		</p>
	</div>

	<!-- User Location Info -->
	{#if data.userLocation}
		<div
			class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-5"
			in:fly={{ y: 20, duration: 500, delay: 200 }}
		>
			<div class="flex items-start gap-3">
				<div class="size-10 bg-[#2369b5]/28 rounded-sm flex items-center justify-center shrink-0">
					<FluentLocation20Filled class="size-5 text-[#5eaef5]" />
				</div>
				<div class="space-y-1">
					<p class="text-sm font-medium text-[#b3dcff]">
						We've detected you're in {data.userLocation.city}, {data.userLocation.country}
					</p>
					<p class="text-xs text-[#b3dcff]/70">
						Below are the {data.nearbyRegions.length} closest regions to your location. Choose one to establish your residence
						and begin your political journey.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Regions List -->
	<div class="space-y-3" in:fly={{ y: 20, duration: 500, delay: 300 }}>
		<div class="grid grid-cols-1 gap-4">
			{#each data.nearbyRegions as region, i (region.id)}
				<form
					method="POST"
					action="?/selectRegion"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							if (result.type === "success") {
								confetti({
									particleCount: 150,
									spread: 70,
									origin: { y: 0.6 }
								});
							}
							await update();
							isSubmitting = false;
						};
					}}
					in:fly={{ y: 20, duration: 500, delay: 400 + i * 100 }}
				>
					<input type="hidden" name="regionId" value={region.id} />
					<button
						type="submit"
						disabled={isSubmitting}
						class="group w-full panel-interactive rounded-sm p-5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
					>
						<div class="flex items-center gap-4">
							<!-- Region Logo -->
							<div class="size-16 shrink-0 rounded-sm overflow-hidden">
								<Logo
									src="/coats/{region.id}.svg"
									alt={getRegionName(region.id)}
									class="size-full"
									placeholderIcon={FluentGlobe20Filled}
									placeholderGradient="from-[#242a1d] to-[#1a1f15]"
								/>
							</div>

							<!-- Region Info -->
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
									{getRegionName(region.id)}
								</h3>

								<div class="flex items-center gap-3 mt-1">
									<!-- State or Independent -->
									<div class="flex items-center gap-1.5 text-sm text-[#d3caa9]">
										{#if region.state}
											<FluentBuildingGovernment20Filled class="size-4" />
											<span>{region.state.name}</span>
										{:else}
											<span class="text-[#e3cbfb]">Independent</span>
										{/if}
									</div>

									<!-- Population -->
									<div class="flex items-center gap-1.5 text-sm {getPopulationColor(region.populationCount)}">
										<FluentPeople20Filled class="size-4" />
										<span>
											{#if region.populationCount === 0}
												No residents
											{:else}
												{formatPopulation(region.populationCount)}
											{/if}
										</span>
									</div>
								</div>
							</div>

							<!-- Chevron -->
							<FluentChevronRight20Filled
								class="size-5 text-[#a8a083] group-hover:text-[#ffcf47] transition-colors shrink-0"
							/>
						</div>
					</button>
				</form>
			{/each}
		</div>
	</div>

	<!-- Info Footer -->
	<div class="text-center space-y-2 pt-4" in:fly={{ y: 20, duration: 500, delay: 900 }}>
		<p class="text-sm text-[#a8a083]">You can travel to other regions later from the map</p>
	</div>
</div>
