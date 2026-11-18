<!-- src/lib/component/press/PostFeed.svelte -->
<!-- The reading feed behind /posts and /posts/subscribed: tabs, search and
     an endless column of article cards (later pages come from /posts/feed). -->
<script lang="ts">
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import ArticleCard, { type CardArticle } from "./ArticleCard.svelte";

	interface Props {
		data: {
			articles: CardArticle[];
			hasMore: boolean;
			nextCursor: string | null;
			userUpvotes: number[];
		};
		subscribed?: boolean;
	}

	let { data, subscribed = false }: Props = $props();

	let searchQuery = $state("");
	let more = $state<CardArticle[]>([]);
	// undefined until the first extra page is loaded; then the cursor from the API.
	let cursor = $state<string | null | undefined>(undefined);
	let isLoading = $state(false);
	let loadFailed = $state(false);

	const nextCursor = $derived(cursor === undefined ? data.nextCursor : cursor);
	const liked = $derived(new Set(data.userUpvotes));
	const allArticles = $derived.by(() => {
		// A post can't show twice, even if new posts shifted the pages meanwhile.
		const seen = new Set<number>();
		return [...data.articles, ...more].filter((a) => !seen.has(a.id) && !!seen.add(a.id));
	});

	const filteredArticles = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return allArticles;
		return allArticles.filter(
			(a) =>
				a.title.toLowerCase().includes(query) ||
				a.authorName?.toLowerCase().includes(query) ||
				a.newspaperName?.toLowerCase().includes(query)
		);
	});

	async function loadMore() {
		if (isLoading || !nextCursor) return;
		isLoading = true;
		loadFailed = false;
		try {
			const params = new URLSearchParams({ cursor: nextCursor });
			if (subscribed) params.set("subscribed", "1");
			const response = await fetch(`/posts/feed?${params}`);
			if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
			const result: { articles: CardArticle[]; nextCursor: string | null } = await response.json();
			more = [...more, ...result.articles];
			cursor = result.nextCursor;
		} catch (error) {
			console.error("Failed to load more articles:", error);
			loadFailed = true;
		} finally {
			isLoading = false;
		}
	}

	/** Load the next page once the sentinel scrolls into view. */
	function whenVisible(node: HTMLElement) {
		// Re-observe after every page, so a sentinel that stays on screen keeps loading.
		void more.length;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) loadMore();
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	const tabs = [
		{ href: "/posts", label: "All", active: !subscribed },
		{ href: "/posts/subscribed", label: "Subscribed", active: subscribed }
	];
</script>

<svelte:head>
	<title>{subscribed ? "Subscribed" : "Posts"} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="3xl">
	<PageHeader documentTitle={false} title="Posts">
		{#snippet actions()}
			<IconButton href="/moderators" icon={FluentShield20Filled} label="Moderators" variant="secondary" />
			<IconButton href="/newspaper" icon={MdiNewspaper} label="Newspapers" variant="secondary" />
			<Button variant="primary" href="/posts/new" icon={FluentAdd20Filled}>Write</Button>
		{/snippet}
	</PageHeader>

	<div class="flex flex-col sm:flex-row sm:items-center gap-3">
		<nav class="flex self-start rounded-sm border border-white/10 overflow-hidden divide-x divide-white/10" aria-label="Feed">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.active ? "page" : undefined}
					class="tap-target px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors {tab.active
						? 'bg-friendly-bg/20 text-friendly-fg'
						: 'text-fg-muted hover:text-fg hover:bg-white/[0.04]'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		<div class="relative flex-1">
			<FluentSearch20Filled
				class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-fg-muted pointer-events-none"
			/>
			<input
				class="field-control w-full rounded-sm pl-10 pr-4 py-2 text-sm"
				placeholder="Search headlines, writers, papers"
				type="search"
				aria-label="Search posts"
				bind:value={searchQuery}
			/>
		</div>
	</div>

	{#if filteredArticles.length === 0}
		{#if searchQuery.trim()}
			<EmptyState icon={FluentSearch20Filled} title="Nothing matches “{searchQuery.trim()}”" />
		{:else if subscribed}
			<EmptyState icon={MdiNewspaper} title="No posts from your newspapers yet">
				{#snippet actions()}
					<Button variant="primary" href="/newspaper" icon={MdiNewspaper}>Find newspapers</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState icon={MdiNewspaper} title="No posts yet">
				{#snippet actions()}
					<Button variant="primary" href="/posts/new" icon={FluentAdd20Filled}>Write the first one</Button>
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<div class="flex flex-col gap-2">
			{#each filteredArticles as article, i (article.id)}
				<ArticleCard {article} liked={liked.has(article.id)} lead={i === 0 && !searchQuery.trim()} />
			{/each}
		</div>

		{#if nextCursor && !searchQuery.trim()}
			<div {@attach whenVisible} class="flex justify-center py-6">
				{#if loadFailed}
					<Button variant="secondary" size="sm" onclick={loadMore}>Try again</Button>
				{:else if isLoading}
					<div
						class="size-5 rounded-full border-2 border-white/15 border-t-friendly animate-spin"
						aria-label="Loading"
					></div>
				{/if}
			</div>
		{/if}
	{/if}
</PageContainer>
