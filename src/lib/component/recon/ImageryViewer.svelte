<!-- src/lib/component/recon/ImageryViewer.svelte -->
<!-- Lightbox for recon frames: the full-size image with its HUD, the pass's
     particulars beside it, prev/next between passes, an IR palette switch and
     a compare view of the other passes over the same region. -->
<script lang="ts">
	import Modal from "#lib/component/Modal.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import { Conditions, UnitBadge } from "#lib/component/tactical/index.js";
	import { SENSORS, UNIT_CATEGORIES, type Cover, type SensorId, type Weather } from "#lib/config/index.js";
	import { buildScene, imageMode } from "#lib/utils/sensor-image.js";
	import { ageLabel, dtg } from "#lib/utils/military.js";
	import SensorImage, { type IrPalette } from "./SensorImage.svelte";
	import type { ImageryItem } from "./types";
	import IconPrev from "~icons/fluent/chevron-left-20-regular";
	import IconNext from "~icons/fluent/chevron-right-20-regular";
	import IconCompare from "~icons/fluent/split-vertical-20-regular";
	import IconDoc from "~icons/fluent/document-search-20-regular";
	import IconSatellite from "~icons/mdi/satellite-variant";
	import IconDrone from "~icons/mdi/quadcopter";
	import IconRadar from "~icons/mdi/radar";

	interface Props {
		items: ImageryItem[];
		open: boolean;
		index: number;
	}
	let { items, open = $bindable(false), index = $bindable(0) }: Props = $props();

	let irPalette = $state<IrPalette>("white");
	let compare = $state(false);

	const item = $derived(items[Math.min(index, items.length - 1)]);
	const scene = $derived(item ? buildScene(item.input) : null);
	const f = $derived(item?.input.findings);
	const sensor = $derived(item ? SENSORS[item.input.sensor as SensorId] : undefined);
	/** Other passes over the same region, newest per sensor (for compare). */
	const siblings = $derived.by(() => {
		if (!item) return [];
		const seen = new Set<string>();
		return items.filter((x) => {
			if (x.input.regionId !== item.input.regionId || seen.has(x.input.sensor)) return false;
			seen.add(x.input.sensor);
			return true;
		});
	});
	const canCompare = $derived(siblings.length > 1);
	const confidence = $derived(
		f ? UNIT_CATEGORIES.reduce((s, c) => s + (f.coverage[c] ?? 0), 0) / UNIT_CATEGORIES.length : 0
	);
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const LABEL: Record<string, string> = {
		infantry: "Infantry",
		vehicle: "Vehicles",
		artillery: "Artillery",
		air: "Aircraft"
	};
	const PlatformIcon = $derived(
		sensor?.platform === "drone" ? IconDrone : sensor?.platform === "satellite" ? IconSatellite : IconRadar
	);

	const go = (d: number) => {
		if (!items.length) return;
		index = (index + d + items.length) % items.length;
	};
	function onkeydown(e: KeyboardEvent) {
		if (!open || compare) return;
		if (e.key === "ArrowLeft") go(-1);
		if (e.key === "ArrowRight") go(1);
	}
</script>

<svelte:window {onkeydown} />

