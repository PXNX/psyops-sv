<script lang="ts">
	import FormatListBulleted from "~icons/mdi/format-list-bulleted";
	import FormatListNumbered from "~icons/mdi/format-list-numbered";
	import FormatIndentIncrease from "~icons/mdi/format-indent-increase";
	import FormatIndentDecrease from "~icons/mdi/format-indent-decrease";
	import type { Editor } from "svelte-tiptap";

	const { editor }: { editor: Editor } = $props();

	const isListActive = $derived({
		bullet: editor?.isActive("bulletList"),
		ordered: editor?.isActive("orderedList")
	});

	const isListEnabled = $derived({
		sink: editor.can().sinkListItem("listItem"),
		lift: editor.can().liftListItem("listItem")
	});

	// List formatting actions
	const listFormatting = {
		toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
		toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
		sinkListItem: () => editor.chain().focus().sinkListItem("listItem").run(),
		liftListItem: () => editor.chain().focus().liftListItem("listItem").run()
	};
</script>

<button
	class="btn btn-circle btn-ghost"
	class:text-primary={isListActive.bullet}
	onclick={listFormatting.toggleBulletList}
	aria-label="Bullet List"
>
	<FormatListBulleted />
</button>

<button
	class="btn btn-circle btn-ghost"
	class:text-primary={isListActive.ordered}
	onclick={listFormatting.toggleOrderedList}
	aria-label="Numbered List"
>
	<FormatListNumbered />
</button>

<button
	class="btn btn-circle btn-ghost"
	onclick={listFormatting.sinkListItem}
	disabled={!isListEnabled.sink}
	aria-label="Indent"
>
	<FormatIndentIncrease />
</button>

<button
	class="btn btn-circle btn-ghost"
	onclick={listFormatting.liftListItem}
	disabled={!isListEnabled.lift}
	aria-label="Outdent"
>
	<FormatIndentDecrease />
</button>
