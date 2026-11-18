<!-- src/routes/(authenticated)/(dock)/user/[id]/articles/+page.svelte -->
<!-- Everything a player has written, newest or most liked first. -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentArrowSortDown20Filled from "~icons/fluent/arrow-sort-down-20-filled";
	import FluentArrowSortUp20Filled from "~icons/fluent/arrow-sort-up-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import ArticleCard from "#lib/component/press/ArticleCard.svelte";
	import { Button, IconButton, BackLink } from "#lib/component/ui/index.js";

	const { data } = $props();

	let searchQuery = $state(page.url.searchParams.get("q") ?? "");
	let debounceTimer: ReturnType<typeof setTimeout>;

	/** Update the query string with a client-side navigation instead of a full reload. */
	function navigate(changes: Record<string, string | null>) {
		const url = new URL(page.url.href);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		goto(url, { replace: true });
	}

	function updateSort(sort: "date" | "rating") {
		if (sort !== data.sortBy) navigate({ sort, page: null });
	}

	function handleSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => navigate({ q: searchQuery.trim() || null, page: null }), 350);
	}

	const totalPages = $derived(Math.max(1, Math.ceil(data.totalArticles / data.pageSize)));
	// Keep the controls while a search is active, even if it narrows things to one or none.
	const showControls = $derived(data.totalArticles > 1 || !!data.searchQuery);
</script>

<svelte:head>
	<title>{data.user.name || "User"} · Articles · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="3xl">
	<header class="space-y-3">
		<BackLink href="/user/{data.user.id}" label={data.user.name || "Profile"} class="-ml-3" />
		<div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
			<UserLink id={data.user.id} name={data.user.name} avatar={data.user.logo} size="md" />
			<p class="shrink-0 text-xs text-fg-muted">
				<span class="font-mono text-fg">{data.totalArticles}</span>
				{data.totalArticles === 1 ? "article" : "articles"}
			</p>
		</div>

		{#if showControls}
			<div class="flex flex-col sm:flex-row gap-2">
				<div class="relative flex-1">
					<FluentSearch20Filled
						class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-fg-muted pointer-events-none"
					/>
					<input
						class="field-control w-full rounded-sm pl-10 pr-4 py-2 text-sm"
						placeholder="Search headlines"
						type="search"
						aria-label="Search headlines"
						bind:value={searchQuery}
						oninput={handleSearch}
					/>
				</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant={data.sortBy === "date" ? "soft-blue" : "secondary"}
						icon={FluentCalendar20Filled}
						onclick={() => updateSort("date")}
						aria-pressed={data.sortBy === "date"}
					>
						Date
					</Button>
					<Button
						size="sm"
						variant={data.sortBy === "rating" ? "soft-blue" : "secondary"}
						icon={FluentHeart20Filled}
						onclick={() => updateSort("rating")}
						aria-pressed={data.sortBy === "rating"}
					>
						Likes
					</Button>
					<IconButton
						icon={data.sortOrder === "asc" ? FluentArrowSortUp20Filled : FluentArrowSortDown20Filled}
						label={data.sortOrder === "asc" ? "Ascending" : "Descending"}
						variant="secondary"
						size="sm"
						onclick={() => navigate({ order: data.sortOrder === "asc" ? "desc" : "asc" })}
					/>
				</div>
			</div>
		{/if}
	</header>

	{#if data.articles.length === 0}
		<EmptyState
			icon={data.searchQuery ? FluentSearch20Filled : FluentDocument20Filled}
			title={data.searchQuery ? `Nothing matches “${data.searchQuery}”` : "No articles yet"}
		>
			{#snippet actions()}
				{#if data.isOwnProfile && !data.searchQuery}
					<Button href="/posts/new" variant="primary" icon={FluentDocument20Filled}>Write an article</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="flex flex-col gap-2">
			{#each data.articles as article (article.id)}
				<ArticleCard
					article={{
						...article,
						authorId: data.user.id,
						authorName: data.user.name,
						authorLogo: data.user.logo
					}}
				/>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-3 pt-2">
				<IconButton
					icon={FluentChevronLeft20Filled}
					label="Previous page"
					variant="secondary"
					size="sm"
					disabled={data.currentPage <= 1}
					onclick={() => navigate({ page: String(data.currentPage - 1) })}
				/>
				<span class="text-sm font-mono text-fg-muted">{data.currentPage} / {totalPages}</span>
				<IconButton
					icon={FluentChevronRight20Filled}
					label="Next page"
					variant="secondary"
					size="sm"
					disabled={data.currentPage >= totalPages}
					onclick={() => navigate({ page: String(data.currentPage + 1) })}
				/>
			</div>
		{/if}
	{/if}
</PageContainer>
