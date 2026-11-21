<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/statistics/+page.svelte -->
<script lang="ts">
	import MdiAccountMultiple from "~icons/mdi/account-multiple";
	import MdiEye from "~icons/mdi/eye";
	import MdiHeart from "~icons/mdi/heart";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { Area, Bars, Axis } from "layerchart";
	import { scaleBand, scaleTime, scaleLinear } from "d3-scale";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { dtgShortDate } from "#lib/utils/dtg.js";

	let { data } = $props();

	function formatDate(date: Date | string) {
		return dtgShortDate(date);
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
		title="Statistics"
		documentTitle="Statistics · {data.newspaper.name}"
		backHref="/newspaper/{data.newspaper.id}"
		backLabel={data.newspaper.name}
	/>

	<!-- Summary -->
	<dl class="panel rounded-sm grid grid-cols-3 divide-x divide-white/10">
		{#each [{ label: "Subscribers", value: data.stats.totalSubscribers, icon: MdiAccountMultiple, tone: "text-friendly" }, { label: "Views", value: data.stats.totalViews, icon: MdiEye, tone: "text-positive" }, { label: "Likes", value: data.stats.totalLikes, icon: MdiHeart, tone: "text-red-400" }] as stat (stat.label)}
			<div class="px-3 py-3 sm:px-4 min-w-0">
				<dt class="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-fg-muted">
					<stat.icon class="size-3.5 {stat.tone}" />
					{stat.label}
				</dt>
				<dd class="mt-1 font-mono text-xl sm:text-2xl text-fg truncate">{formatNumber(stat.value)}</dd>
			</div>
		{/each}
	</dl>

	<!-- Charts Section -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		<!-- Subscriber Growth Chart -->
		<div class="panel rounded-sm p-4">
			<h2 class="section-title mb-3">Subscribers · 30 days</h2>

			{#if subscriberChartData.length === 0}
				<div class="panel-muted rounded-sm text-center py-12 text-fg-muted">
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
							<Area class="fill-friendly/15" />
							<Area line={{ class: "stroke-friendly stroke-2" }} />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item
									label="Subscribers"
									value={data.count.toLocaleString()}
									valueClass="text-friendly font-bold"
								/>
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>

		<!-- Post Views Chart -->
		<div class="panel rounded-sm p-4">
			<h2 class="section-title mb-3">Views · 30 days</h2>

			{#if viewsChartData.length === 0}
				<div class="panel-muted rounded-sm text-center py-12 text-fg-muted">
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
							<Bars radius={1} class="fill-positive/80 hover:fill-positive transition-colors" />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{formatDate(data.date)}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item label="Views" value={data.count.toLocaleString()} valueClass="text-positive font-bold" />
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent articles -->
	<section class="space-y-2">
		<h2 class="section-title">Recent articles</h2>
		{#if data.stats.topArticles.length === 0}
			<div class="panel-muted rounded-sm text-center py-10 text-sm text-fg-muted">No articles published yet</div>
		{:else}
			<ul class="panel rounded-sm divide-y divide-white/[0.06] overflow-hidden">
				{#each data.stats.topArticles as article (article.id)}
					<li>
						<a
							href="/posts/{article.id}"
							class="group flex items-center gap-3 px-3 sm:px-4 py-2.5 min-w-0 hover:bg-white/[0.04] transition-colors"
						>
							<span class="min-w-0 flex-1">
								<span
									class="block truncate text-sm font-semibold text-fg group-hover:text-friendly-fg transition-colors"
									>{article.title}</span
								>
								<span class="block font-mono text-xs text-fg-muted">{formatDate(article.publishDate)}</span>
							</span>
							<span class="shrink-0 flex items-center gap-3 font-mono text-xs">
								<span class="inline-flex items-center gap-1 text-positive" title="Views">
									<MdiEye class="size-3.5" />{article.views}
								</span>
								<span class="inline-flex items-center gap-1 text-red-400" title="Likes">
									<MdiHeart class="size-3.5" />{article.likes}
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</PageContainer>
