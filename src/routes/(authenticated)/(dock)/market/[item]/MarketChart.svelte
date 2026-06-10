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

	export let priceHistory: PricePoint[] = [];
	export let currentPrice: number = 0;

	let mounted = false;
	onMount(() => {
		mounted = true;
	});

	// ── Normalise ────────────────────────────────────────────────────────────────
	$: allData = priceHistory
		.map((p) => ({ x: new Date(p.recordedAt).getTime(), y: p.pricePerUnit }))
		.sort((a, b) => a.x - b.x);

	// ── Range ────────────────────────────────────────────────────────────────────
	let selectedRange: Range = "1M";
	const RANGES: Range[] = ["1D", "1W", "1M", "All"];
	const RANGE_MS: Record<Range, number> = {
		"1D": 86_400_000,
		"1W": 604_800_000,
		"1M": 2_592_000_000,
		All: Infinity
	};

	$: data = (() => {
		if (selectedRange === "All" || !allData.length) return allData;
		const cutoff = allData[allData.length - 1].x - RANGE_MS[selectedRange];
		const filtered = allData.filter((d) => d.x >= cutoff);
		return filtered.length > 1 ? filtered : allData;
	})();

	// ── Interaction ──────────────────────────────────────────────────────────────
	let hoveredIndex: number | null = null;
	let svgEl: SVGSVGElement;
	$: if (selectedRange) hoveredIndex = null;

	// ── Dimensions ───────────────────────────────────────────────────────────────
	let containerWidth = 390;
	// Taller chart on narrow screens for a more immersive feel
	$: chartHeight = containerWidth < 480 ? 220 : 260;
	$: isMobile = containerWidth < 480;
	// On mobile remove side padding so line spans full width edge-to-edge
	$: PAD = {
		top: 36,
		right: isMobile ? 0 : 4,
		bottom: 32,
		left: isMobile ? 0 : 4
	};
	$: innerW = containerWidth - PAD.left - PAD.right;
	$: innerH = chartHeight - PAD.top - PAD.bottom;

	// ── Scales ───────────────────────────────────────────────────────────────────
	$: xMin = data[0]?.x ?? 0;
	$: xMax = data[data.length - 1]?.x ?? 1;
	$: yVals = data.map((d) => d.y);
	$: yMin = data.length ? Math.min(...yVals) * 0.993 : 0;
	$: yMax = data.length ? Math.max(...yVals) * 1.007 : 1;

	function sx(x: number): number {
		return PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
	}
	function sy(y: number): number {
		return PAD.top + (1 - (y - yMin) / (yMax - yMin || 1)) * innerH;
	}

	// ── Active point ─────────────────────────────────────────────────────────────
	$: activeIndex = hoveredIndex ?? data.length - 1;
	$: activePoint = data[activeIndex] ?? null;
	$: displayPrice = activePoint?.y ?? currentPrice;
	$: displayDate = activePoint ? new Date(activePoint.x) : null;
	$: firstPrice = data[0]?.y ?? displayPrice;
	$: change = displayPrice - firstPrice;
	$: changePct = firstPrice ? (change / firstPrice) * 100 : 0;
	$: isUp = change >= 0;
	$: scrubX = data.length ? sx(data[activeIndex].x) : PAD.left + innerW;

	// ── Split paths ──────────────────────────────────────────────────────────────
	$: leftData = data.slice(0, activeIndex + 1);
	$: leftLine = leftData.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`).join(" ");
	$: leftArea =
		leftData.length > 1
			? `${leftLine} L ${sx(leftData[leftData.length - 1].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${sx(leftData[0].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
			: "";

	$: rightData = data.slice(activeIndex);
	$: rightLine = rightData
		.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`)
		.join(" ");
	$: rightArea =
		rightData.length > 1
			? `${rightLine} L ${sx(rightData[rightData.length - 1].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${sx(rightData[0].x).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
			: "";

	$: baselineY = data.length ? sy(firstPrice) : PAD.top + innerH / 2;

	// ── Y ticks (for grid lines only, no labels) ──────────────────────────────────
	$: yTicks = Array.from({ length: 4 }, (_, i) => {
		const val = yMin + (i / 3) * (yMax - yMin);
		return sy(val);
	});

	// ── X ticks: fewer on mobile ─────────────────────────────────────────────────
	// Desktop: 6 labels (0/20/40/60/80/100%)
	// Mobile:  4 labels (0/33/66/100%) — avoids crowding
	$: tickCount = isMobile ? 4 : 6;
	$: xTicks =
		data.length < 2 ? [] : Array.from({ length: tickCount }, (_, i) => xMin + (i / (tickCount - 1)) * (xMax - xMin));

	// ── Formatting ───────────────────────────────────────────────────────────────
	function fmtAxisDate(ts: number): string {
		const d = new Date(ts);
		const pad = (n: number) => String(n).padStart(2, '0');
		if (selectedRange === "1D")
			return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		if (selectedRange === "1W") return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
		if (selectedRange === "1M") return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
		return `${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
	}

	function fmtTooltipDate(d: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
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
	$: PILL_W = isMobile ? 150 : 140;
	$: pillX = Math.max(PAD.left + PILL_W / 2, Math.min(PAD.left + innerW - PILL_W / 2, scrubX));
</script>

<!--
  Outer wrapper: no horizontal padding on mobile so the chart bleeds to the
  card edges. Vertical padding kept so the header breathes.
-->
<div class="bg-slate-800/50 border border-white/5 rounded-xl overflow-hidden" bind:clientWidth={containerWidth}>
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="px-4 pt-4 pb-2 select-none">
		<!-- Price row -->
		<div class="flex items-baseline gap-2 flex-wrap">
			<span class="text-2xl font-bold text-white tabular-nums leading-none">
				${fmtPrice(displayPrice)}
			</span>
			<span class="text-xs font-semibold tabular-nums {isUp ? 'text-green-400' : 'text-red-400'}">
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
		<div style="height:{chartHeight}px" class="flex items-center justify-center text-gray-500 text-sm">Loading…</div>
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
					<stop offset="0%" stop-color="#94a3b8" stop-opacity="0.10" />
					<stop offset="100%" stop-color="#94a3b8" stop-opacity="0.01" />
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
					stroke="#ffffff"
					stroke-opacity="0.05"
					stroke-width="1"
				/>
			{/each}

			<!-- Dotted open-price baseline -->
			<line
				x1={PAD.left}
				x2={PAD.left + innerW}
				y1={baselineY}
				y2={baselineY}
				stroke="#64748b"
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
					stroke="#475569"
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
					stroke="#94a3b8"
					stroke-width="1"
					stroke-dasharray="3 3"
					stroke-opacity="0.6"
				/>
			{/if}

			<!-- Date pill (inside PAD.top space) -->
			{#if hoveredIndex !== null && displayDate}
				<rect
					x={pillX - PILL_W / 2}
					y={PAD.top - 28}
					width={PILL_W}
					height={22}
					rx="5"
					fill="#1e293b"
					stroke="#334155"
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
					stroke="#1e293b"
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
		<div style="height:{chartHeight}px" class="flex items-center justify-center text-gray-400 text-sm px-4">
			Not enough data
		</div>
	{/if}
</div>

<style>
	.range-btn {
		padding: 5px 12px;
		border-radius: 7px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		background: transparent;
		border: 1px solid transparent;
		color: #475569;
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
		color: #94a3b8;
		border-color: #334155;
	}
	.range-btn.active {
		color: #f1f5f9;
		background: #1e293b;
		border-color: #475569;
	}

	.axis-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 10px;
		fill: #475569;
	}
	.date-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 11px;
		fill: #cbd5e1;
	}
</style>
