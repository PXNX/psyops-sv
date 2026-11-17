<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<script lang="ts">
	import MdiHeart from "~icons/mdi/heart";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentBell20Filled from "~icons/fluent/alert-20-filled";
	import FluentBellOff20Filled from "~icons/fluent/alert-off-20-filled";
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import EditNewspaperSheet from "./EditNewspaperSheet.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { toastResult } from "#lib/ui/toast.svelte.js";

	let { data } = $props();
	let isSubscribing = $state(false);
	let showEditNewspaperSheet = $state(false);

	function formatDate(date: Date) {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
	}
</script>

<svelte:head>
	<title>{data.newspaper.name}</title>
	<meta
		name="description"
		content={data.newspaper.background || `Read the latest news from ${data.newspaper.name} on PsyOps.`}
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.newspaper.name} />
	<meta
		property="og:description"
		content={data.newspaper.background || `Read the latest news from ${data.newspaper.name} on PsyOps.`}
	/>
	{#if data.newspaper.logoUrl}
		<meta property="og:image" content={data.newspaper.logoUrl} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.newspaper.name} />
	<meta
		name="twitter:description"
		content={data.newspaper.background || `Read the latest news from ${data.newspaper.name} on PsyOps.`}
	/>
	{#if data.newspaper.logoUrl}
		<meta name="twitter:image" content={data.newspaper.logoUrl} />
	{/if}
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Masthead -->
	<header class="panel rounded-sm px-5 pt-6 pb-4 relative text-center">
		{#if data.userRole === "owner"}
			<IconButton
				icon={FluentEdit20Filled}
				label="Edit Newspaper"
				variant="secondary"
				size="sm"
				class="absolute top-3 right-3"
				onclick={() => (showEditNewspaperSheet = true)}
			/>
		{/if}

		<div class="mx-auto mb-3 size-16 sm:size-20 rounded-sm overflow-hidden border border-[#c8b47a]/25 bg-[#1a1f15]">
			{#if data.newspaper.logoUrl}
				<img src={data.newspaper.logoUrl} alt="" class="size-full object-cover" decoding="async" />
			{:else}
				<div class="size-full flex items-center justify-center">
					<MdiNewspaper class="size-9 text-[#b3dcff]" />
				</div>
			{/if}
		</div>

		<div class="border-y-2 border-double border-[#c8b47a]/40 py-2">
			<h1 class="font-serif text-3xl sm:text-5xl font-black tracking-tight text-[#f5efd8] break-words leading-tight">
				{data.newspaper.name}
			</h1>
		</div>
		<p
			class="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#a8a083] flex flex-wrap justify-center gap-x-3 gap-y-1"
		>
			<span>Est. {formatDate(data.newspaper.createdAt)}</span>
			<span aria-hidden="true">·</span>
			<span>{data.subscriberCount} {data.subscriberCount === 1 ? "subscriber" : "subscribers"}</span>
			<span aria-hidden="true">·</span>
			<span>{data.staffCount} staff</span>
		</p>
		{#if data.newspaper.background}
			<p class="mt-3 mx-auto max-w-2xl font-serif italic text-[#d3caa9] text-sm sm:text-base">
				{data.newspaper.background}
			</p>
		{/if}

		<!-- Owner + actions -->
		<div class="mt-4 pt-4 border-t border-[#c8b47a]/15 flex flex-wrap items-center justify-center gap-2">
			<a
				href="/user/{data.owner.id}"
				class="inline-flex items-center gap-2 mr-auto sm:mr-2 text-sm text-[#d3caa9] hover:text-[#ffcf47] transition-colors"
			>
				<Logo
					src={data.owner.logoUrl}
					alt={data.owner.name}
					class="size-7"
					placeholderIcon={FluentPerson20Filled}
					placeholderGradient="from-[#8a4fc0]/40 to-[#8a4fc0]/40"
				/>
				<span><span class="text-[#a8a083]">Publisher</span> {data.owner.name}</span>
			</a>
			{#if data.userRole}
				<Button size="sm" variant="primary" href="/posts/new" icon={FluentEdit20Filled}>Write</Button>
			{/if}
			<form
				method="POST"
				action="?/{data.isSubscribed ? 'unsubscribe' : 'subscribe'}"
				use:enhance={() => {
					isSubscribing = true;
					return async ({ update, result }) => {
						await update();
						isSubscribing = false;
						toastResult(result);
					};
				}}
			>
				<Button
					type="submit"
					size="sm"
					variant={data.isSubscribed ? "secondary" : data.userRole ? "soft-blue" : "primary"}
					loading={isSubscribing}
					icon={data.isSubscribed ? FluentBellOff20Filled : FluentBell20Filled}
				>
					{data.isSubscribed ? "Subscribed" : "Subscribe"}
				</Button>
			</form>
			<IconButton
				icon={FluentPeople20Filled}
				label="Staff"
				variant="secondary"
				size="sm"
				href="/newspaper/{data.newspaper.id}/staff"
			/>
			{#if data.userRole === "owner" || data.userRole === "editor"}
				<IconButton
					icon={FluentChartMultiple20Regular}
					label="Statistics"
					variant="secondary"
					size="sm"
					href="/newspaper/{data.newspaper.id}/statistics"
				/>
			{/if}
		</div>
	</header>

	{#if data.articles.length === 0}
		<EmptyState icon={MdiNewspaper} title="No articles yet" subtitle="The first edition is still being written." />
	{:else}
		{@const [lead, ...rest] = data.articles}
		<!-- Lead story -->
		<a href="/posts/{lead.id}" class="panel-interactive rounded-sm p-5 sm:p-6 block group">
			<p class="text-[10px] uppercase tracking-[0.2em] text-[#ffd35c] mb-2">Latest</p>
			<h2
				class="font-serif text-2xl sm:text-3xl font-bold leading-snug text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors"
			>
				{lead.title}
			</h2>
			{#if lead.excerpt}
				<p
					class="mt-3 text-[#d3caa9] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-5xl first-letter:leading-[0.85] first-letter:text-[#f5efd8]"
				>
					{lead.excerpt}
				</p>
			{/if}
			<div class="mt-4 flex items-center gap-3 text-xs text-[#a8a083]">
				<Logo src={lead.authorLogo} alt={lead.authorName} class="size-6" placeholderIcon={FluentPerson20Filled} />
				<span class="text-[#e6ddbf]">{lead.authorName}</span>
				<span>{formatDate(lead.publishDate)}</span>
				<span class="ml-auto flex items-center gap-1"><MdiHeart class="size-3.5 text-red-400" />{lead.upvoteCount}</span
				>
			</div>
		</a>

		{#if rest.length}
			<section>
				<h2 class="section-title mb-3">More from {data.newspaper.name}</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each rest as article (article.id)}
						<a href="/posts/{article.id}" class="panel-interactive rounded-sm p-4 flex flex-col group">
							<h3
								class="font-serif text-lg font-bold leading-snug text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors"
							>
								{article.title}
							</h3>
							{#if article.excerpt}
								<p class="mt-1.5 text-sm text-[#a8a083] line-clamp-3">{article.excerpt}</p>
							{/if}
							<div class="mt-auto pt-3 flex items-center gap-2 text-xs text-[#a8a083]">
								<Logo
									src={article.authorLogo}
									alt={article.authorName}
									class="size-5"
									placeholderIcon={FluentPerson20Filled}
								/>
								<span class="text-[#d3caa9] truncate">{article.authorName}</span>
								<span class="shrink-0">· {formatDate(article.publishDate)}</span>
								<span class="ml-auto flex items-center gap-1 shrink-0"
									><MdiHeart class="size-3.5 text-red-400" />{article.upvoteCount}</span
								>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
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
