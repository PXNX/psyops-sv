<!-- src/routes/(authenticated)/(fullscreen)/posts/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import IconClock from "~icons/fluent/clock-24-regular";
	import IconHeart from "~icons/fluent/heart-24-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-24-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";

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
	<title>Posts</title>
</svelte:head>

<!-- Header -->
<header class="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-white/5 shadow-2xl">
	<div class="max-w-4xl mx-auto px-4 py-4">
		<div class="flex items-center gap-3">
			<!-- Search Input -->
			<div class="relative flex-1">
				<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
				<input
					class="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
					placeholder="Search posts, authors, newspapers..."
					type="text"
					bind:value={searchQuery}
				/>
			</div>

			<!-- Action Buttons -->
			<button
				onclick={() => goto("/posts/new")}
				class="btn btn-sm gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300 hover:text-purple-200 transition-all"
				title="Create new post"
			>
				<FluentAdd20Filled class="size-4" />
				<span class="hidden sm:inline">New</span>
			</button>

			<button
				onclick={() => goto("/newspaper")}
				class="btn btn-sm btn-circle bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 transition-all p-2"
				title="View newspapers"
			>
				<FluentEmojiRolledUpNewspaper class="text-xl" />
			</button>
		</div>
	</div>
</header>

<!-- Main Content -->
<main class="max-w-5xl mx-auto px-4 py-6">
	{#if filteredArticles.length === 0}
		<div class="text-center py-16">
			<div class="inline-flex items-center justify-center size-20 bg-slate-800/50 rounded-full mb-4">
				<FluentSearch20Filled class="size-10 text-gray-500" />
			</div>
			<p class="text-lg text-gray-400">
				{searchQuery ? "No posts found matching your search" : "No posts yet"}
			</p>
			{#if !searchQuery}
				<button
					onclick={() => goto("/posts/new")}
					class="btn btn-sm gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300 hover:text-purple-200 mt-4"
				>
					<FluentAdd20Filled class="size-4" />
					Create First Post
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-3 w-full">
			{#each filteredArticles as article (article.id)}
				<a
					href="/posts/{article.id}"
					class="card border bg-base-200 transition-all cursor-pointer w-full"
					class:border-base-300={!article.own}
					class:border-blue-300={article.own}
					class:hover:border-blue-500={article.own}
					class:hover:border-purple-500={!article.own}
				>
					<div class="card-body p-4">
						<div class="flex items-start gap-3 w-full">
							<!-- Logo/Avatar -->
							<div class="avatar flex-shrink-0">
								<div class="size-12 rounded-lg">
									{#if article.newspaperId}
										<!-- Newspaper logo -->
										<Logo src={article.newspaperLogo} alt={article.newspaperName!} />
									{:else}
										<Logo src={article.authorLogo} alt={article.authorName!} />
									{/if}
								</div>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<!-- Author/Newspaper and Date -->
								<div class="text-sm text-base-content/60 mb-1">
									{#if article.newspaperName}
										{article.newspaperName}
									{:else}
										{article.authorName}
									{/if}
								</div>

								<!-- Title -->
								<h3 class="card-title text-lg mb-2 line-clamp-2">
									{article.title}
								</h3>

								<!-- Meta info: Time and Likes -->
								<div class="flex items-center gap-4 text-sm text-base-content/60">
									<div class="flex items-center gap-1">
										<IconClock class="size-4" />
										{formatDateTime(article.createdAt)}
									</div>
									<div class="flex items-center gap-1">
										<IconHeart class="size-4" />
										{article.upvoteCount}
									</div>
								</div>
							</div>

							<!-- Chevron Right -->
							<div class="flex-shrink-0 self-center">
								<IconChevronRight class="h-5 w-5 text-base-content/40" />
							</div>
						</div>
					</div>
				</a>
			{/each}

			<!-- Load More Trigger -->
			{#if hasMore && !searchQuery}
				<div bind:this={loadMoreTrigger} class="py-8 text-center">
					{#if isLoading}
						<div class="inline-flex items-center gap-2 text-gray-400">
							<span class="loading loading-spinner loading-sm"></span>
							<span>Loading more posts...</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</main>
