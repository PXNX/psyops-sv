<script lang="ts">
	import FormatBold from "~icons/mdi/format-bold";
	import FormatItalic from "~icons/mdi/format-italic";
	import FormatStrikethrough from "~icons/mdi/format-strikethrough";
	import { Editor } from "svelte-tiptap";
	import type { Readable } from "svelte/store";

	const { editor }: { editor: Editor } = $props();

	const textFormatting = {
		toggleBold: () => editor.chain().focus().toggleBold().run(),
		toggleItalic: () => editor.chain().focus().toggleItalic().run(),
		toggleStrike: () => editor.chain().focus().toggleStrike().run()
	};

	const isFormattingActive = $derived({
		bold: editor?.isActive("bold"),
		italic: editor?.isActive("italic"),
		strike: editor?.isActive("strike")
	});
</script>

<button
	class="btn btn-square btn-ghost"
	onclick={textFormatting.toggleBold}
	class:text-primary={isFormattingActive.bold}
	aria-label="Bold"
>
	<FormatBold />
</button>
<button
	class="btn btn-square btn-ghost"
	onclick={textFormatting.toggleItalic}
	class:text-primary={isFormattingActive.italic}
	aria-label="Italic"
>
	<FormatItalic />
</button>
<button
	class="btn btn-square btn-ghost"
	onclick={textFormatting.toggleStrike}
	class:text-primary={isFormattingActive.strike}
	aria-label="Strike"
>
	<FormatStrikethrough />
</button>
