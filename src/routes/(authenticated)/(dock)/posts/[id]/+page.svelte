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
	import ShareButton from "$lib/component/ShareButton.svelte";

	const { data, form } = $props();

	let hasUpvoted = $state(data.hasUpvoted);
	let upvoteCount = $state(data.article.upvoteCount);
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>{data.article.title}</title>
	<meta name="description" content={data.article.content.substring(0, 160)} />
</svelte:head>

<!-- Floating Back Button -->
<button
	onclick={() => history.back()}
	class="fixed top-4 left-4 z-20 btn btn-circle btn-sm backdrop-blur-xl bg-slate-900/80 border-white/10 hover:bg-slate-800/80 shadow-lg"
	title="Go back"
>
	<FluentArrowLeft20Regular class="size-5" />
</button>

<!-- Main Content -->
<main class="max-w-5xl mx-auto px-4 py-8 sm:py-12">
	<!-- Article -->
	<article class="space-y-8">
		<!-- Title -->
		<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
			{data.article.title}
			<!-- Time -->
			<span class="flex items-center gap-1.5 text-sm text-gray-500">
				<FluentClock20Regular class="size-4" />
				{formatDateTime(data.article.createdAt)}
			</span>
		</h1>

		<!-- Metadata & Actions -->
		<div class="flex flex-wrap items-center gap-4 sm:gap-6">
			<!-- Author -->
			<a href="/profile/{data.article.authorId}" class="flex items-center gap-3 group">
				<div
					class="size-10 rounded-full ring-1 ring-white/10 group-hover:ring-purple-500/30 transition-all overflow-hidden"
				>
					<Logo src={data.article.authorLogo} alt={data.article.authorName} />
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
						{data.article.authorName || "Anonymous"}
					</span>
					{#if data.article.newspaperName}
						<a
							href="/newspaper/{data.article.newspaperId}"
							class="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-400 transition-colors"
						>
							<FluentEmojiRolledUpNewspaper class="size-3" />
							{data.article.newspaperName}
						</a>
					{/if}
				</div>
			</a>

			<!-- Actions -->
			<div class="flex items-center gap-2">
				<!-- Upvote -->
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
						class="btn btn-sm gap-2 {hasUpvoted
							? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400'
							: 'btn-ghost hover:bg-slate-700/50'}"
						disabled={isSubmitting}
					>
						{#if hasUpvoted}
							<FluentHeart20Filled class="size-5" />
						{:else}
							<FluentHeart20Regular class="size-5" />
						{/if}
						<span class="font-mono text-sm">{upvoteCount}</span>
					</button>
				</form>

				<!-- Share -->
				<ShareButton title={data.article.title} />

				<!-- Edit -->
				{#if data.isAuthor}
					<button
						onclick={() => goto(`/posts/${data.article.id}/edit`)}
						class="btn btn-sm btn-ghost gap-2 text-purple-400 hover:bg-purple-500/10"
					>
						<FluentEdit20Filled class="size-4" />
						<span class="hidden sm:inline">Edit</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Divider -->
		<div class="border-t border-white/5"></div>

		<!-- Content -->
		<div class="prose prose-invert prose-lg max-w-none">
			<div class="article-content text-gray-300 leading-relaxed">
				{@html data.article.content}
			</div>
		</div>
	</article>
</main>
