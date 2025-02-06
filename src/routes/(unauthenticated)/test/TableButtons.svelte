<script>
	import { Editor } from "@tiptap/core";
	import { mergeTableCells, splitTableCell } from "@tiptap/pm/commands";

	/** @type {Editor} */
	export let editor;

	function canMergeCells() {
		const { state } = editor;
		const { selection } = state;
		return selection.ranges.length > 1;
	}

	function handleMergeCells() {
		editor
			.chain()
			.focus()
			.command(({ tr, dispatch }) => {
				if (dispatch) return mergeTableCells(tr);
				return true;
			})
			.run();
	}

	function handleSplitCell() {
		editor
			.chain()
			.focus()
			.command(({ tr, dispatch }) => {
				if (dispatch) return splitTableCell(tr);
				return true;
			})
			.run();
	}
</script>

<div class="table-controls">
	<button on:click={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.can().addColumnBefore()}>
		Add Column Before
	</button>

	<button on:click={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>
		Add Column After
	</button>

	<button on:click={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.can().deleteColumn()}>
		Delete Column
	</button>

	<button on:click={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.can().addRowBefore()}>
		Add Row Before
	</button>

	<button on:click={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>
		Add Row After
	</button>

	<button on:click={() => editor.chain().focus().deleteRow().run()} disabled={!editor.can().deleteRow()}>
		Delete Row
	</button>

	<button on:click={handleMergeCells} disabled={!canMergeCells()}> Merge Cells </button>

	<button on:click={handleSplitCell} disabled={!editor.can().splitCell()}> Split Cell </button>
</div>

<style>
	.table-controls {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f5f5f5;
		border-bottom: 1px solid #ddd;
	}

	button {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
