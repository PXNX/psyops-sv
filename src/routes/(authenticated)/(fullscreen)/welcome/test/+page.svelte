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

	// MDI Icons
	import FormatBold from "~icons/mdi/format-bold";
	import FormatItalic from "~icons/mdi/format-italic";
	import FormatStrikethrough from "~icons/mdi/format-strikethrough";
	import FormatListBulleted from "~icons/mdi/format-list-bulleted";
	import FormatListNumbered from "~icons/mdi/format-list-numbered";
	import FormatAlignLeft from "~icons/mdi/format-align-left";
	import FormatAlignCenter from "~icons/mdi/format-align-center";
	import FormatAlignRight from "~icons/mdi/format-align-right";
	import FormatAlignJustify from "~icons/mdi/format-align-justify";
	import FormatIndentIncrease from "~icons/mdi/format-indent-increase";
	import FormatIndentDecrease from "~icons/mdi/format-indent-decrease";

	import MdiLinkPlus from "~icons/mdi/link-plus";
	import MdiImagePlus from "~icons/mdi/image-plus";
	import MdiTablePlus from "~icons/mdi/table-plus";

	let editor = $state() as Readable<Editor>;
	let linkUrl = $state("");
	let imageUrl = $state("");
	let showLinkInput = $state(false);
	let showImageInput = $state(false);
	let isTableActive = false;

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
				BulletList,
				OrderedList,
				ListItem,
				Gapcursor,
				Table.configure({
					resizable: true
				}),
				TableCell,
				TableHeader,
				TableRow
			],
			content: "<p>Welcome to the editor! Try selecting some text...</p>",
			onTransaction(props) {
				isTableActive = props.editor.state.selection.$anchor.parent.type.name === "tableCell";
			}
		});
	});

	$effect(() => {
		return () => {
			$editor?.destroy();
		};
	});

	// Text formatting handlers
	const textFormatting = {
		toggleBold: () => $editor.chain().focus().toggleBold().run(),
		toggleItalic: () => $editor.chain().focus().toggleItalic().run(),
		toggleStrike: () => $editor.chain().focus().toggleStrike().run()
	};

	// List formatting handlers
	const listFormatting = {
		toggleBulletList: () => $editor.chain().focus().toggleBulletList().run(),
		toggleOrderedList: () => $editor.chain().focus().toggleOrderedList().run(),
		sinkListItem: () => $editor.chain().focus().sinkListItem("listItem").run(),
		liftListItem: () => $editor.chain().focus().liftListItem("listItem").run()
	};

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

	// Table handlers
	const tableActions = {
		insertTable: () => $editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
		addColumnBefore: () => $editor.chain().focus().addColumnBefore().run(),
		addColumnAfter: () => $editor.chain().focus().addColumnAfter().run(),
		deleteColumn: () => $editor.chain().focus().deleteColumn().run(),
		addRowBefore: () => $editor.chain().focus().addRowBefore().run(),
		addRowAfter: () => $editor.chain().focus().addRowAfter().run(),
		deleteRow: () => $editor.chain().focus().deleteRow().run(),
		deleteTable: () => $editor.chain().focus().deleteTable().run()
	};

	// Alignment handlers
	const alignmentActions = {
		alignLeft: () => $editor.chain().focus().setTextAlign("left").run(),
		alignCenter: () => $editor.chain().focus().setTextAlign("center").run(),
		alignRight: () => $editor.chain().focus().setTextAlign("right").run(),
		alignJustify: () => $editor.chain().focus().setTextAlign("justify").run()
	};

	let isListActive = {
		bullet: $editor?.isActive("bulletList") ?? false,
		ordered: $editor?.isActive("orderedList") ?? false
	};

	let isAlignmentActive = {
		left: $editor?.isActive({ textAlign: "left" }) ?? false,
		center: $editor?.isActive({ textAlign: "center" }) ?? false,
		right: $editor?.isActive({ textAlign: "right" }) ?? false,
		justify: $editor?.isActive({ textAlign: "justify" }) ?? false
	};
</script>

