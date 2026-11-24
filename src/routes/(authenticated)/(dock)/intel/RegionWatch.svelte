<!-- src/routes/(authenticated)/(dock)/intel/RegionWatch.svelte -->
<!-- Regions under watch: one row per region with a fused picture, showing a
     confidence meter, the hostile forces seen per category as tactical
     symbols, the sensors that contributed and how old the picture is. -->
<script lang="ts">
	import { Badge } from "#lib/component/ui/index.js";
	import { UnitBadge } from "#lib/component/tactical/index.js";
	import { SENSORS, UNIT_CATEGORIES, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import IconChevron from "~icons/fluent/chevron-right-20-regular";
	import type { PageData } from "./$types";
	import { CATEGORY_LABEL, LEVEL_LABEL, LEVEL_TONE, pct } from "./labels";

	interface Props {
		pictures: PageData["pictures"];
		now: Date;
	}
	let { pictures, now }: Props = $props();

	const sensorShort = (s: string) => SENSORS[s as SensorId]?.short ?? s;
	const meterTone = { none: "bg-fg-faint", low: "bg-warning", medium: "bg-primary", high: "bg-positive" } as const;
	// Biggest known threat first, then the most certain picture.
	const rows = $derived(
		[...pictures].sort(
			(a, b) => b.picture.knownUnits - a.picture.knownUnits || b.picture.confidence - a.picture.confidence
		)
	);
</script>

<ul class="divide-y divide-line/15">
	{#each rows as { region, picture } (region.id)}
		{@const blind = UNIT_CATEGORIES.filter((c) => picture.categories[c].coverage === 0)}
		{@const seen = UNIT_CATEGORIES.filter((c) => picture.categories[c].coverage > 0 && picture.categories[c].count)}
		{@const usable = picture.sensors.some((s) => s.outcome === "ok")}
		<li class="group grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,11rem)_8rem_minmax(0,1fr)_auto] sm:items-center">
			<!-- Region -->
			<div class="min-w-0">
				<a href="/region/{region.id}" class="block truncate font-semibold text-fg hover:text-primary-fg">
					{region.name}
				</a>
				<div class="truncate text-xs text-fg-muted">{region.ownerName ?? "Unclaimed"}</div>
			</div>

			<!-- Confidence -->
			<div title="Share of the enemy order of battle the fresh passes could have seen">
				<div class="flex items-baseline justify-between gap-2">
					<span class="data text-sm text-fg">{pct(picture.confidence)}</span>
					<Badge tone={LEVEL_TONE[picture.level]} size="xs">{LEVEL_LABEL[picture.level]}</Badge>
				</div>
				<div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-8" aria-hidden="true">
					<div
						class="h-full rounded-full transition-[width] duration-700 {meterTone[picture.level]}"
						style="width: {Math.max(2, Math.round(picture.confidence * 100))}%"
					></div>
				</div>
			</div>

			<!-- Known forces -->
			<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
				{#if !usable}
					<span class="text-xs text-warning">No usable pass yet — re-task with another sensor</span>
				{:else}
					{#each seen as c (c)}
						{@const cat = picture.categories[c]}
						<UnitBadge
							affiliation="hostile"
							unitType={c}
							count={cat.count}
							estimated={cat.estimated}
							size={20}
							title="{CATEGORY_LABEL[c]}: {cat.estimated ? '~' : ''}{cat.count} ({pct(cat.coverage)} detection)"
						/>
					{/each}
					{#if !seen.length}
						<span class="text-xs text-positive-fg">No hostile forces seen</span>
					{/if}
					{#if blind.length}
						<span class="text-[11px] text-fg-faint" title="No fresh pass could see these categories">
							Blind: {blind.map((c) => CATEGORY_LABEL[c]).join(", ")}
						</span>
					{/if}
				{/if}
			</div>

			<!-- Sensors + age -->
			<a
				href="/region/{region.id}"
				class="flex items-center justify-between gap-3 text-fg-muted hover:text-fg sm:justify-end"
				title="Open region to re-task recon"
			>
				<span class="flex flex-wrap gap-1">
					{#each picture.sensors as s (s.reportId)}
						<span
							class="data rounded-sm border border-line/15 px-1 text-[10px] {s.outcome === 'ok'
								? 'text-fg-soft'
								: 'text-fg-faint line-through'}"
							title="{SENSORS[s.sensor as SensorId]?.label ?? s.sensor} · {s.outcome === 'ok'
								? `${pct(s.confidence)} detection`
								: s.outcome}"
						>
							{sensorShort(s.sensor)}
						</span>
					{/each}
				</span>
				<span class="data shrink-0 text-xs">
					{picture.latestObservedAt ? ageLabel(picture.latestObservedAt, now) : "—"}
				</span>
				<IconChevron class="hidden size-4 shrink-0 transition-transform group-hover:translate-x-0.5 sm:block" />
			</a>
		</li>
	{/each}
</ul>
