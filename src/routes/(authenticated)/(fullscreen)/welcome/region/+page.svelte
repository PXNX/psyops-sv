<!-- src/routes/(authenticated)/welcome/region/+page.svelte -->
<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import { enhance } from "$app/forms";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { getRegionName } from "$lib/utils/formatting";

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
		if (count === 0) return "text-green-400";
		if (count < 10) return "text-emerald-400";
		if (count < 50) return "text-yellow-400";
		if (count < 100) return "text-orange-400";
		return "text-red-400";
	}
</script>

<div class="max-w-5xl w-full space-y-8" in:fade={{ duration: 300 }}>
	<!-- Header -->
	<div class="text-center space-y-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div class="flex justify-center">
			<div
				class="size-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20"
			>
				<FluentGlobe20Filled class="size-10 text-white" />
			</div>
		</div>
		<h1 class="text-4xl font-bold text-white">Choose Your Starting Region</h1>
		<p class="text-lg text-gray-400 max-w-2xl mx-auto">
			Pick a region to call home. These are the closest regions to your location.
		</p>
	</div>

	<!-- User Location Info -->
	{#if data.userLocation}
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-5" in:fly={{ y: 20, duration: 500, delay: 200 }}>
			<div class="flex items-start gap-3">
				<div class="size-10 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
					<FluentLocation20Filled class="size-5 text-blue-400" />
				</div>
				<div class="space-y-1">
					<p class="text-sm font-medium text-blue-300">
						We've detected you're in {data.userLocation.city}, {data.userLocation.country}
					</p>
					<p class="text-xs text-blue-400/70">
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
						return async ({ update }) => {
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
						class="group w-full bg-slate-800/50 border-2 border-white/5 rounded-xl p-5 hover:bg-slate-800/70 hover:border-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left"
					>
						<div class="flex items-center gap-4">
							<!-- Region Logo -->
							<div class="size-16 shrink-0 rounded-lg overflow-hidden">
								<Logo
									src="/coats/{region.id}.svg"
									alt={getRegionName(region.id)}
									class="size-full"
									placeholderIcon={FluentGlobe20Filled}
									placeholderGradient="from-slate-700 to-slate-800"
								/>
							</div>

							<!-- Region Info -->
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
									{getRegionName(region.id)}
								</h3>

								<div class="flex items-center gap-3 mt-1">
									<!-- State or Independent -->
									<div class="flex items-center gap-1.5 text-sm text-gray-400">
										{#if region.state}
											<FluentBuildingGovernment20Filled class="size-4" />
											<span>{region.state.name}</span>
										{:else}
											<span class="text-purple-400">Independent</span>
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
								class="size-5 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"
							/>
						</div>
					</button>
				</form>
			{/each}
		</div>
	</div>

	<!-- Info Footer -->
	<div class="text-center space-y-2 pt-4" in:fly={{ y: 20, duration: 500, delay: 900 }}>
		<p class="text-sm text-gray-500">You can travel to other regions later from the map</p>
	</div>
</div>
