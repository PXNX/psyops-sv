<script lang="ts">
	import { createEditor, Editor, EditorContent, BubbleMenu } from "svelte-tiptap";
	import Document from "@tiptap/extension-document";
	import Paragraph from "@tiptap/extension-paragraph";
	import Text from "@tiptap/extension-text";
	import TextStyle from "@tiptap/extension-text-style";
	import BulletList from "@tiptap/extension-bullet-list";
	import OrderedList from "@tiptap/extension-ordered-list";
	import ListItem from "@tiptap/extension-list-item";
	import Gapcursor from "@tiptap/extension-gapcursor";
	import Table from "@tiptap/extension-table";
	import TableCell from "@tiptap/extension-table-cell";
	import TableHeader from "@tiptap/extension-table-header";
	import TableRow from "@tiptap/extension-table-row";
	import Bold from "@tiptap/extension-bold";
	import Italic from "@tiptap/extension-italic";
	import Strike from "@tiptap/extension-strike";
	import TextAlign from "@tiptap/extension-text-align";
	import Link from "@tiptap/extension-link";
	import Image from "@tiptap/extension-image";
	import { onMount } from "svelte";
	import type { Readable } from "svelte/store";

	import MdiLinkPlus from "~icons/mdi/link-plus";
	import MdiImagePlus from "~icons/mdi/image-plus";
	import MdiTablePlus from "~icons/mdi/table-plus";
	import MdiFormatClear from "~icons/mdi/format-clear";
	import AlignmentOptions from "./AlignmentOptions.svelte";
	import ListOptions from "./ListOptions.svelte";
	import FormattingOptions from "./FormattingOptions.svelte";
	import Placeholder from "@tiptap/extension-placeholder";
	import StarterKit from "@tiptap/starter-kit";
	import Typography from "@tiptap/extension-typography";
	import { fade } from "svelte/transition";

	let editor = $state() as Readable<Editor>;
	let linkUrl = $state("");
	let imageUrl = $state("");
	let showLinkInput = $state(false);
	let showImageInput = $state(false);
	let isTableActive = $state(false);

	onMount(() => {
		editor = createEditor({
			extensions: [
				Document,
				Paragraph,
				Text,
				TextStyle,
				Bold,
				Italic,
				Strike,
				Link.configure({
					openOnClick: true,
					linkOnPaste: true
				}),
				Image.configure({
					inline: true,
					allowBase64: true
				}),
				TextAlign.configure({
					types: ["paragraph", "heading"]
				}),
				StarterKit,
				ListItem,

				Table.configure({
					resizable: true
				}),
				TableCell,
				TableHeader,
				TableRow,
				Typography,
				Placeholder.configure({
					// Use a placeholder:
					placeholder: "Write something …"
				})
			],
			content: "<p>Welcome to the editor! Try selecting some text...</p>",
			onTransaction(props) {
				isTableActive = props.editor.state.selection.$anchor.parent.type.name === "tableCell";
			},
			editorProps: {
				attributes: {
					class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-4 focus:outline-none"
				}
			}
		});
	});

	$effect(() => {
		return () => {
			$editor?.destroy();
		};
	});

	// Link handlers
	function setLink() {
		if (linkUrl) {
			$editor.chain().focus().setLink({ href: linkUrl }).run();
			linkUrl = "";
			showLinkInput = false;
		}
	}

	// Image handlers
	function addImage() {
		if (imageUrl) {
			$editor.chain().focus().setImage({ src: imageUrl }).run();
			imageUrl = "";
			showImageInput = false;
		}
	}

	let showAlignmentOptions = $state(false);
	let showListOptions = $state(false);

	// Table handlers
	const tableActions = {
		insertTable: () => $editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
		addColumnBefore: () => $editor.chain().focus().addColumnBefore().run(),
		addColumnAfter: () => $editor.chain().focus().addColumnAfter().run(),
		deleteColumn: () => $editor.chain().focus().deleteColumn().run(),
		addRowBefore: () => $editor.chain().focus().addRowBefore().run(),
		addRowAfter: () => $editor.chain().focus().addRowAfter().run(),
		deleteRow: () => $editor.chain().focus().deleteRow().run(),
		deleteTable: () => $editor.chain().focus().deleteTable().run()
	};
