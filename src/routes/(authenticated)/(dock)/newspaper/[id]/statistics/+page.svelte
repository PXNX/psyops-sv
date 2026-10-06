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
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	let { data } = $props();

	function formatDate(date: Date | string) {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
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

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="{data.newspaper.name} - Statistics"
		subtitle="Analytics and insights for your newspaper"
		backHref="/newspaper/{data.newspaper.id}"
		backLabel={data.newspaper.name}
	/>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Total Subscribers -->
		<div class="panel rounded-sm p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Total Subscribers</p>
					<p class="text-3xl font-bold text-[#f5efd8]">{formatNumber(data.stats.totalSubscribers)}</p>
				</div>
				<div class="p-3 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm">
					<MdiAccountMultiple class="size-6 text-[#5eaef5]" />
				</div>
			</div>
		</div>

		<!-- Total Views -->
		<div class="panel rounded-sm p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Total Views</p>
					<p class="text-3xl font-bold text-[#f5efd8]">{formatNumber(data.stats.totalViews)}</p>
				</div>
				<div class="p-3 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm">
					<MdiEye class="size-6 text-[#6fd14a]" />
				</div>
			</div>
		</div>

		<!-- Total Likes -->
		<div class="panel rounded-sm p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-1">Total Likes</p>
					<p class="text-3xl font-bold text-[#f5efd8]">{formatNumber(data.stats.totalLikes)}</p>
				</div>
				<div class="p-3 bg-red-600/10 border border-red-500/30 rounded-sm">
					<MdiHeart class="size-6 text-red-400" />
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Section -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Subscriber Growth Chart -->
		<div class="panel rounded-sm p-5">
			<div class="flex items-center gap-2 mb-4">
				<MdiChartLine class="size-5 text-[#5eaef5]" />
				<h2 class="section-title">Subscriber Growth (30 Days)</h2>
			</div>

			{#if subscriberChartData.length === 0}
				<div class="panel-muted rounded-sm text-center py-12 text-[#a8a083]">
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
							<Area class="fill-[#5eaef5]/20" />
							<Area line={{ class: "stroke-[#5eaef5] stroke-2" }} />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item
									label="Subscribers"
									value={data.count.toLocaleString()}
									valueClass="text-[#5eaef5] font-bold"
								/>
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>

		<!-- Post Views Chart -->
		<div class="panel rounded-sm p-5">
			<div class="flex items-center gap-2 mb-4">
				<MdiEye class="size-5 text-[#6fd14a]" />
				<h2 class="section-title">Post Views (30 Days)</h2>
			</div>

			{#if viewsChartData.length === 0}
				<div class="panel-muted rounded-sm text-center py-12 text-[#a8a083]">
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
							<Bars radius={4} class="fill-[#6fd14a]/80 hover:fill-[#6fd14a] transition-colors" />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item label="Views" value={data.count.toLocaleString()} valueClass="text-[#6fd14a] font-bold" />
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>
	</div>

	<!-- Top Articles -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-2 mb-4">
			<MdiNewspaper class="size-5 text-[#c08cf0]" />
			<h2 class="section-title">Recent Articles Performance</h2>
		</div>

		{#if data.stats.topArticles.length === 0}
			<div class="panel-muted rounded-sm text-center py-12 text-[#a8a083]">
				<p>No articles published yet</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-[#c8b47a]/15">
							<th class="text-left py-3 px-4 text-sm font-medium text-[#a8a083]">Article</th>
							<th class="text-left py-3 px-4 text-sm font-medium text-[#a8a083]">Published</th>
							<th class="text-center py-3 px-4 text-sm font-medium text-[#a8a083]">
								<MdiEye class="inline size-4" /> Views
							</th>
							<th class="text-center py-3 px-4 text-sm font-medium text-[#a8a083]">
								<MdiHeart class="inline size-4" /> Likes
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.stats.topArticles as article}
							<tr class="border-b border-[#c8b47a]/15 hover:bg-[#1a1f15]/50 transition-colors">
								<td class="py-3 px-4">
									<a
										href="/posts/{article.id}"
										class="text-[#f5efd8] hover:text-[#ffcf47] font-medium transition-colors"
									>
										{article.title}
									</a>
								</td>
								<td class="py-3 px-4 text-sm text-[#a8a083]">
									{formatDate(article.publishDate)}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-[#6fd14a] font-medium">
										{article.views}
									</span>
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-flex items-center gap-1 text-red-400 font-medium">
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
</PageContainer>
