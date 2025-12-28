<!-- src/routes/(authenticated)/(fullscreen)/posts/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";

	const { data } = $props();

	let searchQuery = $state("");
	let upvotingArticleId = $state<number | null>(null);

	const filteredArticles = $derived(
		data.articles.filter((article) => {
			const query = searchQuery.toLowerCase();
			return (
				article.title.toLowerCase().includes(query) ||
				article.authorName?.toLowerCase().includes(query) ||
				article.newspaperName?.toLowerCase().includes(query)
			);
		})
	);
</script>

<svelte:head>
	<title>Posts</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
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
					class="btn btn-sm btn-circle bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 transition-all"
					title="View newspapers"
				>
					<FluentEmojiRolledUpNewspaper class="text-xl" />
				</button>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-4xl mx-auto px-4 py-6">
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
			<div class="space-y-3">
				{#each filteredArticles as article (article.id)}
					<article
						class="group bg-slate-800/30 rounded-xl border border-white/5 hover:border-white/10 hover:bg-slate-800/50 transition-all shadow-lg hover:shadow-xl"
					>
						<div class="p-4">
							<div class="flex items-start gap-4">
								<!-- Author/Newspaper Avatar -->
								{#if article.newspaperName}
									<a href="/newspaper/{article.newspaperId}" class="flex-shrink-0">
										<div
											class="size-12 rounded-full ring-2 ring-white/10 group-hover:ring-purple-500/30 transition-all overflow-hidden bg-slate-700/50 flex items-center justify-center"
										>
											<FluentEmojiRolledUpNewspaper class="text-2xl" />
										</div>
									</a>
								{:else}
									<a href="/profile/{article.authorId}" class="flex-shrink-0">
										<div
											class="size-12 rounded-full ring-2 ring-white/10 group-hover:ring-purple-500/30 transition-all overflow-hidden"
										>
											<Logo
												src={article.authorLogo}
												alt={article.authorName || "Author"}
												class="w-full h-full object-cover"
											/>
										</div>
									</a>
								{/if}

								<!-- Content -->
								<div class="flex-1 min-w-0">
									<!-- Newspaper or Author Name -->
									<div class="flex flex-wrap items-center gap-2 text-sm mb-2">
										{#if article.newspaperName}
											<a
												href="/newspaper/{article.newspaperId}"
												class="font-semibold text-white hover:text-purple-400 transition-colors truncate"
											>
												{article.newspaperName}
											</a>
										{:else}
											<a
												href="/profile/{article.authorId}"
												class="font-semibold text-white hover:text-purple-400 transition-colors truncate"
											>
												{article.authorName || "Anonymous"}
											</a>
										{/if}

										<span class="text-gray-600">•</span>
										<span class="flex items-center gap-1 text-gray-500 text-xs">
											<FluentClock20Regular class="size-3" />
											{formatDateTime(article.createdAt)}
										</span>
									</div>

									<!-- Title -->
									<a href="/posts/{article.id}" class="block">
										<h3
											class="font-bold text-lg text-white group-hover:text-purple-400 transition-colors line-clamp-2 mb-3"
										>
											{article.title}
										</h3>
									</a>

									<FluentChevronRight20Filled class="size-4" />
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</main>
</div>
