<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<script lang="ts">
	import MdiHeart from "~icons/mdi/heart";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import Logo from "$lib/component/Logo.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import MdiBell from "~icons/mdi/bell";
	import MdiBellOff from "~icons/mdi/bell-off";
	import MdiChartLine from "~icons/mdi/chart-line";
	import MdiCalendar from "~icons/mdi/calendar";
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

<!-- Banner Section -->
<section class="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-b border-white/10">
	<div class="max-w-5xl mx-auto px-6 py-8">
		<div class="flex items-start gap-6">
			<!-- Newspaper Logo -->
			<div class="flex-shrink-0">
				{#if data.newspaper.logoUrl}
					<div class="size-24 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-xl">
						<img src={data.newspaper.logoUrl} alt={data.newspaper.name} class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="size-24 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-white/10 shadow-xl">
						<MdiNewspaper class="size-12 text-white" />
					</div>
				{/if}
			</div>

			<!-- Newspaper Info -->
			<div class="flex-1 min-w-0">
				<h1 class="text-3xl font-bold text-white mb-2 truncate">{data.newspaper.name}</h1>
				{#if data.newspaper.background}
					<p class="text-gray-300 text-sm leading-relaxed mb-4">{data.newspaper.background}</p>
				{/if}

				<!-- Stats Row -->
				<div class="flex flex-wrap gap-4 text-sm">
					<div class="flex items-center gap-2 text-gray-400">
						<MdiCalendar class="size-4" />
						<span>Founded {formatDate(data.newspaper.createdAt)}</span>
					</div>
					<div class="flex items-center gap-2 text-gray-400">
						<FluentPeople20Filled class="size-4" />
						<span>{data.staffCount} {data.staffCount === 1 ? 'staff member' : 'staff members'}</span>
					</div>
					<div class="flex items-center gap-2 text-gray-400">
						<MdiBell class="size-4" />
						<span>{data.subscriberCount} {data.subscriberCount === 1 ? 'subscriber' : 'subscribers'}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Owner Info -->
<div class="max-w-5xl mx-auto px-6 py-4">
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
		<div class="flex items-center gap-3">
			<Logo
				src={data.owner.logoUrl}
				alt={data.owner.name}
				class="size-12"
				placeholderIcon={FluentPerson20Filled}
				placeholderGradient="from-purple-500 to-pink-500"
			/>
			<div class="flex-1">
				<p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Owner</p>
				<a href="/user/{data.owner.id}" class="text-white font-semibold hover:text-purple-400 transition-colors">
					{data.owner.name}
				</a>
			</div>
		</div>
	</div>
</div>

<!-- Action Buttons -->
<div class="max-w-5xl mx-auto px-6 py-4">
	<div class="flex flex-wrap gap-3">
	<!-- Subscribe/Unsubscribe Button - Show prominently -->
	<form method="POST" action="?/{data.isSubscribed ? 'unsubscribe' : 'subscribe'}" use:enhance={() => {
		isSubscribing = true;
		return async ({ update }) => {
			await update();
			isSubscribing = false;
		};
	}}>
		<button
			type="submit"
			class="btn {data.isSubscribed ? 'btn-ghost border-white/10' : 'bg-blue-600 hover:bg-blue-700 border-0 text-white'} gap-2"
			disabled={isSubscribing}
		>
			{#if isSubscribing}
				<span class="loading loading-spinner loading-sm"></span>
				{data.isSubscribed ? 'Unsubscribing...' : 'Subscribing...'}
			{:else if data.isSubscribed}
				<MdiBellOff class="size-5" />
				Unsubscribe
			{:else}
				<MdiBell class="size-5" />
				Subscribe
			{/if}
		</button>
	</form>

	<div class="flex-1"></div>

	<a class="btn btn-ghost border-white/10" href="/newspaper/{data.newspaper.id}/staff">
		<FluentPeople20Filled class="size-5" />
		Staff
	</a>

	{#if data.userRole === "owner" || data.userRole === "editor"}
		<a class="btn btn-ghost border-white/10" href="/newspaper/{data.newspaper.id}/statistics">
			<MdiChartLine class="size-5" />
			Statistics
		</a>
	{/if}

	{#if data.userRole === "owner"}
		<a class="btn btn-ghost border-white/10" href="/newspaper/{data.newspaper.id}/edit">
			<FluentEmojiGear class="size-5" />
			Settings
		</a>
	{/if}
	</div>
	</div>

<!-- Recent Articles -->
<div class="max-w-5xl mx-auto px-6 py-6">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-xl font-bold text-white">Recent Articles</h3>
	</div>

	{#if data.articles.length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-slate-700/50 mb-4">
				<MdiNewspaper class="size-8 text-gray-500" />
			</div>
			<h4 class="text-lg font-semibold text-gray-300 mb-2">No articles yet</h4>
			<p class="text-gray-400 text-sm">Articles published by this newspaper will appear here</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.articles as article}
				<a
					class="block group bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-white/10 rounded-xl p-5 transition-all"
					href="/posts/{article.id}"
				>
					<h4 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mb-3">
						{article.title}
					</h4>
					<div class="flex items-center flex-wrap gap-x-5 gap-y-2 text-sm">
						<div class="flex items-center gap-2 text-gray-400">
							<Logo
								src={article.authorLogo}
								alt={article.authorName}
								class="size-6"
								placeholderIcon={FluentPerson20Filled}
							/>
							<span class="text-white">{article.authorName}</span>
						</div>
						<span class="text-gray-500">•</span>
						<span class="text-gray-400">{formatDate(article.publishDate)}</span>
						<span class="text-gray-500">•</span>
						<span class="flex items-center gap-1.5 text-gray-400">
							<MdiHeart class="size-4" />
							{article.upvoteCount}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
