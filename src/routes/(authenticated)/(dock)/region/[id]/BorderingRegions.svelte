<!-- src/routes/(authenticated)/(dock)/region/[id]/BorderingRegions.svelte -->
<script lang="ts">
	import FluentMapDrive20Filled from "~icons/fluent/map-drive-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import Logo from "$lib/component/Logo.svelte";

	const { borderingRegions } = $props<{
		borderingRegions: Array<{
			id: number;
			name: string;
			distanceKm: number;
			population: number;
			stateId: number | null;
			stateName: string | null;
			resources: {
				oil: number;
				steel: number;
				chromium: number;
				tungsten: number;
				rubber: number;
				aluminium: number;
			};
		}>;
	}>();
</script>

{#if borderingRegions && borderingRegions.length > 0}
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<div class="flex items-center gap-3 mb-4">
			<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
				<FluentMapDrive20Filled class="size-5 text-blue-400" />
			</div>
			<div>
				<h2 class="text-lg font-semibold text-white">Bordering Regions</h2>
				<p class="text-xs text-gray-400">
					{borderingRegions.length} adjacent {borderingRegions.length === 1 ? "region" : "regions"}
				</p>
			</div>
		</div>
		<div class="grid gap-3">
			{#each borderingRegions as borderRegion}
				<a
					href="/region/{borderRegion.id}"
					class="group bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all border border-white/5 hover:border-blue-500/30"
				>
					<div class="flex items-start gap-4">
						<Logo
							src="/coats/{borderRegion.id}.svg"
							alt={borderRegion.name}
							class="size-12 rounded-lg flex-shrink-0"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-blue-500 to-purple-500"
						/>

						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-2 mb-2">
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
										{borderRegion.name}
									</h3>
									<div class="flex items-center gap-3 text-xs text-gray-400 mt-1">
										{#if borderRegion.stateName}
											<span class="flex items-center gap-1">
												<FluentFlag20Filled class="size-3" />
												{borderRegion.stateName}
											</span>
										{:else}
											<span class="flex items-center gap-1 text-amber-400">
												<FluentFlag20Filled class="size-3" />
												Independent
											</span>
										{/if}
										<span class="flex items-center gap-1">
											<FluentPeople20Filled class="size-3" />
											{borderRegion.population.toLocaleString()}
										</span>
									</div>
								</div>
								<div
									class="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg flex-shrink-0"
								>
									<FluentNavigation20Filled class="size-3.5 text-blue-400" />
									<span class="text-xs font-semibold text-blue-300">{borderRegion.distanceKm} km</span>
								</div>
							</div>

							{#if borderRegion.resources.oil || borderRegion.resources.steel || borderRegion.resources.chromium || borderRegion.resources.tungsten || borderRegion.resources.rubber || borderRegion.resources.aluminium}
								<div class="flex flex-wrap gap-1.5 mt-3">
									{#if borderRegion.resources.oil}
										<div
											class="px-2 py-1 bg-amber-600/10 border border-amber-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-amber-400">⛽</span>
											<span class="text-amber-300 font-medium">{borderRegion.resources.oil}</span>
										</div>
									{/if}
									{#if borderRegion.resources.steel}
										<div
											class="px-2 py-1 bg-gray-600/10 border border-gray-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-gray-400">🔩</span>
											<span class="text-gray-300 font-medium">{borderRegion.resources.steel}</span>
										</div>
									{/if}
									{#if borderRegion.resources.chromium}
										<div
											class="px-2 py-1 bg-blue-600/10 border border-blue-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-blue-400">💎</span>
											<span class="text-blue-300 font-medium">{borderRegion.resources.chromium}</span>
										</div>
									{/if}
									{#if borderRegion.resources.tungsten}
										<div
											class="px-2 py-1 bg-purple-600/10 border border-purple-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-purple-400">⚡</span>
											<span class="text-purple-300 font-medium">{borderRegion.resources.tungsten}</span>
										</div>
									{/if}
									{#if borderRegion.resources.rubber}
										<div
											class="px-2 py-1 bg-green-600/10 border border-green-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-green-400">🌿</span>
											<span class="text-green-300 font-medium">{borderRegion.resources.rubber}</span>
										</div>
									{/if}
									{#if borderRegion.resources.aluminium}
										<div
											class="px-2 py-1 bg-slate-600/10 border border-slate-600/20 rounded text-xs flex items-center gap-1"
										>
											<span class="text-slate-400">🔘</span>
											<span class="text-slate-300 font-medium">{borderRegion.resources.aluminium}</span>
										</div>
									{/if}
								</div>
							{:else}
								<p class="text-xs text-gray-500 italic mt-3">No natural resources</p>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
