<!-- src/routes/(authenticated)/(dock)/region/[id]/BorderingRegions.svelte -->
<!-- The gazetteer's "Neighbours" list: adjacent regions with distance, owner and resources. -->
<script lang="ts">
	import { regionCoatUrl } from "#lib/utils/formatting.js";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";

	type Resources = {
		oil: number;
		steel: number;
		chromium: number;
		tungsten: number;
		rubber: number;
		aluminium: number;
	};

	interface Props {
		borderingRegions: Array<{
			id: number;
			name: string;
			distanceKm: number;
			population: number;
			stateId: number | null;
			stateName: string | null;
			underAttackByUs: boolean;
			resources: Resources;
		}>;
	}

	const { borderingRegions }: Props = $props();

	const resourcesOf = (r: Resources) =>
		(Object.entries(r) as [keyof Resources, number][]).filter(([, value]) => value > 0);
</script>

{#if borderingRegions && borderingRegions.length > 0}
	<section class="space-y-3">
		<h2 class="section-title">
			Neighbours <span class="text-[#8e9abb] font-normal">· {borderingRegions.length}</span>
		</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each [...borderingRegions].sort((a, b) => a.distanceKm - b.distanceKm) as borderRegion (borderRegion.id)}
				{@const resources = resourcesOf(borderRegion.resources)}
				<a
					href="/region/{borderRegion.id}"
					class="group panel-interactive rounded-sm p-3 flex items-center gap-3 {borderRegion.underAttackByUs
						? 'border-red-500/45'
						: ''}"
				>
					<Logo
						src={regionCoatUrl(borderRegion.id)}
						alt=""
						class="size-11 rounded-sm shrink-0"
						placeholderIcon={FluentShield20Filled}
						placeholderGradient="from-[#2f6be0]/40 to-[#2f6be0]/40"
					/>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<h3 class="font-semibold text-[#eef2ff] group-hover:text-[#ffc857] transition-colors truncate">
								{borderRegion.name}
							</h3>
							{#if borderRegion.underAttackByUs}
								<FluentFire20Filled class="size-4 text-red-400 shrink-0" aria-label="Attack underway" />
							{/if}
						</div>
						<p class="text-xs text-[#8e9abb] flex items-center gap-2 min-w-0">
							<span class="truncate {borderRegion.stateName ? '' : 'text-[#ffcb6b]'}"
								>{borderRegion.stateName ?? "Unclaimed"}</span
							>
							<span class="flex items-center gap-1 shrink-0">
								<FluentPeople20Filled class="size-3" />
								{borderRegion.population.toLocaleString()}
							</span>
						</p>
						{#if resources.length}
							<div class="flex flex-wrap gap-2 mt-1">
								{#each resources as [name, value] (name)}
									<span class="flex items-center gap-1 text-[11px] font-mono text-[#c2cbe3]" title={name}>
										<ResourceIcon {name} class="size-3.5" />{value}
									</span>
								{/each}
							</div>
						{/if}
					</div>
					<span class="shrink-0 text-right font-mono text-xs text-[#c3dbff]">
						{Math.round(borderRegion.distanceKm)}<span class="text-[#8e9abb]"> km</span>
					</span>
				</a>
			{/each}
		</div>
	</section>
{/if}
