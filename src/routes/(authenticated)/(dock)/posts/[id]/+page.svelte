<script lang="ts">
	import { page } from "$app/stores";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDateTime } from "$lib/utils/formatting.js";
	import ShareButton from "$lib/component/ShareButton.svelte";

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
			const response = await fetch($page.url.pathname + "?/upvote", {
				method: "POST",
				headers: { "x-sveltekit-action": "true" },
				body: new FormData()
			});

			const result = await response.json();

			if (!response.ok || result.type === "error" || result.type === "failure") {
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

	const description = $derived(data.article.content.replace(/<[^>]*>/g, "").substring(0, 200));
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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Command Header -->
	<div class="border-b border-purple-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center gap-4">
				<button
					onclick={() => history.back()}
					class="flex-shrink-0 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 text-slate-300 hover:text-white transition-all"
				>
					<FluentArrowLeft20Filled class="size-5" />
				</button>

				<!-- Author Info -->
				<a href="/user/{data.article.authorId}" class="flex items-center gap-3 group flex-1 min-w-0">
					<div class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
						<div class="relative size-12 sm:size-14 rounded-lg border-2 border-purple-500/30 overflow-hidden">
							<Logo src={data.article.authorLogo} alt={data.article.authorName} />
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
							{data.article.authorName}
						</p>
						{#if data.article.newspaperName}
							<a
								href="/newspaper/{data.article.newspaperId}"
								class="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-400 transition-colors font-mono"
							>
								<FluentEmojiRolledUpNewspaper class="size-3" />
								{data.article.newspaperName}
							</a>
						{/if}
						<span class="flex items-center gap-1 text-[10px] text-slate-600 font-mono mt-0.5">
							<FluentClock20Regular class="size-3" />
							{formatDateTime(data.article.createdAt)}
						</span>
					</div>
				</a>

				<!-- Actions -->
				<div class="flex items-center gap-2 flex-shrink-0">
					{#if data.isAuthor}
						<a
							href="/posts/{data.article.id}/edit"
							class="px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-purple-400 hover:text-purple-300 transition-all flex items-center gap-2 text-xs font-mono"
						>
							<FluentEdit20Filled class="size-3.5" />
							<span class="hidden sm:inline">Edit</span>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Article Content -->
	<div class="w-full px-4 sm:px-6 py-6 sm:py-8">
		<div class="max-w-4xl mx-auto space-y-8">
			<!-- Headline -->
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-wide">
				{data.article.title}
			</h1>

			<!-- Divider -->
			<div class="border-t border-slate-700/50"></div>

			<!-- Article Body -->
			<div class="prose prose-invert prose-lg max-w-none">
				<div class="article-content text-slate-300 leading-relaxed">
					{@html data.article.content}
				</div>
			</div>

			<!-- Bottom Divider -->
			<div class="border-t border-slate-700/50"></div>

			<!-- Bottom Actions -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<!-- Upvote -->
					<button
						type="button"
						onclick={toggleUpvote}
						class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-all {hasUpvoted
							? 'bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-red-400'
							: 'bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 text-slate-400 hover:text-white'}"
						disabled={isSubmitting}
					>
						{#if hasUpvoted}
							<FluentHeart20Filled class="size-5" />
						{:else}
							<FluentHeart20Regular class="size-5" />
						{/if}
						<span class="font-bold">{upvoteCount}</span>
					</button>

					<!-- Share -->
					<ShareButton title={data.article.title} />
				</div>
			</div>
		</div>
	</div>
</div>
