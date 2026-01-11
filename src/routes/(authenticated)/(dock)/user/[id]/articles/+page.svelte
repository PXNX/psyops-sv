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
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";

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

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-4">
			<a href="/user/{data.user.id}" class="btn btn-ghost btn-sm gap-2">
				<FluentChevronLeft20Filled class="size-4" />
				Back to Profile
			</a>
			<div class="h-6 w-px bg-white/10"></div>
			<div class="flex items-center gap-3">
				<div class="size-10 rounded-lg overflow-hidden ring-2 ring-white/10">
					<Logo
						src={data.user.logo}
						alt={data.user.name || "User"}
						class="size-full"
						placeholderIcon={FluentDocument20Filled}
						placeholderGradient="from-purple-500 to-blue-500"
					/>
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">{data.user.name || "Anonymous"}'s Articles</h1>
					<p class="text-sm text-gray-400">
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
					<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
					<input
						class="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
						placeholder="Search by title..."
						type="text"
						bind:value={searchQuery}
						oninput={handleSearch}
					/>
				</div>

				<!-- Sort Controls -->
				<div class="flex gap-2">
					<div class="btn-group">
						<button class="btn btn-sm {data.sortBy === 'date' ? 'btn-active' : ''}" onclick={() => updateSort("date")}>
							<FluentCalendar20Filled class="size-4" />
							Date
						</button>
						<button
							class="btn btn-sm {data.sortBy === 'rating' ? 'btn-active' : ''}"
							onclick={() => updateSort("rating")}
						>
							<FluentHeart20Filled class="size-4" />
							Rating
						</button>
					</div>

					<button
						onclick={toggleSortOrder}
						class="btn btn-sm bg-slate-700 hover:bg-slate-600 border-0 text-white gap-2"
					>
						<FluentArrowSort20Filled class="size-4" />
						{data.sortOrder === "asc" ? "Ascending" : "Descending"}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Articles List -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		{#if data.articles.length === 0}
			<div class="text-center py-12">
				<div class="size-16 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
					<FluentDocument20Filled class="size-8 text-gray-500" />
				</div>
				<p class="text-gray-400">
					{#if data.searchQuery}
						No articles found matching your search
					{:else if data.isOwnProfile}
						You haven't written any articles yet
					{:else}
						This user hasn't written any articles yet
					{/if}
				</p>
				{#if data.isOwnProfile && !data.searchQuery}
					<a
						href="/posts/new"
						class="btn btn-sm gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300 hover:text-purple-200 mt-4"
					>
						<FluentDocument20Filled class="size-4" />
						Write Your First Article
					</a>
				{/if}
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.articles as article}
					<a
						href="/posts/{article.id}"
						class="flex items-center gap-4 bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-white/10 hover:bg-slate-700/50 transition-all group"
					>
						<!-- Icon or Newspaper Logo -->
						<div class="shrink-0">
							{#if article.newspaperName}
								<div
									class="size-12 rounded-lg bg-slate-700/50 flex items-center justify-center ring-2 ring-white/5 group-hover:ring-purple-500/20 transition-all"
								>
									<FluentEmojiRolledUpNewspaper class="text-2xl" />
								</div>
							{:else}
								<div
									class="size-12 rounded-lg bg-purple-600/20 flex items-center justify-center ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all"
								>
									<FluentDocument20Filled class="size-6 text-purple-400" />
								</div>
							{/if}
						</div>

						<!-- Article Info -->
						<div class="flex-1 min-w-0">
							<h3 class="text-base font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
								{article.title}
							</h3>
							<div class="flex items-center gap-3 mt-1">
								{#if article.newspaperName}
									<span class="text-xs text-gray-400 flex items-center gap-1">
										<FluentEmojiRolledUpNewspaper class="text-sm" />
										{article.newspaperName}
									</span>
								{/if}
								<span class="text-xs text-gray-500 flex items-center gap-1">
									<FluentCalendar20Filled class="size-3" />
									{formatDateTime(article.createdAt)}
								</span>
								<span class="text-xs text-gray-500 flex items-center gap-1">
									<FluentHeart20Filled class="size-3" />
									{article.upvoteCount}
								</span>
							</div>
						</div>

						<!-- Chevron -->
						<div class="shrink-0">
							<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
						</div>
					</a>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/5">
					<button
						class="btn btn-sm btn-ghost"
						disabled={data.currentPage === 1}
						onclick={() => goToPage(data.currentPage - 1)}
					>
						<FluentChevronLeft20Filled class="size-4" />
					</button>

					<span class="text-sm text-gray-400">
						Page {data.currentPage} of {totalPages}
					</span>

					<button
						class="btn btn-sm btn-ghost"
						disabled={data.currentPage === totalPages}
						onclick={() => goToPage(data.currentPage + 1)}
					>
						<FluentChevronRight20Filled class="size-4" />
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
