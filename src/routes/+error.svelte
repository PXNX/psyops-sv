<script lang="ts">
	import { page } from "$app/state";

	import FluentEmojiEyes from "~icons/fluent-emoji/eyes";
	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face";
	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import { error } from "@sveltejs/kit";
	import { PUBLIC_TELEGRAM_BOT_USERNAME } from "$app/env/public";
	import Button from "#lib/component/ui/Button.svelte";

	const botUsername = PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot";
</script>

<main class="flex flex-col items-center justify-center min-h-dvh p-4 text-center">
	<div
		class="panel rounded-sm flex flex-col items-center justify-center gap-1 p-6 w-full max-w-md text-center place-self-center"
	>
		{#if page.status === 404}
			<FluentEmojiEyes class="w-12 h-12" />
			<h1 class="mt-2 text-xl font-semibold text-red-300">Not found</h1>
			<p class="mt-1 text-sm text-[#d9ccb7]">
				The page <code class="px-1.5 py-0.5 rounded-sm bg-[#102239] border border-[#dfceb0]/15 font-mono text-[#e5d8c1]"
					>{page.url.pathname}</code
				> does not exist.
			</p>
		{:else if page.status === 403}
			<FluentEmojiEyes class="w-12 h-12" />
			<h1 class="mt-2 text-xl font-semibold text-red-300">Access denied</h1>
			<p class="mt-1 text-sm text-[#d9ccb7]">
				{page.error?.message || "You don't have permission to access this page."}
			</p>
		{:else if page.status === 500}
			<FluentEmojiKnockedOutFace class="w-12 h-12" />

			<h1 class="text-xl font-semibold text-red-300">Internal Error</h1>
			<p class="text-sm text-[#d9ccb7]">
				Something unexpected happened when trying to access <code
					class="px-1.5 py-0.5 rounded-sm bg-[#102239] border border-[#dfceb0]/15 font-mono text-[#e5d8c1]"
					>{page.url.pathname}</code
				>.
			</p>
			{#if page.error?.requestId}
				<div class="mt-4 p-3 panel-muted rounded-sm">
					<p class="text-xs text-[#c7bda9] font-mono">
						Request ID: <span class="text-[#d9ccb7] font-semibold">{page.error.requestId}</span>
					</p>
					<p class="text-xs text-[#a89e8e] mt-2">Please provide this ID when reporting the issue.</p>
				</div>
			{/if}
		{:else}
			<FluentEmojiKnockedOutFace class="w-12 h-12" />
			<h1 class="mt-2 text-xl font-semibold text-red-300">Error {page.status}</h1>
			<p class="mt-1 text-sm text-[#d9ccb7]">
				{page.error?.message || "Something went wrong while loading this page."}
			</p>
		{/if}

		<Button
			href={`https://t.me/${botUsername}`}
			variant="secondary"
			icon={FluentEmojiEnvelopeWithArrow}
			class="mt-4 btn-wide">Report error</Button
		>
	</div>

	<Button variant="ghost" icon={FluentEmojiLeftArrow} onclick={() => history.back()} class="mt-4 btn-wide"
		>Go back</Button
	>
</main>

{JSON.stringify(page.error)}
