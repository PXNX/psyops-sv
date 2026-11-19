<!-- Small price line for a quote row. -->
<script lang="ts">
	let { prices, class: className = "" }: { prices: number[]; class?: string } = $props();

	const W = 100;
	const H = 32;

	const up = $derived(prices.length < 2 || prices[prices.length - 1] >= prices[0]);
	const stroke = $derived(
		prices.length < 2 ? "var(--color-fg-muted)" : up ? "var(--color-success)" : "var(--color-error)"
	);
	const flat = $derived(prices.every((p) => p === prices[0]));
	const path = $derived.by(() => {
		if (!prices.length) return "";
		const pts = prices.length === 1 ? [prices[0], prices[0]] : prices;
		const lo = Math.min(...pts);
		const hi = Math.max(...pts);
		const span = hi - lo || 1;
		return pts
			.map((v, i) => {
				const x = (i / (pts.length - 1)) * W;
				const y = hi === lo ? H / 2 : 3 + (1 - (v - lo) / span) * (H - 6);
				return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join("");
	});
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class={className} aria-hidden="true">
	{#if path}
		{#if !flat}<path d="{path}L{W},{H}L0,{H}Z" fill={stroke} fill-opacity="0.07" />{/if}
		<path d={path} fill="none" {stroke} stroke-width="1.25" vector-effect="non-scaling-stroke" />
	{:else}
		<line
			x1="0"
			x2={W}
			y1={H / 2}
			y2={H / 2}
			stroke="var(--color-fg-muted)"
			stroke-opacity="0.35"
			stroke-dasharray="3 4"
			vector-effect="non-scaling-stroke"
		/>
	{/if}
</svg>
