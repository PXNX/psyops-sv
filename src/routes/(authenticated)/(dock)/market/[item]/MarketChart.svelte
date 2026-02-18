<script lang="ts">
	import { Plot, Area, Svg, type TooltipContext } from "svelteplot";
	import { scaleTime, scaleLinear } from "d3-scale";

	interface PricePoint {
		recordedAt: string;
		pricePerUnit: number;
	}

	interface Props {
		priceHistory: PricePoint[];
		currentPrice: number;
		selectedRange?: "1D" | "1W" | "1M" | "1Y" | "Max";
	}

	let { priceHistory, currentPrice, selectedRange = "Max" }: Props = $props();

	// Transform data to proper format
	const chartData = $derived(
		priceHistory.map((point) => ({
			x: new Date(point.recordedAt),
			y: point.pricePerUnit
		}))
	);

	// Calculate price change from first to last
	const priceChange = $derived.by(() => {
		if (!priceHistory.length) return { amount: 0, percent: 0 };
		const firstPrice = priceHistory[0].pricePerUnit;
		const lastPrice = priceHistory[priceHistory.length - 1].pricePerUnit;
		const amount = lastPrice - firstPrice;
		const percent = ((amount / firstPrice) * 100).toFixed(2);
		return { amount, percent: parseFloat(percent) };
	});

	// Determine if price is up or down
	const isPositive = $derived(priceChange.percent >= 0);

	// Interactive state
	let hoveredIndex = $state<number | null>(null);
	let isInteracting = $state(false);

	const displayPrice = $derived(
		hoveredIndex !== null ? chartData[hoveredIndex].y : currentPrice
	);

	const displayDate = $derived(
		hoveredIndex !== null ? chartData[hoveredIndex].x : null
	);

	const displayChange = $derived.by(() => {
		if (hoveredIndex === null) return priceChange;
		const firstPrice = chartData[0].y;
		const hoveredPrice = chartData[hoveredIndex].y;
		const amount = hoveredPrice - firstPrice;
		const percent = ((amount / firstPrice) * 100).toFixed(2);
		return { amount, percent: parseFloat(percent) };
	});

	// Format date
	const formatDate = (date: Date) => {
		const months = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
		return `${date.getDate()} ${months[date.getMonth()]}`;
	};

	// Format month/year for x-axis
	const formatAxisDate = (date: Date) => {
		const months = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
		return `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
	};

	// Create scales
	const xScale = $derived(
		scaleTime()
			.domain([chartData[0]?.x ?? new Date(), chartData[chartData.length - 1]?.x ?? new Date()])
			.nice()
	);

	const yMin = $derived(Math.min(...chartData.map((d) => d.y)));
	const yMax = $derived(Math.max(...chartData.map((d) => d.y)));
	const yRange = $derived(yMax - yMin);

	const yScale = $derived(
		scaleLinear()
			.domain([yMin - yRange * 0.1, yMax + yRange * 0.1])
			.nice()
	);

	// Handle interaction
	function handleMouseMove(event: MouseEvent, width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }) {
		if (chartData.length === 0) return;
		
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const x = event.clientX - rect.left - padding.left;
		const chartWidth = width - padding.left - padding.right;
		
		if (x < 0 || x > chartWidth) {
			hoveredIndex = null;
			isInteracting = false;
			return;
		}

		isInteracting = true;
		const index = Math.round((x / chartWidth) * (chartData.length - 1));
		hoveredIndex = Math.max(0, Math.min(index, chartData.length - 1));
	}

	function handleTouchMove(event: TouchEvent, width: number, height: number, padding: { left: number; right: number; top: number; bottom: number }) {
		if (chartData.length === 0) return;
		event.preventDefault();
		
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const touch = event.touches[0];
		const x = touch.clientX - rect.left - padding.left;
		const chartWidth = width - padding.left - padding.right;
		
		if (x < 0 || x > chartWidth) {
			hoveredIndex = null;
			isInteracting = false;
			return;
		}

		isInteracting = true;
		const index = Math.round((x / chartWidth) * (chartData.length - 1));
		hoveredIndex = Math.max(0, Math.min(index, chartData.length - 1));
	}

	function handleMouseLeave() {
		hoveredIndex = null;
		isInteracting = false;
	}

	// Calculate percentage labels for right side
	const percentageLabels = $derived.by(() => {
		if (chartData.length === 0) return [];
		const basePrice = chartData[0].y;
		return [0.049, 0.017, -0.015, -0.047].map(pct => ({
			percent: pct,
			label: `${(pct * 100).toFixed(1)} %`
		}));
	});
</script>

<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 select-none">
	<!-- Price Display -->
	<div class="mb-6">
		<div class="text-4xl font-bold text-white mb-2">
			{displayPrice.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
		</div>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-1 {displayChange.percent >= 0 ? 'text-red-400' : 'text-green-400'}">
				<span>{displayChange.percent >= 0 ? "▼" : "▲"}</span>
				<span class="font-semibold text-lg">
					{Math.abs(displayChange.percent).toFixed(2)} %
				</span>
			</div>
			{#if displayDate}
				<span class="text-gray-400 text-sm">{formatDate(displayDate)}</span>
			{/if}
		</div>
	</div>

	<!-- Time Range Selector -->
	<div class="flex justify-between items-center mb-6">
		<div class="flex gap-6">
			{#each ["1T", "1W", "1M", "1J", "Max"] as range}
				<button
					class="px-1 py-1 text-base font-medium transition-colors {selectedRange === range
						? 'text-white font-bold'
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{range}
				</button>
			{/each}
		</div>
	</div>

	<!-- Chart Container -->
	<div class="relative" style="height: 300px; touch-action: none;">
		{#if chartData.length > 1}
								{@const baselineY = yScale(chartData[0].y)}

			<Plot
				data={chartData}
				{xScale}
				{yScale}
				padding={10}
				let:data
				let:xScale
				let:yScale
				let:width
				let:height
				let:padding
			>
				<Svg>
					<g
						on:mousemove={(e) => handleMouseMove(e, width, height, padding)}
						on:touchmove={(e) => handleTouchMove(e, width, height, padding)}
						on:mouseleave={handleMouseLeave}
						on:touchend={handleMouseLeave}
						style="cursor: crosshair;"
					>
						<!-- Background rect for interaction -->
						<rect
							x={0}
							y={0}
							{width}
							{height}
							fill="transparent"
						/>

						<!-- Horizontal dotted line at baseline -->
						<line
							x1={0}
							y1={baselineY}
							x2={width - padding.right}
							y2={baselineY}
							stroke="#4B5563"
							stroke-width="1"
							stroke-dasharray="4 4"
							opacity="0.6"
						/>

						<!-- Area gradient fill -->
						<defs>
							<linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
								<stop
									offset="0%"
									stop-color={isPositive ? "#EF4444" : "#34D399"}
									stop-opacity="0.3"
								/>
								<stop
									offset="100%"
									stop-color={isPositive ? "#EF4444" : "#34D399"}
									stop-opacity="0.05"
								/>
							</linearGradient>
						</defs>

						<!-- Area chart -->
						<Area
							{data}
							x="x"
							y="y"
							{xScale}
							{yScale}
							fill="url(#areaGradient)"
							strokeWidth={0}
						/>

						<!-- Line chart -->
						<path
							d={data
								.map((d, i) => {
									const x = xScale(d.x);
									const y = yScale(d.y);
									return `${i === 0 ? "M" : "L"} ${x} ${y}`;
								})
								.join(" ")}
							fill="none"
							stroke={isPositive ? "#EF4444" : "#34D399"}
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>

						<!-- Hover indicator line and dot -->
						{#if hoveredIndex !== null && isInteracting}
							{@const hoveredPoint = data[hoveredIndex]}
							{@const x = xScale(hoveredPoint.x)}
							{@const y = yScale(hoveredPoint.y)}
							
							<!-- Vertical line -->
							<line
								x1={x}
								y1={0}
								x2={x}
								y2={height}
								stroke="#9CA3AF"
								stroke-width="1.5"
							/>
							
							<!-- Horizontal dotted line -->
							<line
								x1={0}
								y1={y}
								x2={width - padding.right}
								y2={y}
								stroke="#4B5563"
								stroke-width="1"
								stroke-dasharray="4 4"
								opacity="0.6"
							/>
							
							<!-- Dot -->
							<circle
								cx={x}
								cy={y}
								r="6"
								fill={isPositive ? "#EF4444" : "#34D399"}
							/>
						{/if}

						<!-- X-axis labels -->
						{#each xScale.ticks(5) as tick}
							{@const x = xScale(tick)}
							<text
								x={x}
								y={height + 25}
								fill="#6B7280"
								font-size="11"
								text-anchor="middle"
							>
								{formatAxisDate(tick)}
							</text>
						{/each}

						<!-- Percentage labels on right -->
						{#each percentageLabels as label, i}
							{@const y = padding.top + (i / (percentageLabels.length - 1)) * (height - padding.top - padding.bottom)}
							<text
								x={width - padding.right + 10}
								y={y + 4}
								fill="#6B7280"
								font-size="11"
								text-anchor="start"
							>
								{label.label}
							</text>
						{/each}
					</g>
				</Svg>
			</Plot>
		{:else}
			<div class="absolute inset-0 flex items-center justify-center">
				<p class="text-gray-400">Not enough data to display chart</p>
			</div>
		{/if}
	</div>
</div>
