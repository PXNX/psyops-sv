<script lang="ts">
	import { writable } from "svelte/store";

	export let editor;

	// Alignment actions
	const alignmentActions = {
		alignLeft: () => editor.chain().focus().setTextAlign("left").run(),
		alignCenter: () => editor.chain().focus().setTextAlign("center").run(),
		alignRight: () => editor.chain().focus().setTextAlign("right").run(),
		alignJustify: () => editor.chain().focus().setTextAlign("justify").run()
	};

	// Check active alignment state
	const isAlignmentActive = writable({
		left: false,
		center: false,
		right: false,
		justify: false
	});

	$: if (editor) {
		isAlignmentActive.set({
			left: editor.isActive({ textAlign: "left" }),
			center: editor.isActive({ textAlign: "center" }),
			right: editor.isActive({ textAlign: "right" }),
			justify: editor.isActive({ textAlign: "justify" })
		});
	}
</script>

<div class="join">
	<button
		class="btn btn-sm join-item"
		class:btn-primary={$isAlignmentActive.left}
		onclick={alignmentActions.alignLeft}
		aria-label="Align Left"
	>
		Align Left
	</button>
	<button
		class="btn btn-sm join-item"
		class:btn-primary={$isAlignmentActive.center}
		onclick={alignmentActions.alignCenter}
		aria-label="Align Center"
	>
		Align Center
	</button>
	<button
		class="btn btn-sm join-item"
		class:btn-primary={$isAlignmentActive.right}
		onclick={alignmentActions.alignRight}
		aria-label="Align Right"
	>
		Align Right
	</button>
	<button
		class="btn btn-sm join-item"
		class:btn-primary={$isAlignmentActive.justify}
		onclick={alignmentActions.alignJustify}
		aria-label="Align Justify"
	>
		Align Justify
	</button>
</div>
