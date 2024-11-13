<script lang="ts">
	import { page } from "$app/stores";
	import Icon from "@iconify/svelte";

	// import Eyes from "$lib/assets/eyes.svg";

	import FluentEmojiEyes from "~icons/fluent-emoji/eyes";
	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face";
	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
</script>

<main class="flex flex-col items-center justify-center h-full px-5 text-center">
	<div
		class="flex flex-col items-center justify-center gap-1 px-5 text-center rounded-md bg-slate-700 place-self-center [border-image:linear-gradient(to_right,#83C59B,#FCF09A,red,purple,#71CAEE)_1] border-4"
	>
		{#if $page.status === 404}
			<FluentEmojiEyes class="w-12 h-12" />
			<h1 class="mt-2 text-xl font-semibold text-red-400">Not found</h1>
			<p class="mt-1 text-base-content">
				The page <code class="p-1 rounded bg-neutral text-neutral-content">{$page.url.pathname}</code> doesn't seem to exist.
			</p>
		{:else if $page.status === 500}
			<FluentEmojiKnockedOutFace class="w-12 h-12" />

			<h1 class="text-xl font-semibold text-red-400">Internal Error</h1>
			<p class=" text-base-content">
				Something unexpected happened when trying to access <code class="p-1 rounded bg-neutral text-neutral-content"
					>{$page.url.pathname}</code
				>.
			</p>
		{:else}
			<p>what the fuck</p>
		{/if}

		<p class="mt-5">Please provide details to the support, so that we can investigate this issue.</p>
		<a href="https://t.me/pentexnyx_bot?start=TEST" class=" btn btn-md btn-wide btn-ghost">
			<FluentEmojiEnvelopeWithArrow />Contact Support</a
		>

		<button on:click={() => history.back()} class=" btn btn-md btn-wide"> <FluentEmojiLeftArrow />Go Back</button>
	</div>
</main>
