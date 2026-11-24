<!-- src/routes/(authenticated)/(dock)/intel/SensorMatrix.svelte -->
<!-- Which sensor sees what: base detection per unit group in clear daylight
     over open ground, folded away until asked for. -->
<script lang="ts">
	import { SENSORS, UNIT_CATEGORIES, type SensorId } from "#lib/config/index.js";
	import IconTable from "~icons/fluent/table-20-regular";
	import IconChevron from "~icons/fluent/chevron-down-20-regular";
	import { CATEGORY_LABEL, pct } from "./labels";

	const sensors = Object.entries(SENSORS) as [SensorId, (typeof SENSORS)[SensorId]][];
	// Shade each cell by how likely the sensor is to see that group.
	const tone = (p: number) => (p >= 0.8 ? "text-positive-fg" : p >= 0.5 ? "text-fg-soft" : "text-fg-faint");
</script>

<details class="group">
	<summary class="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
		<span class="section-title"><IconTable class="size-4 text-primary-fg" /> Sensor vs target</span>
		<IconChevron class="size-4 text-fg-faint transition-transform group-open:rotate-180" aria-hidden="true" />
	</summary>
	<p class="mt-2 text-xs text-fg-muted">Base detection in clear daylight over open ground.</p>
	<table class="mt-2 w-full text-xs">
		<thead>
			<tr class="text-[10px] uppercase tracking-wide text-fg-muted">
				<th class="py-1 text-left font-medium">Sensor</th>
				{#each UNIT_CATEGORIES as c (c)}
					<th class="py-1 text-right font-medium" title={CATEGORY_LABEL[c]}>{CATEGORY_LABEL[c].slice(0, 3)}</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-line/15">
			{#each sensors as [id, s] (id)}
				<tr title={s.label}>
					<td class="data py-1.5 text-fg-soft">{s.short}</td>
					{#each UNIT_CATEGORIES as c (c)}
						<td class="data py-1.5 text-right {tone(s.base[c])}">{pct(s.base[c])}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	<a href="/docs/intel" class="mt-2 inline-block text-xs text-primary-fg hover:underline">
		How weather, night and cover change this
	</a>
</details>
