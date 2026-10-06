<!-- src/routes/(authenticated)/(dock)/user/[id]/articles/+page.svelte -->
<script lang="ts">
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import Logo from "#lib/component/Logo.svelte";
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
	<div class="flex flex-col gap-4">
		<div class="space-y-2">
			<BackLink href="/user/{data.user.id}" label={data.user.name || "Anonymous"} class="-ml-3" />
			<div class="flex items-center gap-4">
				<div class="size-14 rounded-sm overflow-hidden shrink-0">
					<Logo
						src={data.user.logo}
						alt={data.user.name || "User"}
						class="size-full"
						placeholderIcon={FluentDocument20Filled}
						placeholderGradient="from-[#8a4fc0] to-[#2369b5]"
					/>
				</div>
				<div class="min-w-0">
					<h1 class="text-3xl font-bold text-[#f5efd8]">Articles</h1>
					<p class="text-[#a8a083] mt-1">
						{data.totalArticles}
						{data.totalArticles === 1 ? "Article" : "Articles"}
					</p>
				</div>
			</div>
		</div>

		<!-- Search and Sort Controls -->
		{#if data.totalArticles > 1}
			<div class="flex flex-col sm:flex-row gap-3">
				<!-- Search -->
				<div class="relative flex-1">
					<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#a8a083]" />
					<input
						class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
						placeholder="Search by title..."
						type="text"
						bind:value={searchQuery}
						oninput={handleSearch}
					/>
				</div>

				<!-- Sort Controls -->
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

					<Button size="sm" variant="secondary" icon={FluentArrowSort20Filled} onclick={toggleSortOrder}>
						{data.sortOrder === "asc" ? "Ascending" : "Descending"}
					</Button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Articles List -->
	{#if data.articles.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="size-16 bg-[#1a1f15] rounded-full flex items-center justify-center mx-auto mb-4">
				<FluentDocument20Filled class="size-8 text-[#a8a083]" />
			</div>
			<p class="text-[#a8a083]">
				{#if data.searchQuery}
					No articles found matching your search
				{:else if data.isOwnProfile}
					You haven't written any articles yet
				{:else}
					This user hasn't written any articles yet
				{/if}
			</p>
			{#if data.isOwnProfile && !data.searchQuery}
				<Button href="/posts/new" variant="soft-purple" size="sm" icon={FluentDocument20Filled} class="mt-4">
					Write Your First Article
				</Button>
			{/if}
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.articles as article}
				<a href="/posts/{article.id}" class="group panel-interactive rounded-sm p-4 flex items-center gap-4">
					<!-- Icon or Newspaper Logo -->
					<div class="shrink-0">
						{#if article.newspaperName}
							<div class="size-12 rounded-sm panel-muted flex items-center justify-center">
								<FluentEmojiRolledUpNewspaper class="text-2xl" />
							</div>
						{:else}
							<div
								class="size-12 rounded-sm bg-[#8a4fc0]/15 border border-[#c08cf0]/30 flex items-center justify-center"
							>
								<FluentDocument20Filled class="size-6 text-[#c08cf0]" />
							</div>
						{/if}
					</div>

					<!-- Article Info -->
					<div class="flex-1 min-w-0">
						<h3 class="font-bold text-[#f5efd8] truncate group-hover:text-[#ffcf47] transition-colors">
							{article.title}
						</h3>
						<div class="flex flex-wrap items-center gap-3 mt-1">
							{#if article.newspaperName}
								<span class="text-xs text-[#a8a083] flex items-center gap-1">
									<FluentEmojiRolledUpNewspaper class="text-sm" />
									{article.newspaperName}
								</span>
							{/if}
							<span class="text-xs text-[#a8a083] flex items-center gap-1">
								<FluentCalendar20Filled class="size-3" />
								{formatDateTime(article.createdAt)}
							</span>
							<span class="text-xs text-[#a8a083] flex items-center gap-1">
								<FluentHeart20Filled class="size-3" />
								{article.upvoteCount}
							</span>
						</div>
					</div>

					<!-- Chevron -->
					<FluentChevronRight20Filled
						class="size-5 shrink-0 text-[#a8a083] group-hover:text-[#ffcf47] transition-colors"
					/>
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

				<span class="text-sm text-[#a8a083]">
					Page {data.currentPage} of {totalPages}
				</span>

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