<Modal bind:open title={item ? `${item.regionName} · ${sensor?.short ?? item.input.sensor}` : "Imagery"} size="xlarge">
	{#if item && scene && f}
		{#if compare && canCompare}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each siblings as s (s.input.reportId)}
					<figure class="space-y-1">
						<div class="overflow-hidden rounded-sm border border-line/20 bg-black">
							<SensorImage input={s.input} {irPalette} />
						</div>
						<figcaption class="flex items-center justify-between font-mono text-[11px] text-fg-muted">
							<span>{SENSORS[s.input.sensor as SensorId]?.label ?? s.input.sensor}</span>
							<span>DTG {dtg(s.input.observedAt)}</span>
						</figcaption>
					</figure>
				{/each}
			</div>
		{:else}
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
				<div class="space-y-2 min-w-0">
					<div class="overflow-hidden rounded-sm border border-line/20 bg-black">
						{#key item.input.reportId}
							<SensorImage input={item.input} {irPalette} animate />
						{/key}
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<IconButton
							icon={IconPrev}
							label="Previous pass"
							size="sm"
							onclick={() => go(-1)}
							disabled={items.length < 2}
						/>
						<span class="font-mono text-xs text-fg-muted">{index + 1} / {items.length}</span>
						<IconButton icon={IconNext} label="Next pass" size="sm" onclick={() => go(1)} disabled={items.length < 2} />
						{#if imageMode(item.input.sensor) === "ir"}
							<div
								class="ml-auto flex overflow-hidden rounded-sm border border-line/20"
								role="group"
								aria-label="Thermal palette"
							>
								{#each [["white", "White hot"], ["black", "Black hot"], ["iron", "Ironbow"]] as [p, l] (p)}
									<button
										type="button"
										class="px-2 py-1 font-mono text-[11px] {irPalette === p
											? 'bg-primary/20 text-primary-fg'
											: 'text-fg-muted hover:text-fg'}"
										aria-pressed={irPalette === p}
										onclick={() => (irPalette = p as IrPalette)}
									>
										{l}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Particulars -->
				<aside class="space-y-3 text-sm">
					<div class="flex items-center gap-2">
						<PlatformIcon class="size-5 text-primary-fg" />
						<div class="min-w-0">
							<p class="font-semibold text-fg truncate">{sensor?.label ?? item.input.sensor}</p>
							<p class="font-mono text-[11px] text-fg-muted">
								INTREP {String(item.input.reportId).padStart(5, "0")} · {ageLabel(item.input.observedAt)} ago
							</p>
						</div>
					</div>
					<div class="flex flex-wrap gap-1.5">
						<Badge tone={item.fresh ? "green" : "neutral"} size="xs">{item.fresh ? "FRESH" : "STALE"}</Badge>
						{#if f.outcome === "intercepted"}<Badge tone="red" size="xs">PLATFORM LOST</Badge>
						{:else if f.outcome === "obscured"}<Badge tone="amber" size="xs">NO OBSERVATION</Badge>
						{:else}<Badge tone="blue" size="xs">SAW {pct(confidence)}</Badge>{/if}
					</div>
					<Conditions
						weather={f.conditions.weather as Weather}
						night={f.conditions.night}
						cover={f.conditions.cover as Cover}
						compact
					/>
					<p class="font-mono text-[11px] text-fg-muted">DTG {dtg(item.input.observedAt)}</p>

					{#if f.outcome === "ok"}
						<ul class="space-y-1 border-t border-line/15 pt-2">
							{#each UNIT_CATEGORIES as c (c)}
								{@const seen = f.categories.find((x) => x.category === c)}
								<li class="flex items-center gap-2">
									<UnitBadge affiliation={f.coverage[c] ? "hostile" : "unknown"} unitType={c} size={16} />
									<span class="text-fg-soft">{LABEL[c]}</span>
									<span class="data ml-auto text-xs {seen ? 'text-hostile-fg font-bold' : 'text-fg-muted'}">
										{#if !f.coverage[c]}blind{:else if seen}{seen.estimated ? "~" : ""}{seen.count}{:else}0{/if}
									</span>
								</li>
							{/each}
						</ul>
						{#if f.buildings}
							<p class="data text-[11px] text-fg-soft">
								FORT {f.buildings.fortifications} · PWR {f.buildings.economy} · MED {f.buildings.hospitals}
							</p>
						{/if}
					{/if}

					{#if scene.notes.length || scene.detections.length}
						<div class="border-t border-line/15 pt-2 space-y-1">
							<p class="text-[10px] uppercase tracking-wide text-fg-muted">Analyst notes</p>
							<ul class="space-y-0.5 text-xs text-fg-soft">
								{#each scene.notes as n (n)}<li>{n}</li>{/each}
								<li>{scene.detections.length} object{scene.detections.length === 1 ? "" : "s"} annotated</li>
							</ul>
						</div>
					{/if}

					<div class="flex flex-wrap gap-2 border-t border-line/15 pt-2">
						{#if canCompare}
							<Button size="xs" variant="secondary" icon={IconCompare} onclick={() => (compare = true)}>
								Compare {siblings.length}
							</Button>
						{/if}
						<Button size="xs" variant="ghost" icon={IconDoc} href="/intel#report-{item.input.reportId}">Report</Button>
					</div>
				</aside>
			</div>
		{/if}
		{#if compare}
			<div class="mt-3 flex justify-end">
				<Button size="xs" variant="secondary" onclick={() => (compare = false)}>Back to single frame</Button>
			</div>
		{/if}
	{/if}
</Modal>
