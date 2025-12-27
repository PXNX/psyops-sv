<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<script lang="ts">
	import MdiHeart from "~icons/mdi/heart";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";

	let { data } = $props();

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
</script>

<!-- Banner Section -->
<section class="h-40 bg-cover bg-center relative bg-slate-900">
	<div class="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900">
		<div class="absolute left-4 bottom-2 flex items-center space-x-3">
			{#if data.newspaper.logoUrl}
				<CircleAvatar src={data.newspaper.logoUrl} />
			{:else}
				<div class="size-16 rounded-full bg-blue-600 flex items-center justify-center">
					<MdiNewspaper class="size-8 text-white" />
				</div>
			{/if}

			<h2 class="text-xl font-bold text-white">{data.newspaper.name}</h2>
		</div>
	</div>
</section>

<!-- Description & Owner -->
<div class="mt-2 px-4 space-y-2">
	{#if data.newspaper.background}
		<p class="text-sm text-gray-400">{data.newspaper.background}</p>
	{/if}

	<ProfileItem
		icon={FluentPerson20Filled}
		name={data.owner.name}
		description="Owner"
		avatar={data.owner.logoUrl}
		date={data.newspaper.createdAt}
		href="/user/{data.owner.id}"
		bgColor="bg-purple-600"
	/>
</div>

<!-- Action Buttons -->
<div class="flex space-x-1 px-4 mt-4">
	<button class="btn btn-ghost btn-circle" title="Share">
		<FluentShareAndroid20Filled />
	</button>

	<a class="btn btn-ghost btn-circle" href="/newspaper/{data.newspaper.id}/members" role="button" title="Members">
		<FluentPeople20Filled />
	</a>

	{#if data.userRole === "owner"}
		<a class="btn btn-ghost btn-circle" href="/newspaper/{data.newspaper.id}/edit" role="button" title="Edit">
			<FluentEmojiGear />
		</a>
	{/if}
</div>

<!-- Recent Articles -->
<div class="mx-4 mt-6 space-y-4">
	<h3 class="text-lg font-semibold mb-2">Recent Articles</h3>

	{#if data.articles.length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 text-center">
			<MdiNewspaper class="size-12 mx-auto text-gray-500 mb-2" />
			<p class="text-gray-400">No articles published yet</p>
		</div>
	{:else}
		{#each data.articles as article}
			<a
				class="block p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-xl transition-colors"
				href="/article/{article.id}"
			>
				<h4 class="text-lg font-bold text-white mb-2">{article.title}</h4>
				<div class="flex items-center gap-4 text-sm text-gray-400">
					<span>{formatDate(article.publishDate)}</span>
					<span class="flex items-center gap-1">
						<MdiHeart class="size-4" />
						{article.upvoteCount}
					</span>
					<span>by {article.authorName}</span>
				</div>
			</a>
		{/each}
	{/if}
</div>
