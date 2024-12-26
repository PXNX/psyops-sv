<script>
	import MdiHeart from "~icons/mdi/heart";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import * as m from "$lib/paraglide/messages.js";
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

<div
	class=" px-2 pb-2 pt-8 flex bg-cover justify-between bg-[url('https://media.cntraveller.com/photos/65291b466ba909a7e4c6ce0d/16:9/w_1280,c_limit/Planet_Earth_III_generic_Best_Places_to_see_wildlife_October23_Credit_BBC_studios.jpg')]"
>
	<img alt="Newspaper Avatar" class="bg-cover rounded-lg" height="140" src={data.newspaper.avatar} width="140" />

	<a class="mt-auto btn btn-square" href="/newspaper/{data.newspaper.id}/edit" role="button">
		<FluentEmojiGear />
	</a>
</div>

<div class="mx-2 mt-2 space-y-4">
	<section class=" space-y-2">
		<b
			class="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] to-[#FF008A] tracking-tighter"
			>{data.newspaper.name}</b
		>
		Established {Intl.DateTimeFormat().format(new Date(data.newspaper.createdAt))}
		<aside>Some description of this newspaper.</aside>

		<a class="flex flex-row w-full gap-2 flinch label-text" href="/user/{data.newspaper.owner.id}" role="button">
			<CircleAvatar src={data.newspaper.owner.avatar} />
			<div>
				<b class="block text-md" id="author_name">{data.newspaper.owner.name}</b>
				<span class=" text-primary">Owner</span>
			</div>
		</a>
	</section>

	<!-- todo: add additional info, lik member list-->

	<h2 class="text-xl font-bold mb-2">Recent Articles</h2>

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