<div class="w-full max-w-4xl mx-auto p-4">
	<div class="relative border rounded-lg">
		{#if $editor}
			<BubbleMenu tippyOptions={{ duration: 100 }} editor={$editor}>
				<div class="flex flex-wrap gap-2 p-2 rounded-lg bg-base-200 shadow-lg">
					<!-- Group: Text Formatting -->
					<div>
						<button class="btn btn-sm" onclick={textFormatting.toggleBold} aria-label="Bold">
							<FormatBold />
						</button>
						<button class="btn btn-sm" onclick={textFormatting.toggleItalic} aria-label="Italic">
							<FormatItalic />
						</button>
						<button class="btn btn-sm" onclick={textFormatting.toggleStrike} aria-label="Strike">
							<FormatStrikethrough />
						</button>
					</div>

					<!-- Group: List and Indentation -->
					<div class="dropdown dropdown-hover">
						<button class="btn btn-sm" aria-label="Alignment Options"> List </button>
						<ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
							<li>
								<button
									class="btn btn-sm join-item"
									class:btn-primary={isListActive.bullet}
									onclick={listFormatting.toggleBulletList}
									aria-label="Bullet List"
								>
									<FormatListBulleted />
								</button>
							</li>
							<li>
								<button
									class="btn btn-sm join-item"
									class:btn-primary={isListActive.ordered}
									onclick={listFormatting.toggleOrderedList}
									aria-label="Numbered List"
								>
									<FormatListNumbered />
								</button>
							</li>
							<li>
								<button class="btn btn-sm join-item" onclick={listFormatting.sinkListItem} aria-label="Indent">
									<FormatIndentIncrease />
								</button>
							</li>
							<li>
								<button class="btn btn-sm join-item" onclick={listFormatting.liftListItem} aria-label="Outdent">
									<FormatIndentDecrease />
								</button>
							</li>
						</ul>
					</div>

					<!-- Group: Alignment -->
					<div class="dropdown dropdown-hover">
						<button class="btn btn-sm" aria-label="Alignment Options"> Alignment </button>
						<ul class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
							<li>
								<button class="btn-sm" class:btn-primary={isAlignmentActive.left} onclick={alignmentActions.alignLeft}
									>Align Left</button
								>
							</li>
							<li>
								<button
									class="btn-sm"
									class:btn-primary={isAlignmentActive.center}
									onclick={alignmentActions.alignCenter}>Align Center</button
								>
							</li>
							<li>
								<button class="btn-sm" class:btn-primary={isAlignmentActive.right} onclick={alignmentActions.alignRight}
									>Align Right</button
								>
							</li>
							<li>
								<button
									class="btn-sm"
									class:btn-primary={isAlignmentActive.justify}
									onclick={alignmentActions.alignJustify}>Align Justify</button
								>
							</li>
						</ul>
					</div>

					<!-- Group: Insert Items -->
					<div>
						<button class="btn btn-sm" onclick={() => (showLinkInput = !showLinkInput)} aria-label="Add Link">
							<MdiLinkPlus />
						</button>
						<button class="btn btn-sm" onclick={() => (showImageInput = !showImageInput)} aria-label="Add Image">
							<MdiImagePlus />
						</button>
						<button class="btn btn-sm" onclick={tableActions.insertTable} aria-label="Add Table">
							<MdiTablePlus />
						</button>
					</div>
				</div>

				<!-- Link Input -->
				{#if showLinkInput}
					<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
						<input type="url" bind:value={linkUrl} placeholder="Enter URL" class="input input-bordered input-sm" />
						<button class="btn btn-sm" onclick={setLink}>Add</button>
					</div>
				{/if}

				<!-- Image Input -->
				{#if showImageInput}
					<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
						<input
							type="url"
							bind:value={imageUrl}
							placeholder="Enter Image URL"
							class="input input-bordered input-sm"
						/>
						<button class="btn btn-sm" onclick={addImage}>Add</button>
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
			</BubbleMenu>
			<EditorContent editor={$editor} class="prose max-w-none p-4" />
		{/if}
	</div>
</div>

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 200px;
	}
	:global(.ProseMirror table) {
		border-collapse: collapse;
		margin: 0;
		overflow: hidden;
		table-layout: fixed;
		width: 100%;
	}
	:global(.ProseMirror td),
	:global(.ProseMirror th) {
		border: 2px solid hsl(var(--bc) / 0.2);
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
