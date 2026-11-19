<!-- src/lib/component/recon/ImageryStrip.svelte -->
<!-- A row of recon frame thumbnails (one per pass); a click opens the viewer
     at that pass. Pass `open(reportId)` callers can use bind:this + show(). -->
<script lang="ts">
	import { SENSORS, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import SensorImage from "./SensorImage.svelte";
	import ImageryViewer from "./ImageryViewer.svelte";
	import type { ImageryItem } from "./types";

	interface Props {
		items: ImageryItem[];
		/** Show the region name under each thumbnail (lists spanning regions). */
		showRegion?: boolean;
		/** Thumbnails shown before "+N more" (the viewer still pages through all). */
		max?: number;
	}
	let { items, showRegion = false, max = 6 }: Props = $props();

	let open = $state(false);
	let index = $state(0);
	const shown = $derived(items.slice(0, max));

	/** Open the viewer at a report (for "View imagery" buttons elsewhere on the page). */
	export function show(reportId: number) {
		const i = items.findIndex((x) => x.input.reportId === reportId);
		if (i < 0) return;
		index = i;
		open = true;
	}
</script>

{#if items.length}
	<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
		{#each shown as it, i (it.input.reportId)}
			<li>
				<button
					type="button"
					class="group block w-full text-left"
					onclick={() => {
						index = i;
						open = true;
					}}
					aria-label="Open {SENSORS[it.input.sensor as SensorId]?.label ?? it.input.sensor} imagery of {it.regionName}"
				>
					<div
						class="overflow-hidden rounded-sm border border-line/20 bg-black transition-colors group-hover:border-primary/60 {it.fresh
							? ''
							: 'opacity-60'}"
					>
						<SensorImage input={it.input} variant="mini" />
					</div>
					<div class="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-fg-muted">
						<span class="truncate text-primary-fg">
							{SENSORS[it.input.sensor as SensorId]?.short ?? it.input.sensor}{showRegion ? ` · ${it.regionName}` : ""}
						</span>
						<span class="shrink-0">{ageLabel(it.input.observedAt)}</span>
					</div>
				</button>
			</li>
		{/each}
	</ul>
	{#if items.length > max}
		<p class="mt-1 text-right font-mono text-[10px] text-fg-muted">+{items.length - max} more in the viewer</p>
	{/if}
	<ImageryViewer {items} bind:open bind:index />
{/if}
