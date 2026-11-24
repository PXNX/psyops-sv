<!-- src/lib/component/recon/ImageryGallery.svelte -->
<!-- Recon frames as a gallery: larger thumbnails with the sensor, region and
     age laid over the frame; a click opens the viewer at that pass. Callers
     can open a specific pass with bind:this + show(reportId). -->
<script lang="ts">
	import { SENSORS, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import SensorImage from "./SensorImage.svelte";
	import ImageryViewer from "./ImageryViewer.svelte";
	import type { ImageryItem } from "./types";

	interface Props {
		items: ImageryItem[];
		/** Thumbnails shown before the "+N" tile (the viewer still pages through all). */
		max?: number;
		now?: Date;
	}
	let { items, max = 8, now = new Date() }: Props = $props();

	let open = $state(false);
	let index = $state(0);
	const overflow = $derived(items.length > max);
	// Leave the last slot for the "+N more" tile when there is overflow.
	const shown = $derived(overflow ? items.slice(0, max - 1) : items);

	/** Open the viewer at a report (for "View imagery" buttons elsewhere on the page). */
	export function show(reportId: number) {
		const i = items.findIndex((x) => x.input.reportId === reportId);
		if (i < 0) return;
		index = i;
		open = true;
	}

	const sensorShort = (s: string) => SENSORS[s as SensorId]?.short ?? s;
	const sensorLabel = (s: string) => SENSORS[s as SensorId]?.label ?? s;
</script>

{#if items.length}
	<ul class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
		{#each shown as it, i (it.input.reportId)}
			{@const outcome = it.input.findings.outcome}
			<li>
				<button
					type="button"
					class="group relative block w-full overflow-hidden rounded-sm border border-line/15 bg-black text-left transition-[border-color,transform] duration-200 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:-translate-y-0.5"
					onclick={() => {
						index = i;
						open = true;
					}}
					aria-label="Open {sensorLabel(it.input.sensor)} imagery of {it.regionName}"
				>
					<div class="transition-opacity {it.fresh ? '' : 'opacity-55 group-hover:opacity-80'}">
						<SensorImage input={it.input} variant="mini" />
					</div>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1.5 font-mono text-[10px]"
					>
						<span class="rounded-sm bg-black/65 px-1.5 py-0.5 text-primary-fg">{sensorShort(it.input.sensor)}</span>
						{#if outcome === "intercepted"}
							<span class="rounded-sm bg-error/80 px-1.5 py-0.5 font-semibold text-white">LOST</span>
						{:else if outcome === "obscured"}
							<span class="rounded-sm bg-warning/85 px-1.5 py-0.5 font-semibold text-black">NO OBS</span>
						{/if}
					</div>
					<div
						class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-2 pt-5 pb-1.5"
					>
						<span class="truncate text-xs font-medium text-white">{it.regionName}</span>
						<span class="data shrink-0 text-[10px] text-white/70">{ageLabel(it.input.observedAt, now)}</span>
					</div>
				</button>
			</li>
		{/each}
		{#if overflow}
			<li>
				<button
					type="button"
					class="flex aspect-[16/10] h-full w-full flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed border-line/25 text-fg-muted transition-colors hover:border-primary/60 hover:text-fg"
					onclick={() => {
						index = shown.length;
						open = true;
					}}
				>
					<span class="data text-xl text-fg">+{items.length - shown.length}</span>
					<span class="text-[11px]">more frames</span>
				</button>
			</li>
		{/if}
	</ul>
	<ImageryViewer {items} bind:open bind:index />
{/if}
