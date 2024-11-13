<script lang="ts">
	import { page } from "$app/stores";
	import Icon from "@iconify/svelte";

	import Eyes from "$lib/assets/eyes.svg";
	import Eyes2 from "$lib/assets/eyes.svg?raw";

	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face?width=1rem&height=1rem";
</script>

<div class="flex flex-col items-center justify-center h-full px-10 text-center">
	{#if $page.status === 404}
		<img src={Eyes} class="w-12 h-12" />

		{@html "scr/lib/assets/eyes.svg"}

		<h1 class="mt-2 text-xl font-semibold text-red-400">Not found!</h1>
		<p class="mt-1 text-base-content">
			The page <code class="p-1 rounded bg-neutral text-neutral-content">{$page.url.pathname}</code> doesn't exist.
		</p>
		<button on:click={() => history.back()} class="mt-5 btn btn-md btn-wide">
			<Icon icon="fluent-emoji:left-arrow" class="w-5 h-5" />Go Back</button
		>
	{:else if $page.status === 500}
		<object data={Eyes} type="image/svg+xml" width="600" height="193" class="bg-transparent" />

		{@html Eyes2}

		<img src={Eyes} class="w-12 h-12" />

		<svg class="icon">
			<use xlink:href={Eyes} href={Eyes} />
		</svg>

		<Icon icon="fluent-emoji:knocked-out-face" class="w-12 h-12" />

		<FluentEmojiKnockedOutFace />

		<h1 class="mt-2 text-xl font-semibold text-red-400">Internal Error!</h1>
		<p class="mt-1 text-base-content">
			Something unexpected happend when trying to access <code class="p-1 rounded bg-neutral text-neutral-content"
				>{$page.url.pathname}</code
			>. Please provide details to the support, so that we can investigate this issue.
		</p>
		<button on:click={() => history.back()} class="mt-4 btn btn-md btn-wide">
			<Icon icon="fluent-emoji:left-arrow" class="w-5 h-5" />Go Back</button
		>
	{:else}
		<p>what the fuck</p>
	{/if}
</div>
