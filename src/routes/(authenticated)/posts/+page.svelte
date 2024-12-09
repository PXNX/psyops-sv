<script>
	import { goto } from "$app/navigation";
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import Avatar from "$lib/component/CircleAvatar.svelte";

	const article = {
		id: 1,
		author_name: "John Doe",
		author_avatar: "https://placehold.co/48/svg",
		title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
		publish_date: "2023-01-01",
		upvote_count: 10
	};
</script>

<header class="sticky top-0 bg-base-100">
	<div class="flex p-2 space-x-2">
		<button onclick={() => goto("/posts/new")} class="flinch">
			<FluentEmojiNewButton />
		</button>
		<input class="w-full max-w-xs input" placeholder="Search Posts..." type="text" />

		<button onclick={() => goto("/newspaper")} class="flinch">
			<FluentEmojiRolledUpNewspaper />
		</button>
	</div>

	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

<a
	class="flex items-center w-full gap-1 p-2 text-current no-underline rounded-lg flinch label-text"
	href="/posts/{article.id}"
>
	<!-- hx-get="/article/{{article.id }}"-->

	<Avatar image_url={article.author_avatar} />

	<div class="flex flex-col flex-grow text-xs text-gray-600">
		<span class="font-semibold text-primary" id="article_title">{article.author_name}</span>
		<span class="text-lg font-bold text-white transition">{article.title}</span>
		{article.publish_date} // {article.upvote_count} Likes
	</div>
</a>
