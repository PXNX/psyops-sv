<!-- src/routes/(authenticated)/(dock)/posts/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Command Header -->
	<div class="border-b border-purple-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center gap-4">
				<div class="relative flex-shrink-0">
					<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
					<div
						class="relative size-14 sm:size-18 bg-slate-800/50 rounded-lg border-2 border-purple-500/30 flex items-center justify-center"
					>
						<FluentDocument20Filled class="size-7 sm:size-9 text-purple-400" />
					</div>
				</div>
				<div class="flex-1 min-w-0">
					<h1 class="text-xl sm:text-2xl font-bold text-white tracking-wide">Posts</h1>
					<span class="text-xs text-slate-400 font-mono">LATEST ARTICLES & NEWS</span>
				</div>
			</div>

			<!-- Search & Actions -->
			<div class="mt-4 flex items-center gap-2 sm:gap-3">
				<div class="relative flex-1">
					<FluentSearch20Filled class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
					<input
						class="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono"
						placeholder="Search posts, authors, newspapers..."
						type="text"
						bind:value={searchQuery}
					/>
				</div>

				<a
					href="/posts/new"
					class="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white text-xs font-mono font-bold uppercase tracking-wide transition-all flex items-center gap-2"
				>
					<FluentAdd20Filled class="size-4" />
					<span class="hidden sm:inline">New Post</span>
				</a>

				<a
					href="/posts/subscribed"
					class="px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentEmojiRolledUpNewspaper class="size-4" />
					<span class="hidden sm:inline">Subscribed</span>
				</a>

				<a
					href="/newspaper"
					class="px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentEmojiRolledUpNewspaper class="size-4" />
					<span class="hidden sm:inline">Papers</span>
				</a>

				<a
					href="/moderators"
					class="px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentShield20Filled class="size-3.5" />
					<span class="hidden sm:inline">Mods</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-3">
		{#if filteredArticles.length === 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-12 text-center"
			>
				<div class="text-5xl mb-4 opacity-30">📰</div>
				<p class="text-lg text-slate-400 font-mono mb-2">
					{searchQuery ? "No posts found" : "No posts yet"}
				</p>
				{#if searchQuery}
					<p class="text-xs text-slate-600">Try a different search term</p>
				{:else}
					<a
						href="/posts/new"
						class="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white text-xs font-mono font-bold uppercase tracking-wide transition-all"
					>
						<FluentAdd20Filled class="size-4" />
						Create First Post
					</a>
				{/if}
			</div>
		{:else}
			{#each filteredArticles as article (article.id)}
				<a
					href="/posts/{article.id}"
					class="flex items-center gap-3 bg-slate-900/40 border rounded-lg p-3 sm:p-4 hover:border-slate-600/60 transition-all group {article.own
						? 'border-purple-500/30 hover:border-purple-400/50'
						: 'border-slate-700/40'}"
				>
					<div class="flex-shrink-0">
						<div class="size-11 sm:size-12 rounded-lg overflow-hidden">
							{#if article.newspaperId}
								<Logo src={article.newspaperLogo} alt={article.newspaperName} />
							{:else}
								<Logo src={article.authorLogo} alt={article.authorName} />
							{/if}
						</div>
					</div>

					<div class="flex-1 min-w-0">
						<p class="text-xs text-slate-500 font-mono mb-0.5">
							{#if article.newspaperName}
								{article.newspaperName}
							{:else}
								{article.authorName}
							{/if}
						</p>
						<p class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
							{article.title}
						</p>
						<div class="flex items-center gap-3 mt-1">
							<span class="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-mono">
								<FluentClock20Regular class="size-3" />
								{formatDateTime(article.createdAt)}
							</span>
							<span class="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-mono">
								<FluentHeart20Filled class="size-3 text-red-400/60" />
								{article.upvoteCount}
							</span>
						</div>
					</div>

					<span class="text-slate-600 group-hover:text-slate-400 transition-colors text-sm">→</span>
				</a>
			{/each}

			{#if hasMore && !searchQuery}
				<div bind:this={loadMoreTrigger} class="py-8 text-center">
					{#if isLoading}
						<div class="flex items-center justify-center gap-2 text-slate-500 font-mono text-xs">
							<div class="size-4 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin"></div>
							Loading more...
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
