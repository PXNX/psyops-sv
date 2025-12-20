<script lang="ts">
	import { page } from "$app/state";

	import FluentEmojiEyes from "~icons/fluent-emoji/eyes";
	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face";
	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import { error } from "@sveltejs/kit";
</script>

<main class="flex flex-col items-center justify-center h-full p-4 text-center">
	<div
		class="flex flex-col items-center justify-center gap-1 p-4 text-center border rounded-lg border-fuchsia-900 place-self-center"
	>
		{#if page.status === 404}
			<FluentEmojiEyes class="w-12 h-12" />
			<h1 class="mt-2 text-xl font-semibold text-error">Not found</h1>
			<p class="mt-1 text-base-content">
				The page <code class="p-1 rounded bg-neutral text-neutral-content">{page.url.pathname}</code> does not exist.
			</p>
		{:else if page.status === 500}
			<FluentEmojiKnockedOutFace class="w-12 h-12" />

			<h1 class="text-xl font-semibold text-error">Internal Error</h1>
			<p class=" text-base-content">
				Something unexpected happened when trying to access <code class="p-1 rounded bg-neutral text-neutral-content"
					>{page.url.pathname}</code
				>.
			</p>
		{:else}
			<p>what the fuck</p>
		{/if}

		<a href="https://t.me/pentexnyx_bot?start=TEST" class="mt-4 btn btn-md btn-wide">
			<FluentEmojiEnvelopeWithArrow />Report error</a
		>
	</div>

	<button onclick={() => history.back()} class="mt-4 btn btn-md btn-wide btn-ghost">
		<FluentEmojiLeftArrow />Go back</button
	>
</main>

{JSON.stringify(page.error)}
