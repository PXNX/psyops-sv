<!-- Terminal-style price chart: thin line on a grid, volume bars underneath,
     a crosshair with price and time tags. `active` is the point under the
     pointer (null when idle). -->
<script lang="ts">
	import type { SeriesPoint } from "./series";
	import { money } from "./series";
	import { dtgShortDate } from "#lib/utils/dtg.js";

	interface Props {
		points: SeriesPoint[];
		/** x domain in ms */
		start: number;
		end: number;
		height?: number;
		/** Dashed horizontal guide, e.g. the best ask. */
		reference?: { value: number; label: string } | null;
		volume?: boolean;
		formatTime?: (t: number) => string;
		active?: SeriesPoint | null;
	}

	let {
		points,
		start,
		end,
		height = 240,
		reference = null,
		volume = true,
		formatTime = (t) => dtgShortDate(t),
		active = $bindable(null)
	}: Props = $props();

	let width = $state(0);
	const W = $derived(width || 600);

	// The price scale sits in a gutter on the right, the time scale below.
	const AXIS_W = 52;
	const PAD = { top: 10, bottom: 22 };
	const plotRight = $derived(W - AXIS_W);
	const volH = $derived(volume ? Math.round(height * 0.16) : 0);
	const plotBottom = $derived(height - PAD.bottom - volH - (volume ? 4 : 0));

	const up = $derived(points.length < 2 || points[points.length - 1].price >= points[0].price);
	const stroke = $derived(up ? "var(--color-success)" : "var(--color-error)");

	const yDomain = $derived.by(() => {
		const vals = points.flatMap((p) => [p.price, p.low, p.high]);
		if (reference) vals.push(reference.value);
		if (!vals.length) return [0, 1] as const;
		const lo = Math.min(...vals);
		const hi = Math.max(...vals);
		const pad = (hi - lo) * 0.12 || Math.max(1, hi * 0.05);
		return [Math.max(0, lo - pad), hi + pad] as const;
	});

	const sx = (t: number) => ((t - start) / (end - start || 1)) * plotRight;
	const sy = (v: number) => PAD.top + (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0] || 1)) * (plotBottom - PAD.top);

	const line = $derived(
		points.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p.price).toFixed(1)}`).join("") +
			// Carry the last price to the right edge so the line reaches "now".
			(points.length ? `L${sx(end).toFixed(1)},${sy(points[points.length - 1].price).toFixed(1)}` : "")
	);
	const area = $derived(
		points.length ? `${line}L${sx(end).toFixed(1)},${plotBottom}L${sx(points[0].t).toFixed(1)},${plotBottom}Z` : ""
	);

	const maxVol = $derived(Math.max(1, ...points.map((p) => p.volume)));
	const barW = $derived(
		points.length > 1 ? Math.max(1, (sx(points[1].t) - sx(points[0].t)) * 0.6) : Math.max(2, W / 80)
	);

	const yTicks = $derived.by(() => {
		const [lo, hi] = yDomain;
		return [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => lo + (hi - lo) * f);
	});
	const xTicks = $derived.by(() => {
		const n = W < 480 ? 3 : 6;
		return Array.from({ length: n }, (_, i) => start + ((end - start) * (i + 0.5)) / n);
	});

	const last = $derived(points[points.length - 1] ?? null);

	let svgEl = $state<SVGSVGElement>();
	function scrub(e: PointerEvent) {
		if (!svgEl || !points.length) return;
		const rect = svgEl.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * W;
		const t = start + (Math.min(x, plotRight) / plotRight) * (end - start);
		let best = points[0];
		for (const p of points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
		active = best;
	}

	const TIME_W = 92;
	const timeX = $derived(active ? Math.min(plotRight - TIME_W / 2, Math.max(TIME_W / 2, sx(active.t))) : 0);
	const tagPrice = $derived(active?.price ?? last?.price ?? null);
</script>

<div class="relative w-full select-none" bind:clientWidth={width}>
	<svg
		bind:this={svgEl}
		viewBox="0 0 {W} {height}"
		width="100%"
		{height}
		class="block font-mono"
		role="img"
		aria-label="Price chart"
		style="touch-action: pan-y; cursor: crosshair"
		onpointermove={scrub}
		onpointerdown={scrub}
		onpointerleave={() => (active = null)}
		onpointercancel={() => (active = null)}
	>
		{#if width}
			<!-- grid -->
			{#each yTicks as v}
				<line x1="0" x2={plotRight} y1={sy(v)} y2={sy(v)} stroke="var(--color-line)" stroke-opacity="0.09" />
				{#if points.length || reference}
					<text x={plotRight + 6} y={sy(v) + 3} class="fill-fg-muted text-[10px]">{money(v)}</text>
				{/if}
			{/each}
			{#each xTicks as t}
				<line
					x1={sx(t)}
					x2={sx(t)}
					y1={PAD.top}
					y2={height - PAD.bottom}
					stroke="var(--color-line)"
					stroke-opacity="0.06"
				/>
			{/each}
			<line
				x1={plotRight}
				x2={plotRight}
				y1="0"
				y2={height - PAD.bottom}
				stroke="var(--color-line)"
				stroke-opacity="0.2"
			/>
			<line
				x1="0"
				x2={W}
				y1={height - PAD.bottom}
				y2={height - PAD.bottom}
				stroke="var(--color-line)"
				stroke-opacity="0.2"
			/>

			{#if volume}
				{#each points as p (p.t)}
					{#if p.volume > 0}
						{@const h = Math.max(1, (p.volume / maxVol) * volH)}
						<rect
							x={sx(p.t) - barW / 2}
							y={height - PAD.bottom - h}
							width={barW}
							height={h}
							fill={active?.t === p.t ? "var(--color-primary-fg)" : "var(--color-line)"}
							fill-opacity={active?.t === p.t ? 0.9 : 0.35}
						/>
					{/if}
				{/each}
			{/if}

			{#if reference}
				<line
					x1="0"
					x2={plotRight}
					y1={sy(reference.value)}
					y2={sy(reference.value)}
					stroke="var(--color-warning)"
					stroke-opacity="0.7"
					stroke-dasharray="2 3"
				/>
				<text x={plotRight - 4} y={sy(reference.value) - 4} text-anchor="end" class="fill-warning text-[10px]"
					>{reference.label.toUpperCase()}</text
				>
			{/if}

			{#if points.length}
				<path d={area} fill={stroke} fill-opacity="0.06" />
				<path d={line} fill="none" {stroke} stroke-width="1.5" stroke-linejoin="round" />
			{:else}
				<text
					x={plotRight / 2}
					y={(PAD.top + plotBottom) / 2}
					text-anchor="middle"
					class="fill-fg-muted text-[11px] tracking-widest">NO TRADES</text
				>
			{/if}

			<!-- crosshair -->
			{#if active}
				<line
					x1={sx(active.t)}
					x2={sx(active.t)}
					y1={PAD.top}
					y2={height - PAD.bottom}
					stroke="var(--color-fg-body)"
					stroke-opacity="0.45"
					stroke-dasharray="3 3"
				/>
				<line
					x1="0"
					x2={plotRight}
					y1={sy(active.price)}
					y2={sy(active.price)}
					stroke="var(--color-fg-body)"
					stroke-opacity="0.45"
					stroke-dasharray="3 3"
				/>
				<circle
					cx={sx(active.t)}
					cy={sy(active.price)}
					r="3"
					fill={stroke}
					stroke="var(--color-base-100)"
					stroke-width="1.5"
				/>
			{:else if last}
				<circle cx={sx(end)} cy={sy(last.price)} r="2.5" fill={stroke} />
			{/if}

			<!-- price tag on the scale -->
			{#if tagPrice !== null}
				<rect
					x={plotRight + 1}
					y={sy(tagPrice) - 8}
					width={AXIS_W - 1}
					height="16"
					rx="2"
					fill={active ? "var(--color-primary)" : stroke}
				/>
				<text
					x={plotRight + 6}
					y={sy(tagPrice) + 3.5}
					class="text-[10px] font-semibold {active ? 'fill-primary-content' : 'fill-base-100'}">{money(tagPrice)}</text
				>
			{/if}

			<!-- time scale -->
			{#if active}
				<rect
					x={timeX - TIME_W / 2}
					y={height - PAD.bottom + 3}
					width={TIME_W}
					height="16"
					rx="2"
					fill="var(--color-primary)"
				/>
				<text x={timeX} y={height - PAD.bottom + 14.5} text-anchor="middle" class="fill-primary-content text-[10px]"
					>{formatTime(active.t)}</text
				>
			{:else}
				{#each xTicks as t}
					<text x={sx(t)} y={height - 7} text-anchor="middle" class="fill-fg-muted text-[10px]">{formatTime(t)}</text>
				{/each}
			{/if}
		{/if}
	</svg>
</div>
