<!-- src/routes/(authenticated)/(dock)/posts/[id]/+page.svelte -->
<script lang="ts">
	import { page } from "$app/state";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import UserLink from "#lib/component/UserLink.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import ShareButton from "#lib/component/ShareButton.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toast } from "#lib/ui/toast.svelte.js";
	import { stamp } from "#lib/component/press/time.js";
	import { dtgDate } from "#lib/utils/dtg.js";
	import SafeHtml from "#lib/component/press/SafeHtml.svelte";

	const { data } = $props();

	// Optimistic like state, reset whenever another article loads into this page.
	let liked = $state<{ id: number; on: boolean; count: number } | null>(null);
	const hasUpvoted = $derived(liked?.id === data.article.id ? liked.on : data.hasUpvoted);
	const upvoteCount = $derived(liked?.id === data.article.id ? liked.count : data.article.upvoteCount);
	let isSubmitting = $state(false);
	let likeButton = $state<HTMLElement>();

	async function toggleUpvote() {
		if (isSubmitting) return;
		isSubmitting = true;

		const id = data.article.id;
		const previous = { id, on: hasUpvoted, count: upvoteCount };
		liked = { id, on: !previous.on, count: previous.count + (previous.on ? -1 : 1) };
		if (liked.on) celebrate(likeButton);

		try {
			const response = await fetch(page.url.pathname + "?/upvote", {
				method: "POST",
				headers: { "x-sveltekit-action": "true" },
				body: new FormData()
			});
			const result = await response.json();
			if (!response.ok || result.type === "error" || result.type === "failure") throw new Error(result.type);
		} catch {
			liked = previous;
			toast.error("Couldn't save your like. Please try again.");
		} finally {
			isSubmitting = false;
		}
	}

	const description = $derived(
		data.article.content
			.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.substring(0, 200)
	);
</script>

