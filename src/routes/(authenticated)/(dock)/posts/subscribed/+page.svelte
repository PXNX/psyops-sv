<!-- src/routes/(authenticated)/(dock)/posts/subscribed/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";

	const { data } = $props();

	let searchQuery = $state("");
	let allArticles = $state([...data.articles]);
	let hasMore = $state(data.hasMore);
	let nextCursor = $state(data.nextCursor);
	let isLoading = $state(false);
	let loadMoreTrigger: HTMLDivElement;

	const filteredArticles = $derived(
		allArticles.filter((article) => {
			const query = searchQuery.toLowerCase();
			return (
				article.title.toLowerCase().includes(query) ||
				article.authorName?.toLowerCase().includes(query) ||
				article.newspaperName?.toLowerCase().includes(query)
			);
		})
	);

	async function loadMore() {
		if (isLoading || !hasMore || !nextCursor) return;

		isLoading = true;
		try {
			const formData = new FormData();
			formData.append("cursor", nextCursor);

			const response = await fetch("?/loadMore", {
				method: "POST",
				body: formData
			});

			const result = await response.json();

			allArticles = [...allArticles, ...result.articles];
			hasMore = result.hasMore;
			nextCursor = result.nextCursor;
		} catch (error) {
			console.error("Failed to load more articles:", error);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoading) {
					loadMore();
				}
			},
			{ threshold: 0.1 }
		);

		if (loadMoreTrigger) {
			observer.observe(loadMoreTrigger);
		}

		return () => {
			if (loadMoreTrigger) {
				observer.unobserve(loadMoreTrigger);
			}
		};
	});
</script>

<svelte:head>
	<title>Subscribed Posts</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader title="Subscribed Posts" backHref="/posts" backLabel="Posts">
		{#snippet actions()}
			<Button variant="primary" href="/posts/new" icon={FluentAdd20Filled}>
				<span class="hidden sm:inline">New Post</span>
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Search -->
	<div class="relative">
		<FluentSearch20Filled class="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-[#a89e8e]" />
		<input
			class="field-control w-full rounded-sm pl-11 pr-4 py-2.5"
			placeholder="Search subscribed posts..."
			type="text"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Content -->
	<div class="space-y-3">
		{#if filteredArticles.length === 0}
			<div class="panel-muted rounded-sm p-12 text-center">
				<div class="text-5xl mb-4 opacity-30">📰</div>
				<p class="text-xl font-bold text-[#fff7e8] mb-2">
					{searchQuery ? "No posts found" : "No posts from subscribed newspapers yet"}
				</p>
				{#if !searchQuery}
					<Button variant="primary" href="/newspaper" icon={FluentSearch20Filled} class="mt-4"
						>Discover Newspapers</Button
					>
				{/if}
			</div>
		{:else}
			{#each filteredArticles as article (article.id)}
				<a
					href="/posts/{article.id}"
					class="group panel-interactive rounded-sm p-4 flex items-center gap-3 {article.own
						? 'border-[#e6a527]/40'
						: ''}"
				>
					<div class="flex-shrink-0">
						<div class="size-11 sm:size-12 rounded-sm overflow-hidden">
							{#if article.newspaperId}
								<Logo src={article.newspaperLogo} alt={article.newspaperName} />
							{:else}
								<Logo src={article.authorLogo} alt={article.authorName} />
							{/if}
						</div>
					</div>

					<div class="flex-1 min-w-0">
						<p class="text-xs text-[#a89e8e] mb-0.5">
							{#if article.newspaperName}
								{article.newspaperName}
							{:else}
								{article.authorName}
							{/if}
						</p>
						<p class="font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
							{article.title}
						</p>
						<div class="flex items-center gap-3 mt-1">
							<span class="flex items-center gap-1 text-xs text-[#a89e8e]">
								<FluentClock20Regular class="size-3" />
								{formatDateTime(article.createdAt)}
							</span>
							<span class="flex items-center gap-1 text-xs text-[#a89e8e]">
								<FluentHeart20Filled class="size-3 text-red-400/60" />
								{article.upvoteCount}
							</span>
						</div>
					</div>

					<FluentChevronRight20Filled
						class="size-4 shrink-0 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors"
					/>
				</a>
			{/each}

			{#if hasMore && !searchQuery}
				<div bind:this={loadMoreTrigger} class="py-8 text-center">
					{#if isLoading}
						<div class="flex items-center justify-center gap-2 text-[#a89e8e] text-xs">
							<div class="size-4 border-2 border-[#dfceb0]/25 border-t-[#e6a527] rounded-full animate-spin"></div>
							Loading more...
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</PageContainer>
