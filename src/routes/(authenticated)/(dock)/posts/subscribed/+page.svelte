<!-- src/routes/(authenticated)/(dock)/posts/subscribed/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";
	import { buttonClass } from "$lib/component/ui/styles";

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

<div class="min-h-screen bg-[#0c1929]">
	<!-- Command Header -->
	<div class="border-b border-[#dfceb0]/15 bg-[#0e1d2f]/95 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<!-- Search & Actions -->
			<div class="flex items-center gap-2 sm:gap-3">
				<a
					href="/posts"
					class="flex-shrink-0 p-2.5 rounded-lg bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8] transition-all"
				>
					<FluentArrowLeft20Filled class="size-5" />
				</a>

				<div class="relative flex-1">
					<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a89e8e]" />
					<input
						class="field-control w-full rounded-sm pl-10 pr-4 py-2.5 text-sm font-mono"
						placeholder="Search subscribed posts..."
						type="text"
						bind:value={searchQuery}
					/>
				</div>

				<a href="/posts/new" class={buttonClass({ variant: "primary", class: "text-xs font-mono font-bold uppercase tracking-wide" })}>
					<FluentAdd20Filled class="size-4" />
					<span class="hidden sm:inline">New Post</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-3">
		{#if filteredArticles.length === 0}
			<div class="panel rounded-sm p-12 text-center">
				<div class="text-5xl mb-4 opacity-30">📰</div>
				<p class="text-lg text-[#c7bda9] font-mono mb-2">
					{searchQuery ? "No posts found" : "No posts from subscribed newspapers yet"}
				</p>
				{#if !searchQuery}
					<a
						href="/newspaper"
						class={buttonClass({ variant: "primary", class: "mt-4 text-xs font-mono font-bold uppercase tracking-wide" })}
					>
						<FluentSearch20Filled class="size-4" />
						Discover Newspapers
					</a>
				{/if}
			</div>
		{:else}
			{#each filteredArticles as article (article.id)}
				<a
					href="/posts/{article.id}"
					class="flex items-center gap-3 bg-[#14283f]/85 border rounded-sm p-3 sm:p-4 hover:border-[#e6a527]/50 transition-all group {article.own
						? 'border-[#e6a527]/40 hover:border-[#e6a527]/60'
						: 'border-[#dfceb0]/15'}"
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
						<p class="text-xs text-[#a89e8e] font-mono mb-0.5">
							{#if article.newspaperName}
								{article.newspaperName}
							{:else}
								{article.authorName}
							{/if}
						</p>
						<p class="text-sm font-bold text-[#fff7e8] group-hover:text-[#f7c56b] transition-colors truncate">
							{article.title}
						</p>
						<div class="flex items-center gap-3 mt-1">
							<span class="flex items-center gap-1 text-[10px] sm:text-xs text-[#a89e8e] font-mono">
								<FluentClock20Regular class="size-3" />
								{formatDateTime(article.createdAt)}
							</span>
							<span class="flex items-center gap-1 text-[10px] sm:text-xs text-[#a89e8e] font-mono">
								<FluentHeart20Filled class="size-3 text-red-400/60" />
								{article.upvoteCount}
							</span>
						</div>
					</div>

					<span class="text-[#a89e8e] group-hover:text-[#d9ccb7] transition-colors text-sm">→</span>
				</a>
			{/each}

			{#if hasMore && !searchQuery}
				<div bind:this={loadMoreTrigger} class="py-8 text-center">
					{#if isLoading}
						<div class="flex items-center justify-center gap-2 text-[#a89e8e] font-mono text-xs">
							<div class="size-4 border-2 border-[#dfceb0]/25 border-t-[#e6a527] rounded-full animate-spin"></div>
							Loading more...
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
