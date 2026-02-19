<script lang="ts">
	import { onMount } from "svelte";

	// Matches the shape returned by +page.server.ts
	type PricePoint = {
		id: number;
		itemType: string;
		itemName: string;
		pricePerUnit: number;
		quantity: number;
		transactionType: string;
		recordedAt: Date | string;
	};

	export let priceHistory: PricePoint[] = [];
	export let currentPrice: number = 0;

	// --- SSR guard ---
	let mounted = false;
	onMount(() => {
		mounted = true;
	});

	// --- Normalize data to { x: timestamp, y: price } ---
	$: data = priceHistory.map((p) => ({
		x: new Date(p.recordedAt).getTime(),
		y: p.pricePerUnit
	}));

	// --- Interaction state ---
	let hoveredIndex: number | null = null;
	let svgEl: SVGSVGElement;

	// --- Responsive width ---
	let containerWidth = 640;
	const height = 260;
	const padding = { top: 24, right: 12, bottom: 36, left: 12 };

	$: innerW = containerWidth - padding.left - padding.right;
	$: innerH = height - padding.top - padding.bottom;

	// --- Scales ---
	$: xMin = data[0]?.x ?? 0;
	$: xMax = data[data.length - 1]?.x ?? 1;
	$: yVals = data.map((d) => d.y);
	$: yMin = data.length ? Math.min(...yVals) * 0.995 : 0;
	$: yMax = data.length ? Math.max(...yVals) * 1.005 : 1;

	function sx(x: number) {
		return padding.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
	}
	function sy(y: number) {
		return padding.top + (1 - (y - yMin) / (yMax - yMin || 1)) * innerH;
	}

	// --- Derived display values ---
	$: activeIndex = hoveredIndex ?? data.length - 1;
	$: activePoint = data[activeIndex] ?? null;

	$: displayPrice = activePoint?.y ?? currentPrice;
	$: displayDate = activePoint ? new Date(activePoint.x) : null;

	$: firstPrice = data[0]?.y ?? displayPrice;
	$: change = displayPrice - firstPrice;
	$: changePct = firstPrice ? (change / firstPrice) * 100 : 0;
	$: isUp = change >= 0;

	// --- Path ---
	$: linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`).join(" ");

	$: baseY = data.length ? sy(data[0].y) : padding.top + innerH;
	$: areaPath =
		data.length > 1
			? `${linePath} L ${sx(xMax).toFixed(1)} ${baseY.toFixed(1)} L ${sx(xMin).toFixed(1)} ${baseY.toFixed(1)} Z`
			: "";

	// --- Y-axis ticks ---
	$: yTicks = Array.from({ length: 4 }, (_, i) => {
		const val = yMin + (i / 3) * (yMax - yMin);
		return { val, y: sy(val) };
	}).reverse();

	// --- X-axis ticks ---
	$: xTicks = (() => {
		if (data.length < 2) return [];
		return [0, 1, 2, 3].map((i) => {
			const idx = Math.round((i / 3) * (data.length - 1));
			return data[idx];
		});
	})();

	// --- Interaction ---
	function getIndexFromClientX(clientX: number): number {
		if (!svgEl) return data.length - 1;
		const rect = svgEl.getBoundingClientRect();
		const relX = clientX - rect.left;
		const frac = (relX - padding.left) / innerW;
		const idx = Math.round(Math.max(0, Math.min(1, frac)) * (data.length - 1));
		return idx;
	}

	function onMouseMove(e: MouseEvent) {
		hoveredIndex = getIndexFromClientX(e.clientX);
	}

	function onTouchMove(e: TouchEvent) {
		e.preventDefault();
		hoveredIndex = getIndexFromClientX(e.touches[0].clientX);
	}

	function onLeave() {
		hoveredIndex = null;
	}

	// --- Formatting ---
	function fmtPrice(v: number) {
		return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function fmtDate(d: Date) {
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function fmtAxisDate(ts: number) {
		return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	const gradId = `mcg-${Math.random().toString(36).slice(2, 7)}`;
	const clipId = `mcc-${Math.random().toString(36).slice(2, 7)}`;
</script>

<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5" bind:clientWidth={containerWidth}>
	<!-- Header: price + date update live as user scrubs -->
	<div class="mb-4 select-none">
		<div class="flex items-end gap-3 flex-wrap">
			<span class="text-3xl font-bold text-white tabular-nums transition-all duration-75">
				${fmtPrice(displayPrice)}
			</span>
			<span class="text-sm font-semibold pb-1 tabular-nums {isUp ? 'text-green-400' : 'text-red-400'}">
				{isUp ? "▲" : "▼"}
				{Math.abs(changePct).toFixed(2)}% ({isUp ? "+" : ""}{fmtPrice(change)})
			</span>
		</div>
		<p class="text-xs text-gray-400 mt-1 h-4 transition-all duration-75">
			{#if displayDate}
				{fmtDate(displayDate)}
			{/if}
		</p>
	</div>

	<!-- Chart -->
	{#if !mounted}
		<div style="height: {height}px;" class="flex items-center justify-center text-gray-500 text-sm">Loading…</div>
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
			style="cursor: crosshair; display: block; touch-action: pan-y;"
		>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={isUp ? "#4ade80" : "#f87171"} stop-opacity="0.20" />
					<stop offset="100%" stop-color={isUp ? "#4ade80" : "#f87171"} stop-opacity="0" />
				</linearGradient>
				<clipPath id={clipId}>
					<rect x={padding.left} y={padding.top} width={innerW} height={innerH} />
				</clipPath>
			</defs>

			<!-- Grid lines -->
			{#each yTicks as tick}
				<line
					x1={padding.left}
					x2={padding.left + innerW}
					y1={tick.y}
					y2={tick.y}
					stroke="#ffffff"
					stroke-opacity="0.05"
					stroke-width="1"
				/>
			{/each}

			<!-- Area fill -->
			<path d={areaPath} fill="url(#{gradId})" clip-path="url(#{clipId})" />

			<!-- Baseline -->
			<line
				x1={padding.left}
				x2={padding.left + innerW}
				y1={baseY}
				y2={baseY}
				stroke={isUp ? "#4ade80" : "#f87171"}
				stroke-width="1"
				stroke-dasharray="3 3"
				stroke-opacity="0.4"
			/>

			<!-- Price line -->
			<path
				d={linePath}
				fill="none"
				stroke={isUp ? "#4ade80" : "#f87171"}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				clip-path="url(#{clipId})"
			/>

			<!-- X-axis ticks -->
			{#each xTicks as tick}
				{@const x = sx(tick.x)}
				<text {x} y={padding.top + innerH + 20} text-anchor="middle" class="chart-label">
					{fmtAxisDate(tick.x)}
				</text>
			{/each}

			<!-- Y-axis labels (right-aligned) -->
			{#each yTicks as tick}
				<text x={padding.left + innerW} y={tick.y - 4} text-anchor="end" class="chart-label">
					${fmtPrice(tick.val)}
				</text>
			{/each}

			<!-- Scrubber line + dot (always visible, snaps to nearest point) -->
			{#if data.length > 0}
				{@const hx = sx(data[activeIndex].x)}
				{@const hy = sy(data[activeIndex].y)}

				<!-- Vertical line -->
				<line
					x1={hx}
					x2={hx}
					y1={padding.top}
					y2={padding.top + innerH}
					stroke="#94a3b8"
					stroke-width="1"
					stroke-dasharray={hoveredIndex !== null ? "4 3" : "0"}
					stroke-opacity={hoveredIndex !== null ? 0.7 : 0}
				/>

				<!-- Dot -->
				<circle cx={hx} cy={hy} r="4" fill={isUp ? "#4ade80" : "#f87171"} stroke="#1e293b" stroke-width="2" />
			{/if}
		</svg>
	{:else}
		<div style="height: {height}px;" class="flex items-center justify-center text-gray-400 text-sm">
			Not enough data to display chart
		</div>
	{/if}
</div>

<style>
	.chart-label {
		font-family: ui-monospace, "Cascadia Code", monospace;
		font-size: 10px;
		fill: #64748b;
	}
</style>
