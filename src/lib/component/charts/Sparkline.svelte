<!-- Tiny dependency-free trend chart. Works with plain numbers, no SSR issues. -->
<script lang="ts">
	let {
		values,
		label = "",
		color = "var(--color-primary)",
		height = 72,
		unit = ""
	}: {
		values: number[];
		label?: string;
		color?: string;
		height?: number;
		unit?: string;
	} = $props();

	const width = 300;
	const pad = 4;
	const points = $derived.by(() => {
		if (values.length === 0) return "";
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const span = max - min || 1;
		return values
			.map((v, i) => {
				const x = pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
				const y = height - pad - ((v - min) / span) * (height - pad * 2);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(" ");
	});
	const last = $derived(values.length ? values[values.length - 1]! : 0);
	const first = $derived(values.length ? values[0]! : 0);
	const change = $derived(first ? ((last - first) / first) * 100 : 0);
</script>

<div class="sparkline">
	<div class="mb-1 flex items-baseline justify-between gap-2">
		{#if label}<span class="text-[11px] uppercase tracking-[0.16em] text-fg-muted">{label}</span>{/if}
		<span class="font-mono text-xs" style:color>
			{last.toLocaleString()}{unit}
			{#if values.length > 1}
				<span class:text-error={change < 0} class:text-positive-fg={change >= 0}>
					({change >= 0 ? "+" : ""}{change.toFixed(1)}%)
				</span>
			{/if}
		</span>
	</div>
	<svg viewBox="0 0 {width} {height}" class="w-full" style="height:{height}px" role="img" aria-label={label}>
		{#if points}
			<polyline {points} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			<circle cx={width - pad} cy={points.split(" ").at(-1)?.split(",")[1]} r="3" fill={color} />
		{:else}
			<text x={width / 2} y={height / 2} text-anchor="middle" class="fill-fg-faint text-[10px]">No history yet</text>
		{/if}
	</svg>
</div>
