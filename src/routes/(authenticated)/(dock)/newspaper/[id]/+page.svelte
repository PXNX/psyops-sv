<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<script lang="ts">
	import MdiHeart from "~icons/mdi/heart";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentBell20Filled from "~icons/fluent/alert-20-filled";
	import FluentBellOff20Filled from "~icons/fluent/alert-off-20-filled";
	import { enhance } from "$app/forms";

	let { data } = $props();
	let isSubscribing = $state(false);

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

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Header -->
	<div
		class="relative rounded-2xl overflow-hidden border border-[#dfceb0]/15 shadow-2xl bg-[#14283f]/85"
	>
		<div
			class="absolute inset-0 opacity-10"
			style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px);"
		></div>
		<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
		<div class="relative z-10 p-6 sm:p-8">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
				<!-- Logo -->
				<div class="rounded-2xl shrink-0">
					{#if data.newspaper.logoUrl}
						<div class="size-20 sm:size-24 rounded-2xl overflow-hidden">
							<img src={data.newspaper.logoUrl} alt={data.newspaper.name} class="w-full h-full object-cover" />
						</div>
					{:else}
						<div
							class="size-20 sm:size-24 rounded-2xl bg-[#315d8d]/25 flex items-center justify-center"
						>
							<MdiNewspaper class="size-10 sm:size-12 text-[#fff7e8]" />
						</div>
					{/if}
				</div>
				<!-- Info -->
				<div class="flex-1 min-w-0">
					<h1 class="text-2xl sm:text-3xl font-bold text-[#fff7e8] mb-1 truncate">{data.newspaper.name}</h1>
					{#if data.newspaper.background}
						<p class="text-[#d9ccb7] text-sm leading-relaxed mb-3 line-clamp-2">{data.newspaper.background}</p>
					{/if}
					<div class="flex flex-wrap gap-3 text-xs text-[#a89e8e]">
						<span class="flex items-center gap-1">
							<FluentCalendar20Filled class="size-3.5" />
							Founded {formatDate(data.newspaper.createdAt)}
						</span>
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5" />
							{data.staffCount}
							{data.staffCount === 1 ? "staff" : "staff members"}
						</span>
						<span class="flex items-center gap-1">
							<FluentBell20Filled class="size-3.5" />
							{data.subscriberCount}
							{data.subscriberCount === 1 ? "subscriber" : "subscribers"}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Owner + Actions row -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Owner card -->
		<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-xl p-4 flex items-center gap-3 flex-1">
			<Logo
				src={data.owner.logoUrl}
				alt={data.owner.name}
				class="size-10"
				placeholderIcon={FluentPerson20Filled}
				placeholderGradient="from-[#8c709b] to-[#b7a0c5]"
			/>
			<div>
				<p class="text-xs text-[#a89e8e] uppercase tracking-wide font-medium">Owner</p>
				<a
					href="/user/{data.owner.id}"
					class="text-[#fff7e8] font-semibold hover:text-purple-400 transition-colors text-sm"
				>
					{data.owner.name}
				</a>
			</div>
		</div>

		<!-- Action buttons -->
		<div class="flex flex-wrap gap-2 items-center">
			<form
				method="POST"
				action="?/{data.isSubscribed ? 'unsubscribe' : 'subscribe'}"
				use:enhance={() => {
					isSubscribing = true;
					return async ({ update }) => {
						await update();
						isSubscribing = false;
					};
				}}
			>
				<Button
					type="submit"
					size="sm"
					variant={data.isSubscribed ? "secondary" : "info"}
					disabled={isSubscribing}
					loading={isSubscribing}
					loadingText={data.isSubscribed ? "Unsubscribing..." : "Subscribing..."}
					icon={data.isSubscribed ? FluentBellOff20Filled : FluentBell20Filled}
				>
					{data.isSubscribed ? "Unsubscribe" : "Subscribe"}
				</Button>
			</form>

			<Button size="sm" variant="secondary" href="/newspaper/{data.newspaper.id}/staff" icon={FluentPeople20Filled}>
				Staff
			</Button>

			{#if data.userRole === "owner" || data.userRole === "editor"}
				<Button
					size="sm"
					variant="secondary"
					href="/newspaper/{data.newspaper.id}/statistics"
					icon={FluentChartMultiple20Regular}
				>
					Statistics
				</Button>
			{/if}

			{#if data.userRole === "owner"}
				<Button
					size="sm"
					variant="secondary"
					href="/newspaper/{data.newspaper.id}/edit"
					icon={FluentSettings20Filled}
				>
					Settings
				</Button>
			{/if}
		</div>
	</div>

	<!-- Recent Articles -->
	<div class="panel rounded-xl p-5">
		<h3 class="text-lg font-semibold text-[#fff7e8] mb-4">Recent Articles</h3>

		{#if data.articles.length === 0}
			<div class="py-10 text-center">
				<div class="inline-flex items-center justify-center size-14 rounded-full bg-[#102239]/70 mb-3">
					<MdiNewspaper class="size-7 text-[#a89e8e]" />
				</div>
				<p class="text-[#a89e8e] text-sm">No articles published yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.articles as article}
					<a
						class="block group panel-interactive rounded-xl p-4"
						href="/posts/{article.id}"
					>
						<h4 class="text-base font-semibold text-[#fff7e8] group-hover:text-[#f7c56b] transition-colors mb-2">
							{article.title}
						</h4>
						<div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-[#a89e8e]">
							<div class="flex items-center gap-1.5">
								<Logo
									src={article.authorLogo}
									alt={article.authorName}
									class="size-5"
									placeholderIcon={FluentPerson20Filled}
								/>
								<span class="text-[#d9ccb7]">{article.authorName}</span>
							</div>
							<span>{formatDate(article.publishDate)}</span>
							<span class="flex items-center gap-1">
								<MdiHeart class="size-3.5 text-red-400" />
								{article.upvoteCount}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
