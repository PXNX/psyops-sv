<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<!-- A newspaper's front page: masthead, lead story, the rest of the edition
     and the newsroom. -->
<script lang="ts">
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentBell20Filled from "~icons/fluent/alert-20-filled";
	import FluentBellOff20Filled from "~icons/fluent/alert-off-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import { enhance } from "$app/forms";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import ArticleCard from "#lib/component/press/ArticleCard.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import EditNewspaperSheet from "./EditNewspaperSheet.svelte";

	let { data } = $props();
	let isSubscribing = $state(false);
	let showEditNewspaperSheet = $state(false);
	let subscribeForm = $state<HTMLFormElement>();

	const description = $derived(
		data.newspaper.background || `Read the latest news from ${data.newspaper.name} on PsyOps.`
	);
	const canWrite = $derived(!!data.userRole);
	const canSeeStats = $derived(data.userRole === "owner" || data.userRole === "editor");
	const lead = $derived(data.articles[0]);
	const rest = $derived(data.articles.slice(1));
	const roleLabel = { owner: "Publisher", editor: "Editor", author: "Writer" } as const;
</script>

<svelte:head>
	<title>{data.newspaper.name} · PsyOps</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.newspaper.name} />
	<meta property="og:description" content={description} />
	{#if data.newspaper.logoUrl}
		<meta property="og:image" content={data.newspaper.logoUrl} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.newspaper.name} />
	<meta name="twitter:description" content={description} />
	{#if data.newspaper.logoUrl}
		<meta name="twitter:image" content={data.newspaper.logoUrl} />
	{/if}
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Masthead -->
	<header class="panel rounded-sm relative px-4 pt-6 pb-4 sm:px-8 sm:pt-8 text-center">
		{#if data.userRole === "owner"}
			<IconButton
				icon={FluentSettings20Filled}
				label="Edit newspaper"
				variant="secondary"
				size="sm"
				class="absolute top-3 right-3"
				onclick={() => (showEditNewspaperSheet = true)}
			/>
		{/if}

		<Logo
			src={data.newspaper.logoUrl}
			alt=""
			class="mx-auto size-14 sm:size-16 rounded-sm border border-white/10"
			placeholderIcon={MdiNewspaper}
			placeholderGradient="from-surface-6 to-surface-6"
		/>

		<h1
			class="mt-3 pb-3 border-b border-white/10 font-serif text-[2.25rem] sm:text-5xl leading-[1.05] tracking-tight text-fg break-words"
		>
			{data.newspaper.name}
		</h1>

		{#if data.newspaper.background}
			<p class="mt-3 mx-auto max-w-xl text-sm sm:text-base text-fg-soft leading-relaxed">
				{data.newspaper.background}
			</p>
		{/if}

		<dl class="mt-4 grid grid-cols-3 divide-x divide-white/10 border border-white/10 rounded-sm text-left">
			<div class="px-3 py-2">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Subscribers</dt>
				<dd class="font-mono text-sm text-fg">{data.subscriberCount}</dd>
			</div>
			<div class="px-3 py-2">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Staff</dt>
				<dd class="font-mono text-sm text-fg">{data.staff.length}</dd>
			</div>
			<div class="px-3 py-2 min-w-0">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Founded</dt>
				<dd class="font-mono text-sm text-fg truncate">{formatDate(data.newspaper.createdAt)}</dd>
			</div>
		</dl>

		<div class="mt-4 flex flex-wrap items-center justify-center gap-2">
			{#if canWrite}
				<Button variant="primary" href="/posts/new?newspaper={data.newspaper.id}" icon={FluentEdit20Filled}>
					Write
				</Button>
			{/if}
			<form
				bind:this={subscribeForm}
				method="POST"
				action="?/{data.isSubscribed ? 'unsubscribe' : 'subscribe'}"
				use:enhance={() => {
					isSubscribing = true;
					const subscribing = !data.isSubscribed;
					return async ({ update, result }) => {
						await update();
						isSubscribing = false;
						toastResult(result);
						if (result.type === "success" && subscribing) celebrate(subscribeForm);
					};
				}}
				class="rounded-sm"
			>
				<Button
					type="submit"
					variant={data.isSubscribed ? "soft-emerald" : canWrite ? "soft-blue" : "primary"}
					loading={isSubscribing}
					icon={data.isSubscribed ? FluentBellOff20Filled : FluentBell20Filled}
				>
					{data.isSubscribed ? "Subscribed" : "Subscribe"}
				</Button>
			</form>
			{#if canSeeStats}
				<IconButton
					icon={FluentChartMultiple20Regular}
					label="Statistics"
					variant="secondary"
					href="/newspaper/{data.newspaper.id}/statistics"
				/>
			{/if}
			<IconButton
				icon={FluentPeople20Filled}
				label="Staff"
				variant="secondary"
				href="/newspaper/{data.newspaper.id}/staff"
			/>
		</div>
	</header>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] items-start">
		<!-- The edition -->
		<div class="flex flex-col gap-2 min-w-0">
			{#if lead}
				<ArticleCard article={lead} lead showNewspaper={false} />
				{#if rest.length}
					<div class="grid gap-2 sm:grid-cols-2">
						{#each rest as article (article.id)}
							<ArticleCard {article} showNewspaper={false} />
						{/each}
					</div>
				{/if}
			{:else}
				<EmptyState icon={MdiNewspaper} title="No stories yet">
					{#snippet actions()}
						{#if canWrite}
							<Button variant="primary" href="/posts/new?newspaper={data.newspaper.id}" icon={FluentEdit20Filled}>
								Write the first story
							</Button>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		</div>

		<!-- Newsroom -->
		<aside class="panel rounded-sm p-4 space-y-3 lg:sticky lg:top-6">
			<div class="flex items-center justify-between gap-2">
				<h2 class="section-title">Newsroom</h2>
				<a
					href="/newspaper/{data.newspaper.id}/staff"
					class="font-mono text-xs text-friendly hover:text-friendly-fg transition-colors"
				>
					{data.staff.length}
				</a>
			</div>
			<ul class="space-y-3">
				{#each data.staff.slice(0, 6) as member (member.id)}
					<li>
						<UserLink id={member.id} name={member.name} avatar={member.logo} subtitle={roleLabel[member.role]} />
					</li>
				{/each}
			</ul>
		</aside>
	</div>
</PageContainer>

<!-- Edit Newspaper Bottom Sheet -->
{#if data.userRole === "owner" && data.editForm}
	<EditNewspaperSheet
		bind:open={showEditNewspaperSheet}
		editForm={data.editForm}
		newspaperName={data.newspaper.name}
		currentLogo={data.newspaper.logoUrl}
		editCost={data.editCost}
		userBalance={data.userBalance}
		canAfford={data.canAffordEdit}
	/>
{/if}
