<!-- src/routes/(authenticated)/(dock)/region/[id]/population/+page.svelte -->
<!-- The region's civil register: residents in order of registration. -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, IconButton, Badge } from "#lib/component/ui/index.js";
	import Sparkline from "#lib/component/charts/Sparkline.svelte";
	import CivilianNeeds from "../CivilianNeeds.svelte";
	import { formatDate, regionCoatUrl } from "#lib/utils/formatting.js";

	const { data } = $props();

	function toggleSort() {
		const url = new URL(window.location.href);
		url.searchParams.set("sort", data.sortOrder === "asc" ? "desc" : "asc");
		url.searchParams.set("page", "1");
		window.location.href = url.toString();
	}

	function goToPage(pageNum: number) {
		const url = new URL(window.location.href);
		url.searchParams.set("page", pageNum.toString());
		window.location.href = url.toString();
	}

	const totalPages = $derived(Math.ceil(data.totalResidents / data.pageSize));
</script>

<svelte:head>
	<title>{`Population · ${data.region.name} · PsyOps`}</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<!-- Register header -->
	<header class="panel rounded-sm p-4 sm:p-5 flex items-center gap-4">
		<a href="/region/{data.region.id}" class="shrink-0">
			<Logo
				src={regionCoatUrl(data.region.id)}
				alt={data.region.name}
				class="size-14 sm:size-16 rounded-sm"
				placeholderIcon={FluentShield20Filled}
				placeholderGradient="from-[#7451e6]/40 to-[#7451e6]/40"
			/>
		</a>
		<div class="flex-1 min-w-0">
			<p class="text-[10px] uppercase tracking-[0.25em] text-[#8e9abb]">Civil register</p>
			<h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#eef2ff] truncate">
				<a href="/region/{data.region.id}" class="hover:text-[#ffc857] transition-colors">{data.region.name}</a>
			</h1>
			<p class="text-sm text-[#8e9abb]">
				<span class="font-mono text-[#dbe2f4]">{data.totalResidents.toLocaleString()}</span>
				{data.totalResidents === 1 ? "resident" : "residents"}
			</p>
		</div>
		<Button variant="secondary" size="sm" icon={FluentArrowSort20Filled} onclick={toggleSort} class="shrink-0">
			<span class="hidden sm:inline">{data.sortOrder === "asc" ? "Oldest First" : "Newest First"}</span>
			<span class="sm:hidden">{data.sortOrder === "asc" ? "Oldest" : "Newest"}</span>
		</Button>
	</header>

	<div class="grid gap-4 items-start lg:grid-cols-2 mt-4">
		<section class="panel rounded-sm p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="section-title text-base">Civilian population</h2>
				{#if data.civilians.report}
					<span class="font-mono text-xs {data.civilians.report.annualRate < 0 ? 'text-error' : 'text-positive-fg'}">
						{data.civilians.report.annualRate >= 0 ? "+" : ""}{(data.civilians.report.annualRate * 100).toFixed(1)}% /
						year
					</span>
				{/if}
			</div>
			<p class="mt-1 font-mono text-xl font-bold text-fg">
				{data.civilians.population.toLocaleString()}
				<span class="text-xs font-normal text-fg-muted">· {data.civilians.density}/km²</span>
			</p>
			<Sparkline
				values={data.civilians.trend ?? []}
				label="Civilian population over the last 90 days"
				color="var(--color-positive)"
			/>
			<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/10 pt-2 text-xs">
				<span
					class="text-fg-muted"
					title="Share set by the region's education level: {(data.civilians.workforce.share * 100).toFixed(0)}%"
				>
					Civilian workforce · {(data.civilians.workforce.share * 100).toFixed(0)}% at education level {data.civilians
						.workforce.education} · {data.civilians.workforce.employed.toLocaleString()} employed
				</span>
				<span class="font-mono text-fg-body" title="Civilians still available for a company shift">
					{data.civilians.workforce.available.toLocaleString()} / {data.civilians.workforce.labour.toLocaleString()} free
				</span>
			</div>
			<div class="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
				<span class="text-fg-muted" title="Unemployment drags down civilian opinion in this region">
					Unemployed · {data.civilians.workforce.unemployed.toLocaleString()} ({Math.round(
						data.civilians.workforce.unemploymentShare * 100
					)}%)
				</span>
				{#if data.civilians.workforce.moodPenalty > 0}
					<span class="font-mono text-hostile-fg">−{data.civilians.workforce.moodPenalty} opinion</span>
				{/if}
			</div>
			{#if data.civilians.report?.contributions.length}
				<div class="mt-2 grid gap-1 text-xs sm:grid-cols-2">
					{#each data.civilians.report.contributions as c}
						<div class="flex justify-between gap-2 border-b border-line/10 py-1">
							<span class="text-fg-muted">{c.label}</span>
							<span class="font-mono {c.value < 0 ? 'text-error' : 'text-positive-fg'}">
								{c.value >= 0 ? "+" : ""}{c.value.toLocaleString()}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<CivilianNeeds needs={data.civilianNeeds} />
	</div>

	<h2 class="section-title mt-5 mb-2">Registered residents</h2>

	{#if data.residents.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<FluentPeople20Filled class="size-10 text-[#8e9abb] mx-auto mb-3 animate-idle-float" />
			<p class="text-[#8e9abb]">Nobody registered yet</p>
		</div>
	{:else}
		<ol class="panel rounded-sm divide-y divide-[#8ea6e0]/10">
			{#each data.residents as resident, i (resident.userId)}
				{@const isYou = resident.userId === data.currentUserId}
				<li class="flex items-center gap-3 px-3 sm:px-4 py-2.5 {isYou ? 'bg-[#2f6be0]/12' : ''}">
					<span class="w-10 shrink-0 font-mono text-xs text-[#8e9abb]/70 text-right">
						{(data.currentPage - 1) * data.pageSize + i + 1}
					</span>
					<UserLink
						id={resident.userId}
						name={resident.user.name || "Anonymous"}
						avatar={resident.user.logo}
						class="flex-1"
					/>
					{#if isYou}
						<Badge tone="blue" size="xs">You</Badge>
					{/if}
					<span class="shrink-0 font-mono text-xs text-[#8e9abb]">{formatDate(resident.movedInAt)}</span>
				</li>
			{/each}
		</ol>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<IconButton
					icon={FluentChevronLeft20Filled}
					label="Previous page"
					size="sm"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
				/>

				<span class="text-sm font-mono text-[#8e9abb]">
					{data.currentPage} / {totalPages}
				</span>

				<IconButton
					icon={FluentChevronRight20Filled}
					label="Next page"
					size="sm"
					disabled={data.currentPage === totalPages}
					onclick={() => goToPage(data.currentPage + 1)}
				/>
			</div>
		{/if}
	{/if}
</PageContainer>
