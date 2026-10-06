<script lang="ts">
	import { onMount } from "svelte";

	type PricePoint = {
		id: number;
		itemType: string;
		itemName: string;
		pricePerUnit: number;
		quantity: number;
		transactionType: string;
		recordedAt: Date | string;
	};

	type Range = "1D" | "1W" | "1M" | "All";

	interface Props {
		priceHistory?: PricePoint[];
		currentPrice?: number;
	}

	let { priceHistory = [], currentPrice = 0 }: Props = $props();

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	// ── Normalise ────────────────────────────────────────────────────────────────
	const allData = $derived(
		priceHistory.map((p) => ({ x: new Date(p.recordedAt).getTime(), y: p.pricePerUnit })).sort((a, b) => a.x - b.x)
	);

	// ── Range ────────────────────────────────────────────────────────────────────
	let selectedRange = $state<Range>("1M");
	const RANGES: Range[] = ["1D", "1W", "1M", "All"];
	const RANGE_MS: Record<Range, number> = {
		"1D": 86_400_000,
		"1W": 604_800_000,
		"1M": 2_592_000_000,
		All: Infinity
	};

	const data = $derived.by(() => {
		if (selectedRange === "All" || !allData.length) return allData;
		const cutoff = allData[allData.length - 1].x - RANGE_MS[selectedRange];
		const filtered = allData.filter((d) => d.x >= cutoff);
		return filtered.length > 1 ? filtered : allData;
	});

	// ── Interaction ──────────────────────────────────────────────────────────────
	let hoveredIndex = $state<number | null>(null);
	let svgEl: SVGSVGElement;
	$effect(() => {
		selectedRange;
		hoveredIndex = null;
	});

	// ── Dimensions ───────────────────────────────────────────────────────────────
	let containerWidth = $state(390);
	// Taller chart on narrow screens for a more immersive feel
	const chartHeight = $derived(containerWidth < 480 ? 220 : 260);
	const isMobile = $derived(containerWidth < 480);
	// On mobile remove side padding so line spans full width edge-to-edge
	const PAD = $derived({
		top: 36,
		right: isMobile ? 0 : 4,
		bottom: 32,
		left: isMobile ? 0 : 4
	});
	const innerW = $derived(containerWidth - PAD.left - PAD.right);
	const innerH = $derived(chartHeight - PAD.top - PAD.bottom);

	// ── Scales ───────────────────────────────────────────────────────────────────
	const xMin = $derived(data[0]?.x ?? 0);
	const xMax = $derived(data[data.length - 1]?.x ?? 1);
	const yVals = $derived(data.map((d) => d.y));
	const yMin = $derived(data.length ? Math.min(...yVals) * 0.993 : 0);
	const yMax = $derived(data.length ? Math.max(...yVals) * 1.007 : 1);

	function sx(x: number): number {
		return PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
	}
	function sy(y: number): number {
		return PAD.top + (1 - (y - yMin) / (yMax - yMin || 1)) * innerH;
	}

	// ── Active point ─────────────────────────────────────────────────────────────
	const activeIndex = $derived(hoveredIndex ?? data.length - 1);
	const activePoint = $derived(data[activeIndex] ?? null);
	const displayPrice = $derived(activePoint?.y ?? currentPrice);
	const displayDate = $derived(activePoint ? new Date(activePoint.x) : null);
	const firstPrice = $derived(data[0]?.y ?? displayPrice);
	const change = $derived(displayPrice - firstPrice);
	const changePct = $derived(firstPrice ? (change / firstPrice) * 100 : 0);
	const isUp = $derived(change >= 0);
	const scrubX = $derived(data.length ? sx(data[activeIndex].x) : PAD.left + innerW);

	// ── Split paths ──────────────────────────────────────────────────────────────
	const leftData = $derived(data.slice(0, activeIndex + 1));
	const leftLine = $derived(
		leftData.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`).join(" ")
	);
	const leftArea = $derived(
		leftData.length > 1
			? `${leftLine} L ${sx(leftData[leftData.length - 1].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${sx(leftData[0].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
			: ""
	);

	const rightData = $derived(data.slice(activeIndex));
	const rightLine = $derived(
		rightData.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`).join(" ")
	);
	const rightArea = $derived(
		rightData.length > 1
			? `${rightLine} L ${sx(rightData[rightData.length - 1].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${sx(rightData[0].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
			: ""
	);

	const baselineY = $derived(data.length ? sy(firstPrice) : PAD.top + innerH / 2);

	// ── Y ticks (for grid lines only, no labels) ──────────────────────────────────
	const yTicks = $derived(
		Array.from({ length: 4 }, (_, i) => {
			const val = yMin + (i / 3) * (yMax - yMin);
			return sy(val);
		})
	);

	// ── X ticks: fewer on mobile ─────────────────────────────────────────────────
	// Desktop: 6 labels (0/20/40/60/80/100%)
	// Mobile:  4 labels (0/33/66/100%) — avoids crowding
	const tickCount = $derived(isMobile ? 4 : 6);
	const xTicks = $derived(
		data.length < 2 ? [] : Array.from({ length: tickCount }, (_, i) => xMin + (i / (tickCount - 1)) * (xMax - xMin))
	);

	// ── Formatting ───────────────────────────────────────────────────────────────
	function fmtAxisDate(ts: number): string {
		const d = new Date(ts);
		const pad = (n: number) => String(n).padStart(2, "0");
		if (selectedRange === "1D") return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		if (selectedRange === "1W") return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
		if (selectedRange === "1M") return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
		return `${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
	}

	function fmtTooltipDate(d: Date): string {
		const pad = (n: number) => String(n).padStart(2, "0");
		if (selectedRange === "1D")
			return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		if (selectedRange === "1W")
			return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
	}

	function fmtPrice(v: number): string {
		return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// ── Interaction handlers ──────────────────────────────────────────────────────
	function getIndex(clientX: number): number {
		if (!svgEl || !data.length) return data.length - 1;
		const rect = svgEl.getBoundingClientRect();
		const frac = (clientX - rect.left - PAD.left) / innerW;
		return Math.round(Math.max(0, Math.min(1, frac)) * (data.length - 1));
	}
	function onMouseMove(e: MouseEvent) {
		hoveredIndex = getIndex(e.clientX);
	}
	function onTouchMove(e: TouchEvent) {
		e.preventDefault();
		hoveredIndex = getIndex(e.touches[0].clientX);
	}
	function onLeave() {
		hoveredIndex = null;
	}

	// ── SVG IDs ───────────────────────────────────────────────────────────────────
	const uid = Math.random().toString(36).slice(2, 7);
	const gradColorId = `gc-${uid}`;
	const gradGrayId = `gg-${uid}`;
	const clipId = `cp-${uid}`;

	// Pill: slightly wider on mobile for touch comfort
	const PILL_W = $derived(isMobile ? 150 : 140);
	const pillX = $derived(Math.max(PAD.left + PILL_W / 2, Math.min(PAD.left + innerW - PILL_W / 2, scrubX)));
</script>

<!--
  Outer wrapper: no horizontal padding on mobile so the chart bleeds to the
  card edges. Vertical padding kept so the header breathes.
-->
<div class="panel rounded-sm overflow-hidden" bind:clientWidth={containerWidth}>
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="px-4 pt-4 pb-2 select-none">
		<!-- Price row -->
		<div class="flex items-baseline gap-2 flex-wrap">
			<span class="text-2xl font-bold font-mono text-[#f5efd8] tabular-nums leading-none">
				${fmtPrice(displayPrice)}
			</span>
			<span class="text-xs font-semibold tabular-nums {isUp ? 'text-[#b9f29a]' : 'text-red-400'}">
				{isUp ? "▲" : "▼"}
				{Math.abs(changePct).toFixed(2)}% ({isUp ? "+" : ""}{fmtPrice(change)})
			</span>
		</div>

		<!-- Range pills — full-width evenly spaced on mobile -->
		<div class="flex mt-3 gap-1 {isMobile ? 'w-full' : ''}">
			{#each RANGES as r}
				<button
					class="range-btn {isMobile ? 'flex-1' : ''}"
					class:active={selectedRange === r}
					on:click={() => (selectedRange = r)}
				>
					{r}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Chart ───────────────────────────────────────────────────────────── -->
	{#if !mounted}
		<div style="height:{chartHeight}px" class="flex items-center justify-center text-[#a8a083] text-sm">Loading…</div>
	{:else if data.length > 1}
		<!--
      touch-action:none prevents the page scrolling while finger is on the
      chart, giving full scrub control. We rely on the parent page having
      normal scroll outside the chart area.
    -->
		<svg
			bind:this={svgEl}
			width={containerWidth}
			height={chartHeight}
			role="img"
			aria-label="Price chart"
			on:mousemove={onMouseMove}
			on:touchmove|preventDefault={onTouchMove}
			on:mouseleave={onLeave}
			on:touchend={onLeave}
			style="display:block; touch-action:none; cursor:crosshair;"
		>
			<defs>
				<linearGradient id={gradColorId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={isUp ? "#4ade80" : "#f87171"} stop-opacity="0.25" />
					<stop offset="100%" stop-color={isUp ? "#4ade80" : "#f87171"} stop-opacity="0.02" />
				</linearGradient>
				<linearGradient id={gradGrayId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#a8a083" stop-opacity="0.10" />
					<stop offset="100%" stop-color="#a8a083" stop-opacity="0.01" />
				</linearGradient>
				<clipPath id={clipId}>
					<rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
				</clipPath>
			</defs>

			<!-- Grid lines -->
			{#each yTicks as y}
				<line
					x1={PAD.left}
					x2={PAD.left + innerW}
					y1={y}
					y2={y}
					stroke="#c8b47a"
					stroke-opacity="0.06"
					stroke-width="1"
				/>
			{/each}

			<!-- Dotted open-price baseline -->
			<line
				x1={PAD.left}
				x2={PAD.left + innerW}
				y1={baselineY}
				y2={baselineY}
				stroke="#a8a083"
				stroke-width="1"
				stroke-dasharray="4 4"
				stroke-opacity="0.5"
			/>

			<!-- Gray right section -->
			{#if rightArea}
				<path d={rightArea} fill="url(#{gradGrayId})" clip-path="url(#{clipId})" />
			{/if}
			{#if rightData.length > 1}
				<path
					d={rightLine}
					fill="none"
					stroke="#a8a083"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					clip-path="url(#{clipId})"
				/>
			{/if}

			<!-- Colored left section -->
			{#if leftArea}
				<path d={leftArea} fill="url(#{gradColorId})" clip-path="url(#{clipId})" />
			{/if}
			{#if leftData.length > 1}
				<path
					d={leftLine}
					fill="none"
					stroke={isUp ? "#4ade80" : "#f87171"}
					stroke-width={isMobile ? "2.5" : "2"}
					stroke-linecap="round"
					stroke-linejoin="round"
					clip-path="url(#{clipId})"
				/>
			{/if}

			<!-- Scrubber line -->
			{#if hoveredIndex !== null}
				<line
					x1={scrubX}
					x2={scrubX}
					y1={PAD.top}
					y2={PAD.top + innerH}
					stroke="#c8b47a"
					stroke-width="1"
					stroke-dasharray="3 3"
					stroke-opacity="0.4"
				/>
			{/if}

			<!-- Date pill (inside PAD.top space) -->
			{#if hoveredIndex !== null && displayDate}
				<rect
					x={pillX - PILL_W / 2}
					y={PAD.top - 28}
					width={PILL_W}
					height={22}
					rx="2"
					fill="#1a1f15"
					stroke="#c8b47a"
					stroke-opacity="0.25"
					stroke-width="1"
				/>
				<text x={pillX} y={PAD.top - 12} text-anchor="middle" class="date-label">
					{fmtTooltipDate(displayDate)}
				</text>
			{/if}

			<!-- Active dot — larger on mobile for fat-finger friendliness -->
			{#if activePoint}
				<circle
					cx={scrubX}
					cy={sy(activePoint.y)}
					r={isMobile ? 5 : 4}
					fill={isUp ? "#4ade80" : "#f87171"}
					stroke="#242a1d"
					stroke-width="2"
				/>
			{/if}

			<!-- X-axis labels -->
			{#each xTicks as ts, i}
				{@const last = i === xTicks.length - 1}
				<text
					x={sx(ts)}
					y={PAD.top + innerH + 22}
					text-anchor={i === 0 ? "start" : last ? "end" : "middle"}
					class="axis-label"
				>
					{fmtAxisDate(ts)}
				</text>
			{/each}
		</svg>
	{:else}
		<div style="height:{chartHeight}px" class="flex items-center justify-center text-[#a8a083] text-sm px-4">
			Not enough data
		</div>
	{/if}
</div>

<style>
	.range-btn {
		padding: 5px 12px;
		border-radius: 2px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		background: transparent;
		border: 1px solid transparent;
		color: #a8a083;
		cursor: pointer;
		transition:
			color 0.1s,
			background 0.1s,
			border-color 0.1s;
		/* Minimum tap target size */
		min-height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.range-btn:hover {
		color: #d3caa9;
		border-color: rgba(200, 180, 122, 0.2);
	}
	.range-btn.active {
		color: #ffd35c;
		background: rgba(230, 165, 39, 0.1);
		border-color: rgba(230, 165, 39, 0.3);
	}

	.axis-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 10px;
		fill: #a8a083;
	}
	.date-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 11px;
		fill: #e6ddbf;
	}
</style>
