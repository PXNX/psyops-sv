<!-- src/lib/component/docs/SensorMatrix.svelte -->
<!-- Which land sensor sees what: base detection per unit group in clear
     daylight over open ground, read straight from the recon config. -->
<script lang="ts">
	import { SENSORS, UNIT_CATEGORIES, type SensorId } from "#lib/config/index.js";

	const LABEL: Record<string, string> = {
		infantry: "Infantry",
		vehicle: "Vehicles",
		artillery: "Artillery",
		air: "Aircraft"
	};
	const sensors = Object.entries(SENSORS) as [SensorId, (typeof SENSORS)[SensorId]][];
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	// Shade each cell by how likely the sensor is to see that group.
	const tone = (p: number) => (p >= 0.8 ? "text-positive-fg" : p >= 0.5 ? "text-fg-soft" : "text-fg-faint");
</script>

<figure class="not-prose my-6 rounded-sm border border-line/20 bg-surface-1 p-4">
	<figcaption class="mb-2 text-sm font-medium text-fg">Sensor vs target</figcaption>
	<div class="overflow-x-auto">
		<table class="w-full min-w-[20rem] text-xs">
			<thead>
				<tr class="text-[10px] uppercase tracking-wide text-fg-muted">
					<th class="py-1 text-left font-medium">Sensor</th>
					{#each UNIT_CATEGORIES as c (c)}
						<th class="py-1 text-right font-medium">{LABEL[c] ?? c}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-line/15">
				{#each sensors as [id, s] (id)}
					<tr>
						<td class="py-1.5 text-fg-soft">{s.label}</td>
						{#each UNIT_CATEGORIES as c (c)}
							<td class="data py-1.5 text-right {tone(s.base[c])}">{pct(s.base[c])}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-2 text-xs text-fg-muted">
		Base detection in clear daylight over open ground. Weather, night, cover and air defence change it.
	</p>
</figure>
