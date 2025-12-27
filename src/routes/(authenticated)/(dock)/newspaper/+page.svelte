<script lang="ts">
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";

	const { data } = $props();
</script>

{#if data.newspapers.length > 0}
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

	<ul class="list">
		{#each data.newspapers as newspaper}
			{#if newspaper}
				<a href="/newspaper/{newspaper.id}" oncontextmenu={() => false}>
					<li class="list-row flinch">
						<SquareAvatar src={newspaper.avatar} />
						<div>
							<h3 class="block text-lg font-bold tracking-tight transition-all duration-3000" id="title">
								{newspaper.name}
							</h3>
							<span class="block transition-all text-primary">{newspaper.rank}</span>
						</div>
					</li></a
				>
			{/if}
		{/each}
	</ul>
{:else}
	<div class="h-full flex flex-col justify-center items-center">
		<div class="max-w-md flex-col space-y-4 flex justify-center items-center text-center">
			<FluentEmojiRolledUpNewspaper class="size-12 " />
			<h3 class="text-2xl font-bold">You don't work for a newspaper</h3>
			<p>
				Newspapers allow you to share events and your views with the community in a more uniform way. You can also ask
				other users to become a journalist for a newspaper they own.
			</p>
			<a class="btn btn-primary" href="/newspaper/create" role="button"> Get started </a>
		</div>
	</div>
{/if}