</script>

{#if $editor}
	<BubbleMenu
		tippyOptions={{ duration: 100 }}
		editor={$editor}
		class="flex flex-wrap gap-1 p-1 rounded-lg bg-base-200 shadow-lg"
	>
		<FormattingOptions editor={$editor} />

		<button
			class="btn btn-square btn-ghost"
			class:bg-primary={showListOptions}
			onclick={() => (showListOptions = !showListOptions)}
			aria-label="List Options">List</button
		>

		<button
			class="btn btn-square btn-ghost"
			class:bg-primary={showAlignmentOptions}
			onclick={() => (showAlignmentOptions = !showAlignmentOptions)}
			aria-label="Alignment Options">Align</button
		>

		<button class="btn btn-square btn-ghost" onclick={() => (showLinkInput = !showLinkInput)} aria-label="Add Link">
			<MdiLinkPlus />
		</button>
		<button class="btn btn-square btn-ghost" onclick={() => (showImageInput = !showImageInput)} aria-label="Add Image">
			<MdiImagePlus />
		</button>
		<button class="btn btn-square btn-ghost" onclick={tableActions.insertTable} aria-label="Add Table">
			<MdiTablePlus />
		</button>

		<div class="flex justify-center bg-slate-800 rounded-full">
			{#if showListOptions}
				<ListOptions editor={$editor} />
				<hr class="w-1 h-full border-t-2 border-slate-700" />
			{/if}

			{#if showAlignmentOptions}
				<AlignmentOptions editor={$editor} />
			{/if}
		</div>

		<!-- Link Input -->
		{#if showLinkInput}
			<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
				<input type="url" bind:value={linkUrl} placeholder="Enter URL" class="input input-bordered input-sm" />
				<button class="btn btn-square btn-ghost" onclick={setLink}>Add</button>
			</div>
		{/if}

		<!-- Image Input -->
		{#if showImageInput}
			<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
				<input type="url" bind:value={imageUrl} placeholder="Enter Image URL" class="input input-bordered input-sm" />
				<button class="btn btn-square btn-ghost" onclick={addImage}>Add</button>
			</div>
		{/if}

		<!-- Table Actions -->
		{#if isTableActive}
			<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
				<ul class="menu">
					<li><button onclick={tableActions.addColumnBefore}>Add Column Before</button></li>
					<li><button onclick={tableActions.addColumnAfter}>Add Column After</button></li>
					<li><button onclick={tableActions.deleteColumn}>Delete Column</button></li>
					<li><button onclick={tableActions.addRowBefore}>Add Row Before</button></li>
					<li><button onclick={tableActions.addRowAfter}>Add Row After</button></li>
					<li><button onclick={tableActions.deleteRow}>Delete Row</button></li>
					<li><button onclick={tableActions.deleteTable}>Delete Table</button></li>
				</ul>
			</div>
		{/if}

		<button
			class="btn btn-square btn-ghost"
			onclick={() => $editor.chain().focus().unsetAllMarks().run()}
			aria-label="Clear Format"><MdiFormatClear /></button
		>
	</BubbleMenu>
	<EditorContent editor={$editor} class="prose max-w-none p-4" />
{/if}

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 200px;
	}
	:global(.ProseMirror table) {
		border-collapse: collapse;
		margin: 0;
		/*overflow: hidden; */
		table-layout: fixed;
		width: 100%;
	}
	:global(.ProseMirror td),
	:global(.ProseMirror th) {
		border: 4px solid hsl(var(--bc) / 0.2);
		box-sizing: border-box;
		min-width: 1em;
		padding: 3px 5px;
		position: relative;
		vertical-align: top;
	}
	:global(.ProseMirror th) {
		background-color: hsl(var(--b2));
		font-weight: bold;
	}
	:global(.ProseMirror ul),
	:global(.ProseMirror ol) {
		padding-left: 1.5rem;
	}
</style>
