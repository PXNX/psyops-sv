<script>
	import MdiHeart from "~icons/mdi/heart";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import * as m from "$lib/paraglide/messages.js";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	let pushblishModal = $state();
	let cancelModal = $state();

	const { data } = $props();

	const articles = [
		{
			id: 1,
			title: "Pentexnyx",
			publish_date: "2023-04-01",
			upvote_count: 1
		},
		{
			id: 2,
			title: "Pentexnyx",
			publish_date: "2023-04-01",
			upvote_count: 1
		},
		{
			id: 3,
			title: "Pentexnyx",
			publish_date: "2023-04-01",
			upvote_count: 1
		}
	];
</script>

<section
	class="h-40 bg-cover bg-center relative bg-[url('https://img.freepik.com/fotos-kostenlos/ein-gemaelde-eines-bergsees-mit-einem-berg-im-hintergrund_188544-9126.jpg')]"
>
	<div class="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900">
		<div class="absolute left-4 bottom-2 flex items-center space-x-3">
			<CircleAvatar src={data.newspaper.avatar} />

			<h2 class="text-xl font-bold text-white">{data.newspaper.name}</h2>
		</div>
	</div>
</section>

<div class="m-2 space-y-2">
	<p class="text-sm text-muted-foreground bg-amber-500">Your trusted source for daily news and in-depth analysis.</p>

	<ProfileItem
		name={data.owner.name}
		description={"Owner"}
		avatar={data.owner.avatar}
		href={"/user/" + data.owner.id}
		bgColor={"bg-purple-600"}
	/>
</div>

<div class="flex space-x-1">
	<button class="btn btn-ghost btn-circle" onclick={() => {}}>
		<FluentShareAndroid20Filled />
	</button>

	<a class=" btn btn-ghost btn-circle" href="/newspaper/{data.newspaper.id}/members" role="button">
		<MdiNewspaper />
	</a>
	<a class=" btn btn-ghost btn-circle" href="/newspaper/{data.newspaper.id}/edit" role="button">
		<FluentEmojiGear />
	</a>
</div>

<div class="mx-2 mt-2 space-y-4">
	<h3 class="text-lg font-semibold mb-2">Recent Articles</h3>

	{#each articles as article}
		<a
			class="w-full gap-2 p-2 text-current no-underline flinch label-text"
			href="/posts/{article.id}"
			oncontextmenu={() => false}
		>
			<b class="block text-lg font-bold tracking-tight transition-all duration-3000" id="article_title"
				>{article.title}</b
			><span class="text-sm">{article.publish_date}<MdiHeart /> {article.upvote_count}</span>
		</a>
	{/each}
</div>
