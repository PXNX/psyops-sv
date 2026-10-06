<!-- src/routes/(authenticated)/(dock)/region/[id]/BorderingRegions.svelte -->
<script lang="ts">
	import FluentMapDrive20Filled from "~icons/fluent/map-drive-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import Logo from "#lib/component/Logo.svelte";

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
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-3 mb-4">
			<div class="size-10 bg-[#315d8d]/18 rounded-sm flex items-center justify-center">
				<FluentMapDrive20Filled class="size-5 text-[#7ba0c8]" />
			</div>
			<div>
				<h2 class="section-title">Bordering Regions</h2>
				<p class="text-xs text-[#a89e8e]">
					{borderingRegions.length} adjacent {borderingRegions.length === 1 ? "region" : "regions"}
				</p>
			</div>
		</div>
		<div class="grid gap-3">
			{#each borderingRegions as borderRegion}
				<a
					href="/region/{borderRegion.id}"
					class="group panel-muted rounded-sm p-4 hover:border-[#e6a527]/55 hover:bg-[#19304b] transition-all"
				>
					<div class="flex items-start gap-4">
						<Logo
							src="/coats/{borderRegion.id}.svg"
							alt={borderRegion.name}
							class="size-12 rounded-sm flex-shrink-0"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#315d8d]/40 to-[#315d8d]/40"
						/>

						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-2 mb-2">
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
										{borderRegion.name}
									</h3>
									<div class="flex items-center gap-3 text-xs text-[#a89e8e] mt-1">
										{#if borderRegion.stateName}
											<span class="flex items-center gap-1">
												<FluentFlag20Filled class="size-3" />
												{borderRegion.stateName}
											</span>
										{:else}
											<span class="flex items-center gap-1 text-[#f7c56b]">
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
									class="flex items-center gap-1.5 px-2.5 py-1 bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm flex-shrink-0"
								>
									<FluentNavigation20Filled class="size-3.5 text-[#7ba0c8]" />
									<span class="text-xs font-semibold text-[#b7d0e6]">{borderRegion.distanceKm} km</span>
								</div>
							</div>

							{#if borderRegion.resources.oil || borderRegion.resources.steel || borderRegion.resources.chromium || borderRegion.resources.tungsten || borderRegion.resources.rubber || borderRegion.resources.aluminium}
								<div class="flex flex-wrap gap-1.5 mt-3">
									{#if borderRegion.resources.oil}
										<div
											class="px-2 py-1 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#e6a527]">⛽</span>
											<span class="text-[#f7c56b] font-medium">{borderRegion.resources.oil}</span>
										</div>
									{/if}
									{#if borderRegion.resources.steel}
										<div
											class="px-2 py-1 bg-[#102239]/70 border border-[#dfceb0]/15 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#a89e8e]">🔩</span>
											<span class="text-[#e5d8c1] font-medium">{borderRegion.resources.steel}</span>
										</div>
									{/if}
									{#if borderRegion.resources.chromium}
										<div
											class="px-2 py-1 bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#7ba0c8]">💎</span>
											<span class="text-[#b7d0e6] font-medium">{borderRegion.resources.chromium}</span>
										</div>
									{/if}
									{#if borderRegion.resources.tungsten}
										<div
											class="px-2 py-1 bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#b7a0c5]">⚡</span>
											<span class="text-[#d5c4df] font-medium">{borderRegion.resources.tungsten}</span>
										</div>
									{/if}
									{#if borderRegion.resources.rubber}
										<div
											class="px-2 py-1 bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#8fae88]">🌿</span>
											<span class="text-[#c6dfbf] font-medium">{borderRegion.resources.rubber}</span>
										</div>
									{/if}
									{#if borderRegion.resources.aluminium}
										<div
											class="px-2 py-1 bg-[#102239]/70 border border-[#dfceb0]/15 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#a89e8e]">🔘</span>
											<span class="text-[#e5d8c1] font-medium">{borderRegion.resources.aluminium}</span>
										</div>
									{/if}
								</div>
							{:else}
								<p class="text-xs text-[#a89e8e] italic mt-3">No natural resources</p>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
