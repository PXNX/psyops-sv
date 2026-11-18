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
