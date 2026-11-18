<!-- src/routes/(authenticated)/(dock)/user/[id]/articles/+page.svelte -->
<!-- A writer's bylines, laid out like a folder of press clippings. -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import BackLink from "#lib/component/ui/BackLink.svelte";

	const { data } = $props();

	let searchQuery = $state(data.searchQuery);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function updateSort(newSortBy: "date" | "rating") {
		const url = new URL(window.location.href);
		url.searchParams.set("sort", newSortBy);
		if (newSortBy !== data.sortBy) {
			url.searchParams.set("page", "1");
		}
		window.location.href = url.toString();
	}

	function toggleSortOrder() {
		const url = new URL(window.location.href);
		url.searchParams.set("order", data.sortOrder === "asc" ? "desc" : "asc");
		window.location.href = url.toString();
	}

	function goToPage(pageNum: number) {
		const url = new URL(window.location.href);
		url.searchParams.set("page", pageNum.toString());
		window.location.href = url.toString();
	}

	function handleSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const url = new URL(window.location.href);
			if (searchQuery) {
				url.searchParams.set("q", searchQuery);
			} else {
				url.searchParams.delete("q");
			}
			url.searchParams.set("page", "1");
			window.location.href = url.toString();
		}, 500);
	}

	const totalPages = $derived(Math.ceil(data.totalArticles / data.pageSize));
</script>

<svelte:head>
	<title>{data.user.name || "User"}'s Articles</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<header class="space-y-3">
		<BackLink href="/user/{data.user.id}" label={data.user.name || "Anonymous"} class="-ml-3" />
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-2 border-double border-[#8ea6e0]/35 pb-3">
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-[0.25em] text-[#8e9abb]">Bylines</p>
				<UserLink id={data.user.id} name={data.user.name || "Anonymous"} avatar={data.user.logo} size="md" />
			</div>
			<p class="font-serif text-sm text-[#8e9abb]">
				{data.totalArticles}
				{data.totalArticles === 1 ? "article" : "articles"}
			</p>
		</div>

		<!-- Search and Sort Controls -->
		{#if data.totalArticles > 1}
			<div class="flex flex-col sm:flex-row gap-3">
				<div class="relative flex-1">
					<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#8e9abb]" />
					<input
						class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
						placeholder="Search headlines…"
						type="text"
						bind:value={searchQuery}
						oninput={handleSearch}
					/>
				</div>

				<div class="flex flex-wrap gap-2">
					<Button
						size="sm"
						variant={data.sortBy === "date" ? "soft-amber" : "secondary"}
						icon={FluentCalendar20Filled}
						onclick={() => updateSort("date")}
					>
						Date
					</Button>
					<Button
						size="sm"
						variant={data.sortBy === "rating" ? "soft-amber" : "secondary"}
						icon={FluentHeart20Filled}
						onclick={() => updateSort("rating")}
					>
						Rating
					</Button>
					<IconButton
						icon={FluentArrowSort20Filled}
						label={data.sortOrder === "asc" ? "Ascending" : "Descending"}
						variant="secondary"
						size="sm"
						onclick={toggleSortOrder}
					/>
				</div>
			</div>
		{/if}
	</header>

	<!-- Clippings -->
	{#if data.articles.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<FluentDocument20Filled class="size-10 text-[#8e9abb] mx-auto mb-3 animate-idle-float" />
			<p class="text-[#8e9abb]">
				{#if data.searchQuery}
					No headline matches “{data.searchQuery}”
				{:else}
					No bylines yet
				{/if}
			</p>
			{#if data.isOwnProfile && !data.searchQuery}
				<Button href="/posts/new" variant="soft-purple" size="sm" icon={FluentDocument20Filled} class="mt-4">
					Write an Article
				</Button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each data.articles as article, i (article.id)}
				<a
					href="/posts/{article.id}"
					class="group panel-interactive rounded-sm p-4 flex flex-col {i === 0 && data.currentPage === 1
						? 'sm:col-span-2'
						: ''}"
				>
					<p class="text-[10px] uppercase tracking-[0.2em] text-[#ffcb6b]/80 truncate">
						{article.newspaperName ?? "Independent"}
					</p>
					<h3
						class="mt-1 font-serif font-bold leading-snug text-[#eef2ff] group-hover:text-[#ffc857] transition-colors break-words {i ===
							0 && data.currentPage === 1
							? 'text-2xl'
							: 'text-lg'}"
					>
						{article.title}
					</h3>
					<div class="mt-auto pt-3 flex items-center gap-3 text-xs text-[#8e9abb]">
						<span class="font-mono">{formatDateTime(article.createdAt)}</span>
						<span class="ml-auto flex items-center gap-1">
							<FluentHeart20Filled class="size-3.5 text-red-400" />
							{article.upvoteCount}
						</span>
					</div>
				</a>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 pt-2">
				<IconButton
					icon={FluentChevronLeft20Filled}
					label="Previous page"
					variant="secondary"
					size="sm"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
				/>

				<span class="text-sm font-mono text-[#8e9abb]">{data.currentPage} / {totalPages}</span>

				<IconButton
					icon={FluentChevronRight20Filled}
					label="Next page"
					variant="secondary"
					size="sm"
					disabled={data.currentPage === totalPages}
					onclick={() => goToPage(data.currentPage + 1)}
				/>
			</div>
		{/if}
	{/if}
</PageContainer>
