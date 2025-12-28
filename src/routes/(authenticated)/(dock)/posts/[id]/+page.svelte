<!-- src/routes/(authenticated)/(fullscreen)/posts/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentArrowLeft20Regular from "~icons/fluent/arrow-left-20-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentShare20Filled from "~icons/fluent/share-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDistanceToNow, format } from "date-fns";
	import { formatDateTime } from "$lib/utils/formatting.js";

	const { data, form } = $props();

	let hasUpvoted = $state(data.hasUpvoted);
	let upvoteCount = $state(data.article.upvoteCount);
	let isSubmitting = $state(false);

	const handleShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: data.article.title,
					url: window.location.href
				});
			} catch (err) {
				if (err.name !== "AbortError") {
					await navigator.clipboard.writeText(window.location.href);
					alert("Link copied to clipboard!");
				}
			}
		} else {
			await navigator.clipboard.writeText(window.location.href);
			alert("Link copied to clipboard!");
		}
	};
</script>

<svelte:head>
	<title>{data.article.title}</title>
	<meta name="description" content={data.article.content.substring(0, 160)} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
	<!-- Header -->
	<header class="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-white/5 shadow-2xl">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center gap-3">
				<button
					onclick={() => history.back()}
					class="btn btn-sm btn-circle bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 transition-all"
					title="Go back"
				>
					<FluentArrowLeft20Regular class="size-5 text-gray-300" />
				</button>

				<div class="flex-1 min-w-0">
					<h1 class="text-sm sm:text-base font-semibold text-white truncate">
						{data.article.title}
					</h1>
				</div>

				{#if data.isAuthor}
					<button
						onclick={() => goto(`/posts/${data.article.id}/edit`)}
						class="btn btn-sm gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300"
					>
						<FluentEdit20Filled class="size-4" />
						<span class="hidden sm:inline">Edit</span>
					</button>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-4xl mx-auto px-4 py-8">
		<!-- Article Card -->
		<article class="bg-slate-800/30 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
			<!-- Article Header -->
			<div class="p-6 sm:p-8 border-b border-white/5">
				<!-- Title -->
				<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
					{data.article.title}
				</h1>

				<!-- Metadata -->
				<div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
					<span class="flex items-center gap-1.5">
						<FluentClock20Regular class="size-4" />
						{formatDateTime(data.article.createdAt)}
					</span>

					<span class="text-gray-600">•</span>

					<span class="flex items-center gap-1.5">
						{#if hasUpvoted}
							<FluentHeart20Filled class="size-4 text-red-400" />
						{:else}
							<FluentHeart20Regular class="size-4" />
						{/if}
						<span>{upvoteCount} {upvoteCount === 1 ? "upvote" : "upvotes"}</span>
					</span>
				</div>
			</div>

			<!-- Article Content -->
			<div class="p-6 sm:p-8">
				<div class="prose prose-invert prose-lg max-w-none">
					<div class="article-content text-gray-300 leading-relaxed">
						{@html data.article.content}
					</div>
				</div>
			</div>

			<!-- Author Info - Bottom -->
			<div class="p-6 sm:p-8 border-t border-white/5 bg-slate-900/30">
				<div class="flex items-center gap-4">
					<a href="/profile/{data.article.authorId}" class="flex-shrink-0">
						<div
							class="size-14 sm:size-16 rounded-full ring-2 ring-white/10 hover:ring-purple-500/30 transition-all overflow-hidden"
						>
							<Logo
								src={data.article.authorLogo}
								alt={data.article.authorName || "Author"}
								class="w-full h-full object-cover"
							/>
						</div>
					</a>

					<div class="flex-1 min-w-0">
						<p class="text-xs text-gray-500 mb-1">Written by</p>
						<div class="flex flex-wrap items-center gap-2">
							<a
								href="/profile/{data.article.authorId}"
								class="font-bold text-lg text-white hover:text-purple-400 transition-colors truncate"
							>
								{data.article.authorName || "Anonymous"}
							</a>

							{#if data.article.newspaperName}
								<span class="text-gray-600 hidden sm:inline">•</span>
								<a
									href="/newspaper/{data.article.newspaperId}"
									class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-400 transition-colors truncate"
								>
									<FluentEmojiRolledUpNewspaper class="size-4" />
									{data.article.newspaperName}
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</article>

		<!-- Action Bar -->
		<div
			class="sticky bottom-0 mt-8 py-4 backdrop-blur-xl bg-slate-900/80 border-t border-white/5 -mx-4 px-4 sm:-mx-0 sm:px-0 rounded-t-2xl"
		>
			<div class="flex items-center justify-between gap-4 max-w-4xl mx-auto">
				<form
					method="POST"
					action="?/upvote"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
						};
					}}
				>
					<button
						type="submit"
						class="btn gap-2 {hasUpvoted
							? 'bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400'
							: 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300'} transition-all"
						disabled={isSubmitting}
					>
						{#if hasUpvoted}
							<FluentHeart20Filled class="size-5" />
						{:else}
							<FluentHeart20Regular class="size-5" />
						{/if}
						<span class="hidden sm:inline font-semibold">
							{hasUpvoted ? "Upvoted" : "Upvote"}
						</span>
						<span class="font-mono">({upvoteCount})</span>
					</button>
				</form>

				<div class="flex gap-2">
					<button
						class="btn gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 transition-all"
						onclick={handleShare}
					>
						<FluentShare20Filled class="size-5" />
						<span class="hidden sm:inline">Share</span>
					</button>

					{#if data.isAuthor}
						<button
							class="btn gap-2 bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300 transition-all"
							onclick={() => goto(`/posts/${data.article.id}/edit`)}
						>
							<FluentEdit20Filled class="size-5" />
							<span class="hidden sm:inline">Edit Article</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>
