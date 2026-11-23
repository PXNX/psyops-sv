<!-- src/routes/(authenticated)/(dock)/user/[id]/karma/+page.svelte -->
<!-- How a player's community karma was earned: every upvote on their articles
     and every vote on their comments is worth one point. -->
<script lang="ts">
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentComment20Filled from "~icons/fluent/comment-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { BackLink } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	let { data } = $props();

	const counted = $derived(data.articleVotes + data.votesOnComments);
</script>

<svelte:head>
	<title>{data.user.name || "User"} · Karma · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="3xl">
	<header class="space-y-3">
		<BackLink href="/user/{data.user.id}" label={data.user.name || "Profile"} class="-ml-3" />
		<div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
			<UserLink id={data.user.id} name={data.user.name} avatar={data.user.logo} size="md" />
			<div class="text-right">
				<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Community karma</p>
				<p class="font-mono text-2xl font-bold text-primary-fg">{data.karma.toLocaleString()}</p>
			</div>
		</div>
	</header>

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<h2 class="section-title">How it adds up</h2>
		<p class="text-sm text-fg-body">
			Karma is earned when other players upvote your articles or vote on your comments — one point each,
			removed again if the vote is withdrawn. Your own votes never count. Reputation is a separate
			figure: it comes from civilian opinion where you live, not from other players.
		</p>
		<div class="rounded-sm border border-line/20">
			<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
				<span>Source</span><span class="text-right">Votes</span><span class="text-right">Karma</span>
			</div>
			<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm">
				<span class="flex items-center gap-2"><FluentDocument20Filled class="size-4 text-fg-muted" /> Upvotes on articles</span>
				<span class="text-right font-mono text-fg-soft">{data.articleVotes.toLocaleString()}</span>
				<span class="text-right font-mono text-fg">+{data.articleVotes.toLocaleString()}</span>
			</div>
			<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm">
				<span class="flex items-center gap-2"><FluentComment20Filled class="size-4 text-fg-muted" /> Votes on comments</span>
				<span class="text-right font-mono text-fg-soft">{data.votesOnComments.toLocaleString()}</span>
				<span class="text-right font-mono text-fg">+{data.votesOnComments.toLocaleString()}</span>
			</div>
			<div class="flex justify-between bg-primary/10 px-3 py-2 text-sm font-semibold text-fg">
				<span class="flex items-center gap-2"><FluentStar20Filled class="size-4" /> Recorded karma</span>
				<span class="font-mono">{data.karma.toLocaleString()}</span>
			</div>
		</div>
		{#if counted !== data.karma}
			<p class="text-xs text-fg-muted">
				The vote rows currently add up to {counted.toLocaleString()}. The recorded total may include
				past votes on deleted items.
			</p>
		{/if}
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<h2 class="section-title">Top articles</h2>
		{#if data.articles.length}
			<ul class="divide-y divide-line/10">
				{#each data.articles as article (article.id)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<a href="/posts/{article.id}" class="min-w-0 truncate text-fg hover:text-primary-hover">
							{article.title}
						</a>
						<span class="shrink-0 font-mono text-fg-soft">+{article.votes} · {formatDate(article.createdAt)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState title="No articles yet" subtitle="Articles that receive upvotes will appear here." />
		{/if}
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<h2 class="section-title">Most-voted comments</h2>
		{#if data.comments.length}
			<ul class="divide-y divide-line/10">
				{#each data.comments as comment (comment.id)}
					<li class="py-2 text-sm">
						<div class="flex items-center justify-between gap-3">
							<a href="/posts/{comment.articleId}" class="min-w-0 truncate text-fg hover:text-primary-hover">
								{comment.articleTitle}
							</a>
							<span class="shrink-0 font-mono text-fg-soft">+{comment.votes} · {formatDate(comment.createdAt)}</span>
						</div>
						<p class="mt-0.5 line-clamp-2 text-xs text-fg-muted">{comment.content}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState title="No comment votes yet" subtitle="Comments other players vote on will appear here." />
		{/if}
	</section>
</PageContainer>
