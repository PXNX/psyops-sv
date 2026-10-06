<!-- src/routes/(authenticated)/(dock)/region/[id]/BorderingRegions.svelte -->
<script lang="ts">
	import FluentMapDrive20Filled from "~icons/fluent/map-drive-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import Logo from "#lib/component/Logo.svelte";

	const { borderingRegions } = $props<{
		borderingRegions: Array<{
			id: number;
			name: string;
			distanceKm: number;
			population: number;
			stateId: number | null;
			stateName: string | null;
			underAttackByUs: boolean;
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
			<div class="size-10 bg-[#2369b5]/18 rounded-sm flex items-center justify-center">
				<FluentMapDrive20Filled class="size-5 text-[#5eaef5]" />
			</div>
			<div>
				<h2 class="section-title">Bordering Regions</h2>
				<p class="text-xs text-[#a8a083]">
					{borderingRegions.length} adjacent {borderingRegions.length === 1 ? "region" : "regions"}
				</p>
			</div>
		</div>
		<div class="grid gap-3">
			{#each borderingRegions as borderRegion}
				<a
					href="/region/{borderRegion.id}"
					class="group panel-muted rounded-sm p-4 hover:border-[#f2b01e]/55 hover:bg-[#2e3524] transition-all"
				>
					<div class="flex items-start gap-4">
						<Logo
							src="/coats/{borderRegion.id}.svg"
							alt={borderRegion.name}
							class="size-12 rounded-sm flex-shrink-0"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#2369b5]/40 to-[#2369b5]/40"
						/>

						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-2 mb-2">
								<div class="flex-1 min-w-0">
									<h3
										class="font-semibold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate flex items-center gap-2"
									>
										{borderRegion.name}
										{#if borderRegion.underAttackByUs}
											<span
												class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600/15 border border-red-500/35 rounded-sm text-[10px] font-bold uppercase tracking-wide text-red-300 shrink-0"
											>
												<FluentFire20Filled class="size-3" />
												Attack Underway
											</span>
										{/if}
									</h3>
									<div class="flex items-center gap-3 text-xs text-[#a8a083] mt-1">
										{#if borderRegion.stateName}
											<span class="flex items-center gap-1">
												<FluentFlag20Filled class="size-3" />
												{borderRegion.stateName}
											</span>
										{:else}
											<span class="flex items-center gap-1 text-[#ffd35c]">
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
									class="flex items-center gap-1.5 px-2.5 py-1 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex-shrink-0"
								>
									<FluentNavigation20Filled class="size-3.5 text-[#5eaef5]" />
									<span class="text-xs font-semibold text-[#b3dcff]">{borderRegion.distanceKm} km</span>
								</div>
							</div>

							{#if borderRegion.resources.oil || borderRegion.resources.steel || borderRegion.resources.chromium || borderRegion.resources.tungsten || borderRegion.resources.rubber || borderRegion.resources.aluminium}
								<div class="flex flex-wrap gap-1.5 mt-3">
									{#if borderRegion.resources.oil}
										<div
											class="px-2 py-1 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#f2b01e]">⛽</span>
											<span class="text-[#ffd35c] font-medium">{borderRegion.resources.oil}</span>
										</div>
									{/if}
									{#if borderRegion.resources.steel}
										<div
											class="px-2 py-1 bg-[#1a1f15]/70 border border-[#c8b47a]/15 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#a8a083]">🔩</span>
											<span class="text-[#e6ddbf] font-medium">{borderRegion.resources.steel}</span>
										</div>
									{/if}
									{#if borderRegion.resources.chromium}
										<div
											class="px-2 py-1 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#5eaef5]">💎</span>
											<span class="text-[#b3dcff] font-medium">{borderRegion.resources.chromium}</span>
										</div>
									{/if}
									{#if borderRegion.resources.tungsten}
										<div
											class="px-2 py-1 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#c08cf0]">⚡</span>
											<span class="text-[#e3cbfb] font-medium">{borderRegion.resources.tungsten}</span>
										</div>
									{/if}
									{#if borderRegion.resources.rubber}
										<div
											class="px-2 py-1 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#6fd14a]">🌿</span>
											<span class="text-[#b9f29a] font-medium">{borderRegion.resources.rubber}</span>
										</div>
									{/if}
									{#if borderRegion.resources.aluminium}
										<div
											class="px-2 py-1 bg-[#1a1f15]/70 border border-[#c8b47a]/15 rounded-sm text-xs flex items-center gap-1"
										>
											<span class="text-[#a8a083]">🔘</span>
											<span class="text-[#e6ddbf] font-medium">{borderRegion.resources.aluminium}</span>
										</div>
									{/if}
								</div>
							{:else}
								<p class="text-xs text-[#a8a083] italic mt-3">No natural resources</p>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
