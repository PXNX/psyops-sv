<!-- src/lib/component/press/PostEditor.svelte -->
<!-- The full-screen writing surface shared by /posts/new and /posts/[id]/edit:
     a slim top bar (close, undo/redo, the main action) over the page with
     a serif headline field and the rich-text editor. -->
<script lang="ts">
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import WysiwygEditor from "#lib/component/WysiwygEditor.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import { SCHEMA_LIMITS } from "#lib/config/validation/schema-limits.js";

	interface Props {
		title: string;
		/** HTML the editor starts with (edit mode). */
		initialContent?: string;
		/** Mirrors the editor's HTML on every change. */
		content?: string;
		editor?: WysiwygEditor | null;
		actionLabel: string;
		onAction: () => void;
		onCancel: () => void;
		actionDisabled?: boolean;
		disabled?: boolean;
		titleError?: string | null;
		contentError?: string | null;
	}

	let {
		title = $bindable(),
		initialContent = "",
		content = $bindable(initialContent),
		editor = $bindable(null),
		actionLabel,
		onAction,
		onCancel,
		actionDisabled = false,
		disabled = false,
		titleError = null,
		contentError = null
	}: Props = $props();

	const max = SCHEMA_LIMITS.ARTICLE_TITLE_MAX;
	const left = $derived(max - title.length);
</script>

<div class="min-h-dvh flex flex-col">
	<header class="sticky top-0 z-10 border-b border-white/10 bg-surface-0">
		<div class="mx-auto max-w-3xl px-3 sm:px-6 py-2.5 flex items-center gap-1.5">
			<IconButton icon={FluentDismiss20Filled} label="Close" variant="ghost" onclick={onCancel} {disabled} />
			{#if editor}
				<IconButton
					icon={FluentArrowHookUpLeft20Regular}
					label="Undo"
					variant="ghost"
					onclick={() => editor?.undo()}
					{disabled}
				/>
				<IconButton
					icon={FluentArrowHookUpRight20Regular}
					label="Redo"
					variant="ghost"
					onclick={() => editor?.redo()}
					{disabled}
				/>
			{/if}
			<div class="flex-1"></div>
			<Button variant="primary" icon={FluentSend20Filled} onclick={onAction} disabled={disabled || actionDisabled}>
				{actionLabel}
			</Button>
		</div>
	</header>

	<main class="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
		<textarea
			class="block w-full resize-none overflow-hidden bg-transparent font-serif text-[2rem] sm:text-5xl leading-[1.1] text-fg placeholder:text-fg-muted/45 border-none outline-none [field-sizing:content]"
			placeholder="Headline"
			rows="1"
			maxlength={max}
			aria-label="Headline"
			bind:value={title}
			onkeydown={(e) => e.key === "Enter" && e.preventDefault()}
			oninput={() => (title = title.replace(/\s*\n\s*/g, " "))}
			{disabled}></textarea>
		<div class="mt-2 flex items-center gap-3 text-xs">
			{#if titleError}
				<span class="text-red-400">{titleError}</span>
			{/if}
			<span class="ml-auto font-mono {left <= 5 ? 'text-primary-fg' : 'text-fg-muted'}">{title.length}/{max}</span>
		</div>

		<div class="mt-6 min-h-[50vh]">
			<WysiwygEditor
				bind:this={editor}
				{initialContent}
				placeholder="Tell the story…"
				onContentChange={(html) => (content = html)}
			/>
		</div>
		{#if contentError}
			<p class="field-error mt-3">{contentError}</p>
		{/if}
	</main>
</div>