<svelte:head>
	<title>{data.article.title} · PsyOps</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.article.title} />
	<meta property="og:description" content={description} />
	<meta property="og:site_name" content="PsyOps" />
	{#if data.article.newspaperLogo || data.article.authorLogo}
		<meta property="og:image" content={data.article.newspaperLogo || data.article.authorLogo} />
	{/if}
	<meta property="article:published_time" content={new Date(data.article.createdAt).toISOString()} />
	{#if data.article.authorName}
		<meta property="article:author" content={data.article.authorName} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.article.title} />
	<meta name="twitter:description" content={description} />
	{#if data.article.newspaperLogo || data.article.authorLogo}
		<meta name="twitter:image" content={data.article.newspaperLogo || data.article.authorLogo} />
	{/if}
</svelte:head>

<PageContainer maxWidth="3xl">
	<!-- Top bar -->
	<div class="flex items-center gap-2">
		<IconButton icon={FluentArrowLeft20Filled} label="Go back" variant="secondary" onclick={() => history.back()} />
		<div class="ml-auto flex items-center gap-2">
			{#if data.isAuthor}
				<Button variant="soft-amber" size="sm" href="/posts/{data.article.id}/edit" icon={FluentEdit20Filled}>
					Edit
				</Button>
			{/if}
			<ShareButton title={data.article.title} />
		</div>
	</div>

	<article class="paper rounded-sm px-5 py-6 sm:px-10 sm:py-10">
		<header class="mx-auto max-w-[42rem]">
			<!-- Masthead -->
			{#if data.article.newspaperId && data.article.newspaperName}
				<a
					href="/newspaper/{data.article.newspaperId}"
					class="group flex items-center gap-2 pb-3 mb-5 border-b-2 border-ink/25 min-w-0"
				>
					<Logo
						src={data.article.newspaperLogo}
						alt=""
						class="size-6 shrink-0 rounded-sm"
						placeholderIcon={MdiNewspaper}
						placeholderGradient="from-surface-6 to-surface-6"
					/>
					<span
						class="text-xs font-semibold uppercase tracking-wide text-friendly group-hover:text-friendly-fg transition-colors truncate"
					>
						{data.article.newspaperName}
					</span>
				</a>
			{/if}

			<p class="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
				Printed edition · {dtgDate(data.article.createdAt)}
			</p>
			<h1 class="mt-1 font-serif text-[2rem] sm:text-[2.75rem] leading-[1.12] text-fg break-words">
				{data.article.title}
			</h1>

			<!-- Byline -->
			<div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
				<UserLink id={data.article.authorId} name={data.article.authorName} avatar={data.article.authorLogo} />
				<span class="ml-auto font-mono text-xs text-fg-muted">
					<time datetime={new Date(data.article.createdAt).toISOString()}>{stamp(data.article.createdAt)}</time>
					· {data.article.minutes} min
				</span>
			</div>
		</header>

		<SafeHtml
			html={data.article.content}
			class="article-content drop-cap mx-auto mt-8 max-w-[42rem] text-[1.0625rem] text-fg-body break-words [&_a]:text-ink-link [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-fg [&_h2]:text-fg [&_h3]:text-fg [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_hr]:my-8 [&_hr]:border-ink/20"
		/>

		{#if data.poll}
			{@const poll = data.poll}
			<section class="panel animate-soft-in mx-auto mt-8 max-w-[42rem] rounded-sm p-5">
				<div class="flex items-center gap-2">
					<h2 class="section-title text-base">{poll.question}</h2>
					<Badge tone="blue" size="xs">poll</Badge>
				</div>
				<div class="mt-3 space-y-2">
					{#each poll.options as option, i}
						{@const pct = poll.total ? Math.round((poll.counts[i] ?? 0) / poll.total * 100) : 0}
						<form method="POST" action="?/votePoll" use:enhance={() => async ({ result, update }) => { toastResult(result); await update(); }}>
							<input type="hidden" name="pollId" value={poll.id} />
							<input type="hidden" name="optionIndex" value={i} />
							<button
								type="submit"
								disabled={poll.closed}
								class="relative w-full overflow-hidden rounded-sm border px-3 py-2 text-left text-sm transition-colors {poll.myVote === i
									? 'border-primary/60 bg-primary/12 text-primary-fg'
									: 'border-line/25 bg-surface-2 hover:border-primary/40'}"
							>
								<span class="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500" style="width:{pct}%"></span>
								<span class="relative flex items-center justify-between gap-2"><span>{option}</span><span class="font-mono text-xs text-fg-muted">{pct}% · {poll.counts[i] ?? 0}</span></span>
							</button>
						</form>
					{/each}
				</div>
				<p class="mt-2 text-[11px] text-fg-muted">{poll.total} votes{poll.closed ? " · closed" : ""}</p>
			</section>
		{/if}

		<!-- Reactions -->
		<footer class="mx-auto mt-10 max-w-[42rem] pt-4 border-t border-ink/20 flex items-center gap-3">
			<button
				bind:this={likeButton}
				type="button"
				onclick={toggleUpvote}
				disabled={isSubmitting}
				aria-pressed={hasUpvoted}
				aria-label={hasUpvoted ? "Remove like" : "Like"}
				class="press-spring tap-target inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors {hasUpvoted
					? 'bg-red-600/15 border-red-500/35 text-red-200'
					: 'border-ink/25 text-fg-body hover:border-red-500/35 hover:text-red-200'}"
			>
				{#if hasUpvoted}
					<FluentHeart20Filled class="size-4 text-red-400" />
				{:else}
					<FluentHeart20Regular class="size-4" />
				{/if}
				<span class="font-mono">{upvoteCount}</span>
			</button>
			<span class="text-sm text-fg-muted">{upvoteCount === 1 ? "like" : "likes"}</span>
		</footer>

		<!-- Reader comments -->
		<section class="mx-auto mt-8 max-w-[42rem] space-y-4">
			<div class="flex items-center gap-2">
				<h2 class="section-title text-base">Comments</h2>
				<Badge tone="neutral" size="xs">{data.comments.length}</Badge>
			</div>
			<form method="POST" action="?/addComment" use:enhance={() => async ({ result, update }) => { toastResult(result); await update(); }} class="space-y-2">
				<textarea name="content" rows="3" maxlength="2000" required placeholder="Add a comment…" class="field-control w-full rounded-sm px-3 py-2 text-sm"></textarea>
				<Button type="submit" size="sm" variant="secondary">Post comment</Button>
			</form>
			{#each data.comments as comment (comment.id)}
				<article class="panel animate-soft-in rounded-sm p-3 text-sm">
					<div class="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
						<UserLink id={comment.authorId} name={comment.authorName ?? "Reader"} size="xs" plain />
						<span>· {stamp(comment.createdAt)}</span>
					</div>
					<p class="mt-2 whitespace-pre-wrap text-fg-body">{comment.content}</p>
					<div class="mt-2 flex items-center gap-2">
						<form method="POST" action="?/commentVote" use:enhance={() => async ({ result, update }) => { toastResult(result); await update(); }}>
							<input type="hidden" name="commentId" value={comment.id} />
							<button type="submit" class="press-spring rounded-sm border px-2 py-1 text-xs {comment.hasVoted ? 'border-primary/50 bg-primary/12 text-primary-fg' : 'border-line/25 text-fg-muted hover:border-primary/40'}">
								▲ {comment.votes}
							</button>
						</form>
						<details class="ml-auto">
							<summary class="cursor-pointer text-xs text-fg-muted hover:text-fg">Report</summary>
							<form method="POST" action="?/reportComment" use:enhance={() => async ({ result, update }) => { toastResult(result); await update(); }} class="mt-2 flex gap-1">
								<input type="hidden" name="commentId" value={comment.id} />
								<input name="reason" placeholder="Reason" class="field-control min-w-0 flex-1 rounded-sm px-2 py-1 text-xs" />
								<Button type="submit" size="xs" variant="ghost">Send</Button>
							</form>
						</details>
					</div>
				</article>
			{/each}
		</section>
	</article>
</PageContainer>
