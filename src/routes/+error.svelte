<script lang="ts">
	import { page } from "$app/state";

	import FluentEmojiEyes from "~icons/fluent-emoji/eyes";
	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face";
	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import { error } from "@sveltejs/kit";
	import { env } from "$env/dynamic/public";

	const botUsername = env.PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot";
</script>

<main class="flex flex-col items-center justify-center min-h-dvh p-4 text-center">
	<div
		class="flex flex-col items-center justify-center gap-1 p-4 text-center border rounded-lg border-fuchsia-900 place-self-center"
	>
			{#if page.status === 404}
				<FluentEmojiEyes class="w-12 h-12" />
				<h1 class="mt-2 text-xl font-semibold text-error">Not found</h1>
				<p class="mt-1 text-base-content">
					The page <code class="p-1 rounded bg-neutral text-neutral-content">{page.url.pathname}</code> does not exist.
				</p>
			{:else if page.status === 403}
				<FluentEmojiEyes class="w-12 h-12" />
				<h1 class="mt-2 text-xl font-semibold text-error">Access denied</h1>
				<p class="mt-1 text-base-content">
					{page.error?.message || "You don't have permission to access this page."}
				</p>
			{:else if page.status === 500}
				<FluentEmojiKnockedOutFace class="w-12 h-12" />

				<h1 class="text-xl font-semibold text-error">Internal Error</h1>
				<p class=" text-base-content">
					Something unexpected happened when trying to access <code class="p-1 rounded bg-neutral text-neutral-content"
						>{page.url.pathname}</code
					>.
				</p>
				{#if page.error?.requestId}
					<div class="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
						<p class="text-xs text-gray-400 font-mono">Request ID: <span class="text-gray-300 font-semibold">{page.error.requestId}</span></p>
						<p class="text-xs text-gray-500 mt-2">Please provide this ID when reporting the issue.</p>
					</div>
				{/if}
			{:else}
				<FluentEmojiKnockedOutFace class="w-12 h-12" />
				<h1 class="mt-2 text-xl font-semibold text-error">Error {page.status}</h1>
				<p class="mt-1 text-base-content">
					{page.error?.message || "Something went wrong while loading this page."}
				</p>
			{/if}

		<a href={`https://t.me/${botUsername}`} class="mt-4 btn btn-md btn-wide">
			<FluentEmojiEnvelopeWithArrow />Report error</a
		>
	</div>

	<button onclick={() => history.back()} class="mt-4 btn btn-md btn-wide btn-ghost">
		<FluentEmojiLeftArrow />Go back</button
	>
</main>

{JSON.stringify(page.error)}
