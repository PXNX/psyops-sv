<script>
	import { goto } from "$app/navigation";
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import MdiCardsHeartOutline from "~icons/mdi/cards-heart-outline";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";

	import MdiClockTimeEightOutline from "~icons/mdi/clock-time-eight-outline";
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

<ul class="list">
	<a href="/posts/{article.id}">
		<li class="list-row flinch flex items-center">
			<Avatar src={article.author_avatar} />
			<div class="text-sm">
				{article.author_name}
				<h3 class="text-base font-semibold line-clamp-1">{article.title}</h3>
				<p class="text-sm flex flex-row items-center gap-0.5">
					<MdiClockTimeEightOutline class="size-4" />
					{article.publish_date}

					<MdiCardsHeartOutline class="ms-1 size-4" />
					{article.upvote_count}
				</p>
			</div>
			<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
		</li>
	</a>
</ul>
