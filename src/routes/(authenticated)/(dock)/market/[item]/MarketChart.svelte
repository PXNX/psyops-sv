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

	// Normalise all history once, sorted ascending
	$: allData = priceHistory
		.map((p) => ({ x: new Date(p.recordedAt).getTime(), y: p.pricePerUnit }))
		.sort((a, b) => a.x - b.x);

	// ── Range selector ──────────────────────────────────────────────────────────
	let selectedRange: Range = "1M";
	const RANGES: Range[] = ["1D", "1W", "1M", "All"];

	const RANGE_MS: Record<Range, number> = {
		"1D": 24 * 60 * 60 * 1000,
		"1W": 7 * 24 * 60 * 60 * 1000,
		"1M": 30 * 24 * 60 * 60 * 1000,
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

	// Reset hover when range changes
	$: if (selectedRange) hoveredIndex = null;

	// ── Dimensions ───────────────────────────────────────────────────────────────
	let containerWidth = 640;
	const height = 260;
	const PAD = { top: 36, right: 12, bottom: 36, left: 12 };

	$: innerW = containerWidth - PAD.left - PAD.right;
	$: innerH = height - PAD.top - PAD.bottom;

	// ── Scales ───────────────────────────────────────────────────────────────────
	$: xMin = data[0]?.x ?? 0;
	$: xMax = data[data.length - 1]?.x ?? 1;
	$: yVals = data.map((d) => d.y);
	$: yMin = data.length ? Math.min(...yVals) * 0.994 : 0;
	$: yMax = data.length ? Math.max(...yVals) * 1.006 : 1;

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

	// ── Split paths (colored left / gray right) ──────────────────────────────────
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

	// Dotted baseline at opening price of selected range
	$: baselineY = data.length ? sy(firstPrice) : PAD.top + innerH / 2;

	// ── Y ticks ──────────────────────────────────────────────────────────────────
	$: yTicks = Array.from({ length: 4 }, (_, i) => {
		const val = yMin + (i / 3) * (yMax - yMin);
		return { val, y: sy(val) };
	}).reverse();

	// ── X ticks: 6 marks at 0 / 20 / 40 / 60 / 80 / 100% of the time range ──────
	$: xTicks = (() => {
		if (data.length < 2) return [];
		return [0, 1, 2, 3, 4, 5].map((i) => xMin + (i / 5) * (xMax - xMin));
	})();

	// Format x-axis label depending on selected range
	function fmtAxisDate(ts: number): string {
		const d = new Date(ts);
		if (selectedRange === "1D") {
			return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
		}
		if (selectedRange === "1W") {
			return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
		}
		if (selectedRange === "1M") {
			return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		}
		// All — show month + year
		return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
	}

	// Format tooltip date based on range granularity
	function fmtTooltipDate(d: Date): string {
		if (selectedRange === "1D") {
			return d.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
		}
		if (selectedRange === "1W") {
			return d.toLocaleString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
		}
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
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

	// ── Price formatting ──────────────────────────────────────────────────────────
	function fmtPrice(v: number) {
		return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// ── Stable per-instance SVG IDs ───────────────────────────────────────────────
	const uid = Math.random().toString(36).slice(2, 7);
	const gradColorId = `gc-${uid}`;
	const gradGrayId = `gg-${uid}`;
	const clipId = `cp-${uid}`;

	// Pill clamped inside chart
	const PILL_W = 140;
	$: pillX = Math.max(PAD.left + PILL_W / 2, Math.min(PAD.left + innerW - PILL_W / 2, scrubX));
</script>

<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5" bind:clientWidth={containerWidth}>
	<!-- ── Price + change ───────────────────────────────────────────────────── -->
	<div class="select-none">
		<div class="flex items-end justify-between flex-wrap gap-2">
			<div class="flex items-end gap-3 flex-wrap">
				<span class="text-3xl font-bold text-white tabular-nums">
					${fmtPrice(displayPrice)}
				</span>
				<span class="text-sm font-semibold pb-1 tabular-nums {isUp ? 'text-green-400' : 'text-red-400'}">
					{isUp ? "▲" : "▼"}
					{Math.abs(changePct).toFixed(2)}% ({isUp ? "+" : ""}{fmtPrice(change)})
				</span>
			</div>

			<!-- ── Range selector ─────────────────────────────────────────────── -->
			<div class="flex gap-1 pb-1">
				{#each RANGES as r}
					<button class="range-btn" class:active={selectedRange === r} on:click={() => (selectedRange = r)}>
						{r}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- ── Chart ────────────────────────────────────────────────────────────── -->
	{#if !mounted}
		<div style="height:{height}px" class="flex items-center justify-center text-gray-500 text-sm">Loading…</div>
	{:else if data.length > 1}
		<svg
			bind:this={svgEl}
			width={containerWidth}
			{height}
			role="img"
			aria-label="Price chart"
			on:mousemove={onMouseMove}
			on:touchmove|preventDefault={onTouchMove}
			on:mouseleave={onLeave}
			on:touchend={onLeave}
			style="cursor:crosshair; display:block; touch-action:pan-y; overflow:visible;"
		>
			<defs>
				<linearGradient id={gradColorId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={isUp ? "#4ade80" : "#f87171"} stop-opacity="0.22" />
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
			{#each yTicks as tick}
				<line
					x1={PAD.left}
					x2={PAD.left + innerW}
					y1={tick.y}
					y2={tick.y}
					stroke="#ffffff"
					stroke-opacity="0.04"
					stroke-width="1"
				/>
			{/each}

			<!-- Dotted baseline at range-open price -->
			<line
				x1={PAD.left}
				x2={PAD.left + innerW}
				y1={baselineY}
				y2={baselineY}
				stroke="#64748b"
				stroke-width="1"
				stroke-dasharray="4 4"
				stroke-opacity="0.55"
			/>

			<!-- Gray area + line (right of scrubber) -->
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

			<!-- Colored area + line (up to scrubber) -->
			{#if leftArea}
				<path d={leftArea} fill="url(#{gradColorId})" clip-path="url(#{clipId})" />
			{/if}
			{#if leftData.length > 1}
				<path
					d={leftLine}
					fill="none"
					stroke={isUp ? "#4ade80" : "#f87171"}
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					clip-path="url(#{clipId})"
				/>
			{/if}

			<!-- Vertical scrubber line (hover only) -->
			{#if hoveredIndex !== null}
				<line
					x1={scrubX}
					x2={scrubX}
					y1={PAD.top}
					y2={PAD.top + innerH}
					stroke="#94a3b8"
					stroke-width="1"
					stroke-dasharray="3 3"
					stroke-opacity="0.65"
				/>
			{/if}

			<!-- Date pill above scrubber (hover only) -->
			{#if hoveredIndex !== null && displayDate}
				<rect
					x={pillX - PILL_W / 2}
					y={PAD.top - 28}
					width={PILL_W}
					height={20}
					rx="4"
					fill="#1e293b"
					stroke="#334155"
					stroke-width="1"
				/>
				<text x={pillX} y={PAD.top - 13} text-anchor="middle" class="date-label">
					{fmtTooltipDate(displayDate)}
				</text>
			{/if}

			<!-- Dot at active point -->
			{#if activePoint}
				<circle
					cx={scrubX}
					cy={sy(activePoint.y)}
					r="4"
					fill={isUp ? "#4ade80" : "#f87171"}
					stroke="#1e293b"
					stroke-width="2"
				/>
			{/if}

			<!-- X-axis quarter labels -->
			{#each xTicks as ts, i}
				<text
					x={sx(ts)}
					y={PAD.top + innerH + 20}
					text-anchor={i === 0 ? "start" : i === 5 ? "end" : "middle"}
					class="axis-label"
				>
					{fmtAxisDate(ts)}
				</text>
			{/each}
		</svg>
	{:else}
		<div style="height:{height}px" class="flex items-center justify-center text-gray-400 text-sm">Not enough data</div>
	{/if}
</div>

<style>
	.range-btn {
		padding: 2px 10px;
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		background: transparent;
		border: 1px solid transparent;
		color: #475569;
		cursor: pointer;
		transition:
			color 0.12s,
			background 0.12s,
			border-color 0.12s;
	}
	.range-btn:hover {
		color: #94a3b8;
		border-color: #334155;
	}
	.range-btn.active {
		color: #f1f5f9;
		background: #1e293b;
		border-color: #334155;
	}
	.axis-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 10px;
		fill: #475569;
	}
	.date-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 10px;
		fill: #cbd5e1;
	}
</style>
