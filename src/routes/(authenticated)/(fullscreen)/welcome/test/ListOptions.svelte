<script lang="ts">
	import FormatListBulleted from "~icons/mdi/format-list-bulleted";
	import FormatListNumbered from "~icons/mdi/format-list-numbered";
	import FormatIndentIncrease from "~icons/mdi/format-indent-increase";
	import FormatIndentDecrease from "~icons/mdi/format-indent-decrease";
	import MdiClose from "~icons/mdi/close";

	const { editor, onClose } = $props();

	// Derived store for list formatting states
	const isListActive = $derived({
		bullet: editor?.isActive("bulletList"),
		ordered: editor?.isActive("orderedList")
	});

	// List formatting actions
	const listFormatting = {
		toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
		toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
		sinkListItem: () => editor.chain().focus().sinkListItem().run(),
		liftListItem: () => editor.chain().focus().liftListItem().run()
	};
</script>

<div class="flex justify-center w-full">
	<!-- Bullet List Button -->
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isListActive.bullet}
		onclick={listFormatting.toggleBulletList}
		aria-label="Bullet List"
	>
		<FormatListBulleted />
	</button>

	<!-- Numbered List Button -->
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isListActive.ordered}
		onclick={listFormatting.toggleOrderedList}
		aria-label="Numbered List"
	>
		<FormatListNumbered />
	</button>

	<!-- Indent Button -->
	<button class="btn btn-square btn-ghost" onclick={listFormatting.sinkListItem} aria-label="Indent">
		<FormatIndentIncrease />
	</button>

	<!-- Outdent Button -->
	<button class="btn btn-square btn-ghost" onclick={listFormatting.liftListItem} aria-label="Outdent">
		<FormatIndentDecrease />
	</button>

	<!-- Close Button -->
	<button class="ms-auto btn btn-sm btn-square btn-ghost" onclick={onClose} aria-label="Close">
		<MdiClose />
	</button>
</div>
