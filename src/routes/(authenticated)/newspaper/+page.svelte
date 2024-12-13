<script lang="ts">
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import { extractId } from "$lib/util";
	const { data } = $props();

	const newspaper = {
		id: 1,
		name: "Newspaper",
		avatar: "https://victorypark.com.ua/wp-content/uploads/2023/04/banner_azov.jpeg",
		rank: 1,
		created_at: "2023-04-01"
	};
</script>

<header class="sticky top-0 bg-base-100">
	<div class="flex p-2 space-x-2">
		<input class="w-full max-w-xs input" placeholder="Search Newspapers..." type="text" />

		<a class="btn btn-square" href="/newspaper/create" role="button">
			<FluentEmojiNewButton />
		</a>
	</div>

	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

{console.log(data)}

{#each data.newspapers as newspaper}
	{#if newspaper}
		<a
			class="flex w-full gap-2 p-2 text-current no-underline flinch label-text"
			href="/newspaper/{newspaper.id}"
			oncontextmenu={() => false}
		>
			<img alt="Newspaper Image" class="rounded-lg" height="56" loading="lazy" src={newspaper.avatar} width="56" />
			<!-- style="aspect-ratio: 100 / 100; object-fit: cover;" -->
			<div>
				<b class="block text-lg font-bold tracking-tight transition-all duration-3000" id="title">{newspaper.name}</b>
				<span class="block transition-all text-primary">{newspaper.rank}</span>
			</div>
		</a>
	{/if}
{/each}

<a
	class="flex w-full gap-2 p-2 text-current no-underline flinch label-text"
	href="/newspaper/{newspaper.id}"
	oncontextmenu={() => false}
>
	<img alt="Newspaper Image" class="rounded-lg" height="56" loading="lazy" src={newspaper.avatar} width="56" />
	<!-- style="aspect-ratio: 100 / 100; object-fit: cover;" -->
	<div>
		<b class="block text-lg font-bold tracking-tight transition-all duration-3000" id="title">{newspaper.name}</b>
		<span class="block transition-all text-primary">{newspaper.rank}</span>
	</div>
</a>
