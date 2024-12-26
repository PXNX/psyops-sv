<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import FluentEmojiGlobeShowingEuropeAfrica from "~icons/fluent-emoji/globe-showing-europe-africa";
</script>

<div class="max-w-md flex-col space-y-4 flex justify-center items-center text-center">
	<FluentEmojiGlobeShowingEuropeAfrica class="size-12" />
	<h3 class="text-2xl font-bold">Regions</h3>
	<p>
		Newspapers allow you to share events and your views with the community in a more uniform way. You can also ask other
		users to become a journalist for a newspaper they own.
	</p>
	<a class="btn btn-primary" href="/newspaper/create" role="button"> Get started </a>
</div>
