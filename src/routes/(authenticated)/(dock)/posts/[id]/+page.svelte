<script lang="ts">
	import { page } from "$app/stores";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentArrowLeft20Regular from "~icons/fluent/arrow-left-20-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";
	import ShareButton from "$lib/component/ShareButton.svelte";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let hasUpvoted = $state(data.hasUpvoted);
	let upvoteCount = $state(data.article.upvoteCount);
	let isSubmitting = $state(false);

	async function toggleUpvote() {
		if (isSubmitting) return;
		isSubmitting = true;

		const previousUpvoted = hasUpvoted;
		const previousCount = upvoteCount;
		hasUpvoted = !hasUpvoted;
		upvoteCount += hasUpvoted ? 1 : -1;

		try {
			const response = await fetch($page.url.pathname + '?/upvote', {
				method: 'POST',
				headers: { 'x-sveltekit-action': 'true' }
			});

			if (!response.ok) {
				hasUpvoted = previousUpvoted;
				upvoteCount = previousCount;
			}
		} catch {
			hasUpvoted = previousUpvoted;
			upvoteCount = previousCount;
		} finally {
			isSubmitting = false;
		}
	}

	const description = $derived(
		data.article.content.replace(/<[^>]*>/g, '').substring(0, 200)
	);
</script>

<svelte:head>
	<title>{data.article.title}</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.article.title} />
	<meta property="og:description" content={description} />
	<meta property="og:site_name" content="PsyOps" />
	{#if data.article.authorLogo}
		<meta property="og:image" content={data.article.authorLogo} />
	{/if}
	<meta property="article:published_time" content={new Date(data.article.createdAt).toISOString()} />
	{#if data.article.authorName}
		<meta property="article:author" content={data.article.authorName} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.article.title} />
	<meta name="twitter:description" content={description} />
	{#if data.article.authorLogo}
		<meta name="twitter:image" content={data.article.authorLogo} />
	{/if}
</svelte:head>

<!-- Floating Back Button -->
<button
	onclick={() => history.back()}
	class="fixed top-4 left-4 z-20 btn btn-circle btn-sm backdrop-blur-xl bg-slate-900/80 border-white/10 hover:bg-slate-800/80 shadow-lg"
	title="Go back"
>
	<FluentArrowLeft20Regular class="size-5" />
</button>

<main class="mx-auto px-4 sm:px-6 py-10 sm:py-16">
	<article>
		<!-- Byline -->
		<div class="flex items-center gap-3 mb-6">
			<a href="/user/{data.article.authorId}" class="flex items-center gap-3 group">
				<div
					class="size-10 rounded-full ring-1 ring-white/10 group-hover:ring-purple-500/30 transition-all overflow-hidden"
				>
					<Logo src={data.article.authorLogo} alt={data.article.authorName} />
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
						{data.article.authorName}
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

			<span class="ml-auto flex items-center gap-1.5 text-sm text-gray-500">
				<FluentClock20Regular class="size-4" />
				{formatDateTime(data.article.createdAt)}
			</span>
		</div>

		<!-- Headline -->
		<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-8">
			{data.article.title}
		</h1>

		<!-- Divider -->
		<div class="border-t border-white/10 mb-8"></div>

		<!-- Article Body -->
		<div class="prose prose-invert prose-lg max-w-none">
			<div class="article-content text-gray-300 leading-relaxed">
				{@html data.article.content}
			</div>
		</div>

		<!-- Bottom Divider -->
		<div class="border-t border-white/10 mt-12 mb-6"></div>

		<!-- Bottom Actions -->
		<footer class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Upvote -->
				<button
					type="button"
					onclick={toggleUpvote}
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

				<!-- Share -->
				<ShareButton title={data.article.title} />
			</div>

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
		</footer>
	</article>
</main>
