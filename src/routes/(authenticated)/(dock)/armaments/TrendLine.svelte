<!-- src/routes/(authenticated)/(dock)/armaments/TrendLine.svelte -->
<!-- Seven-day price sparkline for a market card. Rising prices draw in the
     positive tone, falling ones in the hostile tone. -->
<script lang="ts">
	let { prices, class: className = "", label }: { prices: number[]; class?: string; label: string } = $props();

	const W = 100;
	const H = 28;
	const up = $derived(prices.length < 2 || prices[prices.length - 1]! >= prices[0]!);
	const flat = $derived(prices.every((p) => p === prices[0]));
	const tone = $derived(flat ? "var(--color-fg-muted)" : up ? "var(--color-positive)" : "var(--color-hostile)");
	const points = $derived.by(() => {
		if (!prices.length) return [] as [number, number][];
		const pts = prices.length === 1 ? [prices[0]!, prices[0]!] : prices;
		const lo = Math.min(...pts);
		const hi = Math.max(...pts);
		return pts.map(
			(v, i) =>
				[(i / (pts.length - 1)) * W, hi === lo ? H / 2 : 3 + (1 - (v - lo) / (hi - lo)) * (H - 6)] as [number, number]
		);
	});
	const line = $derived(points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(""));
	const last = $derived(points[points.length - 1]);
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class={className} role="img" aria-label={label}>
	{#if line}
		{#if !flat}<path d="{line}L{W},{H}L0,{H}Z" style:fill={tone} fill-opacity="0.1" />{/if}
		<path
			d={line}
			fill="none"
			style:stroke={tone}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
			stroke-linejoin="round"
		/>
		{#if last}<circle cx={last[0]} cy={last[1]} r="1.8" style:fill={tone} />{/if}
	{/if}
</svg>
