<script lang="ts">
	import { page } from "$app/state";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import ShareButton from "#lib/component/ShareButton.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";

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
			const response = await fetch(page.url.pathname + "?/upvote", {
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

<PageContainer maxWidth="4xl">
	<!-- Author Header -->
	<div class="panel rounded-sm p-4">
		<div class="flex items-center gap-4">
			<IconButton
				icon={FluentArrowLeft20Filled}
				label="Go back"
				variant="secondary"
				onclick={() => history.back()}
				class="flex-shrink-0"
			/>

			<!-- Author Info -->
			<a href="/user/{data.article.authorId}" class="flex items-center gap-3 group flex-1 min-w-0">
				<Logo src={data.article.authorLogo} alt={data.article.authorName} class="size-12 sm:size-14 shrink-0" />
				<div class="flex-1 min-w-0">
					<p class="text-sm font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
						{data.article.authorName}
					</p>
					{#if data.article.newspaperName}
						<a
							href="/newspaper/{data.article.newspaperId}"
							class="flex items-center gap-1 text-xs text-[#a8a083] hover:text-[#ffcf47] transition-colors"
						>
							<FluentEmojiRolledUpNewspaper class="size-3" />
							{data.article.newspaperName}
						</a>
					{/if}
					<span class="flex items-center gap-1 text-xs text-[#a8a083] mt-0.5">
						<FluentClock20Regular class="size-3" />
						{formatDateTime(data.article.createdAt)}
					</span>
				</div>
			</a>

			<!-- Actions -->
			<div class="flex items-center gap-2 flex-shrink-0">
				{#if data.isAuthor}
					<Button variant="soft-amber" size="sm" href="/posts/{data.article.id}/edit" icon={FluentEdit20Filled}>
						<span class="hidden sm:inline">Edit</span>
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Article Content -->
	<article class="space-y-8 px-1 sm:px-2 py-2">
		<!-- Headline -->
		<h1 class="text-3xl lg:text-4xl font-bold text-[#f5efd8] leading-tight">
			{data.article.title}
		</h1>

		<!-- Divider -->
		<div class="border-t border-[#c8b47a]/15"></div>

		<!-- Article Body -->
		<div class="article-content text-[#d3caa9]">
			{@html data.article.content}
		</div>

		<!-- Bottom Divider -->
		<div class="border-t border-[#c8b47a]/15"></div>

		<!-- Bottom Actions -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<!-- Upvote -->
				<Button
					type="button"
					variant={hasUpvoted ? "soft-red" : "secondary"}
					icon={hasUpvoted ? FluentHeart20Filled : FluentHeart20Regular}
					onclick={toggleUpvote}
					disabled={isSubmitting}
				>
					<span class="font-bold">{upvoteCount}</span>
				</Button>

				<!-- Share -->
				<ShareButton title={data.article.title} />
			</div>
		</div>
	</article>
</PageContainer>
