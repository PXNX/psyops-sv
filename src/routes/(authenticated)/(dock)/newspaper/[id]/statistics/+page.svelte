<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/statistics/+page.svelte -->
<script lang="ts">
	import MdiChartLine from "~icons/mdi/chart-line";
	import MdiAccountMultiple from "~icons/mdi/account-multiple";
	import MdiEye from "~icons/mdi/eye";
	import MdiHeart from "~icons/mdi/heart";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { Area, Bars, Axis } from "layerchart";
	import { scaleBand, scaleTime, scaleLinear } from "d3-scale";

	let { data } = $props();

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric"
		});
	}

	function formatNumber(num: number) {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + "M";
		}
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + "K";
		}
		return num.toString();
	}

	// Prepare chart data
	const subscriberChartData = data.stats.subscriberGrowth.map((point) => ({
		date: new Date(point.date),
		count: point.count
	}));

	const viewsChartData = data.stats.viewsOverTime.map((point) => ({
		date: new Date(point.date),
		count: point.count
	}));
</script>

<div class="container mx-auto px-4 py-6 max-w-6xl">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-white mb-2">{data.newspaper.name} - Statistics</h1>
		<p class="text-gray-400">Analytics and insights for your newspaper</p>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<!-- Total Subscribers -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400 mb-1">Total Subscribers</p>
					<p class="text-3xl font-bold text-white">{formatNumber(data.stats.totalSubscribers)}</p>
				</div>
				<div class="p-3 bg-blue-600/20 rounded-lg">
					<MdiAccountMultiple class="size-6 text-blue-400" />
				</div>
			</div>
		</div>

		<!-- Total Views -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400 mb-1">Total Views</p>
					<p class="text-3xl font-bold text-white">{formatNumber(data.stats.totalViews)}</p>
				</div>
				<div class="p-3 bg-green-600/20 rounded-lg">
					<MdiEye class="size-6 text-green-400" />
				</div>
			</div>
		</div>

		<!-- Total Likes -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-400 mb-1">Total Likes</p>
					<p class="text-3xl font-bold text-white">{formatNumber(data.stats.totalLikes)}</p>
				</div>
				<div class="p-3 bg-pink-600/20 rounded-lg">
					<MdiHeart class="size-6 text-pink-400" />
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Section -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Subscriber Growth Chart -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="flex items-center gap-2 mb-4">
				<MdiChartLine class="size-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">Subscriber Growth (30 Days)</h2>
			</div>

			{#if subscriberChartData.length === 0}
				<div class="text-center py-12 text-gray-400">
					<p>No subscriber data yet</p>
				</div>
			{:else}
				<div class="h-64">
					<Chart
						data={subscriberChartData}
						x="date"
						xScale={scaleBand().padding(0.2)}
						y="count"
						yDomain={[0, null]}
						yNice
						padding={{ left: 40, bottom: 40, top: 10, right: 10 }}
					>
						<Svg>
							<Axis placement="left" grid={{ style: "stroke: rgb(255 255 255 / 0.05)" }} />
							<Axis placement="bottom" format={(d) => formatDate(d)} rule />
							<Area class="fill-blue-500/20" />
							<Area line={{ class: "stroke-blue-500 stroke-2" }} />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item
									label="Subscribers"
									value={data.count.toLocaleString()}
									valueClass="text-blue-400 font-bold"
								/>
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>

		<!-- Post Views Chart -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="flex items-center gap-2 mb-4">
				<MdiEye class="size-5 text-green-400" />
				<h2 class="text-lg font-semibold text-white">Post Views (30 Days)</h2>
			</div>

			{#if viewsChartData.length === 0}
				<div class="text-center py-12 text-gray-400">
					<p>No view data yet</p>
				</div>
			{:else}
				<div class="h-64">
					<Chart
						data={viewsChartData}
						x="date"
						xScale={scaleBand().padding(0.2)}
						y="count"
						yDomain={[0, null]}
						yNice
						padding={{ left: 40, bottom: 40, top: 10, right: 10 }}
					>
						<Svg>
							<Axis placement="left" grid={{ style: "stroke: rgb(255 255 255 / 0.05)" }} />
							<Axis placement="bottom" format={(d) => formatDate(d)} rule />
							<Bars radius={4} class="fill-green-500/80 hover:fill-green-500 transition-colors" />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item
									label="Views"
									value={data.count.toLocaleString()}
									valueClass="text-green-400 font-bold"
								/>
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>
	</div>

	<!-- Top Articles -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
		<div class="flex items-center gap-2 mb-4">
			<MdiNewspaper class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Recent Articles Performance</h2>
		</div>

		{#if data.stats.topArticles.length === 0}
			<div class="text-center py-12 text-gray-400">
				<p>No articles published yet</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/5">
							<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Article</th>
							<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Published</th>
							<th class="text-center py-3 px-4 text-sm font-medium text-gray-400">
								<MdiEye class="inline size-4" /> Views
							</th>
							<th class="text-center py-3 px-4 text-sm font-medium text-gray-400">
								<MdiHeart class="inline size-4" /> Likes
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.stats.topArticles as article}
							<tr class="border-b border-white/5 hover:bg-slate-700/30 transition-colors">
								<td class="py-3 px-4">
									<a href="/posts/{article.id}" class="text-white hover:text-blue-400 font-medium">
										{article.title}
									</a>
								</td>
								<td class="py-3 px-4 text-sm text-gray-400">
									{formatDate(article.publishDate)}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-green-400 font-medium">
										{article.views}
									</span>
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-pink-400 font-medium">
										{article.likes}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
