<script lang="ts">
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
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
