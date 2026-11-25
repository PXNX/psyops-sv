<!-- src/routes/(authenticated)/(dock)/armaments/DepthChart.svelte -->
<!-- Market depth for one good: units on offer stacked up from the cheapest
     price, as a step chart, with the guide price marked. Offers the viewer
     can buy fill solid; out-of-reach ones are hatched. -->
<script lang="ts">
	type Ask = { price: number; quantity: number; buyable: boolean };
	let { asks, guide, label }: { asks: Ask[]; guide: number; label: string } = $props();

	const W = 320;
	const H = 120;
	const PAD = { l: 4, r: 4, t: 14, b: 18 };
	const uid = $props.id();

	const sorted = $derived([...asks].sort((a, b) => a.price - b.price));
	const total = $derived(sorted.reduce((n, a) => n + a.quantity, 0));
	const lo = $derived(Math.min(guide * 0.5, ...sorted.map((a) => a.price)));
	const hi = $derived(Math.max(guide * 1.5, ...sorted.map((a) => a.price)) * 1.05);
	const x = (p: number) => PAD.l + ((p - lo) / (hi - lo || 1)) * (W - PAD.l - PAD.r);
	const y = (q: number) => H - PAD.b - (q / (total || 1)) * (H - PAD.t - PAD.b);

	// One block per offer: from its price to the next, as tall as the units stacked so far.
	const steps = $derived.by(() => {
		let cum = 0;
		return sorted.map((a, i) => {
			cum += a.quantity;
			const next = sorted[i + 1]?.price ?? hi;
			return {
				x0: x(a.price),
				x1: Math.max(x(next), x(a.price) + 1.5),
				y: y(cum),
				buyable: a.buyable,
				cum,
				price: a.price
			};
		});
	});
	const outline = $derived(
		steps.length ? `M${steps[0]!.x0},${H - PAD.b}` + steps.map((s) => `L${s.x0},${s.y}L${s.x1},${s.y}`).join("") : ""
	);
	const fmt = (n: number) => (n >= 1000 ? `$${+(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);
	const gx = $derived(x(guide));
</script>

<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label={label}>
	<defs>
		<pattern id="hatch-{uid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
			<line x1="0" y1="0" x2="0" y2="5" style="stroke: var(--color-fg-faint)" stroke-width="1.5" />
		</pattern>
	</defs>
	<line
		x1={PAD.l}
		x2={W - PAD.r}
		y1={H - PAD.b}
		y2={H - PAD.b}
		style="stroke: var(--color-line)"
		stroke-opacity="0.4"
	/>
	{#each steps as s, i (i)}
		<rect
			x={s.x0}
			y={s.y}
			width={s.x1 - s.x0}
			height={H - PAD.b - s.y}
			style:fill={s.buyable ? "var(--color-primary)" : `url(#hatch-${uid})`}
			fill-opacity={s.buyable ? 0.22 : 0.6}
		>
			<title>{s.cum.toLocaleString("en-US")} units at or below {fmt(s.price)}</title>
		</rect>
	{/each}
	{#if outline}
		<path d={outline} fill="none" style="stroke: var(--color-primary)" stroke-width="1.5" stroke-linejoin="round" />
	{:else}
		<text x={W / 2} y={H / 2} text-anchor="middle" font-size="11" style="fill: var(--color-fg-faint)">
			No offers on the book
		</text>
	{/if}
	<line
		x1={gx}
		x2={gx}
		y1={PAD.t - 2}
		y2={H - PAD.b}
		style="stroke: var(--color-warning)"
		stroke-dasharray="3 3"
		stroke-width="1.2"
	/>
	<text
		x={Math.min(Math.max(gx, 34), W - 34)}
		y={PAD.t - 4}
		text-anchor="middle"
		font-size="9"
		style="fill: var(--color-warning)"
	>
		guide {fmt(guide)}
	</text>
	<text x={PAD.l} y={H - 4} font-size="9" style="fill: var(--color-fg-faint)">{fmt(lo)}</text>
	<text x={W - PAD.r} y={H - 4} text-anchor="end" font-size="9" style="fill: var(--color-fg-faint)">{fmt(hi)}</text>
	{#if total}
		<text x={PAD.l + 2} y={PAD.t + 6} font-size="9" style="fill: var(--color-fg-muted)">
			{total.toLocaleString("en-US")} units
		</text>
	{/if}
</svg>
