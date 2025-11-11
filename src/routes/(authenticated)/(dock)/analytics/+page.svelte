<!-- src/routes/(authenticated)/(dock)/analytics/+page.svelte -->
<script lang="ts">
	import { Chart, Svg, Tooltip } from "layerchart";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";

	import { Bar } from "layerchart";
	import { scaleBand, scaleLinear } from "d3-scale";

	let { data } = $props();

	// Resource icons
	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	const productIcons: Record<string, string> = {
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const allIcons = { ...resourceIcons, ...productIcons };

	// Chart data for market prices
	const chartData = $derived(
		data.resourcePrices.map((item) => ({
			name: item.name,
			value: item.avgPrice / 100, // Convert to dollars for display
			quantity: item.totalQuantity,
			icon: allIcons[item.name] || "📦"
		}))
	);

	// Calculate total market value
	const totalMarketValue = $derived(
		data.resourcePrices.reduce((sum, item) => sum + item.avgPrice * item.totalQuantity, 0) / 100
	);

	// Get top traded items
	const topItems = $derived([...data.resourcePrices].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5));
</script>

<div class="container mx-auto p-4 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-4xl font-bold flex items-center gap-3">
			<FluentChartMultiple20Filled class="w-10 h-10" />
			Market Analytics
		</h1>
		<p class="text-base-content/70 mt-2">Market trends and statistics</p>
	</div>

	<!-- Stats Overview -->
	<div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
		<div class="stat">
			<div class="stat-figure text-primary">
				<FluentChartMultiple20Filled class="w-8 h-8" />
			</div>
			<div class="stat-title">Total Listings</div>
			<div class="stat-value text-primary">{data.marketStats.totalListings}</div>
			<div class="stat-desc">Active market listings</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-secondary">
				<FluentChartMultiple20Filled class="w-8 h-8" />
			</div>
			<div class="stat-title">Total Volume</div>
			<div class="stat-value text-secondary">{data.marketStats.totalVolume}</div>
			<div class="stat-desc">Items available for trade</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-success">
				<FluentChartMultiple20Filled class="w-8 h-8" />
			</div>
			<div class="stat-title">Market Value</div>
			<div class="stat-value text-success">${totalMarketValue.toFixed(2)}</div>
			<div class="stat-desc">Total market capitalization</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-info">
				<FluentChartMultiple20Filled class="w-8 h-8" />
			</div>
			<div class="stat-title">Active Items</div>
			<div class="stat-value text-info">{data.resourcePrices.length}</div>
			<div class="stat-desc">Unique items trading</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-2 gap-6">
		<!-- Price Chart -->
		<div class="card bg-base-200 shadow-xl lg:col-span-2">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<FluentChartMultiple20Filled class="w-6 h-6" />
					Average Market Prices
				</h2>

				{#if chartData.length > 0}
					<div class="h-96 w-full">
						<Chart
							data={chartData}
							x="name"
							xScale={scaleBand().padding(0.4)}
							y="value"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							padding={{ left: 60, bottom: 40, top: 20, right: 20 }}
						>
							<Svg>
								<Bar radius={4} strokeWidth={1} class="fill-primary hover:fill-primary-focus transition-colors" />
							</Svg>
							<Tooltip header={(d) => `${d.icon} ${d.name}`} let:data>
								<div class="bg-base-100 p-3 rounded-lg shadow-lg border border-base-300">
									<div class="space-y-1">
										<div class="flex justify-between gap-4">
											<span class="text-sm opacity-70">Avg Price:</span>
											<span class="font-bold text-success">${data.value.toFixed(2)}</span>
										</div>
										<div class="flex justify-between gap-4">
											<span class="text-sm opacity-70">Total Qty:</span>
											<span class="font-bold">{data.quantity}</span>
										</div>
										<div class="flex justify-between gap-4">
											<span class="text-sm opacity-70">Market Value:</span>
											<span class="font-bold text-primary">${(data.value * data.quantity).toFixed(2)}</span>
										</div>
									</div>
								</div>
							</Tooltip>
						</Chart>
					</div>
				{:else}
					<div class="text-center py-12">
						<FluentChartMultiple20Filled class="w-16 h-16 mx-auto opacity-20 mb-4" />
						<p class="text-lg text-base-content/50">No market data available</p>
						<p class="text-sm text-base-content/30 mt-2">Start trading to see analytics!</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Top Traded Items -->
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<FluentChartMultiple20Filled class="w-6 h-6" />
					Most Available Items
				</h2>

				{#if topItems.length > 0}
					<div class="space-y-3">
						{#each topItems as item, index}
							{@const icon = allIcons[item.name]}
							<div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-100/70 transition-colors">
								<div class="text-3xl font-bold text-base-content/30 w-8">
									#{index + 1}
								</div>
								<div class="text-3xl">{icon}</div>
								<div class="flex-1">
									<div class="font-bold capitalize">{item.name}</div>
									<div class="text-sm text-base-content/70">
										{item.totalQuantity} units available
									</div>
								</div>
								<div class="text-right">
									<div class="text-lg font-bold text-success">
										${(item.avgPrice / 100).toFixed(2)}
									</div>
									<div class="text-xs text-base-content/60">avg price</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8 text-base-content/50">
						<p>No trading data available</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Price Breakdown -->
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<FluentChartMultiple20Filled class="w-6 h-6" />
					Price Overview
				</h2>

				{#if data.resourcePrices.length > 0}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Item</th>
									<th class="text-right">Avg Price</th>
									<th class="text-right">Available</th>
									<th class="text-right">Value</th>
								</tr>
							</thead>
							<tbody>
								{#each data.resourcePrices as item}
									{@const icon = allIcons[item.name]}
									<tr class="hover">
										<td>
											<div class="flex items-center gap-2">
												<span class="text-xl">{icon}</span>
												<span class="capitalize font-medium">{item.name}</span>
											</div>
										</td>
										<td class="text-right font-bold text-success">
											${(item.avgPrice / 100).toFixed(2)}
										</td>
										<td class="text-right">
											{item.totalQuantity}
										</td>
										<td class="text-right font-bold">
											${((item.avgPrice * item.totalQuantity) / 100).toFixed(2)}
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot>
								<tr class="font-bold">
									<td>Total</td>
									<td></td>
									<td class="text-right">{data.marketStats.totalVolume}</td>
									<td class="text-right text-primary">${totalMarketValue.toFixed(2)}</td>
								</tr>
							</tfoot>
						</table>
					</div>
				{:else}
					<div class="text-center py-8 text-base-content/50">
						<p>No price data available</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Insights -->
	<div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="alert alert-info">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path></svg
			>
			<span class="text-xs">Prices reflect market supply and demand dynamics</span>
		</div>
		<div class="alert alert-success">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				></path></svg
			>
			<span class="text-xs">Use analytics to set competitive prices</span>
		</div>
		<div class="alert">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"
				></path></svg
			>
			<span class="text-xs">Market updates in real-time</span>
		</div>
	</div>
</div>

<style>
	:global(body) {
		min-height: 100vh;
	}
</style>
