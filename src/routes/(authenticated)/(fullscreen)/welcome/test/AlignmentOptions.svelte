<script lang="ts">
	import FormatAlignLeft from "~icons/mdi/format-align-left";
	import FormatAlignCenter from "~icons/mdi/format-align-center";
	import FormatAlignRight from "~icons/mdi/format-align-right";
	import FormatAlignJustify from "~icons/mdi/format-align-justify";
	import MdiClose from "~icons/mdi/close";

	const { editor, onClose } = $props();

	const isAlignmentActive = $derived({
		left: editor?.isActive({ textAlign: "left" }),
		center: editor?.isActive({ textAlign: "center" }),
		right: editor?.isActive({ textAlign: "right" }),
		justify: editor?.isActive({ textAlign: "justify" })
	});

	const alignmentActions = {
		alignLeft: () => editor.chain().focus().setTextAlign("left").run(),
		alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
		alignRight: () => editor.chain().focus().setTextAlign("right").run(),
		alignJustify: () => editor.chain().focus().setTextAlign("justify").run()
	};
</script>

<div class="flex justify-center w-full">
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isAlignmentActive.left}
		onclick={alignmentActions.alignLeft}
		aria-label="Align Left"
	>
		<FormatAlignLeft />
	</button>
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isAlignmentActive.center}
		onclick={alignmentActions.alignCenter}
		aria-label="Align Center"
	>
		<FormatAlignCenter />
	</button>
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isAlignmentActive.right}
		onclick={alignmentActions.alignRight}
		aria-label="Align Right"
	>
		<FormatAlignRight />
	</button>
	<button
		class="btn btn-square btn-ghost"
		class:text-primary={isAlignmentActive.justify}
		onclick={alignmentActions.alignJustify}
		aria-label="Align Justify"
	>
		<FormatAlignJustify />
	</button>

	<button class="ms-auto btn btn-sm btn-square btn-ghost" onclick={onClose} aria-label="Close">
		<MdiClose />
	</button>
</div>
