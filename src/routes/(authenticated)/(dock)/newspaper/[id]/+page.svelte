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
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Header -->
	<div class="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-blue-900/30 via-slate-800/50 to-purple-900/30">
		<div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px);"></div>
		<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
		<div class="relative z-10 p-6 sm:p-8">
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
				<!-- Logo -->
				<div class="ring-4 ring-white/10 rounded-2xl shrink-0">
					{#if data.newspaper.logoUrl}
						<div class="size-20 sm:size-24 rounded-2xl overflow-hidden">
							<img src={data.newspaper.logoUrl} alt={data.newspaper.name} class="w-full h-full object-cover" />
						</div>
					{:else}
						<div class="size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
							<MdiNewspaper class="size-10 sm:size-12 text-white" />
						</div>
					{/if}
				</div>
				<!-- Info -->
				<div class="flex-1 min-w-0">
					<h1 class="text-2xl sm:text-3xl font-bold text-white mb-1 truncate">{data.newspaper.name}</h1>
					{#if data.newspaper.background}
						<p class="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-2">{data.newspaper.background}</p>
					{/if}
					<div class="flex flex-wrap gap-3 text-xs text-gray-400">
						<span class="flex items-center gap-1">
							<FluentCalendar20Filled class="size-3.5" />
							Founded {formatDate(data.newspaper.createdAt)}
						</span>
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5" />
							{data.staffCount} {data.staffCount === 1 ? 'staff' : 'staff members'}
						</span>
						<span class="flex items-center gap-1">
							<FluentBell20Filled class="size-3.5" />
							{data.subscriberCount} {data.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Owner + Actions row -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Owner card -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 flex items-center gap-3 flex-1">
			<Logo
				src={data.owner.logoUrl}
				alt={data.owner.name}
				class="size-10"
				placeholderIcon={FluentPerson20Filled}
				placeholderGradient="from-purple-500 to-pink-500"
			/>
			<div>
				<p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Owner</p>
				<a href="/user/{data.owner.id}" class="text-white font-semibold hover:text-purple-400 transition-colors text-sm">
					{data.owner.name}
				</a>
			</div>
		</div>

		<!-- Action buttons -->
		<div class="flex flex-wrap gap-2 items-center">
			<form method="POST" action="?/{data.isSubscribed ? 'unsubscribe' : 'subscribe'}" use:enhance={() => {
				isSubscribing = true;
				return async ({ update }) => {
					await update();
					isSubscribing = false;
				};
			}}>
				<button
					type="submit"
					class="btn btn-sm {data.isSubscribed ? 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300' : 'bg-blue-600 hover:bg-blue-500 border-0 text-white'} gap-2"
					disabled={isSubscribing}
				>
					{#if isSubscribing}
						<span class="loading loading-spinner loading-xs"></span>
						{data.isSubscribed ? 'Unsubscribing...' : 'Subscribing...'}
					{:else if data.isSubscribed}
						<FluentBellOff20Filled class="size-4" />
						Unsubscribe
					{:else}
						<FluentBell20Filled class="size-4" />
						Subscribe
					{/if}
				</button>
			</form>

			<a class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 gap-2" href="/newspaper/{data.newspaper.id}/staff">
				<FluentPeople20Filled class="size-4" />
				Staff
			</a>

			{#if data.userRole === "owner" || data.userRole === "editor"}
				<a class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 gap-2" href="/newspaper/{data.newspaper.id}/statistics">
					<FluentChartMultiple20Regular class="size-4" />
					Statistics
				</a>
			{/if}

			{#if data.userRole === "owner"}
				<a class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 gap-2" href="/newspaper/{data.newspaper.id}/edit">
					<FluentSettings20Filled class="size-4" />
					Settings
				</a>
			{/if}
		</div>
	</div>

	<!-- Recent Articles -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-5">
		<h3 class="text-lg font-semibold text-white mb-4">Recent Articles</h3>

		{#if data.articles.length === 0}
			<div class="py-10 text-center">
				<div class="inline-flex items-center justify-center size-14 rounded-full bg-slate-700/50 mb-3">
					<MdiNewspaper class="size-7 text-gray-500" />
				</div>
				<p class="text-gray-400 text-sm">No articles published yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.articles as article}
					<a
						class="block group bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 rounded-xl p-4 transition-all"
						href="/posts/{article.id}"
					>
						<h4 class="text-base font-semibold text-white group-hover:text-purple-400 transition-colors mb-2">
							{article.title}
						</h4>
						<div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
							<div class="flex items-center gap-1.5">
								<Logo
									src={article.authorLogo}
									alt={article.authorName}
									class="size-5"
									placeholderIcon={FluentPerson20Filled}
								/>
								<span class="text-gray-300">{article.authorName}</span>
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
