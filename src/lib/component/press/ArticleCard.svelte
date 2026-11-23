<!-- src/lib/component/press/ArticleCard.svelte -->
<!-- One story as a compact dispatch: source and timestamp, headline,
     excerpt, then author and likes. The whole card opens the article; the
     newspaper and author links sit above that overlay link. -->
<script lang="ts" module>
	export interface CardArticle {
		id: number;
		title: string;
		excerpt?: string | null;
		cover?: string | null;
		minutes?: number | null;
		createdAt: Date | string;
		authorId?: string | null;
		authorName?: string | null;
		authorLogo?: string | null;
		newspaperId?: number | null;
		newspaperName?: string | null;
		newspaperLogo?: string | null;
		upvoteCount: number;
		/** Reader comments, when the feed supplies it. */
		commentCount?: number;
		own?: boolean;
	}
</script>

<script lang="ts">
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentHeart20Regular from "~icons/fluent/heart-20-regular";
	import FluentChat20Regular from "~icons/fluent/chat-20-regular";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { stamp } from "./time";

	interface Props {
		article: CardArticle;
		liked?: boolean;
		/** Bigger headline and a longer excerpt, for the top story. */
		lead?: boolean;
		/** Hide the newspaper line, e.g. on that newspaper's own front page. */
		showNewspaper?: boolean;
		class?: string;
	}

	let { article, liked = false, lead = false, showNewspaper = true, class: className = "" }: Props = $props();
</script>

<article
	class="group panel-interactive rounded-sm relative overflow-hidden {article.own
		? 'border-friendly/35'
		: ''} {className}"
>
	{#if article.cover && lead}
		<div class="aspect-[16/7] overflow-hidden border-b border-white/10 bg-surface-4">
			<img src={article.cover} alt="" loading="lazy" decoding="async" class="size-full object-cover" />
		</div>
	{/if}

	<div class="{lead ? 'p-4 sm:p-5' : 'p-3 sm:p-4'} flex gap-3">
		<div class="min-w-0 flex-1 flex flex-col gap-1.5">
			<div class="flex items-center gap-2 min-w-0 text-[11px] text-fg-muted">
				{#if showNewspaper && article.newspaperId && article.newspaperName}
					<a
						href="/newspaper/{article.newspaperId}"
						class="relative z-10 inline-flex items-center gap-1.5 min-w-0 font-semibold uppercase tracking-wide text-friendly hover:text-friendly-fg transition-colors"
					>
						<Logo
							src={article.newspaperLogo}
							alt=""
							class="size-4 shrink-0 rounded-sm"
							placeholderIcon={MdiNewspaper}
							placeholderGradient="from-surface-6 to-surface-6"
						/>
						<span class="truncate">{article.newspaperName}</span>
					</a>
				{/if}
				<time class="ml-auto shrink-0 font-mono" datetime={new Date(article.createdAt).toISOString()}>
					{stamp(article.createdAt)}
				</time>
			</div>

			<h2
				class="font-sans font-semibold tracking-normal {lead
					? 'text-lg sm:text-xl'
					: 'text-[15px] sm:text-base'} leading-snug text-fg group-hover:text-friendly-fg transition-colors break-words"
			>
				<a href="/posts/{article.id}" class="after:absolute after:inset-0 after:content-['']">{article.title}</a>
			</h2>

			{#if article.excerpt}
				<p class="text-sm leading-relaxed text-fg-soft {lead ? 'line-clamp-3' : 'line-clamp-2'}">
					{article.excerpt}
				</p>
			{/if}
		</div>

		{#if article.cover && !lead}
			<img
				src={article.cover}
				alt=""
				loading="lazy"
				decoding="async"
				class="size-16 sm:size-20 shrink-0 rounded-sm border border-white/10 object-cover"
			/>
		{/if}
	</div>

	<div
		class="flex items-center gap-3 min-w-0 border-t border-white/[0.06] {lead ? 'px-4 sm:px-5' : 'px-3 sm:px-4'} py-2"
	>
		<UserLink
			id={article.authorId}
			name={article.authorName}
			avatar={article.authorLogo}
			size="xs"
			class="relative z-10 shrink min-w-0"
		/>
		<span class="ml-auto flex items-center gap-3 shrink-0 font-mono text-[11px] text-fg-muted">
			{#if article.minutes}
				<span class="hidden min-[400px]:inline">{article.minutes} min</span>
			{/if}
			<span
				class="inline-flex items-center gap-1 {liked ? 'text-red-300' : ''}"
				aria-label="{article.upvoteCount} likes"
			>
				{#if liked}
					<FluentHeart20Filled class="size-3.5 text-red-400" />
				{:else}
					<FluentHeart20Regular class="size-3.5" />
				{/if}
				{article.upvoteCount}
			</span>
			{#if article.commentCount != null}
				<span class="inline-flex items-center gap-1" aria-label="{article.commentCount} comments">
					<FluentChat20Regular class="size-3.5" />
					{article.commentCount}
				</span>
			{/if}
		</span>
	</div>
</article>
